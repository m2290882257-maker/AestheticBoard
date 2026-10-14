@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-shortcuts.ps1"
if errorlevel 1 (
  echo Shortcut setup failed. See the error above.
  pause
  exit /b 1
)
echo AestheticBoard shortcuts are ready on the desktop and in the Start menu.
pause
