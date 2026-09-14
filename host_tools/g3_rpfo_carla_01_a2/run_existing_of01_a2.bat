@echo off
setlocal
set "REPO_ROOT=C:\CARLA_0.9.16\oasis-mvp1"
set "OUTPUT_ROOT=C:\OASIS_G3_RPFO_OUTPUT"
cd /d "%REPO_ROOT%"
echo CARLA 0.9.16 must already be running on 127.0.0.1:2000 with Town10HD_Opt loaded.
echo OF-01 A1 is preserved; this launcher uses A2 only.
echo The empirical boundary remains closed until the separate A2 approval launcher is run.
echo.
python -m host_tools.g3_rpfo_carla_01_a2.run_compat --flow OF-01 --attempt 2 --output-root "%OUTPUT_ROOT%" --host 127.0.0.1 --port 2000
set "RC=%ERRORLEVEL%"
echo.
echo Exit code: %RC%
pause
exit /b %RC%
