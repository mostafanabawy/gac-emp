import { Component, effect, input, Input, output, TemplateRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-reject-modal',
  templateUrl: './app-reject-modal.component.html'
})
export class AppRejectModalComponent {
  closed = output<string>();
  isOpened = input.required<boolean>();
  @ViewChild('modal11') modal11: any;
  constructor() {
    effect(() => {
      if (this.isOpened()) {
        this.modal11?.open();
      } else {
        this.modal11?.close();
      }
    }, { allowSignalWrites: true })
  }
  ngAfterViewInit() {
    setTimeout(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (dialog) {
        dialog.setAttribute('aria-label', 'reject popup message');
      }
    }, 100);
  }
  onUserClose(answer: string) {
    this.closed.emit(answer);
  }
}
