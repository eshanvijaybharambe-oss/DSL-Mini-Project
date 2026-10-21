@echo off
cd /d "%~dp0"
echo [1/2] Compiling the C++ graph algorithms...
g++ -std=c++17 -O2 cpp\skillgraph.cpp -o cpp\skillgraph.exe
if errorlevel 1 (
  echo.
  echo Compilation failed. Install a C++ compiler such as MinGW-w64 and make sure g++ is on PATH.
  pause
  exit /b 1
)
echo [2/2] Starting the web server...
node server.js
pause
