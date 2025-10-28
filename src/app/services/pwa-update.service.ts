import { Injectable, ApplicationRef } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, first, interval, concat } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PwaUpdateService {
  constructor(
    private swUpdate: SwUpdate,
    private appRef: ApplicationRef
  ) {}

  /**
   * Initialize PWA update checking
   */
  init(): void {
    if (!this.swUpdate.isEnabled) {
      console.log('Service Worker is not enabled');
      return;
    }

    // Check for updates periodically (every 6 hours)
    const appIsStable$ = this.appRef.isStable.pipe(first(isStable => isStable === true));
    const everySixHours$ = interval(6 * 60 * 60 * 1000); // 6 hours
    const everySixHoursOnceAppIsStable$ = concat(appIsStable$, everySixHours$);

    everySixHoursOnceAppIsStable$.subscribe(() => {
      this.checkForUpdates();
    });

    // Listen for version updates
    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(() => {
        this.promptUserToUpdate();
      });

    // Listen for unrecoverable state
    this.swUpdate.unrecoverable.subscribe(event => {
      console.error('Unrecoverable state:', event.reason);
      this.handleUnrecoverableState();
    });
  }

  /**
   * Check for available updates
   */
  async checkForUpdates(): Promise<void> {
    if (this.swUpdate.isEnabled) {
      try {
        const updateAvailable = await this.swUpdate.checkForUpdate();
        if (updateAvailable) {
          console.log('Update available');
        } else {
          console.log('Already on latest version');
        }
      } catch (error) {
        console.error('Failed to check for updates:', error);
      }
    }
  }

  /**
   * Prompt user to update the app
   */
  private promptUserToUpdate(): void {
    const updateMessage = 'A new version of FundIt is available. Would you like to update now?';

    if (confirm(updateMessage)) {
      this.activateUpdate();
    } else {
      console.log('User declined the update');
      // Show a persistent notification or badge that update is available
      this.showUpdateBadge();
    }
  }

  /**
   * Activate the pending update
   */
  async activateUpdate(): Promise<void> {
    try {
      await this.swUpdate.activateUpdate();
      console.log('Update activated, reloading...');
      document.location.reload();
    } catch (error) {
      console.error('Failed to activate update:', error);
    }
  }

  /**
   * Handle unrecoverable state
   */
  private handleUnrecoverableState(): void {
    const message = 'The app encountered an error and needs to reload. Click OK to continue.';
    if (confirm(message)) {
      document.location.reload();
    }
  }

  /**
   * Show update badge (implement based on your UI)
   */
  private showUpdateBadge(): void {
    // Store update availability in localStorage
    localStorage.setItem('pwa-update-available', 'true');
    // You can emit an event or use a service to show a badge in your UI
    console.log('Update badge should be shown');
  }

  /**
   * Clear update badge
   */
  clearUpdateBadge(): void {
    localStorage.removeItem('pwa-update-available');
  }

  /**
   * Check if update is available
   */
  isUpdateAvailable(): boolean {
    return localStorage.getItem('pwa-update-available') === 'true';
  }
}

