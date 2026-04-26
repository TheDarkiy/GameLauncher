@echo off
setlocal

cd /d "%~dp0"

echo [1/3] Pruefe Projektordner...
if not exist package.json (
	echo package.json wurde nicht gefunden.
	echo Bitte starte diese Datei im Projektordner.
	exit /b 1
)

echo [2/3] Pruefe Node.js und npm...
where node >nul 2>&1
if errorlevel 1 (
	echo Node.js wurde nicht gefunden. Bitte zuerst installieren.
	exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
	echo npm wurde nicht gefunden. Bitte Node.js Installation pruefen.
	exit /b 1
)

echo [3/3] Pruefe Abhaengigkeiten...
if not exist node_modules (
	echo node_modules fehlt - installiere Pakete...
	call npm.cmd install
	if errorlevel 1 (
		echo npm install ist fehlgeschlagen.
		exit /b 1
	)
)

echo.
echo Starte Launcher im Testmodus (vor Build)...
echo Schliessen mit Strg+C im Terminal oder durch Schliessen des Fensters.
call npm.cmd start

if errorlevel 1 (
	echo Start ist fehlgeschlagen.
	exit /b 1
)

endlocal
