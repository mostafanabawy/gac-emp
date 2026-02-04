import { Component, effect, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { slideDownUp } from '../shared/animations';
import { ServiceApiPayload } from 'src/types/newApplication.types';
import { AppState } from 'src/types/auth.types';
import { NewApplicationService } from '../service/new-application.service';
import { MenuLinksService } from '../service/menu-links.service';
import * as AuthActions from '../store/auth/auth.actions';
import { LocalizationService } from '../service/localization.service';

@Component({
    selector: 'sidebar',
    templateUrl: './sidebar.html',
    animations: [slideDownUp],
})
export class SidebarComponent {
    active = false;
    store!: AppState;
    activeDropdown: string[] = ['dashboard'];
    parentDropdown: string = '';
    activeService: any;
    menuLinks = signal<any>([])
    translations = signal<any>(null);
    constructor(
        public translate: TranslateService,
        public storeData: Store<AppState>,
        public router: Router,
        private newApplicationService: NewApplicationService,
        private menuLinksService: MenuLinksService,
        private localizationservice: LocalizationService
    ) {
        this.translations.set(this.localizationservice.getTranslations());
        this.initStore();
        effect(() => {
            this.menuLinks.set(this.menuLinksService.menuResponse())
        }, { allowSignalWrites: true })
    }
    async initStore() {
        this.storeData
            .select(({ index, auth }) => ({ index, auth }))
            .subscribe((d) => {
                this.store = d;
            });
    }

    ngOnInit() {
        this.setActiveDropdown();
        this.getData();
    }

    setActiveDropdown() {
        const selector = document.querySelector('.sidebar ul a[routerLink="' + window.location.pathname + '"]');
        if (selector) {
            selector.classList.add('active');
            const ul: any = selector.closest('ul.sub-menu');
            if (ul) {
                let ele: any = ul.closest('li.menu').querySelectorAll('.nav-link') || [];
                if (ele.length) {
                    ele = ele[0];
                    setTimeout(() => {
                        ele.click();
                    });
                }
            }
        }
    }

    toggleMobileMenu() {
        if (window.innerWidth < 1024) {
            this.storeData.dispatch({ type: 'toggleSidebar' });
        }
    }

    toggleAccordion(name: string, parent?: string) {
        if (this.activeDropdown.includes(name)) {
            this.activeDropdown = this.activeDropdown.filter((d) => d !== name);
        } else {
            this.activeDropdown.push(name);
        }
    }

    navigateToDetails(listItem: any) {
        let roleID = JSON.parse(sessionStorage.getItem('user')!).FkRoleID
        const payload: ServiceApiPayload = {
            FKServiceID: listItem.ServiceID,
            FKProcessID: 40,
            FKCurrentStatusID: null,
            FKRoleID: roleID
        };
        this.newApplicationService.requestData.set(null);
        this.newApplicationService.serviceApiPayload.set(payload)
        this.activeService = listItem.ServiceID
        this.router.navigate([listItem.ItemURL.split('?')[0]], {
            state: { data: payload, pageName: this.store.index.locale === 'en' ? listItem.TitleEn : listItem.TitleAr },
            queryParams: { ServiceID: listItem.ServiceID }
        });
    }
    userName: string = '';
    userRole: string = '';
    getData() {
        const isArabic = this.translate.currentLang === 'ae';
        const name = isArabic ? this.store.auth.user?.Name : this.store.auth.user?.NameEn;
        if (name) {
            this.userName = name;
        }
    }
    logout() {
        this.storeData.dispatch(AuthActions.logout());
    }
}
