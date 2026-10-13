@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instala Node.js 22 o posterior y vuelve a abrir este archivo.
  pause
  exit /b 1
)
echo Abre http://127.0.0.1:8080 en tu navegador.
node servidor.cjs
pause
