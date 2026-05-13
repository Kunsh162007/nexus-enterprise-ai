@echo off
setlocal EnableDelayedExpansion
title NEXUS — Local Dev Setup (Windows)

echo.
echo  ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗
echo  ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝
echo  ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗
echo  ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║
echo  ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║
echo  ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝
echo  Enterprise AI Command Center — Windows Local Dev
echo.

:: ── Check Python ─────────────────────────────────────────────
echo [1/5] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Download from https://python.org ^(3.11+^)
    pause & exit /b 1
)
for /f "tokens=2" %%v in ('python --version 2^>^&1') do set PYVER=%%v
echo [OK] Python %PYVER% found

:: ── Check Node ───────────────────────────────────────────────
echo [2/5] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Download from https://nodejs.org ^(18+^)
    pause & exit /b 1
)
for /f %%v in ('node --version') do set NODEVER=%%v
echo [OK] Node.js %NODEVER% found

:: ── Check .env ───────────────────────────────────────────────
echo [3/5] Checking environment...
if not exist .env (
    echo [INFO] Creating .env from template...
    copy .env.example .env >nul
    echo.
    echo  ════════════════════════════════════════════════
    echo   ACTION REQUIRED: Add your API keys to .env
    echo  ════════════════════════════════════════════════
    echo   Open .env and fill in:
    echo     GEMINI_API_KEY=...        (from ai.google.dev)
    echo     FEATHERLESS_API_KEY=...   (from featherless.ai)
    echo     SPEECHMATICS_API_KEY=...  (from speechmatics.com)
    echo  ════════════════════════════════════════════════
    echo.
    notepad .env
    echo Press any key after saving your API keys...
    pause >nul
)
echo [OK] .env file exists

:: ── Backend Setup ────────────────────────────────────────────
echo [4/5] Setting up Python backend...
cd backend

if not exist venv (
    echo     Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat

echo     Installing dependencies (first run takes ~60s)...
pip install -r requirements.txt --quiet --disable-pip-version-check

echo [OK] Backend dependencies installed
cd ..

:: ── Frontend Setup ───────────────────────────────────────────
echo [5/5] Setting up React frontend...
cd frontend

if not exist node_modules (
    echo     Installing npm packages (first run takes ~60s)...
    npm install --silent
)

echo [OK] Frontend dependencies installed
cd ..

:: ── Start Services ───────────────────────────────────────────
echo.
echo  Starting NEXUS services...
echo  ─────────────────────────────────────────────────
echo   Backend API  →  http://localhost:8000
echo   Frontend UI  →  http://localhost:5173
echo   API Docs     →  http://localhost:8000/docs
echo  ─────────────────────────────────────────────────
echo.
echo  NOTE: Redis is optional for local dev (session data
echo  stored in-memory). NEXUS works without it locally.
echo.

:: Start backend in new window
start "NEXUS Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate && set REDIS_URL=memory && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

:: Wait for backend to start
echo  Waiting for backend...
timeout /t 4 /nobreak >nul

:: Start frontend in new window
start "NEXUS Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

:: Wait and open browser
timeout /t 4 /nobreak >nul
echo  Opening browser...
start http://localhost:5173

echo.
echo  ════════════════════════════════════════════════
echo   NEXUS is running! Two windows opened:
echo   - NEXUS Backend  (keep open)
echo   - NEXUS Frontend (keep open)
echo.
echo   Browser: http://localhost:5173
echo   Press any key to stop both services...
echo  ════════════════════════════════════════════════
pause >nul

:: Kill both service windows
taskkill /fi "WindowTitle eq NEXUS Backend" /f >nul 2>&1
taskkill /fi "WindowTitle eq NEXUS Frontend" /f >nul 2>&1
echo  Services stopped.
