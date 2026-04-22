@echo off
setlocal

cd /d "%~dp0"

if not exist "backend\node_modules" (
  echo [ERROR] backend dependencies are not installed.
  echo Run: cd backend ^&^& npm install
  exit /b 1
)

if not exist "desktop\node_modules" (
  echo [ERROR] desktop dependencies are not installed.
  echo Run: cd desktop ^&^& npm install
  exit /b 1
)

where cargo >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Rust toolchain is not installed or cargo is not in PATH.
  echo Install Rust from: https://rustup.rs
  exit /b 1
)

echo Starting Soundy backend...
start "Soundy Backend" cmd /k "cd /d ""%~dp0backend"" && npm run dev"

timeout /t 2 /nobreak >nul

echo Starting Soundy desktop app...
start "Soundy Desktop" cmd /k "cd /d ""%~dp0desktop"" && npm run tauri dev"

echo.
echo Soundy desktop dev is starting:
echo - Backend API: http://localhost:4000
echo - Desktop widget: Tauri window
echo.
echo Keep both terminal windows open while developing.

endlocal
