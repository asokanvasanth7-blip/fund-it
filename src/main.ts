import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

// Initialize mobile-specific features
const initializeApp = async () => {
  // Check if running on native platform
  if (Capacitor.isNativePlatform()) {
    // Configure status bar
    try {
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#ffffff' });
    } catch (error) {
      console.log('Status bar not available');
    }

    // Hide splash screen after a delay
    try {
      await SplashScreen.hide();
    } catch (error) {
      console.log('Splash screen not available');
    }
  }
};

bootstrapApplication(App, appConfig)
  .then(() => initializeApp())
  .catch((err) => console.error(err));
