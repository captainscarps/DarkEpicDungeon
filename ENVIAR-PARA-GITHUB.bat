@echo off
rem Salva TODAS as mudancas do projeto e envia para o GitHub
cd /d "%~dp0"
set "PATH=C:\Users\rafaelscarpille\AppData\Local\Programs\Git\cmd;%PATH%"

echo ========================================================
echo   DEPTHGATE - Enviar atualizacoes para o GitHub
echo ========================================================
echo.
echo Arquivos alterados:
git status -s
echo.

set "MSG="
set /p "MSG=Descreva a mudanca (ou Enter para mensagem automatica): "
if "%MSG%"=="" set "MSG=Atualizacao %date% %time:~0,5%"

git add -A
git commit -m "%MSG%"
if errorlevel 1 echo (Nada novo para salvar - so vou sincronizar.)

echo.
echo Baixando novidades do GitHub antes de enviar...
git pull --rebase origin main
if errorlevel 1 (
    echo.
    echo [ATENCAO] Conflito ao juntar com o GitHub. Nada foi enviado.
    echo Me mande o que apareceu acima que eu te ajudo a resolver.
    pause
    exit /b 1
)

echo.
echo Enviando para o GitHub...
git push origin main
if errorlevel 1 (
    echo.
    echo [ATENCAO] O Git precisa da sua autorizacao no navegador.
    echo Autorize o acesso na janela que abriu e rode este arquivo de novo.
) else (
    echo.
    echo [SUCESSO] Tudo enviado! O site atualiza em 1 ou 2 minutos.
)

echo.
pause
