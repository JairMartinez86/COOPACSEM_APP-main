import {
  AfterViewInit,
  Component,
  HostListener,
  Inject,
  OnInit,
  PLATFORM_ID,
  inject
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { Navbar } from './navbar/navbar';
import { Sidebar } from './sidebar/sidebar';
import { AppStateService } from '../../core/services/app-state.service';
import { RouteFilterContext } from '../../core/services/route-filter-context';

@Component({
  standalone: true,
  selector: 'app-main-layout',
  imports: [
    RouterOutlet,
    Navbar,
    Sidebar
  ],
  templateUrl: './main-layout.html',
})
export class MainLayout implements OnInit, AfterViewInit {
  public appState = inject(AppStateService);

  isMobile = false;
  sidebarOpen = true;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private routeFilterContext: RouteFilterContext
  ) {}

  ngOnInit(): void {
    this.routeFilterContext.init();
  }

  ngAfterViewInit(): void {
    this.updateViewportMode();
    this.applyBodyClass();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const previousIsMobile = this.isMobile;

    this.updateViewportMode();

    if (previousIsMobile !== this.isMobile) {
      this.sidebarOpen = false;
      this.applyBodyClass();
    }
  }

  onToggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    this.applyBodyClass();
  }

  onCloseSidebar(): void {
    this.sidebarOpen = false;
    this.applyBodyClass();
  }

  private updateViewportMode(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.isMobile = window.innerWidth <= 991.98;
  }

  private applyBodyClass(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    document.body.classList.remove('sidebar-open', 'sidebar-hidden');

    if (this.isMobile) {
      if (this.sidebarOpen) {
        document.body.classList.add('sidebar-open');
      }
    } else {
      if (!this.sidebarOpen) {
        document.body.classList.add('sidebar-hidden');
      }
    }
  }
}