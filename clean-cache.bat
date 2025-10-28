@echo off
REM Wrapper for running the PowerShell clean script from cmd.exe
SETLOCAL
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0clean-cache.ps1" %*
ENDLOCAL

