@echo off
REM Build and run Voice AI Chat client and server Docker containers locally using Docker Compose for correct networking

REM Build images using docker-compose (ensures build args and env are set correctly)
docker compose build

REM Start both containers with correct networking
docker compose up

echo.
echo Client running at http://localhost:5173
echo Server running at http://localhost:5000
pause
