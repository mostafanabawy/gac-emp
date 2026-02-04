import { Component, effect, input, output, signal, ViewChild } from '@angular/core';
import { LocalizationService } from 'src/app/service/localization.service';

@Component({
  selector: 'app-help-tutorial-modal',
  templateUrl: './help-tutorial-modal.component.html'
})
export class HelpTutorialModalComponent {
  isOpen = input.required<boolean>();
  closed = output<string>();
  @ViewChild('modal6') modal6: any
  btnEl: HTMLElement | null = null;
  translations = signal<any>(null);
  constructor(
    private localizationService: LocalizationService
  ){
    this.translations.set(this.localizationService.getTranslations());
    effect(() => {
      if (this.isOpen()) {
        this.closed.emit('no');
        this.modal6?.open();
       /*  setTimeout(() => this.initEvents(), 100); */
      } else {
        this.closed.emit('yes');
        this.modal6?.close();
      }
    }, { allowSignalWrites: true })
  }
 
  ngAfterViewInit(){
    setTimeout(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (dialog) {
        dialog.setAttribute('aria-label', 'help tutorial video');
      }
    }, 100);
  }
  /* initEvents(){
    this.btnEl = document.querySelector('#helpTutorial button')
    this.btnEl?.addEventListener('click', () => this.closed.emit('yes'));
    this.btnEl?.addEventListener('keydown', (event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key === 'Enter') {
        this.closed.emit('yes');
      }
    })
  } */
 /*  ngOnDestroy(){
    this.btnEl?.removeEventListener('click', () => this.closed.emit('yes'));
    this.btnEl?.removeEventListener('keydown', (event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key === 'Enter') {
        this.closed.emit('yes');
      }
    })
  } */

}
