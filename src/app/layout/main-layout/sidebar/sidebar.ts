import {
  Component,
  EventEmitter,
  Inject,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
  inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { filter, Subscription } from 'rxjs';

import { TableFilterService } from '../../../core/services/table-filter.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { SIDEBAR_DATA, SidebarItem, SidebarPermissions } from './sidebar.config';

@Component({
  standalone: true,
  selector: 'app-sidebar',
  imports: [CommonModule, TranslateModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar implements OnInit, OnDestroy {
  private filterSvc = inject(TableFilterService);
  private auth = inject(AuthService);
  private router = inject(Router);

  private subs = new Subscription();

  public currentValue = '';
  public user: any = null;
  public menuItems: SidebarItem[] = [];

  @Output() requestToggle = new EventEmitter<void>();
  @Output() requestClose = new EventEmitter<void>();

  private permissionsMap: Record<string, SidebarPermissions> = {};

  constructor(@Inject(PLATFORM_ID) private platformId: object) { }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const raw = localStorage.getItem('user');


      this.subs.add(
        this.router.events
          .pipe(filter(event => event instanceof NavigationEnd))
          .subscribe(() => {
            this.requestClose.emit();
          })
      );



      if (raw) {
        try {
          this.user = JSON.parse(raw);
          this.permissionsMap = this.normalizePermissionsMap(
            this.user?.permissionsByRoute ?? {}
          );
        } catch {
          this.user = null;
          this.permissionsMap = {};
          localStorage.removeItem('user');
        }
      } else {
        this.user = null;
        this.permissionsMap = {};
      }
    }

    this.subs.add(
      this.filterSvc.activeQuery$().subscribe(v => {
        this.currentValue = v;
      })
    );

    this.menuItems = this.prepareItems(
      this.filterMenuByPermissions(SIDEBAR_DATA)
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private safePreventDefault(event?: Event): void {
    if (!event) return;

    try {
      event.preventDefault();
    } catch {
      // hydration replay
    }
  }

  toggleMenu(event?: Event): void {
    event?.stopPropagation();
    this.requestToggle.emit();
  }

  closeMenu(event?: Event): void {
    event?.stopPropagation();
    this.requestClose.emit();
  }

  onNavigate(): void {
    this.requestClose.emit();
  }

  onInput(ev: Event): void {
    const value = (ev.target as HTMLInputElement).value;
    this.currentValue = value;
    this.filterSvc.setQueryForActiveRoute(value);
  }

  logout(event?: Event): void {
    this.safePreventDefault(event);
    event?.stopPropagation();
    this.requestClose.emit();
    this.auth.logout();
  }

  toggleItem(item: SidebarItem, event: Event): void {
    if (item.type !== 'submenu') {
      return;
    }

    this.safePreventDefault(event);
    event.stopPropagation();

    item.open = !item.open;

    if (!item.open && item.children?.length) {
      this.closeChildren(item.children);
    }
  }

  trackById(index: number, item: SidebarItem): string {
    return item.id || `idx-${index}`;
  }

  private filterMenuByPermissions(items: SidebarItem[]): SidebarItem[] {
    const result: SidebarItem[] = [];
    let pendingHeading: SidebarItem | null = null;

    for (const item of items) {
      if (item.type === 'heading') {
        pendingHeading = { ...item };
        continue;
      }

      const filteredItem = this.filterSingleItem(item);
      if (!filteredItem) {
        continue;
      }

      if (pendingHeading) {
        result.push(pendingHeading);
        pendingHeading = null;
      }

      result.push(filteredItem);
    }

    return result;
  }

  private filterSingleItem(item: SidebarItem): SidebarItem | null {
    if (item.type === 'link') {
      return this.canViewItem(item) ? { ...item } : null;
    }

    if (item.type === 'submenu') {
      const children = this.filterMenuByPermissions(item.children ?? []);
      const hasVisibleChildren = children.length > 0;
      const canViewSelf = this.canViewItem(item);

      if (!canViewSelf && !hasVisibleChildren) {
        return null;
      }

      return {
        ...item,
        children,
        open: item.open ?? false
      };
    }

    return { ...item };
  }

  private canViewItem(item: SidebarItem): boolean {
    if (!item.router) {
      return false;
    }

    const route = this.normalizeRoute(item.router);
    const permission = this.permissionsMap[route];

    return permission?.view === true;
  }

  private normalizePermissionsMap(
    map: Record<string, SidebarPermissions>
  ): Record<string, SidebarPermissions> {
    const normalized: Record<string, SidebarPermissions> = {};

    for (const key of Object.keys(map ?? {})) {
      normalized[this.normalizeRoute(key)] = map[key];
    }

    return normalized;
  }

  private normalizeRoute(route: string): string {
    return ('/' + route.trim().replace(/^\/+/, ''))
      .replace(/\/+$/, '')
      .toLowerCase();
  }

  private closeChildren(items: SidebarItem[]): void {
    for (const child of items) {
      child.open = false;

      if (child.children?.length) {
        this.closeChildren(child.children);
      }
    }
  }

  private prepareItems(items: SidebarItem[], parentKey = 'menu'): SidebarItem[] {
    return items.map((item, index) => {
      const rawKey = item.id || item.router || item.titleKey || `item-${index}`;
      const safeKey = this.toSafeId(rawKey);
      const uniqueId = `${parentKey}-${safeKey}-${index}`;

      return {
        ...item,
        id: uniqueId,
        open: item.open ?? false,
        children: item.children?.length
          ? this.prepareItems(item.children, uniqueId)
          : []
      };
    });
  }

  private toSafeId(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/^\/+/, '')
      .replace(/\//g, '-')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-_]/g, '');
  }
}