import { Component, effect, HostListener, Input, input, output, signal, TemplateRef, ViewChild } from '@angular/core';
let counter = 0;
@Component({
  selector: 'app-success-modal',
  templateUrl: './success-modal.component.html'
})
export class SuccessModalComponent {


  isOpen = input.required<boolean>();
  @ViewChild('modal2') modal2: any;
  @Input() subtextTpl?: TemplateRef<any>;
  title = input.required<string>();
  subtext = input<string>();
  requestNumber = input<string>();
  closed = output<boolean>();
  private modalReady = signal(false); // ✅ tracked signal

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.modal2?.open();
      } else {
        this.modal2?.close();
      }
    }, { allowSignalWrites: true });
  }
  ngAfterViewInit() {
    setTimeout(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (dialog) {
        dialog.setAttribute('aria-label', 'success popup message');
      }
    }, 100);
  }
  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent) {
    const modalEl = this.modal2?.nativeElement;
    if (!modalEl || modalEl.contains(event.target)) return;

    // Click was outside modal → treat as user-close
    this.onUserClose();
  }

  onUserClose() {
    this.modal2?.close();
    this.closed.emit(true);
  }
}
