import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const forceLogout = sessionStorage.getItem('force-logout') === '1';
  if (forceLogout) {
    sessionStorage.removeItem('force-logout');
    return true;
  }

  const rawUser = localStorage.getItem('user');
  const accessToken = localStorage.getItem('access_token');

  if (!rawUser || !accessToken) {
    return true;
  }

  try {
    const user = JSON.parse(rawUser);

    if (user?.user || user?.email) {
      return router.createUrlTree(['/dashboard']);
    }

    return true;
  } catch {
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    return true;
  }
};