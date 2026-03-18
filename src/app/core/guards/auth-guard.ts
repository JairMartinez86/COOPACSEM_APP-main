import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../auth/services/auth.service';
import { TokenStorageService } from '../auth/services/token-storage.service';

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload?.exp;

    if (!exp) return true;

    const now = Math.floor(Date.now() / 1000);
    return exp <= now;
  } catch {
    return true;
  }
}

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const storage = inject(TokenStorageService);
  const router = inject(Router);

  const token = storage.getAccessToken();


  if (!token) {

    return router.createUrlTree(['/login']);
  }

  if (isTokenExpired(token)) {

    storage.clear();
    return router.createUrlTree(['/login']);
  }



  return auth.validateSession().pipe(
    map(() => {

      return true;
    }),
    catchError((err) => {

      storage.clear();
      return of(router.createUrlTree(['/login']));
    })
  );
};