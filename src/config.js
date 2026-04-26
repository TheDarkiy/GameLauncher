const config = {
    serverName: 'SERVERNAME', // ServerName
    serverlogo: 'logo.webp', // ServerLogo (relative path to the launcher directory)
    connect: 'fivem://connect/SERVERIP', // Connect Link (e.g., fivem://connect/yourserverip)
    connect_command: 'connect SERVERIP', // Connect Command (e.g., yourserverip)
    discordlink: 'https://discord.gg/DEINDISCORD', // Discord Link
    processName: 'GTAProcess', // Sucht eine laufende EXE der den Namen enthält
    window: {
        width: 1200, // Fensterbreite
        height: 760, // Fensterhöhe
        resizable: false, // Ob das Fenster in der Größe veränderbar ist
        autoHideMenuBar: true, // Ob die Menüleiste automatisch ausgeblendet wird
        icon: 'logo.ico', // Pfad zum Fenstersymbol (relative zum Launcher-Verzeichnis)
        html: 'index.html', // Pfad zur HTML-Datei, die als Benutzeroberfläche dient (relative zum Launcher-Verzeichnis)
        webPreferences: {
            preload: 'preload.js', // Pfad zur Preload-Datei (relative zum Launcher-Verzeichnis)
            nodeIntegration: false, // Ob Node.js-Integration im Renderer-Prozess aktiviert ist (für Sicherheit in der Regel false)
            contextIsolation: true, // Ob Kontextisolation aktiviert ist (für Sicherheit in der Regel true)
            webSecurity: true // Ob Web-Sicherheitsfunktionen aktiviert sind (für Sicherheit in der Regel true)
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
}

if (typeof window !== 'undefined') {
    window.config = config;
}