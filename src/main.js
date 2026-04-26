const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const config = require('./config.js');
const { execFile, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const configFilePath = path.join(app.getPath('userData'), 'config.json');
const logDirectoryPath = path.join(app.getPath('userData'), 'logs');

// Generiere Log-Dateiname mit Datum und Zeit
function generateLogFileName() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    
    return `log_${year}_${month}_${day}_${hour}_${minute}.log`;
}

let logFilePath = path.join(logDirectoryPath, generateLogFileName());

const LOG_LEVELS = { DEBUG: 'DEBUG', INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR' };

function ensureLogDirectoryExists() {
    if (!fs.existsSync(logDirectoryPath)) {
        fs.mkdirSync(logDirectoryPath, { recursive: true });
    }
}

function writeLog(message, details, level = LOG_LEVELS.INFO) {
    const timestamp = new Date().toISOString();
    const detailsText = details ? '\n    ' + JSON.stringify(details, null, 2).replace(/\n/g, '\n    ') : '';
    const line = `[${timestamp}] [${level.padEnd(5)}] ${message}${detailsText}\n`;

    try {
        ensureLogDirectoryExists();
        fs.appendFileSync(logFilePath, line, 'utf8');
    } catch (_error) {
    }
}

function logInfo(message, details)  { writeLog(message, details, LOG_LEVELS.INFO);  }
function logWarn(message, details)  { writeLog(message, details, LOG_LEVELS.WARN);  }
function logError(message, details) { writeLog(message, details, LOG_LEVELS.ERROR); }
function logDebug(message, details) { writeLog(message, details, LOG_LEVELS.DEBUG); }

function readConfig() {
    try {
        if (!fs.existsSync(configFilePath)) {
            return { selectedExePath: null };
        }

        const raw = fs.readFileSync(configFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        return {
            selectedExePath: typeof parsed.selectedExePath === 'string' ? parsed.selectedExePath : null
        };
    } catch (error) {
        logError('Config read failed', { error: error.message });
        return { selectedExePath: null };
    }
}

function writeConfig(partialConfig) {
    const current = readConfig();
    const next = {
        ...current,
        ...partialConfig
    };

    fs.writeFileSync(configFilePath, JSON.stringify(next, null, 2), 'utf8');
    logInfo('Config updated', { keys: Object.keys(partialConfig || {}) });
    return next;
}

function createWindow() {
    const win = new BrowserWindow({
        title: config.servername || "Unbekannter Server",
        width: config.window.width || 1200,
        height: config.window.height || 760,
        resizable: config.window.resizable !== undefined ? config.window.resizable : false,
        autoHideMenuBar: config.window.autoHideMenuBar !== undefined ? config.window.autoHideMenuBar : true,
		icon: path.join(__dirname, config.window.icon || 'logo.ico'),
        webPreferences: {
            preload: path.join(__dirname, config.window.webPreferences.preload || 'preload.js'),
            nodeIntegration: config.window.webPreferences.nodeIntegration || false,
            contextIsolation: config.window.webPreferences.contextIsolation !== undefined ? config.window.webPreferences.contextIsolation : true,
            webSecurity: config.window.webPreferences.webSecurity !== undefined ? config.window.webPreferences.webSecurity : true
        }
    });

    win.loadFile(path.join(__dirname, config.window.html || 'index.html'));
}


app.whenReady().then(() => {
    const sep = '='.repeat(60);
    ensureLogDirectoryExists();
    fs.appendFileSync(logFilePath, `\n${sep}\n`, 'utf8');
    logInfo(`Application started | v${app.getVersion()} | Electron ${process.versions.electron} | Node ${process.versions.node}`);
    createWindow();
});

app.on('window-all-closed', () => {
    logInfo('All windows closed');
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.handle('get-config', async () => {
    const config = readConfig();
    logDebug('Config requested');
    return config;
});

ipcMain.handle('save-config', async (_event, partialConfig) => {
    if (!partialConfig || typeof partialConfig !== 'object') {
        return { ok: false, error: 'Ungultige Config Daten.' };
    }

    try {
        const config = writeConfig(partialConfig);
        return { ok: true, config };
    } catch (error) {
        logError('Config save failed', { error: error.message });
        return { ok: false, error: 'Config konnte nicht gespeichert werden.' };
    }
});

ipcMain.handle('get-log-file-path', async () => {
    return logFilePath;
});

ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });

    if (result.canceled || !result.filePaths.length) {
        return null;
    }

    return result.filePaths[0];
});

