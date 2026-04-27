# GameLauncher
GameLauncher - Funktionsuebersicht
Du benötigdt NodeJS
Diese Datei beschreibt alle wichtigen Funktionen im Projekt mit kurzen Beispielen.

    Projektstruktur (relevant)
    - src/main.js: Electron Main Process, IPC Handler, Logging, EXE-Start
    - src/preload.js: Sichere API fuer den Renderer (window.launcherAPI)
    - src/script.js: Frontend-Logik (Join, Notify, Settings, Prozess-Check)
    - src/config.js: Statische Launcher-Konfiguration

    1) Funktionen in src/main.js

        generateLogFileName()
        - Zweck: Erzeugt pro Session einen Log-Dateinamen im Format log_YYYY_MM_DD_HH_MM.log
        - Rueckgabe: String
        - Beispiel:
            const name = generateLogFileName();

        ensureLogDirectoryExists()
        - Zweck: Erstellt den Logs-Ordner unter app.getPath('userData')/logs, falls er fehlt
        - Rueckgabe: keine
        - Beispiel:
            ensureLogDirectoryExists();

        writeLog(message, details, level)
        - Zweck: Schreibt einen Log-Eintrag mit Zeitstempel und Level in die aktuelle Log-Datei
        - Parameter:
            message: Text
            details: Optionales Objekt mit Zusatzdaten
            level: DEBUG | INFO | WARN | ERROR
        - Beispiel:
            writeLog('Process check completed', { searchTerm: 'GTAProcess', isRunning: true }, 'DEBUG');

        logInfo(message, details)
        logWarn(message, details)
        logError(message, details)
        logDebug(message, details)
        - Zweck: Komfortfunktionen fuer writeLog mit festem Level
        - Beispiel:
            logError('Launch failed', { error: 'Datei nicht gefunden' });

        readConfig()
        - Zweck: Liest config.json aus dem userData-Ordner
        - Rueckgabe: Objekt mit selectedExePath
        - Fehlerfall: Gibt selectedExePath: null zurueck und loggt Fehler
        - Beispiel:
            const cfg = readConfig();

        writeConfig(partialConfig)
        - Zweck: Fuehrt Merge mit bestehender Config aus und speichert sie
        - Rueckgabe: Vollstaendige, gespeicherte Config
        - Beispiel:
            const next = writeConfig({ selectedExePath: 'D:\\FiveM\\FiveM.exe' });

        createWindow()
        - Zweck: Erstellt das Electron Fenster und laedt index.html
        - Beispiel:
            createWindow();

    2) IPC Handler in src/main.js

        ipcMain.handle('get-config')
        - Zweck: Renderer kann gespeicherte Config holen
        - Rueckgabe: { selectedExePath }

        ipcMain.handle('save-config', partialConfig)
        - Zweck: Renderer speichert Config-Teile
        - Rueckgabe: { ok: true, config } oder { ok: false, error }

        ipcMain.handle('get-log-file-path')
        - Zweck: Gibt aktuellen Pfad zur Log-Datei zurueck
        - Rueckgabe: String

        ipcMain.handle('select-folder')
        - Zweck: Oeffnet Folder-Dialog
        - Rueckgabe: Pfad oder null

        ipcMain.handle('select-exe')
        - Zweck: Oeffnet Dateidialog fuer EXE
        - Rueckgabe: Pfad oder null

        ipcMain.handle('launch-exe', exePath, launchArgsRaw)
        - Zweck: Startet EXE getrennt vom Launcher (detached)
        - Rueckgabe: { ok: true } oder { ok: false, error }
        - Hinweis: Pfad wird normalisiert, Existenz wird geprueft

        ipcMain.handle('run-power-shell-command', command)
        - Status: Noch nicht fertig implementiert
        - Aktuell: Prueft nur den Input und liefert bei ungueltigem Input einen Fehler

        ipcMain.handle('run-cmd-command', command)
        - Zweck: Fuehrt CMD-Befehl aus
        - Rueckgabe: { ok: true, stdout, stderr } oder { ok: false, error }

        ipcMain.handle('check-process', processName)
        - Zweck: Prueft ueber tasklist, ob ein Prozess laeuft
        - Rueckgabe: { ok: true, isRunning } oder { ok: false, isRunning: false, error? }

    3) API fuer den Renderer in src/preload.js

        Die folgenden Methoden stehen im Frontend als window.launcherAPI zur Verfuegung:

        selectFolder()
        - Aufruf: window.launcherAPI.selectFolder()

        selectExe()
        - Aufruf: window.launcherAPI.selectExe()

        launchExe(exePath, launchArgs)
        - Aufruf: window.launcherAPI.launchExe('D:\\FiveM\\FiveM.exe', '+exec auto.cfg')

        runCmdCommand(command)
        - Aufruf: window.launcherAPI.runCmdCommand('start fivem://connect/silverlakecity.de')

        checkProcess(processName)
        - Aufruf: window.launcherAPI.checkProcess('GTAProcess')

        getConfig()
        - Aufruf: window.launcherAPI.getConfig()

        saveConfig(config)
        - Aufruf: window.launcherAPI.saveConfig({ selectedExePath: 'D:\\FiveM\\FiveM.exe' })

        getLogFilePath()
        - Aufruf: window.launcherAPI.getLogFilePath()

    4) Funktionen im Frontend in src/script.js

        init()
        - Zweck: Prueft, ob die Website erreichbar ist und startet danach checkcfg()

        checkcfg()
        - Zweck: Laedt gespeicherte EXE aus Config und blendet UI ein

        IsRunning(processName)
        - Zweck: Wrapper fuer launcherAPI.checkProcess mit Fehlerbehandlung
        - Rueckgabe: true oder false

        join()
        - Zweck: Gesamter Join-Flow
            1. EXE vorhanden?
            2. Spielprozess schon aktiv?
            3. Falls nein: EXE starten
            4. Warten bis Prozess aktiv
            5. Countdown
            6. Server-Connect ueber CMD

        Notify(type, message)
        - Zweck: Zeigt Statusmeldung im Launcher
        - type: error | success | warning | hide

        setTimeout(init, 2000)
        - Zweck: Startet init nach kurzer Wartezeit

        setInterval(..., 2000)
        - Zweck: Aktualisiert die iframe URL regelmaessig mit Zeitstempel

    5) Beispielablauf (nur notwendige Calls)

        1. EXE auswaehlen und speichern
            const exePath = await window.launcherAPI.selectExe();
            if (exePath) {
                    await window.launcherAPI.saveConfig({ selectedExePath: exePath });
            }

        2. Prozess pruefen und ggf. starten
            const processState = await window.launcherAPI.checkProcess('GTAProcess');
            if (!processState.ok || !processState.isRunning) {
                    await window.launcherAPI.launchExe(exePath);
            }

        3. Mit Server verbinden
            await window.launcherAPI.runCmdCommand('start fivem://connect/silverlakecity.de');

    6) Wichtiger Hinweis

        - In src/main.js wird config aus src/config.js geladen.
        - In src/script.js wird config als Browser-Global genutzt.
        - src/config.js ist deshalb fuer beide Seiten ausgelegt:
            module.exports = config (Node)
            window.config = config (Browser)

    7) Projekt starten (Preview) und packen (Build)

        Voraussetzungen
        - Node.js installiert
        - Abhaengigkeiten installiert (im Projektordner):
            npm install

        Preview starten (Entwicklung)
        - Variante A (npm Script):
            npm start
        - Variante B (Batch Datei):
            __preview.bat

        Projekt packen (portable EXE)
        - Variante A (npm Script):
            npm run build
        - Variante B (Batch Datei):
            _build.bat

        Output nach dem Build
        - Der Build liegt im Ordner:
            release/
        - Ziel ist als portable konfiguriert (electron-builder, win portable).
