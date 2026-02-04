import { Component, effect, input, output, signal, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { AllApplicationsService } from 'src/app/service/all-applications.service';
import { LocalizationService } from 'src/app/service/localization.service';
import { AppState } from 'src/types/auth.types';

@Component({
  selector: 'app-services-log-modal',
  templateUrl: './services-log-modal.component.html'
})
export class ServicesLogModalComponent {
  @ViewChild('modal4') modal4: any;
  @ViewChild('modalHeader') modalHeader: any;
  closed = output<string>();
  isOpened = input.required<boolean>();
  popupRendered = signal(false);
  private focusableEls: HTMLElement[] = [];
  private firstButton: HTMLButtonElement | null = null;
  isModalReady: boolean = false;
  private boundHandleTab = this.handleTab.bind(this);
  statusMessage = signal<string>('');
  tableCols = signal<any[]>([])
  tableRows = signal<any[]>([])
  store!: AppState;

  
  translations = signal<any>({});
  constructor(
    private localizationService: LocalizationService,
    public allApplicationsService: AllApplicationsService,
    private storeData: Store<AppState>
  ) {
    this.initStore();
    effect(() => {
      if (this.isOpened()) {
        this.modal4?.open();
      } else {
        this.modal4?.close();
      }
    }, { allowSignalWrites: true });

    effect(() => {
      if(this.allApplicationsService.appActivity() && this.translations()){
        this.tableCols.set(this.translations()?.applicationsLogTableColumns.label.split(','));
        this.tableRows.set(this.allApplicationsService.appActivity() || [])
        console.log(this.tableCols());
      }else{
        this.statusMessage.set('لا يوجد بيانات');
      }
      
      

    }, { allowSignalWrites: true })
  }
  ngOnInit() {
    this.translations.set(this.localizationService.getTranslations());

  }
  ngAfterViewInit() {
    if (this.isOpened()) {
      this.onModalOpened();
      this.getFocusableElements(this.modal4).then((els) => {
        this.focusableEls = els;
      })
      this.isModalReady = true;
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
      .select(({ index, auth }) => ({ index, auth }))
      .subscribe((d) => {
        this.store = d;
      });
  }
  onModalOpened() {
    setTimeout(() => {
      this.firstButton = document.querySelector('.modal-top button') as HTMLButtonElement | null;
      this.firstButton?.addEventListener('click', () => this.onUserClose('no'));
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
  onUserClose(answer: string) {
    console.log(answer);
    this.closed.emit(answer);
    document.removeEventListener('keydown', this.boundHandleTab);
    this.firstButton?.removeEventListener('click', () => this.onUserClose('no'));
    this.firstButton?.removeEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.onUserClose('no');
      }
    });
    this.focusableEls = [];
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
}
