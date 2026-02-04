import { AfterViewInit, ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUploadWithPreview } from 'file-upload-with-preview';
import { FlatpickrDefaultsInterface } from 'angularx-flatpickr';
import { FlatpickrModule } from 'angularx-flatpickr';

@Component({
  imports: [CommonModule, FlatpickrModule],
  standalone: true,
  selector: 'app-test',
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.css'],
})
export class TestComponent implements AfterViewInit {
  activeTab: number = 1;
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
    this.initializeFileUploadForTab(this.activeTab);
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

  setActiveTab(tab: number): void {
    this.activeTab = tab;
    this.initializeFileUploadForTab(tab);
    this.cdr.detectChanges();
  }

  changeTab(direction: number): void {
    const newTab = this.activeTab + direction;
    if (newTab >= 1 && newTab <= 10) {
      this.activeTab = newTab;
      this.initializeFileUploadForTab(this.activeTab);
      this.cdr.detectChanges();
    }
  }
  finish(): void {
    alert('You have completed all the steps!');
  }
  getTabs() {
    const tabsToShow = [];
    const startTab = Math.max(1, this.activeTab - 1); // Show one tab before
    const endTab = Math.min(10, this.activeTab + 1); // Show one tab after

    for (let i = startTab; i <= endTab; i++) {
      tabsToShow.push(i);
    }

    return tabsToShow;
  }
}