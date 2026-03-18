import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

type RoutePermission = {
  view: boolean | null;
  create: boolean | null;
  edit: boolean | null;
  delete: boolean | null;
};

function normalizeRoute(route: string): string {
  return ('/' + (route || '').trim().replace(/^\/+/, ''))
    .replace(/\/+$/, '')
    .toLowerCase();
}

export const permissionGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  const permissionKey = route.data?.['permission'] as string | undefined;

  if (!permissionKey) {
    return true;
  }

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const rawUser = localStorage.getItem('user');

  if (!rawUser) {
    return router.createUrlTree(['/login']);
  }

  try {
    const user = JSON.parse(rawUser);
    const permissionsByRoute = user?.permissionsByRoute ?? {};

    const normalizedKey = normalizeRoute(permissionKey);
    const permission: RoutePermission | undefined = permissionsByRoute[normalizedKey];

    if (permission?.view === true) {
      return true;
    }

    // NO redirigir a dashboard aquí; eso provoca loops.
    return false;
  } catch {
    localStorage.removeItem('user');
    return router.createUrlTree(['/login']);
  }
};