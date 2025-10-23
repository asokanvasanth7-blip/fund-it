import { Component, signal, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLinkActive, RouterLink, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('fund-it');
  user$;
  sidebarCollapsed = false;
  isMobile = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.user$ = this.authService.user$;
    // Check if mobile view on init
    this.checkMobileView();

    // Close sidebar on navigation in mobile view
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.isMobile) {
        this.sidebarCollapsed = true;
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

  async logout() {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}
