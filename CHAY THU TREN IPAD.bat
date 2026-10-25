@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title myNote - may chu thu cho iPad
echo.
echo   myNote - BAN MAU. iPad cung Wi-Fi mo dia chi duoi day bang Safari:
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (set ip=%%a& set ip=!ip: =!& echo      http://!ip!:9040)
echo.
echo   Safari: nut Chia se ^> Them vao MH chinh de cai nhu app.
echo   Dong cua so nay = tat may chu.
echo.
python -m http.server 9040 --bind 0.0.0.0
pause
