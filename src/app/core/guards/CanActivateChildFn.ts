import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

export const authChildGuard: CanActivateChildFn = () => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const forceLogout = sessionStorage.getItem('force-logout') === '1';

  if (forceLogout) {
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('permissions');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('force-logout');
    return router.createUrlTree(['/login']);
  }

  const rawUser = localStorage.getItem('user');
  const accessToken = localStorage.getItem('access_token');

  if (!rawUser || !accessToken) {
    return router.createUrlTree(['/login']);
  }

  try {
    const user = JSON.parse(rawUser);

    if (user?.user || user?.email) {
      return true;
    }

    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    return router.createUrlTree(['/login']);
  } catch {
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    return router.createUrlTree(['/login']);
  }
};