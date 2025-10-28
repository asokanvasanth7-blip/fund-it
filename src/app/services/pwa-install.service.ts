import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PwaInstallService {
  private deferredPrompt: any = null;
  private installable$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.init();
  }

  /**
   * Initialize install prompt listeners
   */
  private init(): void {
    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e: any) => {
      console.log('PWA install prompt available');
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      this.deferredPrompt = e;
      // Update the installable state
      this.installable$.next(true);
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this.deferredPrompt = null;
      this.installable$.next(false);
      // Clear the install prompt shown flag
      localStorage.removeItem('pwa-install-prompt-shown');
    });

    // Check if app is already installed
    if (this.isStandalone()) {
      console.log('App is running in standalone mode');
      this.installable$.next(false);
    }
  }

  /**
   * Check if the app is installable
   */
  get canInstall$(): Observable<boolean> {
    return this.installable$.asObservable();
  }

  /**
   * Check if the app can be installed
   */
  canInstall(): boolean {
    return this.installable$.value && this.deferredPrompt !== null;
  }

  /**
   * Show the install prompt
   */
  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.log('No install prompt available');
      return false;
    }

    try {
      // Show the install prompt
      this.deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const choiceResult = await this.deferredPrompt.userChoice;

      console.log(`User response to install prompt: ${choiceResult.outcome}`);

      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        this.deferredPrompt = null;
        this.installable$.next(false);
        return true;
      } else {
        console.log('User dismissed the install prompt');
        // Mark that we've shown the prompt
        localStorage.setItem('pwa-install-prompt-shown', 'true');
        return false;
      }
    } catch (error) {
      console.error('Error showing install prompt:', error);
      return false;
    }
  }

  /**
   * Check if app is running in standalone mode (already installed)
   */
  isStandalone(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  /**
   * Check if we should show the install prompt
   * (not shown before or shown more than 7 days ago)
   */
  shouldShowInstallPrompt(): boolean {
    const lastShown = localStorage.getItem('pwa-install-prompt-shown');
    if (!lastShown) {
      return true;
    }

    // Show again after 7 days
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const lastShownDate = parseInt(lastShown, 10);
    return Date.now() - lastShownDate > sevenDays;
  }

  /**
   * Get installation instructions based on platform
   */
  getInstallInstructions(): string {
    const userAgent = navigator.userAgent.toLowerCase();

    if (this.isStandalone()) {
      return 'App is already installed!';
    }

    if (/iphone|ipad|ipod/.test(userAgent)) {
      return 'To install: Tap the Share button and select "Add to Home Screen"';
    }

    if (/android/.test(userAgent)) {
      return 'To install: Tap the menu button and select "Add to Home Screen" or "Install App"';
    }

    if (/chrome/.test(userAgent)) {
      return 'To install: Click the install icon in the address bar or use the browser menu';
    }

    if (/firefox/.test(userAgent)) {
      return 'To install: Click the home icon with a plus sign in the address bar';
    }

    return 'To install: Look for the install option in your browser menu';
  }

  /**
   * Check browser compatibility for PWA features
   */
  getBrowserCompatibility(): {
    serviceWorker: boolean;
    manifest: boolean;
    installPrompt: boolean;
  } {
    return {
      serviceWorker: 'serviceWorker' in navigator,
      manifest: 'manifest' in document.createElement('link'),
      installPrompt: this.deferredPrompt !== null
    };
  }
}

