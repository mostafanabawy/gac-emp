import { Component, effect, input, output, signal, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ConfirmModalService } from 'src/app/service/confirm-modal.service';
import { LocalizationService } from 'src/app/service/localization.service';

@Component({
  selector: 'app-application-confirm-modal',
  templateUrl: './application-confirm-modal.component.html'
})
export class ApplicationConfirmModalComponent {
  closed = output<string>();

  title = input.required<string>();
  form = input.required<any>();
  confirmBtnName = input.required<string>();
  actionID = input.required<number | null>();

  @ViewChild('modal21') modal21: any;
  isOpened = input.required<boolean>()
  translations = signal<any>('');
  private destroy$ = new Subject<void>();
  constructor(
    private localizationService: LocalizationService,
    private confirmModalService: ConfirmModalService
  ) {
    this.translations.set(this.localizationService.getTranslations());
  }
  ngOnInit() {
    this.confirmModalService.openStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isOpen => {
        if (isOpen === this.actionID()) {
          this.modal21.open();
          console.log('modal opened');
        }
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
    if (this.form().valid) {
      this.confirmModalService.confirm();
      this.modal21.close();
    } else {
      this.form().markAllAsTouched()
      // Optional: Add a visual cue or notification that the form is invalid
      this.logInvalidControls()
      console.log('Form is invalid. Cannot confirm.');
    }
  }
  logInvalidControls() {
    Object.keys(this.form().controls).forEach(key => {
      const control = this.form().get(key)!;
      if (control.invalid) {
        console.log(`Invalid control: ${key}`);
        if (control.controls) {
          Object.keys(control.controls).forEach(key2 => {
            const control2 = control!.get(key2);
            if (control2!.invalid) {
              console.log(`Invalid control: ${key}.${key2}`);
            }
          });
        }
      }
    });
  }

  onCancel() {
    this.confirmModalService.cancel();
    this.modal21.close();
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
