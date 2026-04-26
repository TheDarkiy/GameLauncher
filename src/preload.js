const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcherAPI', {
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    selectExe: () => ipcRenderer.invoke('select-exe'),
    launchExe: (exePath, launchArgs) => ipcRenderer.invoke('launch-exe', exePath, launchArgs),
    runCmdCommand: (command) => ipcRenderer.invoke('run-cmd-command', command),
    checkProcess: (processName) => ipcRenderer.invoke('check-process', processName),
    getConfig: () => ipcRenderer.invoke('get-config'),
    saveConfig: (config) => ipcRenderer.invoke('save-config', config),
    getLogFilePath: () => ipcRenderer.invoke('get-log-file-path')
});
