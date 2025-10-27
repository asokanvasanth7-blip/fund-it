# Build Fund-It Android App
# This script builds the Angular app and syncs with Android

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Building Fund-It for Android" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build Angular
Write-Host "[1/3] Building Angular app..." -ForegroundColor Yellow
$buildResult = & ng build --configuration production
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Angular build failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit $LASTEXITCODE
}
Write-Host "Angular build completed successfully!" -ForegroundColor Green
Write-Host ""

# Step 2: Sync with Android
Write-Host "[2/3] Syncing with Android..." -ForegroundColor Yellow
$syncResult = & npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Capacitor sync failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit $LASTEXITCODE
}
Write-Host "Sync completed successfully!" -ForegroundColor Green
Write-Host ""

# Step 3: Open Android Studio
Write-Host "[3/3] Opening Android Studio..." -ForegroundColor Yellow
$openResult = & npx cap open android
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Could not open Android Studio automatically!" -ForegroundColor Yellow
    Write-Host "Please open the 'android' folder manually in Android Studio." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Build process completed!" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Wait for Android Studio to open" -ForegroundColor White
Write-Host "2. Wait for Gradle sync to complete" -ForegroundColor White
Write-Host "3. Click Build -> Build Bundle(s) / APK(s) -> Build APK(s)" -ForegroundColor White
Write-Host "4. Or click the green Run button to test on device/emulator" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to exit"

