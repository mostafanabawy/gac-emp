import { Component, effect, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { LocalizationService } from '../service/localization.service';
import { MenuLinksService } from '../service/menu-links.service';
import { ServiceApiPayload } from 'src/types/newApplication.types';
import { Router } from '@angular/router';
import { NewApplicationService } from '../service/new-application.service';
import { AppState } from 'src/types/auth.types';
import { LicensesService } from '../service/licenses.service';

@Component({
    selector: 'footer',
    templateUrl: './footer.html',
})
export class FooterComponent {
    currYear: number = new Date().getFullYear();
    store!: AppState;
    translations = signal<any>(null);
    menuData = signal<any>(null);
    servicesMenuData = signal<any>(null);
    tabsMenuData = signal<any>(null);
    constructor(
        private storeData: Store<any>,
        private localizationService: LocalizationService,
        private menuService: MenuLinksService,
        private router: Router,
        private newApplicationService: NewApplicationService,
        private licenseService: LicensesService
    ) {
        this.translations.set(this.localizationService.getTranslations())
        this.initStore();

        effect(() => {
            if (this.menuService.menuResponse()) {
                this.menuData.set(this.menuService.menuResponse());
            }
        }, { allowSignalWrites: true })
        effect(() => {
            if (this.menuData() && this.menuData()?.length) {
                this.tabsMenuData.set(this.getTabsMenuData()[0]?.children)
            }
        }, { allowSignalWrites: true })
    }
    getServicesMenuData() {
        if (this.menuData()) {
            return this.menuData().filter((item: any) => item.TitleEn.includes('Services'));
        }
    }
    getTabsMenuData() {
        if (this.menuData()) {
            return this.menuData().filter((item: any) => item.TitleEn.includes('Requests'));
        }
    }
    initStore() {
        this.storeData
            .select(({ index, auth }) => ({ index, auth }))
            .subscribe((d) => {
                this.store = d;
            });
    }
    ngOnInit() {
        this.licenseService.search({
            "ReportName": "RequestsCount"
        }).subscribe((res: any) => {
            console.log(res);
            this.servicesMenuData.set(res.resultData)
        })
    }
    selectedLink(item: any, event: any) {
        event.preventDefault();

        this.router.navigate([item.ItemURL], {
            state: {
                menuData: item
            }
        });
    }
    navigateToDetails(listItem: any, event: any) {
        event.preventDefault();
        listItem = this.findByServiceId(this.menuService.menuResponse(), listItem.ServiceID)
        let roleID = JSON.parse(sessionStorage.getItem('user')!).FkRoleID
        const payload: ServiceApiPayload = {
            FKServiceID: listItem.ServiceID,
            //FKServiceID: +(listItem.ItemURL.split('=')[1]),
            FKProcessID: +listItem.FKProcessID,
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

    navigateToNewLink(event: any, tab: string) {
        event.preventDefault();
        let mainTab: any;
        let branchTab: any;
        mainTab = tab;
        this.router.navigateByUrl('/FAQS', { skipLocationChange: true }).then(() => {
            // 2. Immediately navigate back to Inbox
            // This forces the Inbox component to completely restart (triggering ngOnInit)
            this.router.navigate(['Inbox'], {
                state: {
                    pageName: this.translations()?.inboxPageTitle.label,
                    itemURL: 'Inbox',
                    mainTab: mainTab,
                    branchTab: branchTab,
                    restoreTabs: true

                },
            });
        });

    }
    findByServiceId(tree: any[], serviceId: any): any | null {
        // ensure serviceId is a number
        const targetId = Number(serviceId);

        for (const item of tree) {
            if (Number(item.ServiceID) === targetId) {
                return item;
            }

            if (item.children?.length) {
                const found = this.findByServiceId(item.children, targetId);
                if (found) return found;
            }
        }

        return null;
    }
}
