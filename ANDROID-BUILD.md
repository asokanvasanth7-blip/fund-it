# Building Fund-It App for Android

This guide explains how to build and run the Fund-It application on Android devices.

## Prerequisites

Before building for Android, ensure you have:

1. **Node.js and npm** - Already installed (used for the Angular app)
2. **Android Studio** - Download from https://developer.android.com/studio
3. **Java Development Kit (JDK)** - JDK 17 is recommended (usually comes with Android Studio)
4. **Android SDK** - Installed via Android Studio

## Initial Setup (Already Completed)

The following has already been set up for your project:
- ✅ Capacitor installed (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`)
- ✅ Capacitor initialized with app ID: `com.fundit.app`
- ✅ Android platform added
- ✅ Build scripts added to package.json
- ✅ Angular output path configured

## Build Commands

### Quick Build and Run
```bash
npm run run:android
```
This command will:
1. Build the Angular app for production
2. Sync the build with Android
3. Open the project in Android Studio

### Individual Commands

#### Build Angular App Only
```bash
npm run build
# or for production
ng build --configuration production
```

#### Sync with Android
```bash
npm run sync:android
# or
npx cap sync android
```

#### Open in Android Studio
```bash
npm run open:android
# or
npx cap open android
```

## Building the APK/AAB

### Step 1: Build and Sync
```bash
ng build --configuration production
npx cap sync android
```

### Step 2: Open in Android Studio
```bash
npx cap open android
```

### Step 3: Build in Android Studio

Once Android Studio opens:

#### For Debug APK (Testing):
1. Click **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Wait for the build to complete
3. Click "locate" in the notification to find the APK
4. APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

#### For Release APK/AAB (Production):
1. Click **Build** → **Generate Signed Bundle / APK**
2. Select **Android App Bundle** (for Play Store) or **APK** (for direct installation)
3. Click **Next**
4. Create a new keystore or use an existing one:
   - **Key store path**: Choose location to save keystore
   - **Password**: Create a strong password
   - **Alias**: Enter an alias (e.g., "fund-it-key")
   - **Key password**: Create a key password
   - **Validity**: 25 years (recommended)
   - Fill in certificate details
5. Click **Next**
6. Select **release** build variant
7. Click **Finish**
8. Output location: 
   - AAB: `android/app/build/outputs/bundle/release/app-release.aab`
   - APK: `android/app/build/outputs/apk/release/app-release.apk`

**Important**: Save your keystore file and passwords securely! You'll need them for all future updates.

## Running on a Device

### Option 1: Using Android Studio
1. Connect your Android device via USB (with USB debugging enabled)
2. Or start an Android emulator
3. Click the **Run** button (green play icon) in Android Studio
4. Select your device from the list

### Option 2: Installing APK Directly
1. Transfer the APK to your Android device
2. Enable "Install from Unknown Sources" in device settings
3. Open the APK file and install

## Testing on Emulator

### Create an Emulator in Android Studio:
1. Click **Tools** → **Device Manager**
2. Click **Create Device**
3. Select a device (e.g., Pixel 5)
4. Select a system image (e.g., Android 13 - API 33)
5. Click **Finish**
6. Start the emulator
7. Run your app

## Configuration

### App Details
- **App Name**: fund-it
- **Package ID**: com.fundit.app
- **Web Directory**: dist/fund-it/browser

### Customizing the App

#### Change App Name
Edit `android/app/src/main/res/values/strings.xml`:
```xml
<string name="app_name">Fund-It</string>
```

#### Change App Icon
Replace icons in:
- `android/app/src/main/res/mipmap-*dpi/` directories

Or use Android Studio's Asset Studio:
1. Right-click `res` folder → **New** → **Image Asset**
2. Choose icon type (Launcher Icons)
3. Select your icon image
4. Click **Next** → **Finish**

#### Change Package Name
Edit `capacitor.config.ts` and rebuild:
```typescript
appId: 'com.yourcompany.fundit',
```

Then run:
```bash
npx cap sync android
```

#### Permissions
Edit `android/app/src/main/AndroidManifest.xml` to add required permissions:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<!-- Add other permissions as needed -->
```

## Updating the App

After making changes to your Angular code:

1. Rebuild the Angular app:
   ```bash
   ng build --configuration production
   ```

2. Sync changes to Android:
   ```bash
   npx cap sync android
   ```

3. Run/rebuild in Android Studio

## Troubleshooting

### Issue: Android Studio not opening
- Ensure Android Studio is installed
- Try opening manually: `android` folder in Android Studio

### Issue: Build fails in Android Studio
- Check you have the correct SDK versions installed
- Go to **Tools** → **SDK Manager** and install required SDKs
- Sync project with Gradle files: **File** → **Sync Project with Gradle Files**

### Issue: App crashes on startup
- Check browser console for errors: `chrome://inspect` on your computer while device is connected
- Check Android Logcat in Android Studio for errors

### Issue: White screen on app launch
- Ensure Angular build completed successfully
- Check capacitor.config.ts has correct `webDir` path
- Run `npx cap sync android` again

### Issue: Changes not reflecting
- Clear browser cache in the app or reinstall
- Run a clean build:
  ```bash
  ng build --configuration production
  npx cap sync android
  ```
- In Android Studio: **Build** → **Clean Project**, then rebuild

## Live Reload for Development

For faster development, you can use live reload:

1. Find your computer's local IP address:
   ```bash
   ipconfig
   ```

2. Start the Angular dev server:
   ```bash
   ng serve
   ```

3. Update `capacitor.config.ts`:
   ```typescript
   const config: CapacitorConfig = {
     appId: 'com.fundit.app',
     appName: 'fund-it',
     webDir: 'dist/fund-it/browser',
     server: {
       url: 'http://YOUR_IP:4200',
       cleartext: true
     }
   };
   ```

4. Sync and run:
   ```bash
   npx cap sync android
   npx cap open android
   ```

**Remember**: Remove the `server` configuration before building for production!

## Publishing to Google Play Store

1. Build a signed Android App Bundle (.aab)
2. Create a Google Play Developer account ($25 one-time fee)
3. Create a new app in Play Console
4. Fill in app details, screenshots, description
5. Upload the .aab file
6. Complete the content rating questionnaire
7. Set pricing and distribution
8. Submit for review

## Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/guide)
- [Angular Deployment](https://angular.io/guide/deployment)

## Notes

- The first build in Android Studio may take several minutes
- Keep your keystore file safe - you cannot update your app without it
- Test on multiple devices and Android versions
- Consider implementing Android-specific features using Capacitor plugins

