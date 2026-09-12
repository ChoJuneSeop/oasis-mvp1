@echo off
setlocal
set "CARLA_ROOT=C:\CARLA_0.9.16"
set "REPO_ROOT=C:\CARLA_0.9.16\oasis-mvp1"
set "OUTPUT_ROOT=C:\OASIS_G3_ORGANIC_OUTPUT"

cd /d "%REPO_ROOT%"
python -m host_tools.g3_organic_carla_01.windows_orchestrator_staged --flow OF-01 --attempt 5 --carla-root "%CARLA_ROOT%" --repo-root "%REPO_ROOT%" --output-root "%OUTPUT_ROOT%"
set "RC=%ERRORLEVEL%"
echo.
echo Exit code: %RC%
pause
exit /b %RC%
