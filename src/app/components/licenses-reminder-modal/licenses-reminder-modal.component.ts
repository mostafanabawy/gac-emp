import { Component, effect, input, output, ViewChild } from '@angular/core';

@Component({
  selector: 'app-licenses-reminder-modal',
  templateUrl: './licenses-reminder-modal.component.html'
})
export class LicensesReminderModalComponent {
  closed = output<string>();
  isOpened = input.required<boolean>();
  status = input.required<string>();
  number = input.required<string>();
  licenseNumber = input.required<string>();
  applicationType = input.required<string>();;
  expiryDate = input<string>();
  @ViewChild('modal10') modal10: any;
  constructor() {
    effect(() => {
      if (this.isOpened()) {
        this.modal10?.open();
      } else {
        this.modal10?.close();
      }
    }, { allowSignalWrites: true });
  }
  ngAfterViewInit(){
    setTimeout(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (dialog) {
        dialog.setAttribute('aria-label', 'licenses notification popup message');
      }
    }, 100);
  }
}
