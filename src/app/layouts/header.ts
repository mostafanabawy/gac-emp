import { Component, ElementRef, HostListener, QueryList, Renderer2, ViewChildren, Directive, ViewChild, signal, effect, computed } from '@angular/core';
import { toggleAnimation } from 'src/app/shared/animations';
import { Store } from '@ngrx/store';
import { Router, NavigationEnd } from '@angular/router';
import { AppService } from '../service/app.service';
import { DomSanitizer } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { FocusableOption, FocusKeyManager } from '@angular/cdk/a11y';
import { FocusableItemDirective } from '../customDirective/focusable-item.directive';
import * as AuthActions from '../store/auth/auth.actions';
import { ServiceApiPayload } from 'src/types/newApplication.types';
import { NewApplicationService } from '../service/new-application.service';
import { MenuLinksService } from '../service/menu-links.service';
import { AppState, indexState } from 'src/types/auth.types';
import { GetMenuApiResponse, MenuItem } from 'src/types/menu.types';
import { ProfileService } from '../service/profile.service';
import { LocalizationService } from '../service/localization.service';
import { filter } from 'rxjs';

@Component({
    selector: 'header',
    templateUrl: './header.html',
    animations: [toggleAnimation],
})
export class HeaderComponent {
    store!: AppState;
    notifications = signal<any[]>([]);
    isArabic = this.translate.currentLang === 'ae';
    messages = [
        {
            id: 1,
            image: this.sanitizer.bypassSecurityTrustHtml(
                `<span class="grid place-content-center w-9 h-9 rounded-full bg-success-light dark:bg-success text-success dark:text-success-light"><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></span>`,
            ),
            title: 'Congratulations!',
            message: 'Your OS has been updated.',
            time: '1hr',
        },
        {
            id: 2,
            image: this.sanitizer.bypassSecurityTrustHtml(
                `<span class="grid place-content-center w-9 h-9 rounded-full bg-info-light dark:bg-info text-info dark:text-info-light"><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></span>`,
            ),
            title: 'Did you know?',
            message: 'You can switch between artboards.',
            time: '2hr',
        },
        {
            id: 3,
            image: this.sanitizer.bypassSecurityTrustHtml(
                `<span class="grid place-content-center w-9 h-9 rounded-full bg-danger-light dark:bg-danger text-danger dark:text-danger-light"> <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>`,
            ),
            title: 'Something went wrong!',
            message: 'Send Reposrt',
            time: '2days',
        },
        {
            id: 4,
            image: this.sanitizer.bypassSecurityTrustHtml(
                `<span class="grid place-content-center w-9 h-9 rounded-full bg-warning-light dark:bg-warning text-warning dark:text-warning-light"><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">    <circle cx="12" cy="12" r="10"></circle>    <line x1="12" y1="8" x2="12" y2="12"></line>    <line x1="12" y1="16" x2="12.01" y2="16"></line></svg></span>`,
            ),
            title: 'Warning',
            message: 'Your password strength is low.',
            time: '5days',
        },
    ];
    user: any = {}
    translations = signal<any>({});
    menuLinks = signal<any>({})
    constructor(
        public translate: TranslateService,
        public storeData: Store<AppState>,
        public router: Router,
        private appSetting: AppService,
        private sanitizer: DomSanitizer,
        private renderer: Renderer2,
        private newApplicationService: NewApplicationService,
        private menuLinksService: MenuLinksService,
        private profileService: ProfileService,
        private localizationService: LocalizationService
    ) {
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
    getNextLanguage() {
        const currentLang = this.translate.currentLang;
        const langs = this.store.index.languageList;
        const currentIndex = langs.findIndex((lang: any) => lang.code === currentLang);
        const nextIndex = (currentIndex + 1) % langs.length;
        return langs[nextIndex];
    }
    ngOnInit() {
        /* this.menuLinksService.GetMenu().subscribe((res: GetMenuApiResponse) => {
            console.log(res);
            this.menuLinksService.menuResponse.set(res.MenuUI)
            this.menuLinks.set(res.MenuUI)
        }) */
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe(() => {
            this.searchTerm.set(''); // Reset your signal/variable12
        });
        this.translations.set(this.localizationService.getTranslations());
        this.profileService.getNotifications().subscribe((res: any) => {
            this.profileService.notifications.set(res);
            this.notifications.set(res);
        });

        this.setActiveDropdown();
        this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.setActiveDropdown();
            }
        });

        const user = JSON.parse(sessionStorage.getItem('user')!);
        this.user = user;

    }
    isServicesMenuOpen = signal<boolean>(false);

    @ViewChildren(FocusableItemDirective)
    menuItems!: QueryList<FocusableItemDirective>;

    @ViewChild('menuButton', { static: false })
    menuButtonRef!: ElementRef<HTMLElement>;

    @ViewChild('servicesMenu') servicesMenuRef!: ElementRef<HTMLElement>;

    keyManager!: FocusKeyManager<FocusableItemDirective>;

    globalClickListener: (() => void) | null = null;

    ngAfterViewInit(): void {
        this.keyManager = new FocusKeyManager(this.menuItems).withWrap();
    }

    ngOnDestroy(): void {
        if (this.globalClickListener) {
            this.globalClickListener();
            this.globalClickListener = null;
        }
    }

    listDataToBeRendered = signal<MenuItem[] | []>([]);
    prepareListScreen(listData: MenuItem[]) {
        this.listDataToBeRendered.set(listData);
    }
    showServicesMenu(event: MouseEvent, menuRef: HTMLElement, listData: MenuItem[]): void {
        this.prepareListScreen(listData);

        event.stopPropagation();
        if (this.isServicesMenuOpen()) {
            this.closeMenu(menuRef);
        } else {
            this.openMenu(menuRef);

            setTimeout(() => {
                this.keyManager.setFirstItemActive();
            });

            this.globalClickListener = this.renderer.listen('document', 'click', (e: Event) => {
                const target = e.target as HTMLElement;
                const clickedOutside = !menuRef.contains(target);
                const clickedLink = target.closest('a');

                if (clickedOutside || clickedLink) {
                    this.closeMenu(menuRef);

                    if (this.globalClickListener) {
                        this.globalClickListener();
                        this.globalClickListener = null;
                    }
                }
            });
        }
    }
    navigateToDetails(listItem: any, event: any) {
        event.preventDefault();
        let roleID = JSON.parse(sessionStorage.getItem('user')!).FkRoleID
        const payload: ServiceApiPayload = {
            FKServiceID: listItem.ServiceID,
            //FKServiceID: +(listItem.ItemURL.split('=')[1]),
            FKProcessID: +listItem.FKProcessID || null,
            FKCurrentStatusID: null,
            FKRoleID: roleID
        };
        this.newApplicationService.requestData.set(null);
        this.newApplicationService.serviceApiPayload.set(payload)
        this.router.navigate([listItem.ItemURL.split('?')[0]], {
            state: {
                data: payload, pageName: this.store.index.locale === 'en' ? listItem.TitleEn : listItem.TitleAr,
                itemURL: listItem.ItemURL,
                newRequestData: null
            },
            queryParams: { ServiceID: listItem.ServiceID }
        });
    }

    navigateToNewLink(listItem: any, event: any) {
        event.preventDefault();
        this.router.navigate([listItem.ItemURL], {
            state: {
                pageName: this.store.index.locale === 'en' ? listItem.TitleEn : listItem.TitleAr,
                itemURL: listItem.ItemURL
            },
        });
    }
    @HostListener('keydown', ['$event'])
    handleKeyboard(event: KeyboardEvent): void {
        if (!this.isServicesMenuOpen()) return;

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            this.keyManager.onKeydown(event);
            event.preventDefault();
        }


        if (event.key === 'Escape' || event.key === 'Tab') {
            this.isServicesMenuOpen.set(false);
            this.closeMenu(this.servicesMenuRef.nativeElement);
            this.menuButtonRef?.nativeElement?.focus();
        }
    }

    openMenu(menuRef: HTMLElement): void {
        this.renderer.removeClass(menuRef, 'hidden');
        this.renderer.addClass(menuRef, 'horizontal-menu');
        this.isServicesMenuOpen.set(true);
    }

    closeMenu(menuRef: HTMLElement): void {
        this.renderer.addClass(menuRef, 'hidden');
        this.renderer.removeClass(menuRef, 'horizontal-menu');
        this.isServicesMenuOpen.set(false);
    }

    isAnySubMenuActive(listItem?: any): boolean {
        const currentUrl = this.router.url;
        return currentUrl.startsWith('/Services/');
    }
    setActiveDropdown() {
        const selector = document.querySelector('ul.horizontal-menu a[routerLink="' + window.location.pathname + '"]');
        if (selector) {
            selector.classList.add('active');
            const all: any = document.querySelectorAll('ul.horizontal-menu .nav-link.active');
            for (let i = 0; i < all.length; i++) {
                all[0]?.classList.remove('active');
            }
            const ul: any = selector.closest('ul.sub-menu');
            if (ul) {
                let ele: any = ul.closest('li.menu').querySelectorAll('.nav-link');
                if (ele) {
                    ele = ele[0];
                    setTimeout(() => {
                        ele?.classList.add('active');
                    });
                }
            }
        }
    }


    removeNotification(value: number) {
        this.notifications.update((values) => {
            return values.filter((d) => d.NotificationID !== value);
        })
    }

    removeMessage(value: number) {
        this.messages = this.messages.filter((d) => d.id !== value);
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
    onLogout() {
        this.storeData.dispatch(AuthActions.logout());
    }
    navigateToNotifications() {
        this.router.navigate(['notifications']);
    }

    searchTerm = signal('');

    filteredServices = computed(() => {
        const term = this.searchTerm().toLowerCase().trim();
        const allData = this.listDataToBeRendered(); // Your original full JSON array

        if (!term) return allData;

        return allData.map(category => {
            // 1. Filter the children first
            const matchingChildren = category.children?.filter(child =>
                child.TitleEn.toLowerCase().includes(term) ||
                child.TitleAr.toLowerCase().includes(term)
            ) || [];

            // 2. Check if the Category itself matches
            const categoryMatches = category.TitleEn.toLowerCase().includes(term) ||
                category.TitleAr.toLowerCase().includes(term);

            // 3. If category matches, show all its children. If not, show only matching children.
            return {
                ...category,
                children: categoryMatches ? category.children : matchingChildren
            };
        }).filter(category => category.children && category.children.length > 0);
    });

    search(event: Event) {
        const input = event.target as HTMLInputElement;
        this.searchTerm.set(input.value);
    }
    clearSearch(inputElement: HTMLInputElement) {
        this.searchTerm.set(''); // Clears the signal (restores the list)
        inputElement.value = ''; // Manually ensures the DOM is clear (extra safety)
        inputElement.focus();    // Keeps the user ready to type again
    }
}
