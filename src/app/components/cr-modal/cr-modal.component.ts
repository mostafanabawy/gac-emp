import { Component, effect, input, output, signal, untracked, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { LocalizationService } from 'src/app/service/localization.service';
import { NewApplicationService } from 'src/app/service/new-application.service';
import { Activity, Partner } from 'src/types/outsideProjectData.types';

@Component({
  selector: 'app-cr-modal',
  templateUrl: './cr-modal.component.html'
})
export class CrModalComponent {
  @ViewChild('modal21') modal21: any;
  @ViewChild('modalHeader') modalHeader: any;
  closed = output<string>();
  isOpened = input.required<boolean>();
  popupRendered = signal(false);
  loader = input<boolean>(false);
  crURL = input<string>();
  isPrint = output<any>();
  private focusableEls: HTMLElement[] = [];
  private firstButton: HTMLButtonElement | null = null;
  isModalReady: boolean = false;
  private boundHandleTab = this.handleTab.bind(this);
  translations = signal<any>({});
  statusMessage = signal<string>('');
  crForm!: FormGroup;
  constructor(
    private localizationService: LocalizationService,
    private newApplicationService: NewApplicationService,
    private fb: FormBuilder
  ) {
    effect(() => {
      if (!this.newApplicationService.CRResultResponse() && this.isOpened() && this.crURL()) {
        this.newApplicationService.getCR(this.crURL()!).subscribe((res: any) => {
          this.newApplicationService.popupCRResultResponse.set(res);
          this.openCRPopup();
        })
      }
    })
    effect(() => {
      if (this.isOpened()) {
        this.openCRPopup();
      } else {
        this.modal21?.close();
      }
    }, { allowSignalWrites: true });
  }
  ngOnInit() {
    this.translations.set(this.localizationService.getTranslations());
  }
  ngAfterViewInit() {
    if (this.isOpened()) {
      this.onModalOpened();
      this.getFocusableElements(this.modal21).then((els) => {
        this.focusableEls = els;
      })
      this.isModalReady = true;
    }
    setTimeout(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (dialog) {
        dialog.setAttribute('aria-label', 'cr popup');
      }
    }, 100);
  }
  initForm() {
    this.crForm = this.fb.group({

    })
  }
  onModalOpened() {
    setTimeout(() => {
      this.firstButton = document.querySelector('#crModal .modal-top .close') as HTMLButtonElement | null;
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
              '#aiPopup button'
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
  autoCompleteData(answer: string){
    this.newApplicationService.overWriteGDX = true;
    if(this.newApplicationService.popupCRResultResponse()){
      this.newApplicationService.CRResultResponse.set({...this.newApplicationService.popupCRResultResponse()});
      this.closed.emit(answer);
    }else{
      this.newApplicationService.getCR(this.crURL()!).subscribe((res: any) => {
        this.newApplicationService.popupCRResultResponse.set(res);
        this.newApplicationService.CRResultResponse.set(res);
        this.closed.emit(answer);
      })
    }
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

  // Signals for CR data used in the second modal template
  crSimpleFields = signal<any>({});
  crActivities = signal<Activity[]>([]);
  crPartners = signal<Partner[]>([]);
  crSignatories = signal<Partner[]>([]);


  // Helper to format ISO date to DD/MM/YYYY
  private formatDate(isoDate: string | undefined): string {
    if (!isoDate) return '';
    try {
      // ISO date strings from the API often end in Z or a timezone offset.
      // Using toLocaleDateString ensures local time conversion is handled gracefully.
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) return isoDate; // Return original if invalid date

      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      console.error('Error formatting date:', e);
      return isoDate;
    }
  }
  /**
     * Opens the CR popup, preparing and displaying data if available, or displaying a message otherwise.
     */
  openCRPopup(): void {
    const result = untracked(()=> this.newApplicationService.CRResultResponse() || this.newApplicationService.popupCRResultResponse());
    this.statusMessage.set('');

    if (result && result.result) {
      const cr = result.result;
      // 1. Prepare simple fields
      this.crSimpleFields.set({
        commercialRegistrationCode: cr.commercialRegistrationCode,
        companyStatus: cr.companyStatus,
        location: cr.location,
        commercialRegistrationEntityType: cr.commercialRegistrationEntityType,
        arabicCommercialName: cr.arabicCommercialName,
        creationDate: this.formatDate(cr.creationDate),
        expiryDate: this.formatDate(cr.expiryDate),
        branchesCount: cr.branchesCount,
        companyCapital: cr.companyCapital,
        addressPOBox: cr.addressPOBox,
        addressStreet: cr.addressStreet,
        addressArea: cr.addressArea,
      });

      // 2. Prepare array data
      this.crActivities.set(cr.activities || []);
      this.crPartners.set(cr.humanPartners || []);
      this.crSignatories.set(cr.signatories || []);

    } else {
      this.statusMessage.set('لا توجد بيانات سجل تجاري لعرضها.');
    }

    setTimeout(() => {
      this.modal21.open();
    }, 500)
  }
  
  printData() {
    this.isPrint.emit(this.modal21.elementRef.nativeElement);
  }
}
