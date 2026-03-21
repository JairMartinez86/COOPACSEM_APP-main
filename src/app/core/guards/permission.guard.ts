import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

type RoutePermission = {
  view: boolean | null;
  create: boolean | null;
  edit: boolean | null;
  delete: boolean | null;
};

type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

function normalizeRoute(route: string): string {
  return ('/' + (route || '').trim().replace(/^\/+/, ''))
    .replace(/\/+$/, '')
    .toLowerCase();
}

export const permissionGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  const permissionKey = route.data?.['permission'] as string | undefined;
  const actionInput = route.data?.['action'] ?? 'view'; // puede ser array o string

  if (!permissionKey) return true;
  if (!isPlatformBrowser(platformId)) return true;

  const rawUser = localStorage.getItem('user');
  if (!rawUser) return router.createUrlTree(['/login']);

  try {
    const user = JSON.parse(rawUser);
    const permissionsByRoute = user?.permissionsByRoute ?? {};
    const normalizedKey = normalizeRoute(permissionKey);
    const permission = permissionsByRoute[normalizedKey];

    // ✅ ahora soporta array de acciones
    const actions = Array.isArray(actionInput) ? actionInput : [actionInput];
    const allowed = actions.some((action: any) => {
      const normalizedAction = action === 'new' ? 'create' : action;
      return permission?.[normalizedAction] === true;
    });

    return allowed ? true : router.createUrlTree(['/unauthorized']);
  } catch {
    localStorage.removeItem('user');
    return router.createUrlTree(['/login']);
  }
};