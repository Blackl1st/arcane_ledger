@echo off
title Stop Arcane Ledger Server
cd /d "%~dp0"

echo Stopping Arcane Ledger server on port 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do (
    taskkill /F /PID %%a 2>nul
)

echo Arcane Ledger backend processes stopped.
timeout /t 2 >nul
