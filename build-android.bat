@echo off
REM Build Fund-It Android App
REM This script builds the Angular app and syncs with Android

echo ====================================
echo Building Fund-It for Android
echo ====================================
echo.

echo [1/3] Building Angular app...
call ng build --configuration production
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Angular build failed!
    pause
    exit /b %ERRORLEVEL%
)
echo Angular build completed successfully!
echo.

echo [2/3] Syncing with Android...
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Capacitor sync failed!
    pause
    exit /b %ERRORLEVEL%
)
echo Sync completed successfully!
echo.

echo [3/3] Opening Android Studio...
call npx cap open android
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Could not open Android Studio!
    echo Please open the android folder manually in Android Studio.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ====================================
echo Build process completed!
echo ====================================
echo.
echo Next steps:
echo 1. Wait for Android Studio to open
echo 2. Wait for Gradle sync to complete
echo 3. Click Build -^> Build Bundle(s) / APK(s) -^> Build APK(s)
echo 4. Or click the green Run button to test on device/emulator
echo.
pause

