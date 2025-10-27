# Android Build - Quick Start Guide

## 🚀 Quick Commands

### Build and Open in Android Studio
```bash
ng build --configuration production
npx cap sync android
npx cap open android
```

Or use the npm script:
```bash
npm run run:android
```

## 📱 What's Been Set Up

✅ **Capacitor installed** - Native mobile wrapper for Angular
✅ **Android platform added** - Ready to build APKs
✅ **Mobile optimizations** - Viewport, status bar, splash screen
✅ **Plugins installed**:
   - @capacitor/splash-screen - Splash screen control
   - @capacitor/status-bar - Status bar styling

## 🛠️ Build Process

### 1. First Time Setup (Do Once)
Install Android Studio from: https://developer.android.com/studio

### 2. Build Your App
```bash
# Build Angular app
ng build --configuration production

# Sync with Android
npx cap sync android

# Open in Android Studio
npx cap open android
```

### 3. In Android Studio

**For Testing (Debug APK):**
- Build → Build Bundle(s) / APK(s) → Build APK(s)
- Find APK at: `android/app/build/outputs/apk/debug/app-debug.apk`

**For Release:**
- Build → Generate Signed Bundle / APK
- Create/use keystore (SAVE IT SAFELY!)
- Find at: `android/app/build/outputs/apk/release/app-release.apk`

### 4. Run on Device/Emulator
- Connect Android device with USB debugging ON
- Or start an emulator in Android Studio
- Click the green Play button

## 📝 App Configuration

- **App ID**: com.fundit.app
- **App Name**: Fund-It
- **Output**: dist/fund-it/browser

## 🔄 After Code Changes

```bash
ng build --configuration production
npx cap sync android
```
Then rebuild in Android Studio (or it will auto-detect changes)

## 📚 More Details

See `ANDROID-BUILD.md` for comprehensive documentation including:
- Detailed build instructions
- Customization options (icons, name, package ID)
- Publishing to Play Store
- Troubleshooting
- Live reload for development

## ⚠️ Important Notes

1. **Keystore**: When creating a release build, SAVE your keystore file and passwords! You can't update your app without it.
2. **First Build**: May take 5-10 minutes in Android Studio
3. **Testing**: Always test on real devices, not just emulators
4. **Permissions**: Internet permission is auto-included; add others in AndroidManifest.xml

## 🐛 Quick Troubleshooting

**White screen?** → Run `npx cap sync android` again
**Changes not showing?** → Clean build in Android Studio
**Build errors?** → Check SDK versions in Android Studio SDK Manager

## 📂 Project Structure

```
fund-it/
├── android/                 # Android native project
│   └── app/
│       └── src/main/
│           ├── AndroidManifest.xml
│           └── res/         # Icons, strings, etc.
├── src/                     # Angular source
├── dist/                    # Build output
├── capacitor.config.ts      # Capacitor configuration
└── ANDROID-BUILD.md         # Full documentation
```

## 🎯 Next Steps

1. Open in Android Studio: `npx cap open android`
2. Build a debug APK to test
3. Test on your Android device
4. Customize app icon and name
5. Build signed release APK/AAB
6. Publish to Play Store (optional)

---

**Need Help?** Check ANDROID-BUILD.md for detailed documentation!

