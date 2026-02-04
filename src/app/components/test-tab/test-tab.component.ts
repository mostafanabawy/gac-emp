import { AfterViewInit, ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUploadWithPreview } from 'file-upload-with-preview';
import { FlatpickrDefaultsInterface } from 'angularx-flatpickr';
import { FlatpickrModule } from 'angularx-flatpickr';
@Component({
    selector: 'app-test-tab',
    standalone: true,
    imports: [CommonModule, FlatpickrModule],
    templateUrl: './test-tab.component.html',
    styleUrl: './test-tab.component.css'
})

export class TestTabComponent implements AfterViewInit {
    fileUploadInstances: { [key: string]: FileUploadWithPreview } = {};
    basic: FlatpickrDefaultsInterface = {
        dateFormat: 'Y-m-d',
        minDate: 'today',
        maxDate: '2025-12-31',
    };
    private _tab1: string = 'applicant';
    get tab1(): string {
        return this._tab1;
    }
    set tab1(value: string) {
        if (this._tab1 !== value) {
            this._tab1 = value.toLowerCase();
            this.initializeFileUploadForTab(this._tab1);
        }
    }
    constructor(private cdr: ChangeDetectorRef) {
        this.basic = {
            dateFormat: 'Y-m-d',
            monthSelectorType: 'dropdown',
        };
    }
    ngAfterViewInit() {
        this.initializeFileUploadForTab(this.tab1);
    }

    initializeFileUploadForTab(tab: string) {
        this.destroyAllFileUploadInstances();

        setTimeout(() => {
            switch (tab) {
                case 'applicant':
                    this.initializeSingleFileUpload('ApplicantQIDAtts_DocID');
                    break;
                case 'license':
                    this.initializeSingleFileUpload('LicenseOwner_QIDAtts_DocID');
                    break;
                case 'responsible':
                    this.initializeSingleFileUpload('Manager_QIDAtts_DocIDControle');
                    break;
                case 'partners':
                    this.initializeSingleFileUpload('QIDOrComReg_DocId');
                    break;
                case 'attachments':
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
