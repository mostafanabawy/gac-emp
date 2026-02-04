import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { slideDownUp } from 'src/app/shared/animations';
import { FileUploadWithPreview } from 'file-upload-with-preview';
import { FlatpickrDefaultsInterface } from 'angularx-flatpickr';
import { FlatpickrModule } from 'angularx-flatpickr';

@Component({
  selector: 'app-test-accordians',
  standalone: true,
  animations: [slideDownUp],
  imports: [CommonModule, FlatpickrModule],
  templateUrl: './test-accordians.component.html',
  styleUrl: './test-accordians.component.css'
})
export class TestAccordiansComponent {
  accordians: any = 1;
  fileUploadInstances: { [key: string]: FileUploadWithPreview } = {};
  
    public basic: FlatpickrDefaultsInterface = {
      dateFormat: 'Y-m-d',
      minDate: 'today',
      maxDate: '2025-12-31',
    };
  
    constructor(private cdr: ChangeDetectorRef) {
      this.basic = {
        dateFormat: 'Y-m-d',
        monthSelectorType: 'dropdown',
      };
    }
  
    ngAfterViewInit() {
      this.initializeFileUploadForTab(this.accordians);
    }
  
    initializeFileUploadForTab(tab: number) {
      this.destroyAllFileUploadInstances();
  
      setTimeout(() => {
        switch(tab) {
          case 1:
            this.initializeSingleFileUpload('ApplicantQIDAtts_DocID');
            break;
          case 3:
            this.initializeSingleFileUpload('LicenseOwner_QIDAtts_DocID');
            break;
            case 4:
            this.initializeSingleFileUpload('Manager_QIDAtts_DocIDControle');
            break;
            case 6:
            this.initializeSingleFileUpload('QIDOrComReg_DocId');
            break;
            case 7:
            this.initializeSingleFileUpload('Attchment');
            break;
            
            
        }
      }, 0);
    }
  
    initializeSingleFileUpload(uploadId: string) {
      const element = document.querySelector(`[data-upload-id="${uploadId}"]`);
      if (element) {
        this.fileUploadInstances[uploadId] = new FileUploadWithPreview(uploadId, {
          images: {
            baseImage: '/assets/images/file-preview.svg',
            backgroundImage: '',
          },
        });
      } else {
        console.error(`Element with data-upload-id ${uploadId} not found.`);
      }
    }
  
    destroyAllFileUploadInstances() {
      Object.keys(this.fileUploadInstances).forEach(uploadId => {
        this.destroyFileUploadInstance(uploadId);
      });
    }
  
    destroyFileUploadInstance(uploadId: string) {
      const instance = this.fileUploadInstances[uploadId];
      if (instance) {
        const container = document.querySelector(`[data-upload-id="${uploadId}"]`);
        if (container) {
          container.innerHTML = '';
        }
        delete this.fileUploadInstances[uploadId];
      }
    }
}
