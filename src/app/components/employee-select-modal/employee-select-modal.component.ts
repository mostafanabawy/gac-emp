import { Component, input, output, signal, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject, takeUntil } from 'rxjs';
import { EmployeeSelectModalService } from 'src/app/service/employee-select-modal.service';
import { LocalizationService } from 'src/app/service/localization.service';
import { AppState, indexState } from 'src/types/auth.types';

@Component({
  selector: 'app-employee-select-modal',
  templateUrl: './employee-select-modal.component.html'
})
export class EmployeeSelectModalComponent {
  closed = output<string>();

  title = input.required<string>();
  confirmBtnName = input.required<string>();
  selectedService: any = null;

  @ViewChild('modal499') modal499: any;
  isOpened = input<boolean>()
  translations = signal<any>('');
  store!: indexState;
  private destroy$ = new Subject<void>();
  employees = input.required<any[]>();
  constructor(
    private localizationService: LocalizationService,
    private serviceSelectModalService: EmployeeSelectModalService,
    private storeData: Store<AppState>
  ) {
    this.translations.set(this.localizationService.getTranslations());
    this.initStore();
  }
  initStore() {
    this.storeData.select('index').pipe(takeUntil(this.destroy$)).subscribe(data => {
      this.store = data;
    });
    
  }
  ngOnInit() {
    this.serviceSelectModalService.openStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isOpen => {
        this.modal499.open();
        console.log('modal opened');

      });
  }
  onEditorCreated(event: any) { }
  ngAfterViewInit() {
    setTimeout(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (dialog) {
        dialog.setAttribute('aria-label', 'application confirm popup message');
      }
    }, 100);
  }
  onConfirm() {
    if (this.selectedService) {
      this.serviceSelectModalService.confirm(this.selectedService);
      this.modal499.close();
    } else {
      // Optional: Add a visual cue or notification that the form is invalid 12
      console.log('Form is invalid. Cannot confirm.');
    }
  }

  onCancel() {
    this.serviceSelectModalService.cancel();
    this.modal499.close();
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
