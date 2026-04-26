@echo off
setlocal

echo ============================================
echo  GameLauncher - Abhängigkeiten installieren
echo ============================================
echo.

:: Node.js prüfen
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [FEHLER] Node.js wurde nicht gefunden.
    echo Bitte Node.js von https://nodejs.org herunterladen und installieren.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
echo [OK] Node.js gefunden: %NODE_VERSION%

:: npm prüfen
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [FEHLER] npm wurde nicht gefunden.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('npm -v') do set NPM_VERSION=%%v
echo [OK] npm gefunden: %NPM_VERSION%
echo.

:: In Projektverzeichnis wechseln
cd /d "%~dp0"

:: npm install ausführen
echo [INFO] Installiere npm-Abhängigkeiten (electron, electron-builder)...
echo.
npm install

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [FEHLER] npm install ist fehlgeschlagen.
    pause
    exit /b 1
)

echo.
echo ============================================
echo  Installation erfolgreich abgeschlossen!
echo  Starten mit: npm start
echo ============================================
echo.
pause
endlocal
