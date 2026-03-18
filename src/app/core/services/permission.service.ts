import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

export interface RolePermissionDto {
  view: boolean | null;
  create: boolean | null;
  edit: boolean | null;
  delete: boolean | null;
}

interface SessionStore {
  user?: string;
  fullname?: string;
  gender?: string;
  email?: string;
  role?: string;
  maxSessions?: number;
  theme?: string;
  permissionsByRoute?: Record<string, RolePermissionDto>;
}

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  private readonly storageKey = 'user';

  has(action: PermissionAction, route?: string): boolean {
    const permissions = this.getPermissionsMap();
    const normalizedRoute = this.normalizeRoute(route || '/');
    const current = permissions[normalizedRoute];

    return current?.[action] === true;
  }

  canView(route?: string): boolean {
    return this.has('view', route);
  }

  canCreate(route?: string): boolean {
    return this.has('create', route);
  }

  canEdit(route?: string): boolean {
    return this.has('edit', route);
  }

  canDelete(route?: string): boolean {
    return this.has('delete', route);
  }

  private getPermissionsMap(): Record<string, RolePermissionDto> {
    if (!isPlatformBrowser(this.platformId)) {
      return {};
    }

    const raw = localStorage.getItem(this.storageKey);

    if (!raw) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw) as SessionStore;
      const map = parsed?.permissionsByRoute ?? {};
      const result: Record<string, RolePermissionDto> = {};

      for (const key of Object.keys(map)) {
        result[this.normalizeRoute(key)] = {
          view: map[key]?.view ?? false,
          create: map[key]?.create ?? false,
          edit: map[key]?.edit ?? false,
          delete: map[key]?.delete ?? false
        };
      }

      return result;
    } catch {
      return {};
    }
  }

  private normalizeRoute(route: string): string {
    return ('/' + (route || '').trim().replace(/^\/+/, ''))
      .replace(/\/+$/, '')
      .toLowerCase();
  }
}