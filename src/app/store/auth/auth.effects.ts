import { Inject, Injectable } from "@angular/core";
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { AuthService } from "../../service/auth.service";
import { Router } from "@angular/router";
import * as AuthActions from './auth.actions';
import { catchError, map, mergeMap, of, tap } from "rxjs";
import Swal from 'sweetalert2';
import { LocalizationService } from "src/app/service/localization.service";

@Injectable()
export class AuthEffects {
    translations: any;
    constructor(private actions$: Actions, private authService: AuthService, @Inject(Router) private router: Router,
        private localizationService: LocalizationService) {

    }
    login$ = createEffect(() =>
        this.actions$.pipe(
            ofType(AuthActions.login),
            mergeMap(({ Username, Password }) => this.authService.login({ Username, Password }).pipe(
                map((response) => {
                    sessionStorage.setItem('token', response.Token);
                    sessionStorage.setItem('user', JSON.stringify(response));
                    console.log(response);
                    const toast: any = Swal.mixin({
                        toast: true,
                        position: 'top',
                        showConfirmButton: false,
                        timer: 3000,
                        customClass: { container: 'toast' },
                    });
                    this.translations = this.localizationService.getTranslations();
                    toast.fire({
                        icon: "success",
                        title: this.translations?.loginSuccessful.label,
                        padding: '10px 20px',
                    });
                    this.router.navigate(['/']);
                    return AuthActions.loginSuccess({ token: response.Token, user: response });
                }),
                catchError((error) => {
                    return of(AuthActions.loginFailure({ error }));
                })
            )
            ))
    );


    logout$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(AuthActions.logout),
                tap(() => {
                    sessionStorage.removeItem('token');
                    sessionStorage.removeItem('user');
                    let newState = history.state;
                    newState = null;
                    history.replaceState(newState, '');

                    // Important: tap is better for side effects like routing
                    this.router.navigate(['/login']);
                })

            ),
        { dispatch: false } // ❗ No action is dispatched from this effect
    );

    ssoLogin$ = createEffect(() =>
        this.actions$.pipe(
            // Listen for the new ssoLogin action
            ofType(AuthActions.ssoLogin),
            mergeMap(({ token }) =>
                // Call the service method for API 2
                this.authService.ssoLogin(token).pipe(
                    map((response: any) => {
                        // 1. Set the token and user data in storage
                        sessionStorage.setItem('token', response.Token); // Assuming API 2 returns the final 'token'
                        sessionStorage.setItem('user', JSON.stringify(response));

                        console.log(response);

                        // 2. Display success toast
                        const toast: any = Swal.mixin({
                            /* ... your Swal config ... */
                            toast: true, position: 'top', showConfirmButton: false, timer: 3000, customClass: { container: 'toast' }
                        });
                        this.translations = this.localizationService.getTranslations();
                        toast.fire({
                            icon: "success",
                            title: this.translations?.loginSuccessful.label, // Updated message
                            padding: '10px 20px',
                        });

                        // 3. Navigate away (to home/dashboard)
                        this.router.navigate(['/']);

                        // 4. Dispatch success action
                        return AuthActions.loginSuccess({ token: response.Token, user: response });
                    }),
                    catchError((error) => {
                        // Handle API 2 failure (e.g., token invalid or expired)
                        // Optionally show an error toast here
                        console.error('SSO Login Failed:', error);
                        // Navigate back to the login page on failure
                        this.router.navigate(['/login']);
                        return of(AuthActions.loginFailure({ error }));
                    })
                )
            )
        )
    );

    loginFailure$ = createEffect(() =>
        this.actions$.pipe(
            ofType(AuthActions.loginFailure),
            tap(() => {
                this.translations = this.localizationService.getTranslations();
                Swal.fire({
                    icon: "error",
                    title: this.translations.loginFail.label,
                    text: this.translations.loginFail.validation,
                    padding: '10px 20px',
                });
            })
        ),
        { dispatch: false } // ❗ No action is dispatched from this effect
    );
}