import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectToken } from '../store/auth/auth.selectors';
import { map } from 'rxjs';

export const guestGuard: CanActivateFn = (route, state) => {
  const store = inject(Store);
  const router = inject(Router);

  return store.select(selectToken).pipe(
    map((token: any) => {
      if (token) {
        router.navigate(['/']); // redirect if already logged in 
        return false;
      }
      return true; // allow guest
    })
  );
};
