import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { Store } from '@ngrx/store';
import { isLoggedIn } from '../store/auth/auth.selectors';
import { map } from 'rxjs';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state) => {
  const store = inject(Store);
  const router = inject(Router);

  return store.select(isLoggedIn).pipe(
    map((loggedIn: any) => {
      console.log(loggedIn)
      
      if (!loggedIn) {
        router.navigate(['/login']);
        return false;
      }

      // Get user from session storage
      const userStr = sessionStorage.getItem('user');
      if (!userStr) {
        router.navigate(['/login']);
        return false;
      }

      const user = JSON.parse(userStr);
      const userRoleId = user.FkRoleID;

      // Get allowed roles from route data
      const allowedRoles = route.data['roles'] as number[] | undefined;

      // Debug logging
      console.log('🔍 Role Guard Check:');
      console.log('  User Role ID:', userRoleId);
      console.log('  Allowed Roles:', allowedRoles);
      console.log('  Route Path:', state.url);
      console.log('  User:', user.Name, '/', user.NameEn);

      // If no roles specified, allow access
      if (!allowedRoles || allowedRoles.length === 0) {
        console.log('  ✅ No roles specified - Access granted');
        return true;
      }

      // Check if user role is in allowed roles
      if (allowedRoles.includes(userRoleId)) {
        console.log('  ✅ Role matched - Access granted');
        return true;
      }

      // Redirect to dashboard if not authorized
      console.log('  ❌ Role not matched - Redirecting to dashboard');
      router.navigate(['/dashboard']);
      return false;
    })
  );
};
