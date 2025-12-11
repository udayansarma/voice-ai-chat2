@echo off
rem Only build when 'build' is passed as first argument
set DO_BUILD=0
if /I "%~1"=="build" set DO_BUILD=1

rem Kill any processes listening on ports 5000 (backend) and 5173 (frontend)

echo Killing processes on port 5000 (backend)...
for /f "tokens=5" %%A in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do (
    echo   Killing PID %%A
    taskkill /PID %%A /F >nul 2>&1
)

echo Killing processes on port 5173 (frontend)...
for /f "tokens=5" %%A in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    echo   Killing PID %%A
    taskkill /PID %%A /F >nul 2>&1
)

echo Starting backend (server)...
if %DO_BUILD%==1 (
  start "Backend" cmd /k "cd /d %~dp0\server && npm install && npm run build && npm run dev"
) else (
  start "Backend" cmd /k "cd /d %~dp0\server && npm install && npm run dev"
)

echo Starting frontend (client)...
if %DO_BUILD%==1 (
  start "Frontend" cmd /k "cd /d %~dp0\client && npm install && npm run build && npm run dev"
) else (
  start "Frontend" cmd /k "cd /d %~dp0\client && npm install && npm run dev"
)

echo All processes started. Close this window to exit.
