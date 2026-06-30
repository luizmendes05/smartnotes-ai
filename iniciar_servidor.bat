@echo off
cd /d "%~dp0"
echo ===================================================
echo   INICIANDO O SERVIDOR BACKEND DO SMARTNOTES AI
echo ===================================================
echo.
echo O servidor Express rodará na porta 3001 e fará a ponte
echo para a sua IA local na porta 3000.
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

"%NODE_BIN%" backend/server.js
if %errorlevel% neq 0 (
    echo.
    echo ❌ [ERROR] Failed to start server (Exit Code: %errorlevel%).
    echo.
    echo Possible causes:
    echo 1. Port 3001 is already in use (e.g. by another background node process).
    echo 2. Missing dependencies (run 'npm install' first).
)

echo.
echo Servidor parado.
pause

