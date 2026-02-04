import { Component, effect, input, output, ViewChild } from '@angular/core';

@Component({
  selector: 'app-payment-modal',
  templateUrl: './payment-modal.component.html'
})
export class PaymentModalComponent {
  payment = input.required<string>();
  isOpened = input.required<boolean>();
  title = input.required<string>();
  licenseNumber = input<string>();
  closed = output<string>();
  amount = input.required<string>();

  @ViewChild('modal12') modal12: any;
  constructor() {
    effect(() => {
      if (this.isOpened()) {
        this.modal12?.open();
      } else {
        this.modal12?.close();
      }
    }, { allowSignalWrites: true });
  }
  ngAfterViewInit() {
    setTimeout(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (dialog) {
        dialog.setAttribute('aria-label', 'payment popup message');
      }
    }, 100);
  }
  onUserClose(){
    this.modal12?.close();
    this.closed.emit('true');
  }
}
