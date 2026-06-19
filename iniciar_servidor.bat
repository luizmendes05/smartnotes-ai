@echo off
cd /d "%~dp0"
echo ===================================================
echo   STARTING SMARTNOTES AI BACKEND SERVER
echo ===================================================
echo.
echo The Express server will run on port 3001 and bridge
echo to your local AI on port 3000.
echo.

set "NODE_BIN=node"

rem Check for relative portable Node path first
if exist "..\node_portable\node-v20.11.0-win-x64\node.exe" (
    set "NODE_BIN=..\node_portable\node-v20.11.0-win-x64\node.exe"
) else if exist "C:\Users\usuario\.gemini\antigravity\scratch\node_portable\node-v20.11.0-win-x64\node.exe" (
    set "NODE_BIN=C:\Users\usuario\.gemini\antigravity\scratch\node_portable\node-v20.11.0-win-x64\node.exe"
)

echo Using Node executable: %NODE_BIN%
echo.

"%NODE_BIN%" server.js
if %errorlevel% neq 0 (
    echo.
    echo ❌ [ERROR] Failed to start server (Exit Code: %errorlevel%).
    echo.
    echo Possible causes:
    echo 1. Port 3001 is already in use (e.g. by another background node process).
    echo 2. Missing dependencies (run 'npm install' first).
)

echo.
echo Server stopped.
pause

