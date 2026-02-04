import { Component, computed, effect, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { AllApplicationsService } from 'src/app/service/all-applications.service';
import { EmployeeApplicationsService } from 'src/app/service/employee-applications.service';
import { MenuLinksService } from 'src/app/service/menu-links.service';
import { AppState } from 'src/types/auth.types';

@Component({
  selector: 'app-employee-applications',
  templateUrl: './employee-applications.component.html',
})
export class EmployeeApplicationsComponent {
  tab8 = signal<string>('ALLREQUESTS');
  store!: AppState;
  cardsData = computed(() => {
    const data = this.allApplicationsService.cardsData() || [];
    const query = this.searchQuery().toLowerCase();
    if (!query) {
      return data;
    }
    return data.filter((item: any) =>
      // Replace `item.name` with the property you want to search
      Object.values(item).some((value: any) => {
        const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
        return valueStr.toLowerCase().includes(query);
      })
    );
  });
  cardLoader = signal<boolean>(false);
  private overrideSet = false;
  constructor(
    private employeeApplicationService: EmployeeApplicationsService,
    public allApplicationsService: AllApplicationsService,
    private menuLinksService: MenuLinksService,
    private router: Router,
    private storeData: Store<AppState>
  ) {
    this.initStore();

    effect(() => {
      if (this.menuLinksService.menuResponse().length > 0) {
        let tabsData = this.menuLinksService.menuResponse().find((item: any) => {
          return `/${item.ItemURL}` === this.router.url
        })
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
          this.tab8 = this.allApplicationsService.tabsData().children.find((item: any) => item.HomeItem).TitleEn
          console.log(this.tab8);
        }
      }
    }, { allowSignalWrites: true })

  }

  ngOnInit() {
    this.cardLoader.set(true);
    this.allApplicationsService.getTabs().subscribe((res: any) => {
      console.log(res);
      this.allApplicationsService.tabsData.set(res.items.filter((item: any) => item.FkRoleID === this.store.auth.user.FkRoleID));
      console.log(this.allApplicationsService.tabsData());

      this.employeeApplicationService.tab.set('ALLREQUESTS')

      /* this.allApplicationsService.getCardsData('ALLREQUESTS').subscribe((res) => {
        console.log(res);
        this.allApplicationsService.cardsData.set(res.Data || [])
        this.cardLoader.set(false);
      }) */
    })
  }
  initStore() {
    this.storeData
      .select(({ index, auth }) => ({ index, auth }))
      .subscribe((d) => {
        this.store = d;
      });
  }


  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(4);
  totalPages = computed(() => Math.ceil(this.allApplicationsService.cardsData().length / this.itemsPerPage()));
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
 /*  getPendingReq() {
    this.cardLoader.set(true);
    this.allApplicationsService.getCardsData('PENDINGREQUESTS').subscribe((res) => {
      console.log(res);
      this.allApplicationsService.cardsData.set(res.Data || [])
      this.cardLoader.set(false);
    })
  } */
}
