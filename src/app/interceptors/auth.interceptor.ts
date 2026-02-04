import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
  HttpResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, filter, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../service/auth.service';
import { Store } from '@ngrx/store';
import { AppState } from 'src/types/auth.types';
import * as AuthActions from "../store/auth/auth.actions"
import { NewApplicationService } from '../service/new-application.service';
@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private router: Router, private auth: AuthService, private storeData: Store<AppState>,
    private newApplicationService: NewApplicationService
  ) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = sessionStorage.getItem('token');
    const excludedUrls = [
      'cr=',
      'cp=',
      'workflows'
    ];

    let cloned = req;
    // Check if the request URL includes any of the excluded URL strings.12
    if (token && !excludedUrls.some(url => req.url.includes(url))) {
      cloned = req.clone({
        setHeaders: {
          'x-sr-token': `${token}`
        }
      });
    }

    return next.handle(cloned).pipe(
      tap({
        next: (event: HttpEvent<any>) => {
          if (event instanceof HttpResponse) {
            const successStatusCode = event.status;
            // 💡 Your code to access the 2xx status code goes here
            console.log(`[AuthInterceptor] SUCCESS - URL: ${req.url}, Status: ${successStatusCode}`);
            if (successStatusCode === 202) {

              let redirectUrl = event.body.redirectUrl;
              let currentReqData = history.state.data
              localStorage.setItem('currentReqData', JSON.stringify(currentReqData));
              localStorage.setItem('pageName', history.state.pageName);

              window.location.replace(redirectUrl!);
            }
            if (successStatusCode === 201) {
              let redirectUrl = event.body.redirectUrl;
              this.newApplicationService.isPrinter = true;
              window.open(redirectUrl!, '_blank');
            }
          }
        },
        error: (err: HttpErrorResponse) => {
          const errorStatusCode = err.status;
          console.error(`[AuthInterceptor] ERROR - URL: ${req.url}, Status: ${errorStatusCode}`);

          if (err.status === 401) {
            this.storeData.dispatch(AuthActions.logout());
          }
        }
      }),
      filter((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse) {
          return event.status !== 202;
        }
        // Allow all other events (HttpSent, HttpHeaders, etc.) to pass
        return true;
      }),

      // Ensure the error is thrown down the chain after the tap side effect
      catchError((err: HttpErrorResponse) => {
        return throwError(() => err);
      })
    );
  }
}
/* catchError((err: HttpErrorResponse) => {
  if (err.status === 401) {
    this.storeData.dispatch(AuthActions.logout());
  }
  return throwError(() => err);
}) */
