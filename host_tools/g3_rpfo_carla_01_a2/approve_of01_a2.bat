@echo off
setlocal
set "REPO_ROOT=C:\CARLA_0.9.16\oasis-mvp1"
set "RUN_DIR=C:\OASIS_G3_RPFO_OUTPUT\G3-RPFO-ORGANIC-CARLA-01\OF-01-A2"
cd /d "%REPO_ROOT%"
python -m research.g3_rpfo_carla_01.release_gate --run-dir "%RUN_DIR%" --approve
set "RC=%ERRORLEVEL%"
echo.
echo Exit code: %RC%
pause
exit /b %RC%
