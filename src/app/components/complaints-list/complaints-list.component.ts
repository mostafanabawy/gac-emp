import { Component, computed, effect, input, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject, takeUntil } from 'rxjs';
import { AllApplicationsService } from 'src/app/service/all-applications.service';
import { LocalizationService } from 'src/app/service/localization.service';
import { AppState } from 'src/types/auth.types';

@Component({
  selector: 'app-complaints-list',
  templateUrl: './complaints-list.component.html'
})
export class ComplaintsListComponent {
  activeTab: string = '';
  store!: AppState;
  searchQuery = signal<string>('');
  ServicesType = input.required<string>();
  translations = signal<any>(null)

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
        'ApplicationNumber',
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
  // Regular expression to detect Arabic characters 12
  tabData = input.required<any>();
  evalResSignal = signal<any>([])
  constructor(
    private storeData: Store<AppState>,
    public allApplicationsService: AllApplicationsService,
    private localizationService: LocalizationService
  ) {
    this.translations.set(this.localizationService.getTranslations());
    this.initStore();
    effect(() => {
      if (this.tabData()) {
        let activeTabData = this.tabData();
        this.activeTab = activeTabData.InboxType
        if (this.activeTab) {
          this.tabLoader.set(true);
          this.allApplicationsService.disableTabs.set(true);
          let tabName = this.activeTab

          this.allApplicationsService.getCardsData(activeTabData.InboxType, this.ServicesType()).subscribe({
            next: (res) => {

              this.allApplicationsService.cardsData.set(res.Data || [])
              /* let dataToBeSent = res.Data.filter((item: any, index: number) => {
                let actionsToBeSent = item.Actions.filter((item: any) => {
                  return !!item.ShowConditionId
                })
                res.Data[index].apiActions = actionsToBeSent
                return actionsToBeSent.length > 0
              })
              dataToBeSent = dataToBeSent.map((item: any) => {
                return {
                  RequestID: item.RequestID,
                  ActionDetailsIDs: item.apiActions.map((action: any) => action.ActionDetailsID)
                }
              })
              if (dataToBeSent.length > 0) {
                this.allApplicationsService.EvaluateActionConditionBulk(dataToBeSent).subscribe((evalRes: any) => {
                  this.evalResSignal.set(evalRes);
                })
              } */
              let pagingInfo = JSON.parse(res.PagingInfo);
              this.totalPages.set(Math.ceil(pagingInfo.TotalRows / this.itemsPerPage()));
              this.totalRows.set(pagingInfo.TotalRows);
              this.tabLoader.set(false);
              this.allApplicationsService.disableTabs.set(false);
              this.dataPage.update(d => d + 1);
              if (this.dataPage() <= pagingInfo.TotalPages) {
                this.loadCardsData({ PageSize: this.pageSize(), PageNum: this.dataPage() }, this.activeTab);
              }
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
    if (this.activeTab !== tab.InboxType) {
      this.tabLoader.set(true);
      this.allApplicationsService.disableTabs.set(true);
      this.activeTab = tab.InboxType;
      this.loadCardsForTab(tab.InboxType, this.ServicesType());
    }
  }
  loadCardsForTab(tabName: string, ServicesType: any) {
    // 3. Call the specific API for the selected tab
    this.allApplicationsService.getCardsData(tabName, ServicesType).subscribe({
      next: (cards) => {
        this.allApplicationsService.cardsData.set(cards.Data || []);
        let pagingInfo = JSON.parse(cards.PagingInfo);
        this.totalPages.set(Math.ceil(pagingInfo.TotalRows / this.itemsPerPage()));
        this.totalRows.set(pagingInfo.TotalRows);
        this.dataPage.set(2);
        if (this.dataPage() <= pagingInfo.TotalPages) {
          this.loadCardsData({ PageSize: this.pageSize(), PageNum: this.dataPage() }, tabName);
        }
        let dataToBeSent = cards.Data.filter((item: any, index: number) => {

          let actionsToBeSent = (item.Actions && item.Actions.length) ? item.Actions.filter((item: any) => {
            return !!item.ShowConditionId
          }) : []
          cards.Data[index].apiActions = actionsToBeSent
          return actionsToBeSent.length > 0
        })
        dataToBeSent = dataToBeSent.map((item: any) => {
          return {
            RequestID: item.RequestID,
            ActionDetailsIDs: item.apiActions.map((action: any) => action.ActionDetailsID)
          }
        })
        if (dataToBeSent.length > 0) {
          this.allApplicationsService.EvaluateActionConditionBulk(dataToBeSent).subscribe((evalRes: any) => {
            this.evalResSignal.set(evalRes);
          })
        }
        this.tabLoader.set(false);
        this.allApplicationsService.disableTabs.set(false);
      },
      error: () => { this.tabLoader.set(false); this.allApplicationsService.disableTabs.set(false); }
    });
  }

  private loadCardsData(pagingInfo?: any, inboxType?: any): void {
    // 1. Get the InboxType for the API call
    const servicesType = this.ServicesType();

    // 2. Set loading state and disable tabs

    // 3. Call the API
    this.allApplicationsService.getCardsData(inboxType, servicesType, pagingInfo).pipe(takeUntil(this.stopLoading$))
      .subscribe({
        next: (res) => {
          // 4. Update the cards data Signal
          if (res.Data) {
            this.allApplicationsService.cardsData.update((cardsData) => [...cardsData, ...res.Data]);
          }
          let pagingInfo = JSON.parse(res.PagingInfo);
          this.dataPage.update(d => d + 1);
          if (this.dataPage() <= pagingInfo.TotalPages) {
            this.loadCardsData({ PageSize: this.pageSize(), PageNum: this.dataPage() }, inboxType)
          }

        },
        error: (err) => {
          console.error('Error loading cards data:', err);
          // Optional: Add error handling logic here 12
        },
        complete: () => {
        }
      });
  }

  private stopLoading$ = new Subject<void>();
  currentPage = signal<number>(1);
  pageSize = signal<number>(200);
  itemsPerPage = signal<number>(10);
  totalRows = signal<number>(0);
  dataPage = signal<number>(1);
  totalPages = signal<number>(0);
  paginatedApplications = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage();
    const endIndex = startIndex + this.itemsPerPage();
    let dataToBeSent = this.cardsData().slice(startIndex, endIndex).filter((item: any, index: number) => {
      let actionsToBeSent = (item.Actions && item.Actions.length) ? item.Actions.filter((item: any) => {
        return !!item.ShowConditionId
      }) : [];
      this.cardsData().slice(startIndex, endIndex)[index].apiActions = actionsToBeSent
      return actionsToBeSent.length > 0
    })
    dataToBeSent = dataToBeSent.map((item: any) => {
      return {
        RequestID: item.RequestID,
        ActionDetailsIDs: item.apiActions.map((action: any) => action.ActionDetailsID)
      }
    })
    if (dataToBeSent.length > 0) {
      this.allApplicationsService.EvaluateActionConditionBulk(dataToBeSent).subscribe((evalRes: any) => {
        this.evalResSignal.set(evalRes);
      })
    }
    return this.cardsData().slice(startIndex, endIndex);
  });
  goToPage(page: number): void {
    this.evalResSignal.set([])
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }
  // Actions for pagination buttons
  goToFirstPage(): void {
    this.evalResSignal.set([])
    this.currentPage.set(1);
  }

  goToPreviousPage(): void {
    this.evalResSignal.set([])
    this.currentPage.update(page => Math.max(1, page - 1));
  }

  goToNextPage(): void {
    this.evalResSignal.set([])
    this.currentPage.update(page => Math.min(this.totalPages(), page + 1));
  }

  goToLastPage(): void {
    this.evalResSignal.set([])
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
  private arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  searchValIsArabic!: boolean;

  searchCards(event: any) {
    const searchValue = (event.target as HTMLInputElement).value;
    this.searchValIsArabic = this.arabicRegex.test(searchValue);
    this.searchQuery.set(searchValue);
    this.currentPage.set(1);
    console.log(searchValue);
    console.log(this.cardsData());
  }

  actionCompleted() {
    this.tabLoader.set(true);
    this.allApplicationsService.disableTabs.set(true);
    this.loadCardsForTab(this.activeTab, this.ServicesType());
  }
  openAnalysisModel = signal(false);
  onAnalysisReq(event: any) {
    this.openAnalysisModel.set(event);
  }
  onUserClose(answer: string) {
    this.openAnalysisModel.set(false)
  }

  ngOnDestroy() {
    this.stopLoading$.next();
    this.stopLoading$.complete();
  }
  get paginationMessage(): string {
    const start = (this.currentPage() - 1) * this.itemsPerPage() + 1;

    // Calculate potential end, then cap it at totalRows
    const calculatedEnd = this.currentPage() * this.itemsPerPage();
    const end = Math.min(calculatedEnd, this.totalRows());

    const total = this.totalRows();

    if (this.store.index.locale === 'en') {
      return `Showing ${start} to ${end} of ${total} entries`;
    } else {
      // Note: RTL languages usually handle numbers naturally, 
      // but ensure your container has dir="rtl" for the best layout.
      return `عرض ${start} إلى ${end} من ${total}`;
    }
  }
}
