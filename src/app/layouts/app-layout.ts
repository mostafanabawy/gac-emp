import { Component, effect } from '@angular/core';
import { Store } from '@ngrx/store';
import { AppService } from '../service/app.service';
import { Router, NavigationEnd, Event as RouterEvent } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { LocalizationService } from '../service/localization.service';
import { LoaderService } from '../service/loader.service';
import { filter, Observable } from 'rxjs';
import { MenuLinksService } from '../service/menu-links.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
    selector: 'app-root',
    templateUrl: './app-layout.html',
})
export class AppLayout {
    store: any;
    showTopButton = false;
    navEndSignal = toSignal(
        this.router.events.pipe(filter(e => e instanceof NavigationEnd)),
        { initialValue: null }
    );
    constructor(public translate: TranslateService, public storeData: Store<any>, private service: AppService, private router: Router, private localizationService: LocalizationService,
        public menuLinksService: MenuLinksService,
        private loaderService: LoaderService
    ) {
        this.initStore();
        effect(() => {
            const nav = this.navEndSignal();     // runs whenever URL changes 
            const menu = this.menuLinksService.menuResponse(); // runs whenever signal changes

            if (!nav || !menu || menu.length === 0) return; // wait for BOTH

            const home = this.findHomeItem(menu);
            const url = home?.ItemURL;

            if (this.router.url === '/' || this.router.url === '') {
                this.router.navigateByUrl(url, {
                    state: {
                        pageName: this.store.locale === 'en' ? home.TitleEn : home.TitleAr,
                        menuData: home
                    }
                });
            }
        });
    }
    headerClass = '';
    isShowMainLoader$!: Observable<boolean>;
    ngOnInit() {
        this.initAnimation();
        this.isShowMainLoader$ = this.loaderService.loaderState;
        this.loaderService.show();
        let currRouter = this.router.url;


        this.menuLinksService.GetMenu().subscribe((config: any) => {
            const home = this.findHomeItem(config?.MenuUI);
            const url = home?.ItemURL;
            this.menuLinksService.menuResponse.set(config?.MenuUI)
            if (!this.router.url.includes('/request-result') && !this.router.url.includes('/RequestData') && !this.router.url.includes('/Services')) {
                this.loaderService.hide();
            }
            if (currRouter === '/' || currRouter === '') {
                this.router.navigateByUrl(url, {
                    state: { pageName: this.store.locale === 'en' ? home.TitleEn : home.TitleAr, menuData: home }
                });  // ✅ dynamic redirect here
            }



        });
        window.addEventListener('scroll', () => {
            if (document.body.scrollTop > 50 || document.documentElement.scrollTop > 50) {
                this.showTopButton = true;
            } else {
                this.showTopButton = false;
            }
        });
        this.localizationService.EServicesLocalizationSelectAll().subscribe((data: any) => {
            localStorage.setItem('localization', JSON.stringify(data.items));
        });
    }

    findHomeItem(tree: any[]): any | null {
        for (const item of tree) {

            const hasValidUrl =
                item.ItemURL &&
                item.ItemURL.trim() !== "" &&
                item.ItemURL !== "/link";

            if (item.HomeItem === true && hasValidUrl) {
                return item;
            }

            // Search children
            if (item.children?.length) {
                const found = this.findHomeItem(item.children);
                if (found) return found;
            }
        }

        return null;
    }

    ngOnDestroy() {
        window.removeEventListener('scroll', () => { });
    }

    initAnimation() {
        this.service.changeAnimation();
        this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.service.changeAnimation();
            }

        });

        const ele: any = document.querySelector('.animation');
        ele.addEventListener('animationend', () => {
            this.service.changeAnimation('remove');
        });
    }

    toggleLoader() {
        if (this.router.url != '/services/application' && this.router.url != '/applications/applicationdetail') {
            this.storeData.dispatch({ type: 'toggleMainLoader', payload: true });
            setTimeout(() => {
                this.storeData.dispatch({ type: 'toggleMainLoader', payload: false });
            }, 500);
        }
    }

    async initStore() {
        this.storeData
            .select((d) => d.index)
            .subscribe((d) => {
                this.store = d;
            });
    }

    goToTop() {
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
    }
    goToMainContent(event: Event) {
        event.preventDefault();
        const element = document.getElementById('main-content');
        if (element) {
            const rect = element.getBoundingClientRect();

            // New condition: skip scrolling if any part is within viewport
            const isVisible =
                rect.bottom > 0 &&
                rect.top < (window.innerHeight || document.documentElement.clientHeight);

            if (!isVisible) {
                element.scrollIntoView({ behavior: 'smooth' });
            }

            element.focus({ preventScroll: true });
        }
    }

}
