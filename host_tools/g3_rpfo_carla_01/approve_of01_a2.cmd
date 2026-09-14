@echo off
setlocal
cd /d C:\CARLA_0.9.16\oasis-mvp1
python -m research.g3_rpfo_carla_01.release_gate --run-dir C:\OASIS_G3_RPFO_OUTPUT\G3-RPFO-ORGANIC-CARLA-01\OF-01-A2 --approve
set RC=%ERRORLEVEL%
echo.
echo Exit code: %RC%
pause
exit /b %RC%
