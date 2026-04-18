@echo off
setlocal

cd /d "%~dp0"

if not exist "backend\node_modules" (
  echo [ERROR] backend dependencies are not installed.
  echo Run: cd backend ^&^& npm install
  exit /b 1
)

if not exist "frontend\node_modules" (
  echo [ERROR] frontend dependencies are not installed.
  echo Run: cd frontend ^&^& npm install
  exit /b 1
)

echo Starting Soundy backend...
start "Soundy Backend" cmd /k "cd /d ""%~dp0backend"" && npm run dev"

timeout /t 2 /nobreak >nul

echo Starting Soundy frontend...
start "Soundy Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

echo.
echo Soundy is starting:
echo - Backend: http://localhost:4000
echo - Frontend: http://localhost:3000
echo.
echo Keep both terminal windows open while developing.

endlocal
