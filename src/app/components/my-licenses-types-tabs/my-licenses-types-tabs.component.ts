import { Component, computed, effect, input, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { AllApplicationsService } from 'src/app/service/all-applications.service';
import { AppState } from 'src/types/auth.types';

@Component({
  selector: 'app-my-licenses-types-tabs',
  templateUrl: './my-licenses-types-tabs.component.html'
})
export class MyLicensesTypesTabsComponent {
  activeTab: string = '';
  store!: AppState;
  applicationTypes = signal<any>('');
  ServicesType = input.required();
  cardsData = computed(() => {
    const data = this.allApplicationsService.cardsData() || [];
    const query = this.searchQuery().toLowerCase();
    if (!query) {
      return data;
    }
    return data.filter((item: any) => {
      // ServiceTitleEn ServiceTitleAr FkProcessID_TitleEn FkProcessID_TitleAr ApplicationNumber FkStatusID_TitleAr  FkStatusID_TitleEn
      // Replace `item.name` with the property you want to search
      return [
        'ServiceTitleEn',
        'ServiceTitleAr',
        'FkProcessID_TitleEn',
        'FkProcessID_TitleAr',
        'ApprovedLicense',
        'FkStatusID_TitleAr',
        'FkStatusID_TitleEn'
      ].some(key => {
        const value = item[key];
        const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
        return valueStr.toLowerCase().includes(query);
      })
    });
  });
  tabLoader = signal<boolean>(false);
  tabData = input.required();
  // Regular expression to detect Arabic characters
  constructor(
    private storeData: Store<AppState>,
    public allApplicationsService: AllApplicationsService
  ) {
    this.initStore();
    effect(() => {
      if (this.tabData()) {
        /* if (allApplicationsService.tabsData()) {
        this.applicationTypes.set(allApplicationsService.tabsData().children[1].children) */
        this.applicationTypes.set(this.tabData())
        let activeTabData = this.applicationTypes().find((item: any) => item.HomeItem);
        this.activeTab = activeTabData.InboxType
        if (this.activeTab) {
          this.tabLoader.set(true);
          this.allApplicationsService.disableTabs.set(true);
          let tabName = this.activeTab
          console.log(tabName);
          this.allApplicationsService.getCardsData(activeTabData.InboxType, this.ServicesType()).subscribe({
            next: (res) => {
              console.log(res);
              this.allApplicationsService.cardsData.set(res.Data || [])
              this.tabLoader.set(false);
              this.allApplicationsService.disableTabs.set(false);
            },
            error: () => this.tabLoader.set(false)
          })
        }
      }
    }, { allowSignalWrites: true })
  }

  ngOnInit() {

  }
  initStore() {
    this.storeData
      .select(({ index, auth }) => ({ index, auth }))
      .subscribe((d) => {
        this.store = d;
      });
  }
  tabChange(tab: any) {
    this.tabLoader.set(true);
    this.allApplicationsService.disableTabs.set(true);
    if (this.activeTab !== tab.InboxType) {
      this.activeTab = tab.InboxType;
      this.loadCardsForTab(tab.InboxType, this.ServicesType());
    }
  }
  loadCardsForTab(tabName: string, ServicesType: any) {
    // 3. Call the specific API for the selected tab
    this.allApplicationsService.getCardsData(tabName, ServicesType).subscribe(cards => {
      this.allApplicationsService.cardsData.set(cards.Data || []);
      this.tabLoader.set(false);
      this.allApplicationsService.disableTabs.set(false);
    });
  }

  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(10);
  totalPages = computed(() => Math.ceil(this.cardsData().length / this.itemsPerPage()));
  paginatedApplications = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage();
    const endIndex = startIndex + this.itemsPerPage();
    return this.cardsData().slice(startIndex, endIndex);
  });
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }
  // Actions for pagination buttons
  goToFirstPage(): void {
    this.currentPage.set(1);
  }

  goToPreviousPage(): void {
    this.currentPage.update(page => Math.max(1, page - 1));
  }

  goToNextPage(): void {
    this.currentPage.update(page => Math.min(this.totalPages(), page + 1));
    console.log(this.totalPages());
    console.log(this.allApplicationsService.cardsData().length / this.itemsPerPage());
  }

  goToLastPage(): void {
    this.currentPage.set(this.totalPages());
  }

  // Helper to generate an array of page numbers
  get pageNumbers(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalPages(); i++) {
      pages.push(i);
    }
    return pages;
  }
  displayedPages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages = [];

    // Don't show anything if there are no pages
    if (total === 0) {
      return [];
    }

    // Case 1: Total pages are small (e.g., <= 5), show all pages
    if (total <= 5) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
      return pages;
    }

    // Case 2: Total pages are large (> 5), use a compact display
    // Always show the first page
    pages.push(1);

    // Define the number of pages to show around the current page
    const pageRange = 1;
    const startRange = Math.max(2, current - pageRange);
    const endRange = Math.min(total - 1, current + pageRange);

    // Add leading ellipsis if needed
    if (startRange > 2) {
      pages.push(0);
    }

    // Add the pages within the defined range
    for (let i = startRange; i <= endRange; i++) {
      pages.push(i);
    }

    // Add trailing ellipsis if needed
    if (endRange < total - 1) {
      pages.push(0);
    }

    // Always show the last page
    pages.push(total);

    // Final filter to remove any duplicates from edge cases
    return pages.filter((page, index, array) => array.indexOf(page) === index);
  });

  searchQuery = signal<string>('');
  private arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  searchValIsArabic!: boolean;
  searchCards(event: any) {
    const searchValue = (event.target as HTMLInputElement).value;
    this.searchValIsArabic = this.arabicRegex.test(searchValue);
    this.searchQuery.set(searchValue);
    console.log(searchValue);
    console.log(this.cardsData());
  }

}
