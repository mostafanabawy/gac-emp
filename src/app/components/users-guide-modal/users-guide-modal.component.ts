import { Component, effect, input, output, signal, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { LocalizationService } from 'src/app/service/localization.service';
import { NewApplicationService } from 'src/app/service/new-application.service';
import { AppState } from 'src/types/auth.types';

@Component({
  selector: 'app-users-guide-modal',
  templateUrl: './users-guide-modal.component.html'
})
export class UsersGuideModalComponent {
  isOpen = input.required<boolean>();
  closed = output<string>();
  @ViewChild('modal7') modal7: any
  btnEl: HTMLElement | null = null;
  tab9: string = 'service-desc';
  translations = signal<any>(null)
  userGuide = signal<any>(null)
  store!: AppState;
  constructor(
    private localizationService: LocalizationService,
    private newApplicationService: NewApplicationService,
    private storeData: Store<AppState>
  ) {
    this.initStore();
    this.translations.set(this.localizationService.getTranslations())

    effect(() => {
      if (this.isOpen()) {
        this.closed.emit('no');
        this.modal7?.open();
        this.newApplicationService.getUserGuide(null).subscribe((res: any) => {
          this.userGuide.set(res.items[0])
        })
      } else {
        this.closed.emit('yes');
        this.modal7?.close();
      }
    }, { allowSignalWrites: true })
  }
  ngOnInit() {

  }
  ngAfterViewInit() {
    setTimeout(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (dialog) {
        dialog.setAttribute('aria-label', 'users guide popup message');
      }
    }, 100);
  }
  initStore() {
    this.storeData
      .select(({ index, auth }) => ({ index, auth }))
      .subscribe((d) => {
        this.store = d;
      });
  }

  /* ngAfterViewInit(){
    this.btnEl = document.querySelector('#usersGuideModal button') as HTMLElement;
    this.btnEl?.addEventListener('click', () => this.onUserClose('yes'));
    this.btnEl?.addEventListener('keydown', (event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key === 'Enter') {
        this.onUserClose('yes');
      }
    })
  }
  onUserClose(answer: string) {
    this.closed.emit(answer);
    this.btnEl?.removeEventListener('click', () => this.onUserClose('yes'));
    this.btnEl?.removeEventListener('keydown', (event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key === 'Enter') {
        this.onUserClose('yes');
      }
    })
  } */
}
