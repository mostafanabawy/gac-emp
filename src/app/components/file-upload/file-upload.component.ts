import { Component, Input, Output, EventEmitter, forwardRef, signal, input, effect } from '@angular/core';
import { NG_VALUE_ACCESSOR, AbstractControl, ValidationErrors, NG_VALIDATORS, FormArray, FormGroup, Validators, FormControl } from '@angular/forms';
import { Store } from '@ngrx/store';
import { forkJoin, tap } from 'rxjs';
import { FileActionsService } from 'src/app/service/file-actions.service';
import { LocalizationService } from 'src/app/service/localization.service';
import { AppState, indexState } from 'src/types/auth.types';
import { FileMetadata } from 'src/types/fileActions.types';
import { Attachments, FieldJson } from 'src/types/newApplication.types';
import Swal from 'sweetalert2';
import { NgxSpinnerService } from "ngx-spinner";
import { NewApplicationService } from 'src/app/service/new-application.service';
import { CustomValidators } from 'src/app/validators/custom-validators';
import { ex } from '@fullcalendar/core/internal-common';
import { environment } from 'src/environments/environment';

interface UploadedFile {
  name: string;
  [key: string]: any;
  size: number;
  type: string;
  uploadDate: Date;
  Confidence?: number;
  progress: number;
  ID?: number;
  IsDeleted: boolean | null;
  status: 'uploading' | 'completed' | 'error';
  rawFile: File; // <--- NEW: Store the actual File object here
}

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FileUploadComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => FileUploadComponent),
      multi: true
    }
  ]
})
export class FileUploadComponent {
  baseUrl = environment.apiUrl;
  @Input() title: string = '';
  @Input() format: string = 'PDF';
  @Input() attachmentGroup!: any;
  @Input() form!: FormGroup;
  @Input() index!: number;
  @Input() uploadId: string = 'fileInput';
  @Input() acceptedTypes: string = '.pdf,.doc,.docx';
  @Input() multiple: boolean = true;
  @Input() required: boolean = false; // New input for validation
  @Input() maxFileSizeKB: number = 5120;
  @Input() disabledBtns: boolean = false;
  @Input() errorMessages: any = {};
  @Input() showTextBox: any = false;
  @Input() attachmentNameKey: string = 'AttachmentName';
  @Input() AttachmentDocIDKey: string = 'AttachmentDocID';
  @Input() field!: FieldJson;
  recordedFiles = input<any>([]);
  @Input() attachment: Attachments | null = null;

  @Input() AttachmentTypeKey: string = 'AttachmentType';
  // Internal storage for files, now managed by ControlValueAccessor
  uploadedFiles: UploadedFile[] = [];
  extractionProgress: number = 100;
  fileSizeError: boolean = false;
  fileTypeError: boolean = false;
  aiPercent = signal<number | null | undefined>(null);

  @Output() isHidden = new EventEmitter<boolean>();
  @Output() filesSelected = new EventEmitter<FileList>();
  @Output() filesDropped = new EventEmitter<FileList>();

