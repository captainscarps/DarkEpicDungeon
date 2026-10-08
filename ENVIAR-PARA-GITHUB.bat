@echo off
rem Sincroniza e envia os commits do DarkEpicDungeon para o GitHub
cd /d "%~dp0"
set "PATH=C:\Users\rafaelscarpille\AppData\Local\Programs\Git\cmd;%PATH%"

echo ========================================================
echo   DarkEpicDungeon - Sincronizar com o GitHub (Push)
echo ========================================================
echo.
echo Status atual dos arquivos:
git status -s
echo.
echo Enviando commits para o GitHub (origin main)...
git push origin main

if errorlevel 1 (
    echo.
    echo ========================================================
    echo [ATENCAO] O Git precisa da sua autorizacao no navegador.
    echo Se abriu uma tela do navegador ou do GitHub, autorize o acesso.
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo [SUCESSO] Atualizacoes enviadas para o GitHub!
    echo Voce ja pode puxar (git pull) no seu outro computador.
    echo ========================================================
)

echo.
pause
