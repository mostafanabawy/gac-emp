import { Component, ElementRef, input, output, signal, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { LocalizationService } from 'src/app/service/localization.service';
import { TermsConditionsService } from 'src/app/service/terms-conditions.service';

@Component({
  selector: 'app-long-text-popup',
  templateUrl: './long-text-popup.component.html'
})
export class LongTextPopupComponent {
  constructor(
    public termsConditionsService: TermsConditionsService,
    private localizationService: LocalizationService
  ) { }
  closed = output<string>();




  @ViewChild('modal21') modal21: any;
  isOpened = input<boolean>()
  translations = signal<any>('');
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.translations.set(this.localizationService.getTranslations())
    this.termsConditionsService.openStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isOpen => {
        if (isOpen) {
          this.modal21.open();
        } else {
          this.modal21.close();
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
    this.termsConditionsService.confirm();
  }


  onCancel() {
    this.termsConditionsService.cancel();
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  isScrolledToEnd = signal(false);

  onScroll(event: Event) {
    const el = event.target as HTMLElement;
    const reachedBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 5; // small tolerance
    if (reachedBottom && !this.isScrolledToEnd()) {
      this.isScrolledToEnd.set(true);
    }
  }
}
