import { Component, effect, input, ViewChild } from '@angular/core';

@Component({
  selector: 'app-procedures-completed-modal',
  templateUrl: './procedures-completed-modal.component.html'
})
export class ProceduresCompletedModalComponent {
  isOpened = input.required<boolean>()
  @ViewChild('modal26') modal26: any;
  constructor() {
    effect(() => {
      if (this.isOpened()) {
        this.modal26?.open();
      } else {
        this.modal26?.close();
      }
    }, { allowSignalWrites: true });
  }
  ngAfterViewInit(){
    setTimeout(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (dialog) {
        dialog.setAttribute('aria-label', 'procedures completed popup message');
      }
    }, 100);
  }
}
