@echo off
echo ==========================================
echo    LP ERP - Sistema de Gestion V2
echo ==========================================
echo.

:: Abrir el Backend en una nueva ventana
echo [1/2] Iniciando Servidor Backend (Python/FastAPI)...
start cmd /k "call venv\Scripts\activate && uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

:: Esperar un momento para asegurar que el server inicie
timeout /t 5 /nobreak >nul

:: Abrir el Frontend en una nueva ventana
echo [2/2] Iniciando Interfaz Frontend (React/Vite)...
cd frontend
start cmd /k "npm run dev -- --mode development"

echo.
echo ==========================================
echo    ¡Todo listo! El sistema se abrira
echo    en tu navegador en unos segundos.
echo ==========================================
pause
