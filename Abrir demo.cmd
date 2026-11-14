@echo off
cd /d "%~dp0"
where py >nul 2>&1
if not errorlevel 1 (
    py -3 -m http.server 8780 --bind 127.0.0.1
) else (
    python -m http.server 8780 --bind 127.0.0.1
)
if errorlevel 1 pause
