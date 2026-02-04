import { Component, computed, effect, input, output, signal, ViewChild } from '@angular/core';
import { FileActionsService } from 'src/app/service/file-actions.service';
import { LocalizationService } from 'src/app/service/localization.service';

@Component({
  selector: 'app-ai-analysis-modal',
  templateUrl: './ai-analysis-modal.component.html'
})
export class AiAnalysisModalComponent {
  isOpened = input.required<boolean>()
  fieldName = input.required<any>()
  closed = output<string>();
  @ViewChild('modal22') modal22: any;
  fileData = computed(() => this.fileActionsService.fileAnalysisData());
  translations = signal<any>(null)
  constructor(
    private fileActionsService: FileActionsService,
    private localizationService: LocalizationService
  ) {
    this.translations.set(this.localizationService.getTranslations());
    effect(() => {
      console.log('isOpened', this.isOpened());
      if (this.isOpened()) {
        this.modal22?.open();
      } else {
        this.modal22?.close();
      }
    }, { allowSignalWrites: true });
  }
  ngOnInit() {

  }
  ngAfterViewInit() {
    setTimeout(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (dialog) {
        dialog.setAttribute('aria-label', 'AI analysis popup message');
      }
    }, 100);
  }

  onUserClose(answer: string) {
    console.log(answer);
    this.closed.emit(answer);
  }
}
