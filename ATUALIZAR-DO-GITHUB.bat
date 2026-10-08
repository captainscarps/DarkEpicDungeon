@echo off
rem Puxa as novidades mais recentes do GitHub para este computador
cd /d "%~dp0"
set "PATH=C:\Users\rafaelscarpille\AppData\Local\Programs\Git\cmd;%PATH%"

echo ========================================================
echo   DarkEpicDungeon - Baixar atualizacoes do GitHub (Pull)
echo ========================================================
echo.
git pull origin main

echo.
pause
