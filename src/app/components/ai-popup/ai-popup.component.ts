import { Component, effect, HostListener, input, Input, output, signal, TemplateRef, ViewChild } from '@angular/core';
import { LocalizationService } from 'src/app/service/localization.service';

@Component({
  selector: 'app-ai-popup',
  templateUrl: './ai-popup.component.html'
})
export class AiPopupComponent {
  @ViewChild('modal4') modal4: any;
  @ViewChild('modalHeader') modalHeader: any;
  @Input() subtextTpl?: TemplateRef<any>;
  closed = output<string>();
  isOpened = input.required<boolean>();
  popupRendered = signal(false);
  private focusableEls: HTMLElement[] = [];
  private firstButton: HTMLButtonElement | null = null;
  isModalReady: boolean = false;
  private boundHandleTab = this.handleTab.bind(this);
  translations = signal<any>({});
  constructor(
    private localizationService: LocalizationService
  ) {
    effect(() => {
      if (this.isOpened()) {
        this.modal4?.open();
      } else {
        this.modal4?.close();
      }
    }, { allowSignalWrites: true });
  }
  ngOnInit() {
    this.translations.set(this.localizationService.getTranslations());
  }
  ngAfterViewInit() {
    if (this.isOpened()) {
      this.onModalOpened();
      this.getFocusableElements(this.modal4).then((els) => {
        this.focusableEls = els;
      })
      this.isModalReady = true;
    }
    setTimeout(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (dialog) {
        dialog.setAttribute('aria-label', 'AI popup message');
      }
    }, 100);
  }
  onModalOpened() {
    setTimeout(() => {
      this.firstButton = document.querySelector('.modal-top button') as HTMLButtonElement | null;
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
}