  formatGroups: Record<string, string[]> = {
    Images: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'svg', 'heic', 'webp'],
    Documents: ['pdf', 'doc', 'docx', 'txt', 'rtf'],
    Sheets: ['xls', 'xlsx', 'csv'],
    Presentations: ['ppt', 'pptx'],
  };
  // Functions to register for ControlValueAccessor
  private onChange: (value: UploadedFile[] | null) => void = () => { };
  private onTouched: () => void = () => { };
  fileName = signal<any[]>([]);
  textBoxValue: string = '';
  translations = signal<any>({});
  showTextBoxSignal = signal<any>(false);
  store!: indexState;
  loading = false;
  constructor(
    private localizationService: LocalizationService,
    private storeData: Store<AppState>,
    private fileService: FileActionsService,
    private spinner: NgxSpinnerService,
    private newApplicationService: NewApplicationService
  ) {
    this.initStore();
    effect(() => {
      if ((this.disabledBtns && !this.uploadedFiles.length)) {
        this.isHidden.emit(true);
      } else {
        this.isHidden.emit(false);
      }
    })
    effect(() => {
      if (this.recordedFiles()) {
        this.aiPercent.set(this.recordedFiles().files[0].Confidence);
      }
    }, { allowSignalWrites: true })
    effect(() => {
      if (this.attachment?.ID === 1583) {
        console.log('when id is 1583.................');
        console.log(this.recordedFiles());
        console.log(this.aiPercent());
      }
    })
    effect(() => {
      if (this.recordedFiles()) {
        console.log('when recordedFiles is not null.................');
        console.log(this.recordedFiles());
        console.log(this.attachment?.ID);
      }
    })
  }
  ngOnInit() {

    this.translations.set(this.localizationService.getTranslations());
    this.showTextBoxSignal.set(this.showTextBox);
  }
  initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }
  // إضافة ملفات تجريبية
  /* private addSampleFiles(): void {
    const sampleFiles: UploadedFile[] = [
     
    ];

    this.uploadedFiles = sampleFiles;
  } */

  writeValue(value: UploadedFile[] | null): void {
    if (value) {
      this.uploadedFiles = value;
      let allFileNames = this.uploadedFiles.map(file => {
        return file.IsDeleted ? null : file.name
      });;
      this.fileName.set(allFileNames);
      // If files are loaded, assume extraction is complete for visual consistency
      this.extractionProgress = value.length > 0 ? 100 : 0;
    } else {
      this.uploadedFiles = [];
      this.fileName.set([]);
      this.extractionProgress = 0;
    }
  }

  /**
   * Registers a function to be called when the control receives a change event.
   * @param fn The function to register.
   */
  registerOnChange(fn: (value: UploadedFile[] | null) => void): void {
    this.onChange = fn;
  }
  /**
   * Registers a function to be called when the control receives a touch event.
   * @param fn The function to register.
   */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  /**
   * Validates the form control.
   * @param control The AbstractControl representing the form control.
   * @returns An object of validation errors, or null if valid.
   */
  validate(control: AbstractControl): ValidationErrors | null {
    const errors: ValidationErrors = {};
    if (this.required && (!this.uploadedFiles || this.uploadedFiles.length === 0)) {
      return { 'requiredFile': true };
    }
    if (this.fileSizeError) {
      errors['fileSizeExceeded'] = true;
    }
    if (this.fileTypeError) {
      errors['fileTypeError'] = true;
    }
    return Object.keys(errors).length > 0 ? errors : null;
  }

  // معالجة تحديد الملفات
  onFileSelected(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.processFiles(files);
      this.onTouched();
      this.textBoxValue = '';
      this.areAllFilesDeleted()
      // Update fileName signal to include all uploaded files

      // Reset the input value to allow selecting the same file again
      event.target.value = '';
    }
  }


  // معالجة السحب فوق المنطقة
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    target.classList.add('drag-over');
  }

  // معالجة مغادرة منطقة السحب
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
  }

  // معالجة إسقاط الملفات
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const target = event.currentTarget as HTMLElement;
    target.classList.remove('drag-over');

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      if (this.multiple === true || (this.multiple === false && files.length === 1)) {
        this.processFiles(files);
        this.filesDropped.emit(files);
      } else {
        Swal.fire({
          icon: 'error',
          title: this.translations()?.fileMultiErrMsg.label,
          showConfirmButton: true,
          confirmButtonText: this.translations()?.validationMsgBtn.label
        })

      }
    }
    const allFileNames = this.uploadedFiles.map(file => {
      return file.IsDeleted ? null : file.name
    });;
    this.fileName.set(allFileNames);

    this.onTouched();
  }

  // تشغيل اختيار الملف
  triggerFileInput(): void {
    const fileInput = document.getElementById(this.uploadId) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  // معالجة الملفات وإضافتها للقائمة
  // Process files and add them to the list
  private processFiles(files: FileList): void {
    this.loading = true;
    this.fileService.fileLoader.update((value) => {
      value[this.attachment!.ID] = true
      return value
    });
    this.spinner.show(this.uploadId);

    const newUploadedFiles: UploadedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check file type validation
      if (!this.isValidFileType(file)) {
        this.loading = false;
        this.spinner.hide(this.uploadId)
        this.fileService.fileLoader.update((value) => {
          value[this.attachment!.ID] = false
          return value
        });
        Swal.fire({
          icon: "error",
          title: this.store.locale == 'en' ? this.errorMessages.ValidMsgEnAllowedFile : this.errorMessages.ValidMsgArAllowedFile,
          padding: '10px 20px',
          confirmButtonText: this.translations()?.validationMsgBtn.label,
        })

        return;
      }

      // Check file size
      const fileSizeKB = file.size / 1024;
      if (fileSizeKB > this.maxFileSizeKB) {
        this.loading = false;
        this.spinner.hide(this.uploadId)
        this.fileService.fileLoader.update((value) => {
          value[this.attachment!.ID] = false
          return value
        });
        Swal.fire({
          icon: "error",
          title: this.store.locale == 'en' ? this.errorMessages.ValidMsgEnMaxSize : this.errorMessages.ValidMsgArMaxSize,
          padding: '10px 20px',
          confirmButtonText: this.translations()?.validationMsgBtn.label,
        })
        /*  Swal.close(); */
        return;
      }

      const uploadedFile: UploadedFile = {
        name: file.name,
        [this.attachmentNameKey]: this.textBoxValue || null,
        [this.AttachmentDocIDKey]: null,
        size: file.size,
        type: file.type,
        IsDeleted: false,
        uploadDate: new Date(),
        progress: 0,
        status: 'uploading',
        rawFile: file
      };
      newUploadedFiles.push(uploadedFile);
      /*   this.simulateUpload(uploadedFile); */
    }
    // If multiple is true, append to existing files; otherwise replace 12
    if (this.multiple) {
      this.uploadedFiles = [...this.uploadedFiles, ...newUploadedFiles];
    } else {
      if(this.recordedFiles()){
        this.uploadedFiles = [...this.uploadedFiles, ...newUploadedFiles];
      }else{
        this.uploadedFiles = newUploadedFiles;
      }
    }
    let rawFiles = this.uploadedFiles.map((file) => file.rawFile)
    const observables = rawFiles.map((file, index) => this.fileService.uploadFile(file, this.attachment?.HasModel ? this.attachment.ModelURL! : 'nomodel', this.attachment?.AIHelpAr).pipe(
      tap((res: FileMetadata) => res ? this.uploadedFiles[index][this.AttachmentDocIDKey] = res.FileId.FileID : '')
    ));
    forkJoin(observables).subscribe({
      next: (res: any) => {
        for (let i = 0; i < res.length; i++) {
          if (res[i]?.AnalysisResult) {
            this.uploadedFiles[0].Confidence = this.attachment?.AIHelpAr ? res[i].AnalysisResult.Confidence : null;
            this.aiPercent.set(+res[i].AnalysisResult.Confidence);
            for (const key in res[i].AnalysisResult.fields) {
              if (!Object.hasOwn(res[i].AnalysisResult.fields, key)) continue;
              const fieldData = res[i].AnalysisResult.fields[key];
              const fieldToUpdate = this.newApplicationService.uiResponseAllFields()!.find(f => f.AiMappingName === key && f.RelatedAIFKAttachmentTypeID === this.attachment?.ID);
              if (fieldToUpdate && fieldData.valueString && fieldToUpdate.RelatedAIFKAttachmentTypeID === this.attachment?.ID) {
                if (fieldToUpdate.FieldType === 3 || fieldToUpdate.FieldType === 23) {
                  fieldData.valueString = this.ensureDDMMYYYY(fieldData.valueString);
                  console.log(fieldData.valueString);
                }
                if (fieldToUpdate.FieldType === 4 || fieldToUpdate.FieldType === 19 || fieldToUpdate.FieldType === 6) {
                  fieldData.valueString = fieldToUpdate.LookupValues!.find((lv) => {
                    return [lv.ISOLookupID, lv.ISOTitleAr?.toLocaleLowerCase(), lv.ISOTitleEn?.toLocaleLowerCase(),
                    lv.TitleAr?.toLocaleLowerCase(), lv.TitleEn?.toLocaleLowerCase(), lv.TitleEn.toLocaleLowerCase(), lv.TitleAr.toLowerCase()
                    ].includes(fieldData.valueString.toLowerCase());
                  })?.LookupID

                }
                if (fieldData) {
                  this.form.get(fieldToUpdate.InternalFieldName)?.setValue(fieldData.valueString);
                }

              }
            }
            if (res[i].AnalysisResult.DescriptionTemplates) {
              for (const key in res[i].AnalysisResult.DescriptionTemplates) {
                if (!Object.hasOwn(res[i].AnalysisResult.DescriptionTemplates, key)) continue;
                let fieldData = res[i].AnalysisResult.DescriptionTemplates[key];
                const fieldToUpdate = this.newApplicationService.uiResponseAllFields()!.find(f => f.AiMappingName === key);
                if (fieldToUpdate && fieldData && fieldToUpdate.RelatedAIFKAttachmentTypeID === this.attachment?.ID) {
                  if (fieldToUpdate.FieldType === 11 || fieldToUpdate.FieldType === 12 || fieldToUpdate.FieldType === 15 || fieldToUpdate.FieldType === 20) {
                    // Step 1: Remove line breaks (as in your original code)
                    fieldData = fieldData.replace(/(\r\n|\n|\r)/gm, '');

                    // Step 2: Extract the number
                    const regex = /[0-9٠-٩]+/g;

                    const extractedNumbers: any = [];
                    const matchResult = fieldData.replace(regex, (num: any) => {
                      const converted = num.replace(/[٠-٩]/g, (d: any) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
                      extractedNumbers.push(converted);
                      return converted; // also replace in text
                    });
                    let number = extractedNumbers[0] || '';
                    fieldData = +number;
                  }
                  if (fieldToUpdate.FieldType === 4) {
                    const lines = fieldData.split('\n').map((line: any) => line.trim()).filter(Boolean);

                    // 2️⃣ Prepare result containers
                    const checked: string[] = [];
                    const unchecked: string[] = [];

                    // 3️⃣ Classify each line
                    for (const line of lines) {
                      if (line.startsWith('●')) {
                        checked.push(line.replace(/^●\s*/, '').trim());
                      } else if (line.startsWith('·')) {
                        unchecked.push(line.replace(/^·\s*/, '').trim());
                      }
                    }
                    checked.map((val: any) => {
                      let newData = fieldToUpdate.LookupValues!.find((lv) => {
                        console.log(`'${lv.ISOTitleAr}' = '${val.replace(/[:-\s]+$/, '').toLowerCase()}'? ${lv.ISOTitleAr?.toLocaleLowerCase() === val.replace(/[.:;\-\s]+$/, '').toLowerCase()}`);
                        return [lv.ISOLookupID, lv.ISOTitleAr?.toLocaleLowerCase(), lv.ISOTitleEn?.toLocaleLowerCase(),
                        lv.TitleAr?.toLocaleLowerCase(), lv.TitleEn?.toLocaleLowerCase()
                        ].includes(val.replace(/[:-\s]+$/, '').toLowerCase());
                      })?.LookupID
                      return newData || ''
                    })
                    fieldData = checked.filter((val: any) => !!val);
                  }
                  if (fieldToUpdate.FieldType === 17) {
                    fieldData = fieldData.replace(/\n/g, '<br>');
                  }
                  this.form.get(fieldToUpdate.InternalFieldName)?.setValue(fieldData);
                }


              }
            }

            if (res[i].AnalysisResult.AnnualReport) {
              for (const key in res[i].AnalysisResult.AnnualReport) {
                if (!Object.hasOwn(res[i].AnalysisResult.AnnualReport, key)) continue;
                let fieldData = res[i].AnalysisResult.AnnualReport[key];
                const fieldToUpdate = this.newApplicationService.uiResponseAllFields()!.find(f => f.AiMappingName === key);
                if (fieldToUpdate && fieldData && fieldToUpdate.RelatedAIFKAttachmentTypeID === this.attachment?.ID) {
                  if (fieldToUpdate.FieldType !== 8) {
                    if (Array.isArray(fieldData)) {
                      fieldData = fieldData[0];
                    }
                    this.form.get(fieldToUpdate.InternalFieldName)?.setValue(fieldData);
                  } else {
                    if (key === 'SportActAnnualGrowth' || key === 'SportActSelfEvaluation') {
                      let extractedData: any = []
                      extractedData = this.processSportActAnnualGrowth(fieldData, key);
                      console.log('data created from sport act: ', extractedData);
                      for (let i = extractedData.length - 1; i >= 0; i--) {
                        let formArray = this.form.get(fieldToUpdate.InternalFieldName) as FormArray;
                        let lastIndex = formArray.length - 1;
                        let shouldRemove = false;
                        for (const tableFieldName in extractedData[i]) {
                          if (!Object.hasOwn(extractedData[i], tableFieldName)) continue;

                          const fieldToUpdate2 = fieldToUpdate.TableServiceFields!.find(f => f.InternalFieldName === tableFieldName);
                          if (fieldToUpdate2 && extractedData[i][tableFieldName]) {
                            if (fieldToUpdate2.FieldType === 4 || fieldToUpdate2.FieldType === 19 || fieldToUpdate2.FieldType === 6) {
                              if (isNaN(+extractedData[i][tableFieldName])) {
                                extractedData[i][tableFieldName] = fieldToUpdate2.LookupValues!.find((lv) => {
                                  return [lv.ISOLookupID, lv.ISOTitleAr?.toLowerCase(), lv.ISOTitleEn?.toLowerCase(),
                                  lv.TitleAr?.toLowerCase(), lv.TitleEn?.toLowerCase()
                                  ].includes(extractedData[i][tableFieldName].toLowerCase().replace(/^[^(\p{L}|\s)]+|[^(\p{L}|\s)]+$/gu, '').trim());
                                })?.LookupID
                              } else {
                                extractedData[i][tableFieldName] = fieldToUpdate2.LookupValues!.find((lv) => {
                                  return [lv.ISOLookupID, lv.ISOTitleAr, lv.ISOTitleEn,
                                  lv.TitleAr, lv.TitleEn
                                  ].includes(`${extractedData[i][tableFieldName]}`);
                                })?.LookupID
                              }
                              if (!extractedData[i][tableFieldName]) {
                                console.log(extractedData[i]);
                                shouldRemove = true;
                                break;
                              }
                            }
                          }
                        }
                        if (shouldRemove) {
                          extractedData.splice(i, 1);
                          continue;
                        }
                        formArray.at(lastIndex).patchValue(extractedData[i]);

                        this.addTableRow(fieldToUpdate);
                        // trigger table to read rows


                        /* formArray.updateValueAndValidity(); */
                      }
                    }

                    if (key === 'SportActSocialMedia') {
                      let newRows: any = []
                      for (let i = 0; i < fieldData.length; i++) {
                        if (!fieldData[i].includes('-') && fieldData[i].includes(':')) {
                          newRows.push(this.extractSocialLink(fieldData[i]));
                        }
                      }
                      for (let i = 0; i < newRows.length; i++) {
                        for (const tableFieldName in newRows[i]) {
                          if (!Object.hasOwn(newRows[i], tableFieldName)) continue;
                          const fieldToUpdate2 = fieldToUpdate.TableServiceFields!.find(f => f.InternalFieldName === tableFieldName);
                          if (fieldToUpdate2 && newRows[i][tableFieldName]) {
                            if (fieldToUpdate2.FieldType === 4 || fieldToUpdate2.FieldType === 19 || fieldToUpdate2.FieldType === 6) {
                              newRows[i][tableFieldName] = fieldToUpdate2.LookupValues!.find((lv) => {
                                return [lv.ISOLookupID, lv.ISOTitleAr?.toLowerCase(), lv.ISOTitleEn?.toLocaleLowerCase(),
                                lv.TitleAr?.toLocaleLowerCase(), lv.TitleEn?.toLocaleLowerCase()
                                ].includes(newRows[i][tableFieldName].toLowerCase());
                              })?.LookupID

                            }
                          }
                        }
                      }

                      console.log(newRows);
                      let formArray = this.form.get(fieldToUpdate.InternalFieldName) as FormArray;
                      let lastIndex = formArray.length - 1;
                      for (let i = 0; i < newRows.length; i++) {
                        formArray.at(lastIndex).patchValue(newRows[i]);
                        this.addTableRow(fieldToUpdate);
                      }
                    }

                    if (key === 'SportActLongTermGoals') {
                      let formArray = this.form.get(fieldToUpdate.InternalFieldName) as FormArray;
                      for (let i = 0; i < fieldData.length; i++) {
                        let lastIndex = formArray.length - 1;
                        let matchResult = fieldData[i].match(/^[^:]+/u);
                        matchResult = matchResult ? matchResult[0] : '';
                        if (matchResult) {
                          // Regex: Match any character that is NOT a Unicode Letter (\p{L}) or a space (\s)
                          // at the START (^) or END ($) of the string.
                          // The 'g' flag ensures it applies globally (to both start and end).
                          // The 'u' flag is necessary for \p{L} to correctly match Arabic characters.
                          matchResult = matchResult.replace(/^[^(\p{L}|\s)]+|[^(\p{L}|\s)]+$/gu, '').trim();
                        }
                        fieldData[i] = fieldToUpdate.TableServiceFields!.find(f => f.InternalFieldName === 'GoalsQuestionID')?.LookupValues!.find((lv) => {
                          return [lv.ISOLookupID, lv.ISOTitleAr?.toLocaleLowerCase(), lv.ISOTitleEn?.toLocaleLowerCase(),
                          lv.TitleAr?.toLocaleLowerCase(), lv.TitleEn?.toLocaleLowerCase()
                          ].includes(matchResult.toLowerCase());
                        })?.LookupID

                        if (fieldData[i]) {
                          formArray.at(lastIndex).get('GoalsQuestionID')?.patchValue(fieldData[i]);
                          this.addTableRow(fieldToUpdate);
                        }
                      }
                      console.log(fieldData);
                    }
                    let currVal = this.newApplicationService.rowsFromApi();
                    this.newApplicationService.rowsFromApi.set([...currVal]);

                  }
                }
              }
            }
            console.log(this.form.value);
          }
        }
        const allFileNames = this.uploadedFiles.map(file => {
          return file.IsDeleted ? null : file.name
        });
        this.fileName.set(allFileNames);
        this.loading = false;
        this.spinner.hide(this.uploadId)
        this.fileService.fileLoader.update((value) => {
          value[this.attachment!.ID] = false
          return value
        });
        const toast = Swal.mixin({
          toast: true,
          position: 'bottom-end',
          showConfirmButton: false,
          timer: 3000,
          showCloseButton: true,
          customClass: {
            popup: `color-success`
          },
          target: document.getElementById('success-toast')
        });
        if (!this.attachment!.HasModel) {
          toast.fire({
            icon: "success",
            html: `<span class="text-lg m-3 font-bold">${this.translations()?.swalFileSuccessMsg.label}</span>`
          })
        } else {
          toast.fire({
            icon: "success",
            html: `<span class="text-lg m-3 font-bold">${this.translations()?.swalAiFileSuccessMsg.label}</span>`
          })
        }
        return this.onChange(this.uploadedFiles)
      },
      error: (err) => {
        console.log(err);
        /* Swal.close(); */
        this.loading = false;
        this.spinner.hide(this.uploadId)
        this.uploadedFiles = []
        this.fileService.fileLoader.update((value) => {
          value[this.attachment!.ID] = false
          return value
        });
        Swal.fire({
          icon: 'error',
          title: this.translations()?.swalFileErrMsg.label,
          showConfirmButton: true,
          confirmButtonText: this.translations()?.validationMsgBtn.label
        })
      }
    });
  }
  onTextBoxChange(event: any): void {
    this.textBoxValue = event.target.value;
    this.onTouched();
  }
  // Validate file type against acceptedTypes
  private isValidFileType(file: File): boolean {
    if (this.acceptedTypes === '*') {
      return true; // Accept all file types
    }

    const fileName = file.name.toLowerCase();
    const acceptedExtensions = this.acceptedTypes.toLowerCase().split(',').map(ext => ext.trim());
    return acceptedExtensions.some(ext => {
      if (ext.startsWith('.')) {
        return fileName.endsWith(ext);
      }
      // Handle MIME types if needed
      return fileName.endsWith(ext);
    });
  }

  // Simulate upload progress
  /*  private simulateUpload(file: UploadedFile): void {
     const interval = setInterval(() => {
       file.progress += Math.random() * 20;
       if (file.progress >= 100) {
         file.progress = 100;
         file.status = 'completed';
         clearInterval(interval);
         // Notify the form again after upload completes (optional, but good for validation)
         this.onChange(this.uploadedFiles);
       }
     }, 200);
   } */

  // Remove a file from the list
  removeFile(index: number): void {
    console.log(this.fileName());
    console.log(index);
    Swal.fire({
      icon: 'question',
      title: this.translations()?.swalConfirmTitle.label,
      text: this.translations()?.swalConfirmDeleteText.label,
      showCancelButton: true,
      confirmButtonText: this.translations()?.validationMsgBtn.label,
      cancelButtonText: this.translations()?.validationMsgCancelBtn.label,
    }).then((result: any) => {
      if (result.isConfirmed) {
        if (this.attachment!.HasModel) {
          this.clearAnalyzedData();
        }
        
        if (this.recordedFiles()) {

          this.uploadedFiles[index].IsDeleted = true;
          this.onChange(this.uploadedFiles); // Notify the form about the change
          this.onTouched(); // Mark as touched
          this.areAllFilesDeleted();
          this.fileName.update((currArr: any) => currArr.map((item: any, i: number) => i === index ? null : item));
        } else {
          this.uploadedFiles.splice(index, 1);
          const allFileNames = this.uploadedFiles.map(file => {
            return file.IsDeleted ? null : file.name
          });
          this.fileName.set(allFileNames);
          this.onChange(this.uploadedFiles); // Notify the form about the change
          this.onTouched(); // Mark as touched
        }
        Swal.fire({
          icon: 'success',
          title: this.translations()?.swalDeleteSuccess.label,
          confirmButtonText: this.translations()?.validationMsgBtn.label
        })
      }
    })
  }

  // تنسيق حجم الملف
  // Format file size for display
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // تنسيق التاريخ
  formatDate(date: Date): string {
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  // الحصول على تسمية الملف
  /* getFileLabel(index: number): string {
    const labels = [
      'اسم المدير المسؤول',
      'رقم بطاقة الهوية الشخصية',
      'البريد الإلكتروني',
      'جوال المدير المسؤول',
      'رقم الرخصة التجارية'
    ];
    return labels[index] || `ملف ${index + 1}`;
  } */

  // Clear all files
  clearAllFiles(): void {
    this.uploadedFiles = [];
    this.extractionProgress = 0;
    this.onChange(this.uploadedFiles); // Notify the form about the change
    this.onTouched(); // Mark as touched
  }

  // إعادة استخراج البيانات
  // Re-extract data (simulated)
  reExtractData(): void {
    this.extractionProgress = 0;
    const interval = setInterval(() => {
      this.extractionProgress += 10;
      if (this.extractionProgress >= 100) {
        clearInterval(interval);
      }
    }, 100);
  }
  isMobileScreen = false;
  checkScreenSize() {
    this.isMobileScreen = window.innerWidth < 576;
    return this.isMobileScreen;
  }
  showFile(index: any) {
    /*  this.fileService.readFile(this.uploadedFiles[index][this.AttachmentDocIDKey]).subscribe((res: any) => {
       console.log(res);
     }) */
    const imageUrl = `${this.baseUrl}/api/Files/read/${this.uploadedFiles[index][this.AttachmentDocIDKey]}`;

    // Use window.open() to open the image URL in a new tab.
    window.open(imageUrl, '_blank');
  }
  allFilesDeleted = signal<any>(false)
  areAllFilesDeleted() {
    this.allFilesDeleted.set(this.uploadedFiles.every(file => {
      return file.IsDeleted && file.IsDeleted === true
    }));
  }

  get groupedFormats() {
    const inputFormats = this.acceptedTypes
      .split(',')
      .map(f => f.replace('.', '').trim().toLowerCase());

    const grouped: { category: string; types: string[] }[] = [];
    const matchedExtensions = new Set<string>();

    for (const [category, list] of Object.entries(this.formatGroups)) {
      const matched = inputFormats.filter(f => list.includes(f));
      if (matched.length) {
        matched.forEach(m => matchedExtensions.add(m));
        grouped.push({
          category,
          types: matched.map(m => m.toUpperCase()),
        });
      }
    }

    // Handle anything that didn't match a known group
    const unknowns = inputFormats.filter(f => !matchedExtensions.has(f));
    if (unknowns.length) {
      grouped.push({
        category: 'Others',
        types: unknowns.map(f => f.toUpperCase()),
      });
    }

    return grouped;
  }

  /**
 * Ensures the date string is in 'dd/mm/yyyy' format.
 *
 * @param dateString The date string from the API (e.g., '31/12/2023' or '2023/12/31').
 * @returns The formatted date string in 'dd/mm/yyyy' or null if parsing fails.
 */
  /**
  * Ensures the date string is in 'dd/mm/yyyy' format.
  *
  * @param dateString The date string from the API (e.g., '31/12/2023' or '2023/12/31').
  * @returns The formatted date string in 'dd/mm/yyyy' or null if parsing fails.
  */
  ensureDDMMYYYY(dateString: string | null | undefined): string | null {
    if (!dateString) {
      return null;
    }

    // Helper to format a Date object into 'dd/mm/yyyy'
    const formatDate = (date: Date): string => {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
      const year = date.getFullYear().toString();
      return `${day}/${month}/${year}`;
    };

    // 1. Try to parse as dd/mm/yyyy
    let dateParts = dateString.split('/');
    if (dateParts.length === 3) {
      // A. Check for dd/mm/yyyy format (e.g., 31/12/2023)
      // Here, day is the first part, month the second, year the third.
      // We check if the day part is likely a day (e.g., > 12)
      if (parseInt(dateParts[0]) > 12 && parseInt(dateParts[2]) > 1900) {
        // It looks like dd/mm/yyyy where day > 12
        const date = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
        // Validate the created date object
        if (!isNaN(date.getTime()) && date.getFullYear() === parseInt(dateParts[2])) {
          return formatDate(date);
        }
      }

      // B. Check for yyyy/mm/dd format (e.g., 2023/12/31)
      // Year is the first part, month the second, day the third.
      if (parseInt(dateParts[0]) > 1900) {
        const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
        // Validate the created date object
        if (!isNaN(date.getTime()) && date.getFullYear() === parseInt(dateParts[0])) {
          return formatDate(date);
        }
      }

      // C. Fallback for ambiguous cases (where day <= 12, e.g., 05/11/2023 vs 2023/11/05)
      // In Angular's built-in Date pipe, Date constructor, or date-fns, if you
      // provide a string like '05/11/2023', it's often interpreted as US format: mm/dd/yyyy.
      // If the input is already 'dd/mm/yyyy' and both d and m are <= 12, it's ambiguous.
      // A safer, more comprehensive library like 'date-fns' or 'moment.js' (with specific format parsing)
      // is recommended for production.
      // For this limited scope, we'll try to treat it as dd/mm/yyyy if the yyyy/mm/dd check failed.
      const date = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
      if (!isNaN(date.getTime()) && date.getFullYear() === parseInt(dateParts[2])) {
        return formatDate(date);
      }
    }

    // If none of the above specific patterns matched or could be parsed,
    // we attempt a generic Date parse (which is unreliable but serves as a final fallback).
    const genericDate = new Date(dateString);
    if (!isNaN(genericDate.getTime())) {
      return formatDate(genericDate);
    }

    // Failed to parse
    return dateString; // Or throw an error, or return null, depending on requirements
  }
  processSportActAnnualGrowth(lines: string[], type: string): any[] {
    const results: any[] = [];

    // Regex to find all sequences of digits, optionally including a decimal point.
    // The 'g' flag is essential for finding ALL matches.
    const numberRegexGlobal = /(\d+(\.\d+)?)/g;

    for (const line of lines) {
      const content = line.trim();

      if (!content) {
        continue; // Skip empty lines
      }

      // 1. Find the last colon, which is the definitive boundary for the GrowthIndexID
      const lastColonIndex = content.lastIndexOf(':');

      if (lastColonIndex === -1) {
        console.warn(`[SKIP] No colon separator found for Index ID: ${line}`);
        continue;
      }

      // 2. The descriptive part is everything BEFORE the last colon.
      const rawGrowthIndexID = content.substring(0, lastColonIndex).trim();

      // 3. The number data is everything AFTER the last colon.
      const rawNumbersSection = content.substring(lastColonIndex + 1).trim();

      // 4. Find ALL number matches in the raw numbers section
      const allMatches = Array.from(rawNumbersSection.matchAll(numberRegexGlobal));

      if (allMatches.length === 0) {
        console.warn(`[SKIP] No full number found in number section: ${line}`);
        continue;
      }

      // 5. Select the LAST number match from the section
      const lastMatch = allMatches[allMatches.length - 1];

      // The full number string (e.g., "2" or "110") is lastMatch[1]
      const lastNumStr = lastMatch[1];

      // 6. The Answer is the parsed number
      const answer = parseFloat(lastNumStr);

      // 7. Clean up the GrowthIndexID: remove any trailing non-word characters (like ':', '-', or extra spaces)
      // This is primarily defensive, ensuring the ID is clean.
      let cleanedGrowthIndexID = rawGrowthIndexID
        // Step 7a: Remove leading list numbering (e.g., "1.", "2. ", "10.")
        .replace(/^\s*\d+\.\s*/, '')
        // Step 7b: Remove any trailing non-word characters (like ':', '-', or extra spaces)
        .replace(/[:-\s]+$/, '');


      // 8. Final Checks
      // Check if the extracted number is valid (not NaN) and the cleaned index ID is not empty
      if (!isNaN(answer) && cleanedGrowthIndexID.length > 0) {
        if (type !== 'SportActSelfEvaluation') {
          results.push({
            GrowthIndexID: cleanedGrowthIndexID,
            Answer: answer
          });
        } else {
          results.push({
            EvaluationIndexID: cleanedGrowthIndexID,
            GradeId: answer
          })
        }
      } else {
        // Log more specific reason for skipping
        if (cleanedGrowthIndexID.length === 0) {
          console.warn(`[SKIP] Index ID missing: ${line}`);
        } else {
          console.warn(`[SKIP] Invalid number found or parsing failed: ${line}`);
        }
      }
    }

    return results;
  }

  addTableRow(field: FieldJson): void {
    const formArray = this.form!.get(field.InternalFieldName)! as FormArray;
    const newFormGroup = new FormGroup({});

    // Add controls for each table field
    field.TableServiceFields?.forEach(tableField => {
      if (tableField.FieldType === 14) {
        return;
      }
      const validators = [];
      let defaultValue: any = ''
      if ((tableField.FieldType === 6 && tableField.Required) || (tableField.FieldType === 5 && tableField.Required)
        || (tableField.FieldType === 19 && tableField.Required)) {
        validators.push(CustomValidators.noNegativeOne);
      } else if (tableField.Required) {
        validators.push(Validators.required);
      }
      if (tableField.FieldType === 6 || (tableField.FieldType === 5)
        || (tableField.FieldType === 19)) {
        defaultValue = +tableField.FieldDefaultValue || tableField.LookupValues![0].LookupID
      }

      if (tableField.FieldType === 21) {
        validators.push(Validators.email)
      }
      if (tableField.MAX_Length > 0 && (tableField.FieldType === 12 || tableField.FieldType === 15 || tableField.FieldType === 11 || tableField.FieldType === 20)) {
        validators.push(Validators.maxLength(tableField.MAX_Length));
      }
      if ((tableField.FieldType === 12 || tableField.FieldType === 15 || tableField.FieldType === 11 || tableField.FieldType === 20) && (tableField.MIN_Length > 0)) {
        validators.push(CustomValidators.numberMinLength(tableField.MIN_Length))
      }
      const control = new FormControl({ value: defaultValue, disabled: !!tableField.IsSystemField }, validators);
      newFormGroup.addControl(tableField.InternalFieldName, control);
    });

    formArray.push(newFormGroup);
  }

  extractSocialLink(socialString: string): any {
    // Use the first colon (':') as the separator.
    const parts = socialString.split(':');

    // Check if the string was successfully split into at least two parts
    if (parts.length < 2) {
      // Return null or throw an error if the format is not as expected
      return null;
    }

    // The first part is the SocialTypeID. Use trim() to remove any leading/trailing spaces.
    const socialTypeID = parts[0].trim();

    // The rest of the string, joined by ':' (in case the URL itself contains colons, 
    // like "http://"), forms the Url.
    // We use slice(1) to get all parts after the first one, then join them back 
    // with ':' and trim any spaces.
    const url = parts.slice(1).join(':').trim();

    // Basic check to ensure neither field is empty
    if (!socialTypeID || !url) {
      return null;
    }

    return {
      SocialTypeID: socialTypeID,
      Url: url,
    };
  }
  openAnalysisModel = signal(false);
  triggerAiAnalysis(fileID: string) {
    this.fileService.readFileAnalysis(fileID).subscribe((res: any) => {
      this.fileService.fileAnalysisData.set({ ...this.fileService.fileAnalysisData(), [this.attachment!.ID]: res });
      this.openAnalysisModel.set(true)
    })
  }
  onUserClose(event: any) {
    this.openAnalysisModel.set(false)
  }

  clearAnalyzedData(): void {
    // Assuming 'res' is accessible or you know which fields to clear
    // We'll iterate through the structure as in your original code to find the InternalFieldName
    // For simplicity and safety, we'll try to find ALL fields and clear them.

    // 1. Clear simple fields (from AnalysisResult.fields and AnalysisResult.DescriptionTemplates)
    const allUiFields = this.newApplicationService.uiResponseAllFields();

    if (!allUiFields) {
      console.warn('UI fields data is not available for clearing.');
      return;
    }

    // Filter fields relevant to the current attachment ID (if needed)
    const fieldsToClear = allUiFields.filter(f => f.RelatedAIFKAttachmentTypeID === this.attachment?.ID);

    for (const fieldToUpdate of fieldsToClear) {
      const control = this.form.get(fieldToUpdate.InternalFieldName);

      if (control) {
        // Clear simple controls (like input, date, dropdowns, etc.)
        if (fieldToUpdate.FieldType !== 8) { // Assuming 8 is FormArray/Table
          control.setValue(null); // or '' for string inputs
          // Note: For checkboxes/radios, you might need a specific default value, 
          // but null/empty string is a good general clear.
        } else {
          // 2. Clear FormArray/Table data (FieldType === 8)
          const formArray = control as FormArray;
          while (formArray.length !== 1) {
            formArray.removeAt(0);
          }

          // Optional: Re-add a blank row if your UI requires at least one row, 
          // similar to what 'this.addTableRow(fieldToUpdate)' might do.
          // You'll need to call your addTableRow method here if that's the desired behavior.
          // this.addTableRow(fieldToUpdate); 
        }

        control.markAsPristine();
        control.markAsUntouched();

        // If you are tracking rows outside the form (like in your original code)
        if (fieldToUpdate.FieldType === 8) {
          let currVal = this.newApplicationService.rowsFromApi();
          this.newApplicationService.rowsFromApi.set([]); // Clear the tracked array
          // Re-set or update rowsFromApi if you re-add a blank row above.
        }
      }
    }

    // 3. Optional: Clear Confidence/AI Percent
    this.uploadedFiles[0].Confidence = undefined;
    this.aiPercent.set(0); // Assuming 0 or null is the clear state

    console.log('Analyzed data cleared from the form.');
  }


}
