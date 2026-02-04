import { Component, effect, input, output, signal, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { AllApplicationsService } from 'src/app/service/all-applications.service';
import { LocalizationService } from 'src/app/service/localization.service';
import { AppState, indexState } from 'src/types/auth.types';
import { ServiceApiPayload } from 'src/types/newApplication.types';

@Component({
  selector: 'app-related-applications-modal',
  templateUrl: './related-applications-modal.component.html',
})
export class RelatedApplicationsModalComponent {
  isOpened = input.required<boolean>()
  private firstButton: HTMLButtonElement | null = null;
  private focusableEls: HTMLElement[] = [];
  private boundHandleTab = this.handleTab.bind(this);
  translations = signal<any>({})
  cols: any[] = [
    { field: 'currentIndex', title: '#' },
    { field: 'ApplicationNumber', title: 'رقم الطلب' },
    { field: 'FkStatusID', title: 'حالة الطلب' },
    { field: 'FkProcessID', title: 'نوع الإجراء' },
    { field: 'CreationDate', title: 'تاريخ التقديم' },
    { field: 'LicenseCreationDate', title: 'تاريخ بداية الرخصة' },
    { field: 'LicenseExpirationDate', title: 'تاريخ انتهاء الرخصة' },

  ];
  //ApprovedLicense 
  rows = signal<any>([])
  @ViewChild('modal23') modal23: any;
  closed = output<string>();
  store!: indexState;
  constructor(
    private allApplicationsService: AllApplicationsService,
    private localizationService: LocalizationService,
    private storeData: Store<AppState>,
    private router: Router
  ) {
    this.translations.set(this.localizationService.getTranslations());
    this.initStore();
    effect(() => {
      if (this.isOpened()) {
        this.modal23?.open();
      } else {
        this.modal23?.close();
      }
    }, { allowSignalWrites: true });

    effect(() => {
      if (this.allApplicationsService.relatedRequestsData()) {
        let result = this.allApplicationsService.relatedRequestsData().map((item: any, index: number) => {
          item.currentIndex = index + 1;
          return item
        })
        this.rows.set(result)
      } else {
        this.rows.set([])
      }
    }, { allowSignalWrites: true });
  }

  ngAfterViewInit() {
    if (this.isOpened()) {
      this.onModalOpened();
      this.getFocusableElements(this.modal23).then((els) => {
        this.focusableEls = els;
      })
    }
    setTimeout(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (dialog) {
        dialog.setAttribute('aria-label', 'activity log');
      }
    }, 100);

  }
  initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }
  onModalOpened() {
    setTimeout(() => {
      this.firstButton = document.querySelector('.modal-top button') as HTMLButtonElement | null;
      this.firstButton?.addEventListener('click', () => {
        return this.onUserClose('no')
      });
      this.firstButton?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          this.onUserClose('no');
        }
      });
      this.firstButton?.focus();
    });

    // Add keydown listener
    document.addEventListener('keydown', this.boundHandleTab);
  }
  getFocusableElements(container: HTMLElement): Promise<HTMLElement[]> {
    return new Promise<HTMLElement[]>((resolve) => {
      setTimeout(() => {
        resolve(
          Array.from(
            document.querySelectorAll<HTMLElement>(
              '#servicesLog button'
            )
          )
        );
      });
    });
  }
  handleTab(event: KeyboardEvent) {
    if (!this.isOpened() || !this.focusableEls.length) return this.onUserClose('no');

    const firstEl = this.focusableEls[0];
    const lastEl = this.focusableEls[this.focusableEls.length - 1];

    if (event.key === 'Tab') {
      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstEl) {
          lastEl.focus();
          event.preventDefault();
        } else if (!this.focusableEls.includes(document.activeElement as HTMLElement)) {
          lastEl.focus();
          event.preventDefault();
        }
      } else {
        // Tab
        if (document.activeElement === lastEl) {
          firstEl.focus();
          event.preventDefault();
        } else if (!this.focusableEls.includes(document.activeElement as HTMLElement)) {
          firstEl.focus();
          event.preventDefault();
        }
      }
    }
  }

  onUserClose(answer: string) {
    console.log(answer);
    this.firstButton?.removeEventListener('click', () => this.onUserClose('no'));
    this.closed.emit(answer);
  }
  onRowClick(event: any) {
    let roleID = JSON.parse(sessionStorage.getItem('user')!).FkRoleID
    const payload: ServiceApiPayload = {
      FKServiceID: event.ServiceID,
      FKProcessID: event.FkProcessID,
      FKCurrentStatusID: event.FkStatusID,
      FKRoleID: roleID
    };
    // 1. Assemble the data you want to pass
    const navigationState = {
      data: payload,
      RequestID: event.RequestID,
      pageName: this.store.locale === 'en' ? event.ServiceTitleEn : event.ServiceTitleAr,
      itemURL: 'Inbox/RequestData'
    };

    // 2. Define a unique key for the data. Using a dynamic value like RequestID is best.
    const uniqueID = event.RequestID; // Assuming RequestID is unique and available
    const storageKey = `requestData`;

    // 3. Save the JSON string to sessionStorage
    sessionStorage.setItem(storageKey, JSON.stringify(navigationState));

    // 4. Generate the URL path *with the key as a query parameter*
    const urlTree = this.router.createUrlTree(['/Inbox/RequestData'], {
      queryParams: { stateKey: storageKey } // <-- This adds the key to the URL
    });

    const url = this.router.serializeUrl(urlTree);

    // 5. Open the URL in a new tab
    window.open(url, '_blank');
    sessionStorage.removeItem(storageKey);
  }
  getLicenseNumber() {
    return this.rows().find((item: any) => item.ApprovedLicense && item.FkProcessID === 40)
  }

  getClassesByStatusId(statusId: number): string {
    switch (statusId) {
      case 5:
      case 6:
      case 625:
      case 627:
      case 629:
      case 1670:
      case 1671:
      case 1672:
      case 1673:
      case 1674:
      case 18:
      case 9:
      case 1827:
      case 1:
      case 7:
      case 19:
        return 'text-white border-[#704d00] bg-yellow-900';
      case 20:
        return 'text-[#4CAF50] border-[#4CAF50] bg-[#4CAF5019]';
      case 111:
      case 675:
        return 'text-white border-[#F44336] bg-red-800';
      case 0:
        return 'text-gray-700 border-[#707070] bg-[#70707024]';
      default:
        return 'text-white border-[#F44336] bg-red-800';
    }
    /* text-[#4CAF50] text-sm border-[#4CAF50] border bg-[#4CAF5019] */
  }
}
