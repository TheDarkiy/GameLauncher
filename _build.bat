@echo off
setlocal

cd /d "%~dp0"

echo [1/3] Pruefe Projektordner...
if not exist package.json (
	echo package.json wurde nicht gefunden.
	exit /b 1
)

echo [2/3] Pruefe Abhaengigkeiten...
if not exist node_modules (
	call npm.cmd install
	if errorlevel 1 (
		echo npm install ist fehlgeschlagen.
		exit /b 1
	)
)

echo Bereinige vorherige Build-Dateien...
taskkill /F /IM launcher.exe >nul 2>&1
if exist release (
	rmdir /s /q release
)

echo [3/3] Baue portable EXE...
set CSC_IDENTITY_AUTO_DISCOVERY=false
call .\node_modules\.bin\electron-builder.cmd --win portable --config.directories.output=release
if errorlevel 1 (
	echo Build ist fehlgeschlagen.
	exit /b 1
)

echo.
echo Fertig. Die EXE liegt im release-Ordner.
endlocal
