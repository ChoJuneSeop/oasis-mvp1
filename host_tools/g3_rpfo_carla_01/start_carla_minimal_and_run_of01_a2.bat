@echo off
setlocal EnableExtensions

set "CARLA_ROOT=C:\CARLA_0.9.16"
set "REPO_ROOT=C:\CARLA_0.9.16\oasis-mvp1"
set "OUTPUT_ROOT=C:\OASIS_G3_RPFO_OUTPUT"
set "CARLA_EXE=%CARLA_ROOT%\CarlaUE4.exe"
set "HOST=127.0.0.1"
set "PORT=2000"

if not exist "%CARLA_EXE%" (
  echo [FAIL] CarlaUE4.exe not found: %CARLA_EXE%
  exit /b 2
)

if not exist "%REPO_ROOT%\host_tools\g3_rpfo_carla_01\HOST_LAUNCH_PROFILE.json" (
  echo [FAIL] Frozen host launch profile is missing.
  exit /b 3
)

if not exist "%REPO_ROOT%\research\g3_rpfo_carla_01\live_runner.py" (
  echo [FAIL] RPFO experiment repository is not present at: %REPO_ROOT%
  exit /b 4
)

cd /d "%REPO_ROOT%"

echo [1/3] Starting CARLA 0.9.16 with frozen minimal host profile...
start "CARLA 0.9.16" "%CARLA_EXE%" -dx11 -RenderOffScreen -nosound -quality-level=Low -carla-port=2000

echo [2/3] Waiting for CARLA RPC %HOST%:%PORT% ...
for /L %%I in (1,1,120) do (
  powershell -NoProfile -Command "$c=New-Object Net.Sockets.TcpClient; try{$c.Connect('%HOST%',%PORT%); $c.Close(); exit 0}catch{exit 1}" >nul 2>&1
  if not errorlevel 1 goto CARLA_READY
  timeout /t 2 /nobreak >nul
)

echo [FAIL] CARLA RPC did not become ready within 240 seconds.
exit /b 5

:CARLA_READY
echo [3/3] CARLA RPC ready. Starting RPFO OF-01 A2 preflight.
echo OF-01 A1 remains preserved and is not reused.
echo The runner will stop at PRE_FIRST_TICK_HOLD before empirical tick 1.
echo.
python -m host_tools.g3_rpfo_carla_01.external_carla_runner --flow OF-01 --attempt 2 --output-root "%OUTPUT_ROOT%" --host %HOST% --port %PORT%
set "RC=%ERRORLEVEL%"
echo.
echo Exit code: %RC%
pause
exit /b %RC%
