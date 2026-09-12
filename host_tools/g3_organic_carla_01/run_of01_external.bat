@echo off
setlocal
set "REPO_ROOT=C:\CARLA_0.9.16\oasis-mvp1"
set "OUTPUT_ROOT=C:\OASIS_G3_ORGANIC_OUTPUT"

cd /d "%REPO_ROOT%"
echo CARLA 0.9.16 must already be running on 127.0.0.1:2000 with Town10HD_Opt loaded.
echo This launcher does not start, reload, or terminate CARLA.
echo.
python -m host_tools.g3_organic_carla_01.external_carla_runner --flow OF-01 --attempt 6 --output-root "%OUTPUT_ROOT%" --host 127.0.0.1 --port 2000
set "RC=%ERRORLEVEL%"
echo.
echo Exit code: %RC%
pause
exit /b %RC%
