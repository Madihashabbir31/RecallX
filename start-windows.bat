@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  py -3 -m venv .venv
  if errorlevel 1 goto fail
)
.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
if errorlevel 1 goto fail
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
pause
exit /b
:fail
echo Setup failed. Check that Python 3.11 or newer is installed and internet access is available.
pause
exit /b 1
