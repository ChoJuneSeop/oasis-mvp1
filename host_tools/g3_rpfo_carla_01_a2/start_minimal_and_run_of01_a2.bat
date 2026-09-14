@echo off
setlocal EnableExtensions
set "CARLA_ROOT=C:\CARLA_0.9.16"
set "REPO_ROOT=C:\CARLA_0.9.16\oasis-mvp1"
set "OUTPUT_ROOT=C:\OASIS_G3_RPFO_OUTPUT"
set "CARLA_EXE=%CARLA_ROOT%\CarlaUE4.exe"
cd /d "%REPO_ROOT%"

echo Starting CARLA 0.9.16 with frozen minimal host profile...
start "CARLA 0.9.16" "%CARLA_EXE%" -dx11 -RenderOffScreen -nosound -quality-level=Low -carla-port=2000

for /L %%I in (1,1,120) do (
  powershell -NoProfile -Command "$c=New-Object Net.Sockets.TcpClient; try{$c.Connect('127.0.0.1',2000); $c.Close(); exit 0}catch{exit 1}" >nul 2>&1
  if not errorlevel 1 goto READY
  timeout /t 2 /nobreak >nul
)

echo [FAIL] CARLA RPC did not become ready within 240 seconds.
exit /b 4

:READY
echo CARLA RPC ready. Starting RPFO OF-01 A2 preflight.
echo OF-01 A1 remains preserved and will not be reused.
python -m host_tools.g3_rpfo_carla_01_a2.run_compat --flow OF-01 --attempt 2 --output-root "%OUTPUT_ROOT%" --host 127.0.0.1 --port 2000
set "RC=%ERRORLEVEL%"
echo.
echo Exit code: %RC%
pause
exit /b %RC%
