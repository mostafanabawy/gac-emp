import { Component, effect, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { AllApplicationsService } from 'src/app/service/all-applications.service';
import { MenuLinksService } from 'src/app/service/menu-links.service';
import { NewApplicationService } from 'src/app/service/new-application.service';
import { WizardServiceService } from 'src/app/service/wizard-service.service';
import { AppState } from 'src/types/auth.types';
import { MenuItem } from 'src/types/menu.types';

@Component({
  selector: 'app-complaints',
  templateUrl: './complaints.component.html'
})
export class ComplaintsComponent {
  tab8: string = '';
  store!: AppState;
  currentLink = signal<any>('');
  private overrideSet = false;
  constructor(
    public allApplicationsService: AllApplicationsService,
    private storeData: Store<AppState>,
    private menuLinksService: MenuLinksService,
    private router: Router,
    private wizardService: WizardServiceService,
    private newApplicationService: NewApplicationService
  ) {
    this.initStore();

    effect(() => {
      if (menuLinksService.menuResponse()) {
        this.currentLink.set(history.state.menuData)
      }
    }, { allowSignalWrites: true })
    effect(() => {
      if (this.menuLinksService.menuResponse().length > 0) {
        let tabsData = this.restoreStateOnLoad();
        if(!tabsData){
          return;
        }
        this.allApplicationsService.tabsData.set(tabsData)
        const fromPage = history.state?.['fromPage'];
        if (fromPage) {
          this.tab8 = fromPage;
          console.log(fromPage);
          console.log(this.tab8);
          const newState = { ...history.state };
          delete newState.fromPage;
          history.replaceState(newState, document.title, window.location.href);
          this.overrideSet = true;
        }
        if (!this.overrideSet) {
          this.tab8 = this.allApplicationsService.tabsData().TitleEn
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

  /* initCardBtns(){
    this.allApplicationsService.initCardActions();
  } */
  onUserClose(answer: string) {
    console.log(answer);
    this.allApplicationsService.closeRelatedModal();
  }

  private restoreStateOnLoad() {
    // 1. Check if history.state has the persistent key we saved (e.g., 'activeMenuId')
    const savedActiveId = history.state?.menuData?.itemId;

    if (savedActiveId !== undefined) {
      console.log(`[Init] Found saved ID: ${savedActiveId}. Searching for item...`);

      // 2. Start the recursive search to find the item in the menu structure
      const foundItem = this.findAndSetActive(this.menuLinksService.menuResponse(), savedActiveId);

      if (foundItem) {
        // 3. If found, restore the item in the component's state
        return foundItem;
      }else{
        return false;
      }
    }else{
      return false;
    }
  }


  /**
   * Recursively searches the menu structure for an item with a matching ID.
   * @param items The array of menu items to search (either top-level or children).
   * @param id The ID of the item to find.
   * @returns The MenuItem object if found, otherwise null.
   */
  private findAndSetActive(items: MenuItem[], id: number): MenuItem | null {
    for (const item of items) {
      // Check the current item
      if (item.itemId === id) {
        return item;
      }

      // Check children recursively
      if (item.children && item.children.length > 0) {
        const foundInChild = this.findAndSetActive(item.children, id);
        if (foundInChild) {
          return foundInChild;
        }
      }
    }
    return null; // Not found in this branch
  }
  ngOnDestroy() {
    this.allApplicationsService.disableTabs.set(false);
  }


}