ipcMain.handle('select-exe', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Executable', extensions: ['exe'] }
        ]
    });

    if (result.canceled || !result.filePaths.length) {
        logInfo('EXE selection canceled');
        return null;
    }

    logInfo('EXE selected', { path: result.filePaths[0] });
    return result.filePaths[0];
});

ipcMain.handle('launch-exe', async (_event, exePath, launchArgsRaw) => {
    if (typeof exePath !== 'string' || !exePath.trim()) {
        logWarn('Launch rejected: invalid exe path');
        return { ok: false, error: 'Ungultiger EXE Pfad.' };
    }

    let normalizedExePath = path.normalize(exePath.trim());
    normalizedExePath = normalizedExePath.replace(/^\\([A-Za-z]:\\)/, '$1');

    const launchArgs = typeof launchArgsRaw === 'string' && launchArgsRaw.trim()
        ? launchArgsRaw.trim().split(/\s+/)
        : [];

    if (!fs.existsSync(normalizedExePath)) {
        logError('Launch rejected: exe not found', {
            rawPath: exePath,
            normalizedPath: normalizedExePath
        });
        return { ok: false, error: 'Die ausgewahlte EXE wurde nicht gefunden.' };
    }

    return new Promise((resolve) => {
        const cmdArgs = ['/d', '/s', '/c', 'start', '""', normalizedExePath, ...launchArgs];
        const child = spawn('cmd.exe', cmdArgs, {
            windowsHide: false,
            detached: true,
            stdio: 'ignore'
        });

        let settled = false;
        const done = (result) => {
            if (settled) return;
            settled = true;
            resolve(result);
        };

        child.once('error', (error) => {
            logError('Launch failed', { path: normalizedExePath, error: error.message });
            done({ ok: false, error: error.message });
        });

        child.once('spawn', () => {
            child.unref();
            logInfo('Launch spawned independently', { path: normalizedExePath, args: launchArgs });
            done({ ok: true });
        });
    });
});

ipcMain.handle('run-power-shell-command', async (_event, command) => {
    if (typeof command !== 'string' || !command.trim()) {
        writeLog('PowerShell command rejected: invalid command');
        return { ok: false, error: 'Ungultiger PowerShell Command.' };
    }
});

ipcMain.handle('run-cmd-command', async (_event, command) => {
    if (typeof command !== 'string' || !command.trim()) {
        writeLog('Command rejected: invalid command');
        return { ok: false, error: 'Ungultiger Command.' };
    }

    logDebug('Command started', { command });

    return new Promise((resolve) => {
        execFile('cmd.exe', ['/c', command], { windowsHide: true }, (error, stdout, stderr) => {
            if (error) {
                logError('Command failed', { command, error: stderr || error.message });
                resolve({ ok: false, error: stderr || error.message });
                return;
            }

            logDebug('Command finished successfully', { command });
            resolve({ ok: true, stdout, stderr });
        });
    });
});

ipcMain.handle('check-process', async (_event, processName) => {
    if (typeof processName !== 'string' || !processName.trim()) {
        return { ok: false, isRunning: false, error: 'Ungueltiger Prozessname.' };
    }

    const searchTerm = processName.trim().replace(/\.exe$/i, '');

    return new Promise((resolve) => {
        execFile('tasklist', ['/NH', '/FO', 'CSV'], { windowsHide: true }, (error, stdout, stderr) => {
            if (error) {
                logError('Process check failed', { searchTerm, error: stderr || error.message });
                return resolve({ ok: false, isRunning: false });
            }

            const isRunning = (stdout || '').toLowerCase().includes(searchTerm.toLowerCase());
            logDebug('Process check completed', { searchTerm, isRunning });
            return resolve({ ok: true, isRunning });
        });
    });
});