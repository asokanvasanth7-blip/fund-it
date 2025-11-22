import { Component, signal, HostListener, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { PwaUpdateService } from './services/pwa-update.service';
import { PwaInstallService } from './services/pwa-install.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLinkActive, RouterLink, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('fund-it');
  user$;
  sidebarCollapsed = false;
  isMobile = false;
  profileDropdownOpen = false;
  showInstallPrompt = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private pwaUpdateService: PwaUpdateService,
    private pwaInstallService: PwaInstallService
  ) {
    this.user$ = this.authService.user$;
    // Check if mobile view on init
    this.checkMobileView();

    // Close sidebar on navigation in mobile view
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.isMobile && !this.sidebarCollapsed) {
        this.sidebarCollapsed = true;
      }
    });
  }

  ngOnInit(): void {
    // Initialize PWA update service
    this.pwaUpdateService.init();

    // Check if we should show install prompt
    this.pwaInstallService.canInstall$.subscribe(canInstall => {
      if (canInstall && this.pwaInstallService.shouldShowInstallPrompt()) {
        // Show install prompt after a delay (3 seconds)
        setTimeout(() => {
          this.showInstallPrompt = true;
        }, 3000);
      }
    });
  }

  checkMobileView() {
    if (typeof window !== 'undefined') {
      this.isMobile = window.innerWidth < 768;
      this.sidebarCollapsed = this.isMobile; // Start collapsed on mobile
    }
  }


  @HostListener('window:resize')
  onResize() {
    const wasMobile = this.isMobile;
    this.isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    // If switching between mobile and desktop, reset sidebar state
    if (wasMobile !== this.isMobile) {
      this.sidebarCollapsed = this.isMobile;
    }
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  getUserDisplayName(): string {
    return this.authService.getUserDisplayName();
  }
  getUserEmail(): string | null {
    return this.authService.getUserEmail();
  }

  getUserPhotoURL(): string | null {
    return this.authService.getUserPhotoURL();
  }

  toggleProfileDropdown(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.profileDropdownOpen = !this.profileDropdownOpen;
  }

  closeProfileDropdown() {
    this.profileDropdownOpen = false;
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.closeProfileDropdown();
  }


  async logout() {
    try {
      this.closeProfileDropdown();
      await this.authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // PWA Install Methods
  async installPwa() {
    const installed = await this.pwaInstallService.promptInstall();
    if (installed) {
      this.showInstallPrompt = false;
    }
  }

  dismissInstallPrompt() {
    this.showInstallPrompt = false;
    localStorage.setItem('pwa-install-prompt-shown', Date.now().toString());
  }

  get isStandalone(): boolean {
    return this.pwaInstallService.isStandalone();
  }
}
