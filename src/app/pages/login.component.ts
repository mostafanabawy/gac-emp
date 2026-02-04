import { Component, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AppService } from '../service/app.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { toggleAnimation } from '../shared/animations';
import { AppState } from 'src/types/auth.types';
import { FormBuilder, FormGroup } from '@angular/forms';
import * as AuthActions from "../store/auth/auth.actions"
import { AuthService } from '../service/auth.service';
import { LocalizationService } from '../service/localization.service';
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  animations: [toggleAnimation]
})
export class LoginComponent {
  store!: AppState;
  currYear: number = new Date().getFullYear();
  loginForm!: FormGroup;
  externalURL!: string;
  translations = signal<any>(null);
  constructor(
    public translate: TranslateService,
    public storeData: Store<AppState>,
    public router: Router,
    private authService: AuthService,
    private appSetting: AppService,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private localizationService: LocalizationService
  ) {
    this.translations.set(this.localizationService.getTranslations())
    this.initStore();
    this.initForm();
  }
  ngOnInit() {
    this.authService.ssoInfo().subscribe((res: any) => {
      const redirectUrl = res.AzureSSOURL;
      this.externalURL = redirectUrl;
    })
    this.checkForToken();
  }
  checkForToken() {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];

      console.log('NGONINIT: Checking for token. Found:', !!token);
      if (token) {
        // 1. Dispatch the action
        console.log('NGONINIT: Token found. Dispatching ssoLogin action.');
        this.storeData.dispatch(AuthActions.ssoLogin({ token }));

        // 2. 🛑 CRITICAL FIX: Wrap the router cleanup in setTimeout(0).
        // This ensures the action dispatch is fully processed before we change the URL,
        // which prevents the component's ngOnDestroy/ngOnInit from racing the cleanup.
        setTimeout(() => {
          console.log('NGONINIT: Clearing token from URL.');
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { token: null },
            queryParamsHandling: 'merge',
            replaceUrl: true
          }).then(success => {
            console.log('NGONINIT: URL cleanup complete:', success);
          });
        }, 0);

      }
    });
  }
  async initStore() {
    this.storeData
      .select((d) => ({
        index: d.index,
        auth: d.auth
      }))
      .subscribe((d) => {
        this.store = d;
      });
  }
  initForm() {
    this.loginForm = this.fb.group({
      Username: [''],
      Password: ['']
    });
  }

  changeLanguage(item: any) {
    this.translate.use(item.code);
    this.appSetting.toggleLanguage(item);
    if (this.store.index.locale?.toLowerCase() === 'ae') {
      this.storeData.dispatch({ type: 'toggleRTL', payload: 'rtl' });
    } else {
      this.storeData.dispatch({ type: 'toggleRTL', payload: 'ltr' });
    }
    window.location.reload();
  }
  onSubmit() {
    if (this.loginForm.valid) {
      console.log('Form Submitted!', this.loginForm.value);
      this.storeData.dispatch(AuthActions.login(this.loginForm.value));
    } else {
      // Handle form validation errors
      console.error('Form is invalid');
    }
  }

  loginWithMinistryAccount() {
    if (this.externalURL) {
      // Redirect the user to the external SSO link
      // This will leave your Angular app and go to the Azure/SSO provider.
      window.location.href = this.externalURL;
    }
  }
}
