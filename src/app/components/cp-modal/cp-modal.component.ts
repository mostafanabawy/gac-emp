import { Component, effect, input, output, signal, untracked, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { LocalizationService } from 'src/app/service/localization.service';
import { NewApplicationService } from 'src/app/service/new-application.service';

@Component({
  selector: 'app-cp-modal',
  templateUrl: './cp-modal.component.html'
})
export class CpModalComponent {
  @ViewChild('modal20') modal20: any;
  @ViewChild('modalHeader') modalHeader: any;
  closed = output<string>();
  isOpened = input.required<boolean>();
  popupRendered = signal(false);
  isPrint = output<any>();
  private focusableEls: HTMLElement[] = [];
  private firstButton: HTMLButtonElement | null = null;
  loader = input<boolean>(false);
  isModalReady: boolean = false;
  private boundHandleTab = this.handleTab.bind(this);
  permitForm!: FormGroup;
  translations = signal<any>({});
  statusMessage = signal<string>('');
  cpURL = input<string>();
  constructor(
    private localizationService: LocalizationService,
    private fb: FormBuilder,
    private newApplicationService: NewApplicationService
  ) {

    effect(() => {
      if (!this.newApplicationService.CPResultResponse() && this.isOpened() && this.cpURL()) {
        this.newApplicationService.getCP(this.cpURL()!).subscribe((res: any) => {
          this.newApplicationService.popupCPResultResponse.set(res);
          this.openPermitPopup();
        })
      }
    })

    effect(() => {
      if (this.isOpened()) {
        this.openPermitPopup();
      } else {
        this.modal20?.close();
      }
    }, { allowSignalWrites: true });
    this.initForm();
  }
  ngOnInit() {
    this.translations.set(this.localizationService.getTranslations());
  }
  ngAfterViewInit() {
    if (this.isOpened()) {
      this.onModalOpened();
      this.getFocusableElements(this.modal20).then((els) => {
        this.focusableEls = els;
      })
      this.isModalReady = true;
    }
    setTimeout(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (dialog) {
        dialog.setAttribute('aria-label', 'cp data popup');
      }
    }, 100);
  }
  initForm() {
    this.permitForm = this.fb.group({
      commercialPermitID: [''],
      ID: [''],
      licenseType: [''],
      commercialPermitStatus: [''],
      branchNumber: [''],
      establishmentCommercialName: [''],
      issueDate: [''],
      expiryDate: [''],
      companyActivity: [''],
      buildingOwner: [''],
      licenseeQID: [''],
      licenseeName: [''],
      licenseeNationality: [''],
      managerQID: [''],
      managerName: [''],
      managerNationality: [''],
      municipalityName: [''],
      buildingNumber: [''],
      streetNumber: [''],
      streetName: [''],
      zoneNumber: [''],
      zoneName: [''],
    });
  }
  onModalOpened() {
    setTimeout(() => {
      this.firstButton = document.querySelector('#cpPopup .modal-top .close') as HTMLButtonElement | null;
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
  autoCompleteData(answer: string) {
    if (this.newApplicationService.popupCPResultResponse()) {
      this.newApplicationService.CPResultResponse.set({...this.newApplicationService.popupCPResultResponse()});
    } else {
      this.newApplicationService.getCP(this.cpURL()!).subscribe((res: any) => {
        this.newApplicationService.popupCPResultResponse.set(res);
        this.newApplicationService.CPResultResponse.set(res);
      })
    }
    this.closed.emit(answer);
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

  private formatDate(isoDate: string | undefined): string {
    if (!isoDate) return '';
    try {
      const date = new Date(isoDate);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      console.error('Error formatting date:', e);
      return isoDate; // Return original if parsing fails
    }
  }

  /**
   * Opens the popup, patching data if available, or displaying a message otherwise.
   */
  openPermitPopup(): void {
    const cpResult = untracked(() => this.newApplicationService.CPResultResponse() || this.newApplicationService.popupCPResultResponse());
    const result = cpResult?.CommercialPermitInfogetCommercialPermitInfoResponse1;

    this.statusMessage.set(''); // Clear previous message

    if (result && result.commercialPermit) {
      const cp = result.commercialPermit;

      // Patch the form with the extracted data
      this.permitForm.patchValue({
        commercialPermitID: cp.commercialPermitID,
        ID: cp.commercialRegistration.ID,
        licenseType: cp.licenseType,
        commercialPermitStatus: cp.commercialPermitStatus,
        branchNumber: cp.commercialRegistration.branchNumber,
        establishmentCommercialName: cp.establishmentCommercialName.nameArabic,
        issueDate: this.formatDate(cp.issueDate),
        expiryDate: this.formatDate(cp.expiryDate),
        companyActivity: cp.companyActivity,
        buildingOwner: cp.buildingOwner,
        licenseeQID: cp.licenseeQID,
        licenseeName: cp.licenseeName,
        licenseeNationality: cp.licenseeNationality,
        managerQID: cp.managerQID,
        managerName: cp.managerName,
        managerNationality: cp.managerNationality,
        municipalityName: cp.municipalityName.nameArabic,
        buildingNumber: cp.location.buildingNumber,
        streetNumber: cp.location.street.number,
        streetName: cp.location.street.name.nameArabic,
        zoneNumber: cp.location.zone.number,
        zoneName: cp.location.zone.name.nameArabic,
      });


    } else {
      // Show the "No data" message
      this.statusMessage.set('لا توجد بيانات رخصة تجارية لعرضها.');
    }
    this.modal20.open();
  }
  printData() {
    this.isPrint.emit(this.modal20.elementRef.nativeElement);
  }
}
