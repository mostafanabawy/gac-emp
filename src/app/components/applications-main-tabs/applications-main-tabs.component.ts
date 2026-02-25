import { Component, effect } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { AllApplicationsService } from 'src/app/service/all-applications.service';
import { MenuLinksService } from 'src/app/service/menu-links.service';
import { NewApplicationService } from 'src/app/service/new-application.service';
import { WizardServiceService } from 'src/app/service/wizard-service.service';
import { AppState } from 'src/types/auth.types';

@Component({
  selector: 'app-applications-tabs',
  templateUrl: './applications-main-tabs.component.html'
})
export class ApplicationsTabsComponent {
  tab8: string = '';
  store!: AppState;
  private overrideSet = false;
  constructor(
    public allApplicationsService: AllApplicationsService,
    private storeData: Store<AppState>,
    private menuLinksService: MenuLinksService,
    private router: Router,
    private wizardService: WizardServiceService,
    public newApplicationService: NewApplicationService
  ) {
    this.initStore();
    effect(() => {
      if (this.menuLinksService.menuResponse().length > 0) {
        let tabsData = this.menuLinksService.menuResponse().find((item: any) => {
          return `/${item.ItemURL}` === this.router.url
        })
        this.allApplicationsService.tabsData.set(tabsData)
        const state = history.state;
        const isRefresh = state?.navigationId === 1 || !this.router.navigated;
        const mainTab = history.state?.['mainTab'];
        const restoreExplicitly = state?.restoreTabs === true;
        const lastNav = this.router.lastSuccessfulNavigation;
        const isBackNav = lastNav?.trigger === 'popstate';
        if ((isRefresh && mainTab) || (restoreExplicitly && mainTab) || (isBackNav && mainTab)) {
          this.tab8 = mainTab;
          this.allApplicationsService.mainTab = mainTab
          this.overrideSet = true;
        }
        if (!this.overrideSet) {
          this.tab8 = this.allApplicationsService.tabsData().children.find((item: any) => item.HomeItem).TitleEn
          this.allApplicationsService.mainTab = this.tab8
          this.allApplicationsService.saveTabs();
          console.log(this.tab8);
        }
      }
    }, { allowSignalWrites: true })
  }
  ngOnInit() {
    console.log(this.router.getCurrentNavigation()?.extras.state);
    this.getAllProcesses();

    this.allApplicationsService.getLookup({ "LookupTypeID": 5 }).subscribe((res: any) => {
      this.allApplicationsService.lookupValues.set(res.result.items)
    })
  }
  changeTab(item: any) {
    this.tab8 = item.TitleEn;
    this.allApplicationsService.mainTab = item.TitleEn
    this.allApplicationsService.saveTabs();
    this.allApplicationsService.cardsData.set([]);
  }

  getAllProcesses() {
    this.wizardService.EServicesSpActionProcessStatus().subscribe((res: any) => {
      this.newApplicationService.processList.set(res.items)
    })
  }
  initStore() {
    this.storeData
      .select(({ index, auth }) => ({ index, auth }))
      .subscribe((d) => {
        this.store = d;
      });
  }

  onUserClose(answer: string) {
    console.log(answer);
    this.allApplicationsService.closeActivityLog();
    this.allApplicationsService.closeRelatedModal();
    this.newApplicationService.closeAuditModal()
  }



  ngOnDestroy() {
    this.allApplicationsService.disableTabs.set(false);
  }

}
