import { Component, Input, OnInit, Output, EventEmitter, signal, ChangeDetectorRef, input, effect, ElementRef, ViewChild, output } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
import { debounceTime, distinctUntilChanged, of, skip, Subject, switchMap, takeUntil } from 'rxjs';
import { basic, timeBasic } from 'src/app/helpers/date-helper';
import { FileActionsService } from 'src/app/service/file-actions.service';
import { LocalizationService } from 'src/app/service/localization.service';
import { NewApplicationService } from 'src/app/service/new-application.service';
import { WizardServiceService } from 'src/app/service/wizard-service.service';
import { CustomValidators } from 'src/app/validators/custom-validators';
import { AppState, indexState } from 'src/types/auth.types';
import { FileMetadata } from 'src/types/fileActions.types';
import { Action, AttachmentField, Attachments, FieldJson, LookupValue, NavigationTab, ServiceApiPayload, TableServiceField } from 'src/types/newApplication.types';
import Swal, { SweetAlertOptions } from 'sweetalert2';
import { TermsConditionsService } from 'src/app/service/terms-conditions.service';
import { NgxSpinnerService } from "ngx-spinner";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { environment } from 'src/environments/environment';
import { MenuLinksService } from 'src/app/service/menu-links.service';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
@Component({
  selector: 'app-dynamic-field',
  templateUrl: './dynamic-field.component.html'
})
export class DynamicFieldComponent implements OnInit {

  @Input() field!: FieldJson;
  @Input() form!: FormGroup; // The full wizardForm
  @Output() isHidden = new EventEmitter<boolean>();
  store!: AppState;
  public isHiddenState = input<boolean>();
  fieldTypeMap: { [key: number]: string } = {};
  modules2 = {
    toolbar: [[{ header: [1, 2, false] }], ['bold', 'italic', 'underline', 'link'], [{ list: 'ordered' }, { list: 'bullet' }], ['clean']],
  };
  basic = basic
  cols: any[] = [];
  rows = signal<any>([])
  editFlag = signal<any>('')
  public sanitizedHtml!: SafeHtml;
  private destroy$ = new Subject<void>();
  fileLoading = signal<boolean>(false);
  emitLoadingState = output<boolean>();
  translations = signal<any>('');
  techFiles: any;
  baseUrl = environment.apiUrl
  expandedFields: any[] = [];
  showSideDrawer: boolean = false;
  shouldBeDim = signal<boolean>(false)
  dateTime = timeBasic;
  actions = input.required<Action[]>();
  @ViewChild('techCheckbox') techCheckbox!: ElementRef<HTMLInputElement>;
  private previousRowsFromApi: any = null;
  constructor(
    private wizardService: WizardServiceService,
    public storeData: Store<AppState>,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private localizationService: LocalizationService,
    private fileService: FileActionsService,
    public newApplicationService: NewApplicationService,
    private fb: FormBuilder,
    private termsConditionsService: TermsConditionsService,
    private spinner: NgxSpinnerService,
    private menuLinksService: MenuLinksService,
    private router: Router
  ) {
    this.initStore();
    this.techFiles = this.newApplicationService.technicalApprovalFiles;
    effect(() => {
      if (this.field.FieldType === 8) {
        let tableTrigger = this.newApplicationService.reTriggerTable();
        let data: any;
        if (this.newApplicationService.requestData() || this.newApplicationService.newRequestData()) {
          data = this.transformTableData()
        }
        let rowsFromApi: any = structuredClone(Object.values(this.newApplicationService.rowsFromApi()).flat().reduce((prev: any, curr) => prev.concat(curr), []));
        if (rowsFromApi.length > 0 || this.form.get(this.field.InternalFieldName)!.value.length > 1) {

          data = this.form.get(this.field.InternalFieldName)!.value.slice(0, -1).map((item: any, index: any) => {
            return { ...item, currentIndex: index + 1 }
          })
          data = data.map((obj: any, index: any) => {
            for (const key in obj) {
              if (Object.prototype.hasOwnProperty.call(obj, key)) {
                let tableField = this.field.TableServiceFields?.find((tableField) => tableField.InternalFieldName === key)
                if (tableField && (tableField.FieldType === 6 || tableField.FieldType === 4 || tableField.FieldType === 19)) {
                  let newVal = tableField.LookupValues!.find((Lookup) => Lookup.LookupID === obj[key]) ||
                    (this.store.index.locale === 'en' ? this.newApplicationService.requestData()?.[this.field.InternalFieldName]?.[index]?.[`${tableField.InternalFieldName}_TitleEn`] : this.newApplicationService.requestData()?.[this.field.InternalFieldName]?.[index]?.[`${tableField.InternalFieldName}_TitleAr`]);

                  if (newVal?.ValueCategoryAr || newVal?.ValueCategoryEn) {
                    let category = this.store.index.locale === 'en' ? newVal?.ValueCategoryEn : newVal?.ValueCategoryAr
                    obj[`${key}-${category}`] = this.store.index.locale === 'en' ? newVal?.TitleEn : newVal?.TitleAr;
                  } else {
                    obj[key] = (this.store.index.locale === 'en' ? newVal?.TitleEn : newVal?.TitleAr) || newVal;

                  }
                }
                if (tableField && tableField.FieldType === 3 && (this.newApplicationService.requestData() || this.newApplicationService.newRequestData())) {
                  obj[key] = obj[key] ? new Date(Date.parse(obj[key])).toLocaleDateString('en-GB') : '';
                }
                if (tableField && tableField.FieldType === 23 && (this.newApplicationService.requestData() || this.newApplicationService.newRequestData())) {
                  let dateValue = obj[key];
                  if (dateValue) {
                    let dateParts = dateValue.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}/);
                    if (dateParts) {
                      let date = new Date(Date.parse(dateParts[0]));
                      obj[key] = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-4)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                    }
                  }
                }
                if (tableField && tableField.FieldType === 10) {
                  if (obj[key]) {
                    if (this.fileUrl[key + (index + 1)] !== `${this.baseUrl}/api/Files/read/${obj[key]}`) {
                      this.fileUrl[key + (index + 1)] = `${this.baseUrl}/api/Files/read/${obj[key]}`;
                      ++this.tableFileIndex
                    }
                  }
                }
              }
            }
            return obj;
          })
          this.rows.set(data);


          return;
        }
        if (data) {

          let formArray = this.getFormArray(this.field.InternalFieldName)! as FormArray;
          let lastIndex = formArray.length;
          if (lastIndex === 1) {
            if (this.newApplicationService.requestData() || this.newApplicationService.newRequestData()) {
              const currentRowsFromApi = data;
              if (JSON.stringify(data) === JSON.stringify(this.previousRowsFromApi)) {
                console.log('API data is the same. Patching skipped.');
              }
              this.previousRowsFromApi = data;
              if (data) {
                let formArray = this.form!.get(this.field.InternalFieldName)! as FormArray;
                let lastIndex = formArray.length;
                if (formArray.length > 0) {
                  formArray.clear();
                }
                if (data.length > 0) {
                  data.forEach((singleRow: any) => {
                    this.addTableRow(this.field.InternalFieldName, undefined, this.newApplicationService.requestData() ? singleRow : undefined);
                    lastIndex = formArray.length;
                    // Patch the new last row with the API data
                    let newRowIndex = formArray.length - 1;
                    formArray.at(newRowIndex).patchValue(singleRow);
                  })
                  this.addTableRow(this.field.InternalFieldName)
                } else {
                  this.addTableRow(this.field.InternalFieldName)
                }
              }
            }
            let newData = data.map((obj: any, index: any) => {
              for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                  let tableField = this.field.TableServiceFields?.find((tableField) => tableField.InternalFieldName === key)
                  if (tableField && (tableField.FieldType === 6 || tableField.FieldType === 4 || tableField.FieldType === 19)) {
                    let newVal = tableField.LookupValues!.find((Lookup) => Lookup.LookupID === obj[key]) ||
                      (this.store.index.locale === 'en' ? this.newApplicationService.requestData()?.[this.field.InternalFieldName]?.[index]?.[`${tableField.InternalFieldName}_TitleEn`] : this.newApplicationService.requestData()?.[this.field.InternalFieldName]?.[index]?.[`${tableField.InternalFieldName}_TitleAr`]);
                    if (newVal?.ValueCategoryAr || newVal?.ValueCategoryEn) {
                      let category = this.store.index.locale === 'en' ? newVal?.ValueCategoryEn : newVal?.ValueCategoryAr
                      obj[`${key}-${category}`] = this.store.index.locale === 'en' ? newVal?.TitleEn : newVal?.TitleAr;
                    } else {
                      obj[key] = (this.store.index.locale === 'en' ? newVal?.TitleEn : newVal?.TitleAr) || newVal;

                    }
                  }
                  if (tableField && tableField.FieldType === 3 && (this.newApplicationService.requestData() || this.newApplicationService.newRequestData())) {
                    obj[key] = obj[key] ? new Date(Date.parse(obj[key])).toLocaleDateString('en-GB') : '';
                  }
                  if (tableField && tableField.FieldType === 23 && (this.newApplicationService.requestData() || this.newApplicationService.newRequestData())) {
                    let dateValue = obj[key];
                    if (dateValue) {
                      let dateParts = dateValue.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}/);
                      if (dateParts) {
                        let date = new Date(Date.parse(dateParts[0]));
                        obj[key] = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-4)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                      }
                    }
                  }
                  if (tableField && tableField.FieldType === 10) {
                    if (obj[key]) {
                      if (this.fileUrl[key + (index + 1)] !== `${this.baseUrl}/api/Files/read/${obj[key]}`) {
                        this.fileUrl[key + (index + 1)] = `${this.baseUrl}/api/Files/read/${obj[key]}`;
                        ++this.tableFileIndex
                      }
                    }
                  }
                }
              }
              obj.currentIndex = index + 1;
              return obj;
            })
            this.rows.set(newData);
          }
          /* this.updateColumns(); */
        } else if (!this.newApplicationService.rowsFromApi()) {
          this.rows.set([]);

        }
      }
      if (this.newApplicationService.requestData() || this.newApplicationService.newRequestData()) {
        if (this.field.FieldType === 9) {
          this.selectedFile.update((selectedFile: any) => ({ ...selectedFile, [this.field.InternalFieldName]: this.translations()?.storedAttachmentName.label }))
        }
        if (this.field.FieldType === 10) {
          if (this.newApplicationService.requestData() || this.newApplicationService.newRequestData()) {

            if (this.newApplicationService.requestData()?.[this.field.InternalFieldName] || this.newApplicationService.newRequestData()?.[this.field.InternalFieldName]) {
              this.selectedFile.update((selectedFile: any) => ({ ...selectedFile, [this.field.InternalFieldName]: this.store.index.locale === 'en' ? this.field.TitleEn : this.field.TitleAr }))
              this.fileUrl[this.field.InternalFieldName] = `${this.baseUrl}/api/Files/read/${this.newApplicationService.requestData()?.[this.field.InternalFieldName] || this.newApplicationService.newRequestData()?.[this.field.InternalFieldName]}`
            }
            if (this.fileService.fileAnalysisData()?.[this.field.InternalFieldName] && this.field.HasModel) {
              this.readFileAnalysis(this.newApplicationService.requestData()?.[this.field.InternalFieldName] || this.newApplicationService.newRequestData()?.[this.field.InternalFieldName]);
            }
          }
        }
      } else {
        if (this.field.FieldType === 10 && this.control?.value) {
          this.selectedFile.update((selectedFile: any) => ({ ...selectedFile, [this.field.InternalFieldName]: this.store.index.locale === 'en' ? this.field.TitleEn : this.field.TitleAr }));
          this.fileUrl[this.field.InternalFieldName] = `${this.baseUrl}/api/Files/read/${this.control?.value}`
        }

      }
    }, { allowSignalWrites: true })




    effect(() => {
      if (this.field.FieldAddress
        && this.field.FieldAddress.includes('Fee_Calculation')) {
        if (this.field && this.store.auth.user) {
          if (this.control) {
            // Use the cleaned path to get the nested value
            const value = this.newApplicationService.activityFees()

            if (value) {
              this.control.patchValue(value);
            } else {
              this.control.patchValue(value);
            }

          }
        }

      }
    }, { allowSignalWrites: true })
    effect(() => {
      if (this.field.FieldType === 8) {
        if (this.newApplicationService.rowIndex()) {
          if (this.newApplicationService.tableName() === this.field.InternalFieldName) {
            this.onEditRow(this.newApplicationService.rowIndex()!)
            let isValid = this.validateTable()
          }
        }
      }
    }, { allowSignalWrites: true })

    effect(() => {
      if (this.newApplicationService.rowsFromApi()) {
        this.setupConditionalValidation(this.field)
      }
    })

    effect(() => {
      if (!this.newApplicationService.requestData() || this.newApplicationService.requestData()?.FkStatusID === 0) {
        if (this.field.FieldAddress === 'TechnicalApprovalFile') {
          let data = this.newApplicationService.technicalApprovalFilesClicked();
          let shouldBeChecked = this.allFilesRead()
          if (!shouldBeChecked && !this.shouldBeDim() && !this.newApplicationService.requestData()?.[this.field.InternalFieldName] && !this.newApplicationService.newRequestData()?.[this.field.InternalFieldName]) {
            this.control?.setValue(undefined);
            this.techCheckbox.nativeElement.checked = false;
          }
        }
      }
    }, { allowSignalWrites: true })


    effect(() => {
      if ((this.newApplicationService.CPResultResponse() && this.newApplicationService.CRResultResponse()) || this.newApplicationService.CRResultResponse()) {
        if (this.field.GDXDim) {
          setTimeout(() => {
            this.closeGDXFieldsAfterPatch(this.field, this.control!)
          })
        }
      }
    })

    effect(() => {
      if (this.field.FieldType === 3 || this.field.FieldType === 5 || this.field.FieldType === 23) {
        if (this.shouldBeDim()) {
          this.control?.disable();  // disables input + Flatpickr
        } else {
          this.control?.enable();   // enables both 12
        }
      }
    })
    effect(() => {
      if (this.actions().length > 0 && this.field.DimExtraCondition) {
        const ids = this.field.DimExtraCondition
          .match(/\(([^)]+)\)/)?.[1]
          .split(',')
          .map(id => Number(id.trim())) ?? [];

        const actionIDs = this.actions().flatMap((action: any) => {
          // group
          if (action.isDropdown && Array.isArray(action.actions)) {
            return action.actions.map((a: any) => a.ActionID);
          }
          // normal action
          return action.ActionID ? [action.ActionID] : [];
        });
        this.shouldBeDim.set(this.newApplicationService.openDimFields() ? this.field.CorrectionDim : (this.field.FieldDim
          || (this.field.DimExtraCondition !== undefined && this.field.DimExtraCondition?.includes('UserActionIDIN')
            && !actionIDs.some((actionID) => ids.includes(actionID)))
        ))
      } else if (this.field) {
        this.shouldBeDim.set(this.newApplicationService.openDimFields() ? this.field.CorrectionDim : this.field.FieldDim)
      }

      if (this.newApplicationService.requestData() && this.newApplicationService.requestData().GDXServiceFieldsID) {
        let allGDXFields = this.newApplicationService.requestData().GDXServiceFieldsID.split(",")
        let isFieldGDX = allGDXFields.find((id: any) => {
          if (this.field.FieldType !== 8) {
            return id == this.field.ServiceFieldID && !!this.form.get(this.field.InternalFieldName)?.value
          } else {
            return id == this.field.ServiceFieldID && (this.form.get(this.field.InternalFieldName) as FormArray)?.value.length > 1
          }
        })
        if (isFieldGDX) {
          this.shouldBeDim.set(true)
        }

      }
    }, { allowSignalWrites: true })
  }

  ngOnInit(): void {
    /* console.log(this.field); */ // Add this log to confirm it's called once per field
    this.fieldTypeMap = this.wizardService.getFieldTypeMap();
    this.translations.set(this.localizationService.getTranslations());
    // Removed: this.addControlToFormGroup();
    // Controls are now added by the parent WizardFormComponent
    if (this.field.FieldType === 18) {
      const htmlContent = this.store.index.locale === 'en' ? this.field.TitleEn : this.field.TitleAr;
      // Mark the HTML as trusted. This is a security-sensitive operation.
      this.sanitizedHtml = this.sanitizer.bypassSecurityTrustHtml(htmlContent);
    }

    this.setupConditionalValidation(this.field);

    if (this.field.FieldType === 8 && (this.newApplicationService.requestData() || this.newApplicationService.newRequestData())) {
      let data = this.transformTableData()
      if (data) {
        data = data.map((obj: any, index: any) => {
          for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              let tableField = this.field.TableServiceFields?.find((tableField) => tableField.InternalFieldName === key)
              if (tableField && (tableField.FieldType === 6 || tableField.FieldType === 4 || tableField.FieldType === 19)) {
                let newVal = tableField.LookupValues!.find((Lookup) => Lookup.LookupID === obj[key]) ||
                  (this.store.index.locale === 'en' ? this.newApplicationService.requestData()?.[this.field.InternalFieldName]?.[index]?.[`${tableField.InternalFieldName}_TitleEn`] : this.newApplicationService.requestData()?.[this.field.InternalFieldName]?.[index]?.[`${tableField.InternalFieldName}_TitleAr`]);
                if (newVal?.ValueCategoryAr || newVal?.ValueCategoryEn) {
                  let category = this.store.index.locale === 'en' ? newVal?.ValueCategoryEn : newVal?.ValueCategoryAr
                  obj[`${key}-${category}`] = this.store.index.locale === 'en' ? newVal?.TitleEn : newVal?.TitleAr;
                } else {
                  obj[key] = (this.store.index.locale === 'en' ? newVal?.TitleEn : newVal?.TitleAr) || newVal;

                }
              }
              if (tableField && tableField.FieldType === 3) {
                obj[key] = obj[key] ? new Date(Date.parse(obj[key])).toLocaleDateString('en-GB') : '';
              }
              if (tableField && tableField.FieldType === 23) {
                let dateValue = obj[key];
                if (dateValue) {
                  let dateParts = dateValue.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}/);
                  if (dateParts) {
                    let date = new Date(Date.parse(dateParts[0]));
                    obj[key] = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-4)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                  }
                }
              }
              if (tableField && tableField.FieldType === 10) {
                if (obj[key]) {
                  if (this.fileUrl[key + (index + 1)] !== `${this.baseUrl}/api/Files/read/${obj[key]}`) {
                    this.fileUrl[key + (index + 1)] = `${this.baseUrl}/api/Files/read/${obj[key]}`;
                    ++this.tableFileIndex
                  }
                }
              }
            }
          }
          return obj;
        })
        this.rows.set(data);
        /* this.updateColumns(); */
      }
      // Call initTable initially
      this.initTable();
    } else if (this.field.FieldType === 8) {
      let data = this.form.get(this.field.InternalFieldName)!.value.slice(0, -1).map((item: any, index: any) => {
        return { ...item, currentIndex: index + 1 }
      })
      data = data.map((obj: any, index: any) => {
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            let tableField = this.field.TableServiceFields?.find((tableField) => tableField.InternalFieldName === key)
            if (tableField && (tableField.FieldType === 6 || tableField.FieldType === 4 || tableField.FieldType === 19)) {
              let newVal = tableField.LookupValues!.find((Lookup) => Lookup.LookupID === obj[key])
              if (newVal?.ValueCategoryAr || newVal?.ValueCategoryEn) {
                let category = this.store.index.locale === 'en' ? newVal?.ValueCategoryEn : newVal?.ValueCategoryAr
                obj[`${key}-${category}`] = this.store.index.locale === 'en' ? newVal?.TitleEn : newVal?.TitleAr;
              } else {
                obj[key] = (this.store.index.locale === 'en' ? newVal?.TitleEn : newVal?.TitleAr) || newVal;

              }

            }
            if (tableField && tableField.FieldType === 3 && (this.newApplicationService.requestData() || this.newApplicationService.newRequestData())) {
              obj[key] = obj[key] ? new Date(Date.parse(obj[key])).toLocaleDateString('en-GB') : '';
            }
            if (tableField && tableField.FieldType === 23 && (this.newApplicationService.requestData() || this.newApplicationService.newRequestData())) {
              let dateValue = obj[key];
              if (dateValue) {
                let dateParts = dateValue.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}/);
                if (dateParts) {
                  let date = new Date(Date.parse(dateParts[0]));
                  obj[key] = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-4)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                }
              }
            }
            if (tableField && tableField.FieldType === 10) {
              if (obj[key]) {
                if (this.fileUrl[key + this.tableFileIndex] !== `${this.baseUrl}/api/Files/read/${obj[key]}`) {
                  this.fileUrl[key + this.tableFileIndex] = `${this.baseUrl}/api/Files/read/${obj[key]}`;
                  ++this.tableFileIndex
                }
              }
            }
          }
        }
        return obj;
      })
      let fileFields = this.field.TableServiceFields!.filter((field) => {
        return field.FieldType === 10
      })

      fileFields.forEach((tableField) => {
        let fileControl = this.getFormArray(this.field.InternalFieldName)!.at(this.getFormArray(this.field.InternalFieldName)!.length - 1).get(tableField.InternalFieldName)?.value;
        if (fileControl) {

          this.fileUrl[tableField.InternalFieldName + this.tableFileIndex] = `${this.baseUrl}/api/Files/read/${fileControl}`
          this.selectedFile.update((files) => {
            return { ...files, [tableField.InternalFieldName]: this.store.index.locale === 'en' ? tableField.TitleEn : tableField.TitleAr }
          })
          ++this.tableFileIndex
        }
      })
      this.initTable();
      this.rows.set(data || []);
      /* this.updateColumns(); */
    }
    if (!this.newApplicationService.requestData() || this.newApplicationService.requestData()?.FkStatusID === 0) {
      if (this.field.FieldType === 16 && this.field.FieldAddress === 'TechnicalApprovalFile') {
        if (this.newApplicationService.technicalApprovalFilesClicked()) {
          this.newApplicationService.technicalApprovalFilesClicked().forEach((file: any) => {
            if (file.isClicked) {
              this.TechnicalApprovalFileClickedMap[file.TechnicalApprovalFile] = file
            }
          })
        }
      }
    }

    if (this.field.FieldType === 6) {
      let isClub = this.field.LookupValues?.find((lv: any) => !!lv.FkClubID)
      if (isClub) {
        this.form.get('FkClubID')?.valueChanges.subscribe((val: any) => {
          this.invalidateLookupCache();
        })
      }
      let relevantLookup = this.field.LookupValues?.find(lookup => {
        return lookup.RelevantLookupInternalFieldName && lookup.RelevantLookupId
      })
      if (relevantLookup) {
        this.form!.get(relevantLookup.RelevantLookupInternalFieldName!)?.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged((prev, curr) => {
            return JSON.stringify(prev) === JSON.stringify(curr)
          }),
          skip(1),
          takeUntil(this.destroy$)
        ).subscribe((value: any) => {
          this.invalidateLookupCache();
          let isValValid = this.filteredLookupValues()?.find((lv: any) => lv.LookupID === value)
          if (isValValid) {
            this.form?.get(this.field.InternalFieldName)?.patchValue(isValValid.LookupID)
          } else {
            this.form?.get(this.field.InternalFieldName)?.patchValue(-1)
          }
        })
      }
    }

    if (this.field.FieldType === 8) {
      this.field.TableServiceFields?.forEach((tableField) => {
        if(tableField.FieldType === 17){
          (this.form?.get(this.field.InternalFieldName) as FormArray)?.at(-1).get(tableField.InternalFieldName)?.valueChanges.subscribe((value: any) => {
            (this.form?.get(this.field.InternalFieldName) as FormArray)?.at(-1).get(tableField.InternalFieldName)?.patchValue(value)
          })
        }
        if(tableField.FieldType === 3){
          (this.form?.get(this.field.InternalFieldName) as FormArray)?.at(-1).get(tableField.InternalFieldName)?.valueChanges.subscribe((value: any) => {
            (this.form?.get(this.field.InternalFieldName) as FormArray)?.at(-1).get(tableField.InternalFieldName)?.patchValue(value)
          })
        }
        if ([4, 6, 19].includes(tableField.FieldType)) {
          let relevantLookup = tableField.LookupValues?.find(lookup => {
            return lookup.RelevantLookupInternalFieldName && lookup.RelevantLookupId
          })
          if (relevantLookup) {
            this.form!.get(relevantLookup.RelevantLookupInternalFieldName!)?.valueChanges.subscribe((value: any) => {
              this.invalidateLookupCache();
              let isValValid = this.filteredLookupValues(tableField)?.find((lv: any) => lv.LookupID === value)
              if (isValValid) {
                this.form?.get(this.field.InternalFieldName)?.get(tableField.InternalFieldName)?.patchValue(isValValid.LookupID)
              } else {
                this.form?.get(this.field.InternalFieldName)?.get(tableField.InternalFieldName)?.patchValue(-1)
              }
            })
          }
        }
      })
    }

    if (this.field.FieldType === 19) {
      this.setupLookupSanitizer(this.field);
    }

  }

  ngAfterViewInit() {
    (window as any).toggleRow = (id: any) => {
      this.toggleRow(id);
    };

  }


  transformTableData() {
    if (this.newApplicationService.requestData() && this.newApplicationService.requestData().ServiceTables) {
      let data = this.newApplicationService.requestData().ServiceTables.filter((rData: any) => {
        return rData.SourceTableID === this.field.TableServiceFields![0].SourceTableID
      })
      data = data.map((d: any, index: any) => {
        return { ...d, currentIndex: index + 1 }
      })
      this.newApplicationService.requestData.update((requestData) => {
        requestData[this.field.InternalFieldName] = data;
        return requestData
      })
      return data;
    } else if (this.newApplicationService.newRequestData() && this.newApplicationService.newRequestData().ServiceTables) {
      let data = this.newApplicationService.newRequestData().ServiceTables.filter((rData: any) => {
        return rData.SourceTableID === this.field.TableServiceFields![0].SourceTableID
      })
      data = data.map((d: any, index: any) => {
        return { ...d, currentIndex: index + 1 }
      })
      return data;
    }
    return null
  }

  initStore() {
    this.storeData
      .select(({ index, auth }) => ({ index, auth }))
      .subscribe((d) => {
        this.store = d;
      });
  }
  expandedRow = signal<any>({});
  filteredCols: any[] = [];
  lookupCategories: any = [];
  initTable() {
    const formArray = this.getFormArray(this.field.InternalFieldName)!;
    if (formArray.length > 0) {
      const firstFormGroup = formArray.at(0) as FormGroup;
      const tableFieldsData = firstFormGroup.getRawValue();

      // Separate fields for the table and the expanded view
      const mainTableFields: any[] = [];
      this.expandedFields = []; // Make sure expandedFields is a component property

      // Use a counter to limit the number of fields for the main table
      let fieldCounter = 0;
      const maxMainTableFields = 4;
      // Get the keys of the form data
      const fieldKeys = this.field.TableServiceFields?.map((tableField) => tableField.InternalFieldName)!

      for (const key of fieldKeys) {
        const fieldConfig = this.field.TableServiceFields?.find(
          (tableField) => tableField.InternalFieldName === key && tableField.FieldType !== 14 && !tableField.IsSystemField
        );


        if (fieldConfig) {

          let isCategory = fieldConfig.LookupValues?.some(lv => lv.ValueCategoryEn || lv.ValueCategoryAr);
          let col: any = [];
          if (isCategory) {
            const categories = [
              ...new Set(
                fieldConfig.LookupValues
                  ?.map(lv => this.store.index.locale === 'en' ? lv.ValueCategoryEn : lv.ValueCategoryAr)
                  .filter(Boolean)
              )
            ];
            this.lookupCategories = categories;
            col = categories.map(cat => ({
              field: `${fieldConfig.InternalFieldName}-${cat}`,
              title: `${cat}`
            }));

          } else {
            col = [{
              field: key,
              title: this.store.index.locale === 'en' ? fieldConfig.TitleEn : fieldConfig.TitleAr
            }];
            // Add to main table if counter is less than limit, otherwise add to expanded fields
          }
          if (fieldCounter < maxMainTableFields) {
            mainTableFields.push(...col);
            this.expandedFields.push(...col);
            fieldCounter += col.length;
          } else {
            this.expandedFields.push(...col);
          }

        }
      }
      console.log(this.expandedFields);
      console.log(mainTableFields)
      let shouldShowActions = this.newApplicationService.openDimFields() ? this.field.CorrectionDim : (this.field.FieldDim || this.field.isGDXVal);
      // Initialize the cols property with your constant and dynamic fields
      if (!shouldShowActions) {
        this.cols = [
          {
            field: 'expand',
            title: '',
            sort: false,
            width: '50px'
          },
          { field: 'currentIndex', title: '#' },
          ...mainTableFields,
          { field: 'actions', title: this.translations()?.tableActionsKey.label }
        ];
      } else {
        this.cols = [
          {
            field: 'expand',
            title: '',
            sort: false,
            width: '50px'
          },
          { field: 'currentIndex', title: '#' },
          ...mainTableFields
        ];
      }
    }
  }
  /* updateColumns() {
    const rows = this.rows()
    const hasRows = rows && rows.length > 0;
    if (hasRows) {
      // Filter columns based on data
      this.filteredCols = this.cols.filter(col => {
        // Keep the 'expand', 'currentIndex', and 'action' columns unconditionally
        if (['expand', 'currentIndex', 'openRequest'].includes(col.field)) {
          return true;
        }

        // For other columns, check if at least one row has a value
        return rows.some((row: any) => row[col.field]);
      });
    } else {
      // If there are no rows, display all columns
      this.filteredCols = this.cols;
    }
  } */
  get control(): FormControl | FormArray | null {
    // Safely retrieve the control from the passed form group
    return this.form.get(this.field.InternalFieldName) as FormControl | null;
  }
  getErrorMessages() {
    return this.field.AttachmentsFields?.find((af) => af.FieldType === 13)
  }
  asFieldJson(field: any): FieldJson {
    return {
      ...field,
      FieldVisible: field.FieldVisible || field.IsSystemField || true, // Default to true if undefined
      FieldDim: field.FieldDim || false,
      FieldDefaultRequired: field.Required || false,
      LookupValues: field.LookupValues || []
    } as FieldJson;
  }
  // This method is no longer needed here as controls are added in the parent
  // private addControlToFormGroup(): void {
  //   const validators = [];
  //   if (this.field.FieldDefaultRequired) {
  //     validators.push(Validators.required);
  //   }
  //   const defaultValue = this.field.DefaultValue || this.field.FieldValue || '';
  //   const control = new FormControl({ value: defaultValue, disabled: this.field.FieldDim }, validators);
  //   this.form.addControl(this.field.InternalFieldName, control);
  // }

  // Helper to determine input type for certain field types
  getInputType(): string {
    switch (this.field.FieldType) {
      case 1: // TextBox
      case 11: // UniqueIdentifier (often displayed as text)
      case 15: // Float
      case 24:
      case 22:
        return 'text';
      case 12: // Number
        return 'number';
      case 3: // Date
        return 'date';
      case 7: // Time
        return 'time';
      case 20:
        return 'tel';
      case 21: // Email
        return 'email';
      default:
        return 'text'; // Fallback
    }
  }
  enforceMaxLength(event: Event, maxLength: number, tableField?: TableServiceField) {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement;
    const currentValue = input.value;
    if (maxLength > 0) {
      if (currentValue.length > maxLength) {
        const trimmedValue = currentValue.slice(0, maxLength);
        input.value = trimmedValue;

        if (tableField) {
          const formArray = this.getFormArray(this.field.InternalFieldName)!
          const control = formArray.at(-1).get(tableField.InternalFieldName);
          control?.setValue(trimmedValue, { emitEvent: false });
        } else {
          this.control?.setValue(trimmedValue, { emitEvent: false });
        }
      }
    } else {
      if (tableField) {
        const formArray = this.getFormArray(this.field.InternalFieldName)!
        const control = formArray.at(-1).get(tableField.InternalFieldName);
        control?.patchValue(currentValue, { emitEvent: false });
      } else {
        this.control?.patchValue(currentValue, { emitEvent: false });
      }
    }
  }

  enforcePositiveNumber(event: Event): void {
    const input = event.target as HTMLInputElement
    let value = input.value;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }


    if (this.field.FieldType === 15) {
      // Remove leading zeros (except for decimal numbers like 0.5)
      if (value.length > 1 && value[0] === '0' && value[1] !== '.') {
        value = value.substring(1);
      }
    }
    if (parseFloat(value) < 0) {
      // If negative, set the value to an empty string or a default value
      value = '';
    }

    // Update input value

    // Update form control
    const numericValue = value === '' ? null : parseFloat(value);
    if (this.field.FieldType === 15) {
      value = value.replace(/[^0-9.]/g, '');
      input.value = value;
      setTimeout(() => {
        input.setSelectionRange(start, end);
      });
    } else {
      // Check if the value is negative
      this.control?.setValue(value.replace(/[^0-9]/g, ''), { emitEvent: false });
    }
  }
  enforceCompoundNumber(event: any, tableField?: TableServiceField): void {
    const input = event.target as HTMLInputElement;
    let value: string = input.value;

    // IMPORTANT: Get the previous valid value from the FormControl
    // This is essential for reverting invalid changes.

    let previousValue: string;
    if (this.field.FieldType !== 8) {
      previousValue = this.control?.value || '';
    } else {
      previousValue = (this.getFormArray(this.field.InternalFieldName)!.at(-1).get(tableField!.InternalFieldName)?.value || '').slice(0, -1);
    }

    if (value === null || value === undefined) {
      return;
    }
    value = String(value);
    // 1. Initial cleanup (Strip out non-allowed characters: everything except 0-9 and /)
    const charPattern = /[^0-9/]/g;
    if (charPattern.test(value)) {
      value = value.replace(charPattern, '');
    }

    // 2. Structural Validation (Enforce "at most one '/' and only in the middle")
    const slashCount = (value.match(/\//g) || []).length;

    // --- Rule A: Prevent a second slash ---
    if (slashCount > 1) {
      // Revert to the previous value if the user tried to type a second slash
      input.value = previousValue; // Revert the DOM
      if (this.field.FieldType !== 8) {
        this.control?.setValue(previousValue, { emitEvent: false });
      } else {
        const lastIndex = this.getFormArray(this.field.InternalFieldName)!.length - 1;
        this.getFormArray(this.field.InternalFieldName)!.at(lastIndex).get(tableField!.InternalFieldName)?.setValue(previousValue, { emitEvent: false });
      }
      return;
    }

    // --- Rule B: Prevent slash at start or end ---
    if (slashCount === 1) {
      // Check if the slash is at the start or end AND if the total length is greater than 1.
      // Length check ensures we don't block the user from typing "1/" then "2" (to get "1/2").
      // We only block if the final result is invalid.
      if (value.startsWith('/') || value.endsWith('/')) {
        // To allow the user to type the *first* slash, we check if the previous value
        // already contained a slash. If it didn't, we need to check the structural validity.
        // Since we are validating structure, if the slash is at the start or end, it is invalid.

        // The only way to get a slash into the string is if the final value is e.g., "1/"
        // If the user tries to type a slash and the result is a number followed by a slash (e.g., '1/'), 
        // we must allow it to proceed so they can type the next number (e.g., '1/2').

        // A stricter validation should check the final intended state: X/Y where X, Y are numbers.
        // We revert the change ONLY if the slash is at the start or if the user removes the number 
        // after the slash, resulting in a trailing slash.

        if (value.startsWith('/')) {
          // If the slash is the first character, block it immediately
          input.value = previousValue;
          if (this.field.FieldType !== 8) {
            this.control?.setValue(previousValue, { emitEvent: false });
          } else {
            const lastIndex = this.getFormArray(this.field.InternalFieldName)!.length - 1;
            this.getFormArray(this.field.InternalFieldName)!.at(lastIndex).get(tableField!.InternalFieldName)?.setValue(previousValue, { emitEvent: false });
          }
          return;
        }

        // Allow a trailing slash (e.g., "1/") so the user can type the next number.
        // The final validity check should happen on form submission.
      }
    }

    // 3. Final Update
    // Only update if the value changed (e.g., characters were stripped)

    input.value = value;
    if (this.field.FieldType !== 8) {
      this.control?.setValue(value, { emitEvent: false });
    } else {
      const lastIndex = this.getFormArray(this.field.InternalFieldName)!.length - 1;
      this.getFormArray(this.field.InternalFieldName)!.at(lastIndex).get(tableField!.InternalFieldName)?.setValue(value, { emitEvent: false });
    }

  }
  enforcePositiveNumberForTable(event: Event, tableField: TableServiceField): void {
    const formArray = this.getFormArray(this.field.InternalFieldName)!;
    let control = formArray.at(-1).get(tableField.InternalFieldName);
    const input = event.target as HTMLInputElement
    let value = input.value;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }


    if (tableField.FieldType === 15) {
      // Remove leading zeros (except for decimal numbers like 0.5)
      if (value.length > 1 && value[0] === '0' && value[1] !== '.') {
        value = value.substring(1);
      }
    }
    if (parseFloat(value) < 0) {
      // If negative, set the value to an empty string or a default value
      value = '';
    }

    // Update input value

    // Update form control
    const numericValue = value === '' ? null : parseFloat(value);
    if (tableField.FieldType === 15) {
      value = value.replace(/[^0-9.]/g, '');
      input.value = value;
      setTimeout(() => {
        input.setSelectionRange(start, end);
      });
    } else {
      // Check if the value is negative
      control?.setValue(value.replace(/[^0-9]/g, ''), { emitEvent: false });
    }
  }



  // Helper to determine if a checkbox is currently selected
  isCheckboxChecked(lookupId: number | string, isDisabled?: boolean): boolean {
    if (isDisabled) return true;
    const controlValue = this.control?.value;
    // For single checkbox, value is boolean. For multi-checkbox, it's an array.
    if (this.field.FieldType === 4) { // Multi-checkbox
      return Array.isArray(controlValue) && controlValue.includes(lookupId);
    } else {

      return !!controlValue
      // For single boolean checkbox (if FieldType 4 were single)
    }
  }

  onSingleCheckboxClick(event: Event, fieldName: string): void {
    const checkbox = event.target as HTMLInputElement;

    const isChecked = checkbox.checked;
    if (this.field.FieldAddress === 'TermsConditions' && (checkbox.checked || this.shouldBeDim())) {
      event.preventDefault();
      this.termsConditionsService.open(this.field.FieldDim).pipe(
        switchMap(confirmed => {
          if (confirmed) {
            return of(true)
          } else {
            return of(undefined)
          }
        })
      ).subscribe((res) => {
        if (!this.shouldBeDim()) {
          this.control?.setValue(res);
          this.control?.updateValueAndValidity();
        }

      })
    } else if (this.field.FieldAddress === 'TechnicalApprovalFile') {
      let result = this.allFilesRead();
      if (result && !this.shouldBeDim() && !this.newApplicationService.requestData()?.[this.field.InternalFieldName] && !this.newApplicationService.newRequestData()?.[this.field.InternalFieldName]) {
        // all files read → mark as checkedconst currentControlValue = this.control?.value;
        // 1. Get the current value from the form control (the source of truth)
        const currentControlValue = this.control?.value;
        // 2. The intended new state is the opposite of the current control value
        const newState = !currentControlValue;
        // 3. Set the control value to true (checked) or undefined (unchecked)
        this.control?.setValue(newState ? true : undefined);

        this.control?.updateValueAndValidity();

        // manually update the DOM visual
        checkbox.checked = true;
      } else {
        // not all files read → ensure unchecked
        this.control?.setValue(undefined);
        this.control?.updateValueAndValidity();

        checkbox.checked = false;

        Swal.fire({
          icon: 'error',
          title: this.translations()?.technicalApprovalErr.label,
          showConfirmButton: true,
          confirmButtonText: this.translations()?.validationMsgBtn.label
        })

      }

      // trigger re-render (important when inside signals or async)
      this.cdr.detectChanges();
      console.log('--- click end ---');
    } else {
      const isChecked = checkbox.checked;
      this.control?.setValue(isChecked || undefined);
      this.control?.updateValueAndValidity();
    }
  }

  /* toggleOpenTermsConditions(event: any) {
    if (this.field.FieldAddress === 'TermsConditions') {
      this.termsConditionsService.open(this.field.FieldDim).pipe(
        switchMap(confirmed => {
          if (confirmed) {
            return of(true)
          } else {
            return of(false)
          }
        })
      ).subscribe((res) => {
        const previousSibling = event.target.previousSibling as HTMLElement;
        const previousSiblingCheckbox = previousSibling as HTMLInputElement;
        if (res === true) {

          if (previousSiblingCheckbox && previousSiblingCheckbox.checked) {
            return;
          }
          previousSiblingCheckbox?.click();
        } else {
          this.control?.reset()
        }
      })
    }
  } */
  // New handler for CheckBox (TypeID: 4)
  onMultiCheckboxChange(event: Event, lookupId: number, isDisabled?: boolean): void {
    let isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked && isDisabled) {
      isChecked = false;
      return;
    }
    let currentValues: number[] = this.control?.value || [];

    if (isChecked) {
      if (!currentValues.includes(lookupId)) {
        currentValues = [...currentValues, lookupId]; // Add if not present
      }
    } else {
      currentValues = currentValues.filter(id => id !== lookupId); // Remove
    }
    if (currentValues) {
      this.control?.setValue(currentValues);
    } else {
      this.control?.reset()
    }
  }

  onCheckboxChange(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.control?.setValue(isChecked);
  }

  onItemAdded(addedItem: any) {
    console.log('Added:', addedItem);

    // If item is not allowed, instantly remove it
    if (addedItem.notSelectable) {
      const control = this.control!;
      const current = control.value as number[];

      // remove it again
      const newValue = current.filter(id => id !== addedItem.LookupID);
      control.setValue(newValue);

      return; // do NOT proceed
    }

    // Otherwise, let it stay
  }

  onLookupChange(value: LookupValue | LookupValue[] | any, formGroup?: AbstractControl, field?: TableServiceField): void {
    // If the field expects a number (FieldType 6 or 5), convert
    let parsedObj = JSON.parse(JSON.stringify(value))
    let parsedValue: any;

    if (this.field.FieldType === 19) {
      if (this.newApplicationService.requestData() || this.newApplicationService.newRequestData()) {
        if (this.newApplicationService.requestData()?.['OldSecondaryActivity'] || this.newApplicationService.newRequestData()?.['OldSecondaryActivity']) {
          let NewSecondaryActivity = parsedObj.filter((lookup: any) => !lookup.disabled)
          let NewSecondaryActivityCount = NewSecondaryActivity.length
          if (this.newApplicationService.newRequestData()) {
            this.newApplicationService.newRequestData.update((value) => {
              value['NewSecondaryActivityCount'] = NewSecondaryActivityCount
              value['NewSecondaryActivity'] = NewSecondaryActivity?.map((lookup: any) => lookup.LookupID)?.join(',')
              return value
            })
          } else if (this.newApplicationService.requestData()) {
            this.newApplicationService.requestData.update((value) => {
              value['NewSecondaryActivityCount'] = NewSecondaryActivityCount
              value['NewSecondaryActivity'] = NewSecondaryActivity?.map((lookup: any) => lookup.LookupID)?.join(',')
              return value
            })
          }
        }
      }
    }
    switch (this.field.FieldType) {
      case 6: // Single lookup
      case 5: // radio
      case 4: // Single checkbox (if used as lookup)
        parsedValue = (value as LookupValue).LookupID;
        break;
      case 19: // Multi-select lookup
        parsedValue = (parsedObj as LookupValue[]).map(item => item.LookupID);
        break;
      default:
        parsedValue = (value as LookupValue).LookupID;
        break;
    }
    const fieldName = field?.InternalFieldName || this.field.InternalFieldName
    this.newApplicationService.updateSelectedLookup(fieldName, value);
    if (formGroup) {
      if (field?.InternalFieldName) {
        formGroup.patchValue(parsedValue);
      }
    } else {
      this.control?.patchValue(parsedValue);
    }
  }
  onButtonClick(x: any) {
    console.log('Button clicked:', x);
  }
  public shouldBeHiddenTableField(tableField: TableServiceField): boolean {
    // If there's no relevant field, don't hide
    if (!tableField.RelevantInternalName) {
      return false;
    }
    let tableGroup = this.getFormArray(this.field.InternalFieldName)!.at(this.getFormArray(this.field.InternalFieldName)!.length - 1)
    const relevantControl = tableGroup.get(tableField.RelevantInternalName);
    if (!relevantControl) {
      console.warn(`Relevant control '${tableField.RelevantInternalName}' not found in form.`);
      return false;
    }

    const relevantValue = relevantControl.value;
    const targetValue = tableField.RelevantVisibleValue; // This might be a string
    const relevantValueIsArray = Array.isArray(relevantControl.value);
    const numericRelevantValue = Number(relevantValue);
    const numericTargetValue = Number(targetValue);
    if (relevantValueIsArray) {
      switch (tableField.RelevantVisibleOperator.toLocaleLowerCase()) {
        case 'in':
          // Use loose equality (==) or check types to handle potential string/number mismatches
          return !relevantValue.includes(numericTargetValue);
        case 'not in':
          return relevantValue.includes(numericTargetValue);
        case '=':
          return !relevantValue.includes(numericTargetValue) && relevantValue.length === 1;
        case '!=':
          return relevantValue.includes(numericTargetValue) && relevantValue.length === 1;
        case '>':
          return relevantValue.some((value: any) => Number(value) < numericTargetValue);
        case '<':
          return relevantValue.some((value: any) => Number(value) > numericTargetValue);
        case 'is not null':
          return (relevantValue.length > 0);
        default:
          return false;
      }
    } else {
      // Handle number conversion for comparison
      switch (tableField.RelevantVisibleOperator.toLocaleLowerCase()) {
        case '=':
          // Use loose equality (==) or check types to handle potential string/number mismatches
          return relevantValue != targetValue;
        case '!=':
          return relevantValue == targetValue;
        case '>':
          return numericRelevantValue < numericTargetValue;
        case '<':
          return numericRelevantValue > numericTargetValue;
        case 'is not null':
          return !(relevantValue);
        default:
          return false;
      }
    }
  }
  public shouldBeHidden(field: FieldJson): boolean {
    // If there's no relevant field, don't hide
    if (!this.field.RelevantInternalName && !this.field.RelevantVisibleOperator) {
      return false;
    }

    const relevantControl = this.form.get(this.field.RelevantInternalName);
    if (!relevantControl) {
      console.warn(`Relevant control '${this.field.RelevantInternalName}' not found in form.`);
      return false;
    }

    const relevantValue = relevantControl.value;
    const targetValue = this.field.RelevantVisibleValue; // This might be a string
    const relevantValueIsArray = Array.isArray(relevantControl.value);
    const numericRelevantValue = Number(relevantValue);
    const numericTargetValue = Number(targetValue);
    if (relevantValueIsArray) {
      switch (this.field.RelevantVisibleOperator.toLocaleLowerCase()) {
        case 'in':
          // Use loose equality (==) or check types to handle potential string/number mismatches
          return !relevantValue.includes(numericTargetValue);
        case 'not in':
          return relevantValue.includes(numericTargetValue);
        case '=':
          return !relevantValue.includes(numericTargetValue) && relevantValue.length === 1;
        case '!=':
          return relevantValue.includes(numericTargetValue) && relevantValue.length === 1;
        case '>':
          return relevantValue.some((value: any) => Number(value) < numericTargetValue);
        case '<':
          return relevantValue.some((value: any) => Number(value) > numericTargetValue);
        case 'is not null':
          return (relevantValue.length > 0);
        default:
          return false;
      }
    } else {
      // Handle number conversion for comparison
      switch (this.field.RelevantVisibleOperator.toLocaleLowerCase()) {
        case 'in':
          return !targetValue!.includes(`${relevantValue!}`)
        case '=':
          // Use loose equality (==) or check types to handle potential string/number mismatches
          return relevantValue != targetValue;
        case '!=':
          return relevantValue == targetValue;
        case '>':
          return numericRelevantValue < numericTargetValue;
        case '<':
          return numericRelevantValue > numericTargetValue;
        case 'is not null':
          return !(relevantValue.length);
        default:
          return false;
      }
    }
  }
  shouldBeRequired(field: FieldJson | TableServiceField, targetControl: FormControl) {
    if (!field.RelevantInternalName || !field.RelevantRequiredOperator) {
      return;
    }
    if (!("ServiceTableFieldID" in field)) {
      if (this.newApplicationService.actionDetailsIDs() && this.newApplicationService.ServiceFieldsByActionsApiResponse()?.items[this.newApplicationService.actionDetailsIDs()]) {

        let fieldToCheck = this.newApplicationService.ServiceFieldsByActionsApiResponse().items[this.newApplicationService.actionDetailsIDs()].find((fieldReq: any) => fieldReq.ServiceFieldID === this.field.ServiceFieldID);
        let shouldBeRequired = false;
        const relevantControl = this.form.get(this.field.RelevantInternalName);
        if (!relevantControl) {
          console.log(this.form.value);
          console.warn(`Relevant control '${this.field.RelevantInternalName}' not found in form.`);
          return;
        }

        const relevantValue = relevantControl.value;
        const targetValue = this.field.RelevantRequiredValue; // This might be a string
        const relevantValueIsArray = Array.isArray(relevantControl.value);
        const numericRelevantValue = Number(relevantValue);
        const numericTargetValue = Number(targetValue);
        if (fieldToCheck && fieldToCheck.FieldRequired === true) {
          if (this.field.RelevantRequiredOperator) {
            if (relevantValueIsArray) {
              switch (this.field.RelevantRequiredOperator.toLocaleLowerCase()) {
                case 'in':
                  // Use loose equality (==) or check types to handle potential string/number mismatches
                  shouldBeRequired = relevantValue.includes(numericTargetValue);
                  break;
                case 'not in':
                  shouldBeRequired = !relevantValue.includes(numericTargetValue);
                  break;
                case '=':
                  shouldBeRequired = relevantValue.includes(numericTargetValue) && relevantValue.length === 1;
                  break;
                case '!=':
                  shouldBeRequired = !(relevantValue.includes(numericTargetValue) && relevantValue.length === 1);
                  break;
                case '>':
                  shouldBeRequired = relevantValue.some((value: any) => Number(value) > numericTargetValue);
                  break;
                case '<':
                  shouldBeRequired = relevantValue.some((value: any) => Number(value) < numericTargetValue);
                  break;
                case 'is not null':
                  shouldBeRequired = (relevantValue.length > 0);
                  break;
                default:
                  shouldBeRequired = false;
                  break;
              }
            } else {
              // Handle number conversion for comparison
              switch (this.field.RelevantRequiredOperator.toLocaleLowerCase()) {
                case 'in':
                  shouldBeRequired = targetValue!.includes(`${relevantValue!}`);
                  break;
                case '=':
                  // Use loose equality (==) or check types to handle potential string/number mismatches
                  shouldBeRequired = relevantValue == targetValue;
                  break;
                case '!=':
                  shouldBeRequired = relevantValue != targetValue;
                  break;
                case '>':
                  shouldBeRequired = numericRelevantValue > numericTargetValue;
                  break;
                case '<':
                  shouldBeRequired = numericRelevantValue < numericTargetValue;
                  break;
                case 'is not null':
                  shouldBeRequired = !!(relevantValue);
                  break;
                default:
                  shouldBeRequired = false;
                  break;
              }
            }
          }
        }
        if (shouldBeRequired) {
          let validators: ValidatorFn[] = [];
          // --- Run the logic on initialization ---
          if (this.field.MAX_Length > 0 && (this.field.FieldType === 12 || this.field.FieldType === 15 || this.field.FieldType === 11 || this.field.FieldType === 20)) {
            validators.push(Validators.maxLength(this.field.MAX_Length));
          }
          if (this.field.FieldType === 21) {
            validators.push(Validators.email);
          }
          if ((this.field.FieldType === 12 || this.field.FieldType === 15 || this.field.FieldType === 11 || this.field.FieldType === 20) && (this.field.MIN_Length > 0)) {
            validators.push(CustomValidators.numberMinLength(this.field.MIN_Length))
          }

          if (!this.field.FieldDim && (this.field.FieldType === 6 || this.field.FieldType === 5)) {
            validators.push(CustomValidators.noNegativeOne);
          } else {
            validators.push(Validators.required);
          }
          targetControl.setValidators(validators);
          targetControl.updateValueAndValidity()
          this.updateControlVisibility(relevantControl, targetControl, field);
        } else {
          targetControl.clearValidators()
          targetControl.updateValueAndValidity()
          this.updateControlVisibility(relevantControl, targetControl, field);
        }
      }
    } else {
      if (field.Required) {

        let shouldBeRequired = false;
        const relevantControl = this.getFormArray(this.field.InternalFieldName)!.at(this.getFormArray(this.field.InternalFieldName)!.length - 1).get(field.RelevantInternalName);
        if (!relevantControl) {
          console.log(this.form.value);
          console.warn(`Relevant control '${this.field.RelevantInternalName}' not found in form.`);
          return;
        }

        const relevantValue = relevantControl.value;
        const targetValue = field.RelevantRequiredValue; // This might be a string
        const relevantValueIsArray = Array.isArray(relevantControl.value);
        const numericRelevantValue = Number(relevantValue);
        const numericTargetValue = Number(targetValue);

        if (field.RelevantRequiredOperator) {
          if (relevantValueIsArray) {
            switch (field.RelevantRequiredOperator.toLocaleLowerCase()) {
              case 'in':
                // Use loose equality (==) or check types to handle potential string/number mismatches
                shouldBeRequired = relevantValue.includes(numericTargetValue);
                break;
              case 'not in':
                shouldBeRequired = !relevantValue.includes(numericTargetValue);
                break;
              case '=':
                shouldBeRequired = relevantValue.includes(numericTargetValue) && relevantValue.length === 1;
                break;
              case '!=':
                shouldBeRequired = !relevantValue.includes(numericTargetValue) && relevantValue.length === 1;
                break
              case '>':
                shouldBeRequired = relevantValue.some((value: any) => Number(value) > numericTargetValue);
                break;
              case '<':
                shouldBeRequired = relevantValue.some((value: any) => Number(value) < numericTargetValue);
                break;
              case 'is not null':
                shouldBeRequired = (relevantValue.length > 0);
                break;
              default:
                shouldBeRequired = false;
                break;
            }
          } else {
            // Handle number conversion for comparison
            switch (field.RelevantRequiredOperator.toLocaleLowerCase()) {
              case 'in':
                shouldBeRequired = targetValue!.includes(`${relevantValue!}`);
                break;
              case '=':
                // Use loose equality (==) or check types to handle potential string/number mismatches
                shouldBeRequired = relevantValue == targetValue;
                break;
              case '!=':
                shouldBeRequired = relevantValue != targetValue;
                break;
              case '>':
                shouldBeRequired = numericRelevantValue > numericTargetValue;
                break;
              case '<':
                shouldBeRequired = numericRelevantValue < numericTargetValue;
                break;
              case 'is not null':
                shouldBeRequired = !!(relevantValue);
                break;
              default:
                shouldBeRequired = false;
                break;
            }
          }
        }

        if (shouldBeRequired) {
          let validators: ValidatorFn[] = [];
          let extraValidators: ValidatorFn[] = this.setupExtraValidations(field as any as FieldJson);

          // --- Run the logic on initialization ---
          if (field.MAX_Length > 0 && (field.FieldType === 12 || field.FieldType === 15 || field.FieldType === 11 || field.FieldType === 20)) {
            validators.push(Validators.maxLength(field.MAX_Length));
          }
          if (field.FieldType === 21) {
            validators.push(Validators.email);
          }
          if ((field.FieldType === 12 || field.FieldType === 15 || field.FieldType === 11 || field.FieldType === 20) && (field.MIN_Length > 0)) {
            validators.push(CustomValidators.numberMinLength(field.MIN_Length))
          }

          if ((field.FieldType === 6 || field.FieldType === 5)) {
            validators.push(CustomValidators.noNegativeOne);
          } else {
            validators.push(Validators.required);
          }
          targetControl.setValidators([...validators, ...extraValidators]);
          targetControl.updateValueAndValidity()
          this.updateControlVisibility(relevantControl, targetControl, undefined, field);
        } else {
          targetControl.clearValidators()
          targetControl.updateValueAndValidity()
          this.updateControlVisibility(relevantControl, targetControl, undefined, field);
        }
      }
    }
  }
  setupConditionalValidation(field: FieldJson): void {
    // If there's no relevant field, no need for conditional logic
    if (!field.RelevantInternalName) {
      if (field.FieldType !== 8) {
        return;
      }
    }
    if (field.FieldType === 8) {
      for (const tableGroup of (this.getFormArray(field.InternalFieldName)! as FormArray).controls) {
        // let tableGroup = this.getFormArray(field.InternalFieldName)!.at(this.getFormArray(field.InternalFieldName)!.length - 1);
        let tableFields = field.TableServiceFields!

        tableFields.forEach((tableField: TableServiceField) => {
          if (!tableField.RelevantInternalName) {
            return;
          }
          const relevantControl = tableGroup.get(tableField.RelevantInternalName);
          const targetControl = tableGroup.get(tableField.InternalFieldName) as FormControl; // The control you want to hide

          if (!relevantControl || !targetControl) {
            console.warn(`relevant: ${tableField.RelevantInternalName} target: ${tableField.InternalFieldName}`);
            console.warn(`Relevant control or target control not found for tableField '${tableField.InternalFieldName}'.`);
            return;
          }

          // --- Run the logic on initialization ---
          this.shouldBeRequired(tableField, targetControl)
          // --- Subscribe to value changes ---
          relevantControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
            console.log(`for tableField: ${tableField.TitleAr}, relevantValue: ${relevantControl.value}, targetValue: ${tableField.RelevantVisibleValue}`);
            this.updateControlVisibility(relevantControl, targetControl, undefined, tableField);
            this.shouldBeRequired(tableField, targetControl);
          });
        });
      }
    } else {
      const relevantControl = this.form.get(field.RelevantInternalName);
      const targetControl = this.form.get(field.InternalFieldName) as FormControl; // The control you want to hide
      if (field.InternalFieldName == 'AttachmentName') {
        console.log(`relevantControl: ${field.RelevantInternalName}, targetControl: `, this.form);
      }
      if (!relevantControl || !targetControl) {
        console.warn(`Relevant control or target control not found for field '${field.InternalFieldName}'.`);
        return;
      }

      this.shouldBeRequired(field, targetControl)
      // --- Subscribe to value changes ---
      relevantControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.updateControlVisibility(relevantControl, targetControl, field);
        this.shouldBeRequired(field, targetControl);
      });
    }
  }
  tableFieldVisibilityMap: any = {};
  // Helper method to perform the conditional logic
  private updateControlVisibility(relevantControl: AbstractControl, targetControl: AbstractControl, field?: FieldJson, tableField?: TableServiceField): void {
    if (tableField) {
      const isHidden = this.shouldBeHiddenTableField(tableField)

      this.tableFieldVisibilityMap[tableField.InternalFieldName] = isHidden;

      if (this.tableFieldVisibilityMap[tableField.InternalFieldName]) {
        // Clear validators and disable the control when hidden
        targetControl.disable({ emitEvent: false }); // Avoids triggering parent form changes
      } else {
        // Re-apply validators and enable the control when visible
        // You'll need to know the original validators here. A better approach is to
        // store them on initialization. For now, we'll assume a simple required validator.
        targetControl.enable({ emitEvent: false });
      }

      targetControl.updateValueAndValidity(); // Re-run validation
    }

    const isHidden = this.shouldBeHidden(field!);
    if (this.isHiddenState() !== isHidden) {
      this.isHidden.emit(isHidden);
    }


    if (this.isHiddenState()) {
      // Clear validators and disable the control when hidden
      targetControl.disable({ emitEvent: false }); // Avoids triggering parent form changes
    } else {
      // Re-apply validators and enable the control when visible
      // You'll need to know the original validators here. A better approach is to
      // store them on initialization. For now, we'll assume a simple required validator.

      targetControl.enable({ emitEvent: false });

    }

    targetControl.updateValueAndValidity(); // Re-run validation

  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  groupAttachmentFieldsByRow(fields: AttachmentField[]): AttachmentField[][] {
    const grouped: AttachmentField[][] = [];
    fields.forEach(field => {
      let row = grouped.find((r: AttachmentField[]) => r.length > 0 && r[0].RowID === field.RowID);
      if (!row) {
        row = [];
        grouped.push(row);
      }
      row.push(field);
    });
    return grouped;
  }

  groupTableServiceFieldsByRow(fields: TableServiceField[]): TableServiceField[][] {
    const grouped: TableServiceField[][] = [];
    let sortedFields = fields.sort((a, b) => {
      const orderA = a.OrderID ?? Infinity;
      const orderB = b.OrderID ?? Infinity;
      return orderA - orderB
    })
    sortedFields.forEach(field => {
      let row = grouped.find((r: TableServiceField[]) => r.length > 0 && r[0].RowID === field.RowID);
      if (!row) {
        row = [];
        grouped.push(row);
      }
      row.push(field);
    });
    return grouped;
  }
  public fieldVisibilityMap: { [fieldName: string]: boolean } = {};
  onFieldHidden(field: FieldJson, isHidden: boolean) {
    console.log(`field: ${field.InternalFieldName}, isHidden: ${isHidden}`);
    this.fieldVisibilityMap[field.InternalFieldName] = isHidden;

    // Re-run the filter logic every time a field's visibility changes

  }
  public attachmentShouldBeHidden(field: FieldJson, relevantAttachment: Attachments): boolean {
    // If there's no relevant field, don't hide
    if (!field.RelevantInternalName) {
      return false;
    }
    if (+relevantAttachment.ID !== +field.RelevantVisibleValue) {
      return true;
    }

    const relevantFormGroup = this.form.get(field.RelevantInternalName) as FormControl;
    if (!relevantFormGroup) {
      console.warn(`Relevant FormGroup '${field.RelevantInternalName}' not found in form.`);
      return true;
    }

    const targetKey = +field.RelevantVisibleValue;
    const targetControl = relevantFormGroup?.value;


    // Handle comparison based on operator
    switch (field.RelevantVisibleOperator) {
      case '=':
        /* console.log(`targetControl: ${targetControl}, targetKey: ${targetKey}, targetControl.hasOwnProperty(targetKey): ${!targetControl.hasOwnProperty(targetKey)}`) */
        return !targetControl.includes(targetKey);
      case '!=':
        return targetControl.includes(targetKey);
      default:
        return false;
    }
  }

  // Add new method to handle the loop logic for attachment fields
  public shouldShowTextBoxForAttachment(attachmentField: Attachments, relatedFields: any[]): any {
    // Find the related field that should control the text box visibility
    const relatedField = relatedFields.find(rf => rf.FieldType === 1);

    if (!relatedField) {
      return null;
    }

    // Check if the related field should be hidden
    const shouldHide = this.attachmentShouldBeHidden(this.asFieldJson(relatedField), attachmentField);
    return !shouldHide ? relatedField : null;
  }
  hasRequiredAttachments(field: any): boolean {
    return Array.isArray(field?.Attachments) &&
      field.Attachments.some(
        (attachment: any) =>
          Array.isArray(attachment?.REQ) &&
          attachment.REQ[0]?.IsRequired
      );
  }
  getAttachmentDocId(attachmentFields: AttachmentField[]) {
    return attachmentFields!.find((af: any) => af.FieldType == 10)?.InternalFieldName
  }
  getAttachmentName(attachmentFields: AttachmentField[]) {
    return attachmentFields!.find((af: any) => af.FieldType == 1)?.InternalFieldName
  }
  getAttachmentType(attachmentFields: AttachmentField[]) {
    return attachmentFields!.find((af: any) => af.FieldType == 13)?.InternalFieldName
  }

  getFormArray(fieldName: string): FormArray | null {
    return this.form.get(fieldName) as FormArray;
  }

  getFormGroupAt(fieldName: string, index: number): FormGroup {
    return this.getFormArray(fieldName)?.at(index) as FormGroup;
  }

  addTableRow(fieldName: string, aiField?: FieldJson, singleRow?: any): void {
    const formArray = this.getFormArray(fieldName)!;
    const newFormGroup = new FormGroup({});
    if (singleRow) {
      let newControl = new FormControl({ value: singleRow.ServiceTablesDataID });
      newFormGroup.addControl('ServiceTablesDataID', newControl);
    }

    let field = aiField || this.field

    // Add controls for each table field
    field.TableServiceFields?.forEach(tableField => {
      if (tableField.FieldType === 14) {
        return;
      }
      const validators = [];
      let defaultValue: any = ''
      let extraValidators = this.setupExtraValidations(tableField as any as FieldJson);
      if ((tableField.FieldType === 6 && tableField.Required) || (tableField.FieldType === 5 && tableField.Required)
        || (tableField.FieldType === 19 && tableField.Required)) {
        validators.push(CustomValidators.noNegativeOne);
      } else if (tableField.Required) {
        validators.push(Validators.required);
      }
      if (tableField.FieldType === 6 || (tableField.FieldType === 5)
        || (tableField.FieldType === 19)) {
        defaultValue = +tableField.FieldDefaultValue || tableField.LookupValues!.find((lv) => lv.LookupID === -1)?.LookupID
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
      const control = new FormControl(defaultValue, [...validators, ...extraValidators]);
      newFormGroup.addControl(tableField.InternalFieldName, control);
    });

    formArray.push(newFormGroup);
    this.setupConditionalValidation(this.field)
  }

  getTableFieldInputType(fieldType: number): string {
    switch (fieldType) {
      case 1: // TextBox
      case 11: // UniqueIdentifier (often displayed as text)
      case 15: // Float
      case 24:
      case 22:
        return 'text';
      case 12: // Number
        return 'number';
      case 20: // Phone
        return 'tel';
      case 21: // Email
        return 'email';
      default:
        return 'text';
    }
  }

  onAddButtonClick(): void {
    let isDuplicate = this.validateDuplicateRow();
    if (isDuplicate !== false) {
      let hostElement: HTMLElement | null = null;
      hostElement = document.querySelector<HTMLElement>(`#${isDuplicate}`);
      let focusableElement: HTMLElement | null = hostElement;

      if (focusableElement) {
        focusableElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const active = document.activeElement as HTMLElement | null;
      if (active) active.blur();
      Swal.fire({
        icon: 'error',
        title: this.store.index.locale == 'en' ? `${this.translations()?.rowDuplicateMsg.label} ${this.field.TableServiceFields?.find((tableField) => tableField.InternalFieldName == isDuplicate)?.TitleEn}` : `${this.translations()?.rowDuplicateMsg.label} ${this.field.TableServiceFields?.find((tableField) => tableField.InternalFieldName == isDuplicate)?.TitleAr}`,
        showConfirmButton: true,
        confirmButtonText: this.translations()?.validationMsgBtn.label
      }).then(() => {
        if (focusableElement) {
          focusableElement.focus();
        }
      });

      Swal.getPopup()?.addEventListener('afterClose', () => {
        if (focusableElement) {
          focusableElement.focus({ preventScroll: true });
        }
      });
      return;
    }
    let isValid = this.validateTable();
    if (isValid === true) {
      const formArray = this.getFormArray(this.field.InternalFieldName)!;
      const currentIndex = this.rows().length;
      const currentFormGroup = formArray.at(currentIndex) as FormGroup;
      let payload = { ...currentFormGroup.value, currentIndex: currentIndex + 1 }
      // Add current row data to table display
      for (const key in payload) {
        if (Object.prototype.hasOwnProperty.call(payload, key)) {
          let tableField = this.field.TableServiceFields?.find((tableField) => tableField.InternalFieldName === key)
          if (tableField && (tableField.FieldType === 6 || tableField.FieldType === 4 || tableField.FieldType === 19)) {
            let newVal = tableField.LookupValues!.find((Lookup) => Lookup.LookupID === payload[key])
            if (newVal?.ValueCategoryEn || newVal?.ValueCategoryAr) {
              let category = this.store.index.locale === 'en' ? newVal?.ValueCategoryEn : newVal?.ValueCategoryAr
              payload[`${key}-${category}`] = this.store.index.locale === 'en' ? newVal?.TitleEn : newVal?.TitleAr;
            } else {
              payload[key] = this.store.index.locale === 'en' ? newVal?.TitleEn : newVal?.TitleAr;
            }
          }
          if (tableField && tableField.FieldType === 10) {
            let newVal = this.selectedFile()[key]
            payload[key] = newVal;
          }
        }
      }
      this.rows.set([...this.rows(), payload]);
      /* this.updateColumns(); */

      // Add a new empty FormGroup
      this.addTableRow(this.field.InternalFieldName);
      this.selectedFile.set('')

      // Force change detection
      this.cdr.detectChanges();
      Swal.fire({
        icon: 'success',
        title: this.translations()?.swalAddSuccess.label,
        showConfirmButton: true,
        confirmButtonText: this.translations()?.validationMsgBtn.label
      })
    } else {


      let hostElement: HTMLElement | null = null;
      hostElement = document.querySelector<HTMLElement>(`#${this.field.InternalFieldName} #${isValid}`);
      let focusableElement: HTMLElement | null = hostElement;

      if (focusableElement) {
        focusableElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const active = document.activeElement as HTMLElement | null;
      if (active) active.blur();
      Swal.fire({
        icon: 'error',
        title: this.store.index.locale == 'en' ? this.field.TableServiceFields?.find((tableField) => tableField.InternalFieldName == isValid)?.ValidationMsgEn : this.field.TableServiceFields?.find((tableField) => tableField.InternalFieldName == isValid)?.ValidationMsgAr,
        showConfirmButton: true,
        confirmButtonText: this.translations()?.validationMsgBtn.label

      }).then(() => {
        if (focusableElement) {
          focusableElement.focus();
        }
      });

      Swal.getPopup()?.addEventListener('afterClose', () => {
        if (focusableElement) {
          focusableElement.focus({ preventScroll: true });
        }
      });
    }

  }

  triggerFileInput(tableField?: any): void {
    if (tableField) {
      const fileInput = document.querySelector(`#${this.field.InternalFieldName} #${tableField.InternalFieldName}`) as HTMLInputElement;
      if (fileInput) {
        fileInput.click();
      }
    } else {
      const fileInput = document.querySelector(`#${this.field.InternalFieldName}`) as HTMLInputElement;
      if (fileInput) {
        fileInput.click();
      }
    }
  }
  selectedFile = signal<any>({})
  fileUrl: any = {};
  aiPercent = signal<any>({})
  Confidence = signal<any>({})
  tableFileIndex: number = 1;
  fileLoadingMap = new Map<string, boolean>();
  isFileLoading(fieldKey: string): boolean {
    return this.fileLoadingMap.get(fieldKey) === true;
  }
  setFileLoading(fieldKey: string, value: boolean): void {
    this.fileLoadingMap.set(fieldKey, value);
  }
  getFileKey(tableField: any): string {
    // example: "Resume_0", "ProfilePic_1"
    return `${tableField.InternalFieldName}`;
  }
  onFileSelected(event: Event, formGroup: AbstractControl, tableField: TableServiceField) {
    /*  this.showCustomLoader(tableField.HasModel); */
    this.fileLoading.set(true);
    this.emitLoadingState.emit(true);
    const key = this.getFileKey(tableField);

    // start loader
    this.setFileLoading(key, true);
    let fileControl = this.getControlFromGroup(formGroup, tableField.InternalFieldName)
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      if (!this.isValidFileType(file, tableField)) {
        /* Swal.close(); */
        this.fileLoading.set(false);
        this.emitLoadingState.emit(false);
        this.setFileLoading(key, false);
        Swal.fire({
          icon: 'error',
          title: this.store.index.locale === 'en' ? tableField.ValidMsgEnAllowedFile : tableField.ValidMsgArAllowedFile,
          showConfirmButton: true,
          confirmButtonText: this.translations()?.validationMsgBtn.label
        })
        return;
      }
      if (!this.isValidFileSize(file, tableField)) {
        /* Swal.close(); */
        this.fileLoading.set(false);
        this.emitLoadingState.emit(false);
        this.setFileLoading(key, false);
        Swal.fire({
          icon: 'error',
          title: this.store.index.locale === 'en' ? tableField.ValidMsgEnMaxSize : tableField.ValidMsgArMaxSize,
          showConfirmButton: true,
          confirmButtonText: this.translations()?.validationMsgBtn.label
        })
        return;
      }
      this.fileService.uploadFile(file, tableField.HasModel ? tableField.ModelURL! : 'nomodel', this.field.AiHelpTextAr).subscribe(
        {
          next: (res: FileMetadata) => {
            fileControl?.patchValue(res.FileId.FileID);
            fileControl?.updateValueAndValidity();
            this.selectedFile.set({ ...this.selectedFile(), [tableField.InternalFieldName]: file?.name })
            this.fileUrl[tableField.InternalFieldName + this.tableFileIndex] = `${this.baseUrl}/api/Files/read/${res.FileId.FileID}`;  // blob URL
            ++this.tableFileIndex
            if (res.AnalysisResult) {
              this.Confidence.update((value) => {
                value[tableField.InternalFieldName] = tableField.AiHelpTextAr ? res.AnalysisResult.Confidence : null;
                return value;
              })
              this.aiPercent.update((value) => {
                value[tableField.InternalFieldName] = +res.AnalysisResult.Confidence
                return value;
              });

              for (const key in res.AnalysisResult.fields) {
                if (!Object.hasOwn(res.AnalysisResult.fields, key)) continue;
                const fieldData = res.AnalysisResult.fields[key];

                const fieldToUpdate = this.field.TableServiceFields!.find(f => f.AiMappingName === key && f.RelatedAIInternalFieldName === tableField.InternalFieldName);
                if (fieldToUpdate && fieldData.valueString && fieldToUpdate.RelatedAIInternalFieldName === tableField.InternalFieldName) {
                  if (fieldToUpdate.FieldType === 3 || fieldToUpdate.FieldType === 23) {
                    fieldData.valueString = this.ensureDDMMYYYY(fieldData.valueString);
                    console.log(fieldData.valueString);
                  }
                  if (fieldToUpdate.FieldType === 4 || fieldToUpdate.FieldType === 19 || fieldToUpdate.FieldType === 6) {
                    fieldData.valueString = fieldToUpdate.LookupValues!.find((lv) => {
                      return [lv.ISOLookupID, lv.ISOTitleAr?.toLocaleLowerCase().trim(), lv.ISOTitleEn?.toLocaleLowerCase().trim(),
                      lv.TitleAr?.toLocaleLowerCase(), lv.TitleEn?.toLocaleLowerCase().trim(), lv.TitleEn.toLocaleLowerCase().trim(), lv.TitleAr.toLowerCase().trim()
                      ].includes(fieldData.valueString.toLowerCase().trim());
                    })?.LookupID || -1

                  }
                  if (fieldData) {

                    let value = this.getFormArray(this.field.InternalFieldName)!.at(this.getFormArray(this.field.InternalFieldName)!.length - 1).get(fieldToUpdate.InternalFieldName)?.value;

                    if (fieldToUpdate.hasDataFromAiPriority && tableField.AIExtractDataPriority! !== fieldToUpdate.hasDataFromAiPriority!) {
                      if (this.getFormArray(this.field.InternalFieldName)!.at(this.getFormArray(this.field.InternalFieldName)!.length - 1).get(fieldToUpdate.InternalFieldName)?.value !== fieldData.valueString) {
                        this.fieldChanged.emit({
                          [this.store.index.locale === 'en' ? fieldToUpdate.TitleEn : fieldToUpdate.TitleAr]:
                          {
                            value: fieldData.valueString,
                            fieldIDs: [this.field.ServiceFieldID, fieldToUpdate.ServiceTableFieldID],
                            aiPriorities: [fieldToUpdate.hasDataFromAiPriority, this.field.AIExtractDataPriority]
                          }
                        })
                      }
                      this.getFormArray(this.field.InternalFieldName)!.at(this.getFormArray(this.field.InternalFieldName)!.length - 1).get(fieldToUpdate.InternalFieldName)?.patchValue(fieldData.valueString);
                    }

                    if ((fieldToUpdate.hasDataFromAiPriority && tableField.AIExtractDataPriority! <= fieldToUpdate.hasDataFromAiPriority!) || !fieldToUpdate.hasDataFromAiPriority) {
                      this.getFormArray(this.field.InternalFieldName)!.at(this.getFormArray(this.field.InternalFieldName)!.length - 1).get(fieldToUpdate.InternalFieldName)?.patchValue(fieldData.valueString);
                      let inputEl = (document.querySelector(`#${this.field.InternalFieldName} #${fieldToUpdate.InternalFieldName}`) as HTMLInputElement)

                      if (inputEl && inputEl.type === 'text') {
                        inputEl.value = fieldData.valueString
                      }
                    }

                    this.setFieldPriority(key, fieldData, fieldToUpdate, tableField);


                    this.getFormArray(this.field.InternalFieldName)!.at(this.getFormArray(this.field.InternalFieldName)!.length - 1).get(fieldToUpdate.InternalFieldName)?.updateValueAndValidity();;
                  }

                }
              }

              console.log(this.form.value);
            }
            /* Swal.close(); */
            this.fileLoading.set(false);
            this.emitLoadingState.emit(false);
            this.setFileLoading(key, false);
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
            toast.fire({
              icon: 'success',
              title: tableField.HasModel ? this.translations()?.swalAiFileSuccessMsg.label : this.translations()?.swalFileSuccessMsg.label
            })
            /*  Swal.fire({
               icon: "success",
               title: tableField.HasModel ? this.translations()?.swalAiFileSuccessMsg.label : this.translations()?.swalFileSuccessMsg.label,
               padding: '10px 20px',
               confirmButtonText: this.translations()?.validationMsgBtn.label,
             }); */

          },
          error: (err) => {
            console.log(err);
            /* Swal.close(); */
            this.fileLoading.set(false);
            this.emitLoadingState.emit(false);
            this.setFileLoading(key, false);
            Swal.fire({
              icon: 'error',
              title: this.translations()?.swalFileErrMsg.label,
              showConfirmButton: true,
              confirmButtonText: this.translations()?.validationMsgBtn.label
            })
          }
        })
      /* const imageUrl = `https://msy.vcld.ws/api/Files/read/${this.uploadedFiles[index][this.AttachmentDocIDKey]}`;
   
    // Use window.open() to open the image URL in a new tab.
    window.open(imageUrl, '_blank'); */

    } else {
      this.setFileLoading(key, false);
    }
  }

  fieldChanged = output<any>();
  uploadComplete = output<any>();
  navigationTabs = input<NavigationTab[] | null>();
  onFileFieldJsonSelected(event: Event, field: FieldJson) {
    /* this.showCustomLoader(this.field.HasModel); 12 */
    this.fileLoading.set(true);
    this.emitLoadingState.emit(true);
    let fileControl = this.control
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      if (!this.isValidFileType(file, field)) {
        /* Swal.close(); */
        this.fileLoading.set(false);
        this.emitLoadingState.emit(false);
        Swal.fire({
          icon: 'error',
          title: this.store.index.locale === 'en' ? field.ValidMsgEnAllowedFile : field.ValidMsgArAllowedFile,
          showConfirmButton: true,
          confirmButtonText: this.translations()?.validationMsgBtn.label
        })
        return;
      }
      if (!this.isValidFileSize(file, field)) {
        /* Swal.close(); */
        this.fileLoading.set(false);
        this.emitLoadingState.emit(false);
        Swal.fire({
          icon: 'error',
          title: this.store.index.locale === 'en' ? field.ValidMsgEnMaxSize : field.ValidMsgArMaxSize,
          showConfirmButton: true,
          confirmButtonText: this.translations()?.validationMsgBtn.label
        })
        return;
      }
      this.fileService.uploadFile(file, this.field.HasModel ? this.field.ModelURL! : 'nomodel', this.field.AiHelpTextAr).subscribe(
        {
          next: (res: any) => {
            fileControl?.patchValue(res.FileId.FileID);
            fileControl?.updateValueAndValidity();
            this.selectedFile.set({ ...this.selectedFile(), [field.InternalFieldName]: file?.name })
            this.fileUrl[field.InternalFieldName] = `${this.baseUrl}/api/Files/read/${res.FileId.FileID}`  // blob URL
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
            /* Swal.close(); */
            this.fileLoading.set(false);
            this.emitLoadingState.emit(false);
            toast.fire({
              icon: 'success',
              title: field.HasModel ? this.translations()?.swalAiFileSuccessMsg.label : this.translations()?.swalFileSuccessMsg.label
            })
            this.uploadComplete.emit('yes')
            if (res.AnalysisResult) {
              this.Confidence.update((value) => {
                value[field.InternalFieldName] = this.field.AiHelpTextAr ? res.AnalysisResult.Confidence : null;
                return value;
              })
              this.aiPercent.update((value) => {
                value[field.InternalFieldName] = +res.AnalysisResult.Confidence
                return value;
              });
              for (const key in res.AnalysisResult.fields) {
                if (!Object.hasOwn(res.AnalysisResult.fields, key)) continue;
                const fieldData = res.AnalysisResult.fields[key];
                if (key === 'CRServiceCode' && fieldData.valueString) {
                  let servicesMenu = this.menuLinksService.menuResponse().find((link: any) => link.TitleEn === 'Services');
                  let currentServiceData = this.findByServiceId([servicesMenu], this.newApplicationService.uiResponse()?.NavigationTabs[0].FKServiceID);
                  if (Number(fieldData.valueString) !== currentServiceData.CRServiceCode) {
                    let correctService = this.findByCRServiceCode([servicesMenu], fieldData.valueString);
                    if (correctService) {
                      Swal.fire({
                        icon: 'error',
                        title: this.translations()?.fileIncorrectServiceMsg.label.replace('[serviceName]', this.store.index.locale === 'en' ? correctService.TitleEn : correctService.TitleAr),
                        showConfirmButton: true,
                        showCancelButton: true,
                        confirmButtonText: this.translations()?.incorrectServiceConfirmBtnName.label,
                        cancelButtonText: this.translations()?.fileIncorrectServiceCancelBtnName.label
                      }).then((result) => {
                        if (result.isConfirmed) {
                          this.navigateToDetails(correctService)
                        }
                        this.control?.reset();
                        let fileInput = document.getElementById(this.field.InternalFieldName) as HTMLInputElement;
                        if (fileInput) {
                          fileInput.value = '';
                          this.selectedFile.update((files) => {
                            delete files[this.field.InternalFieldName];
                            return files;
                          })
                        }
                      })
                      break;
                    } else {
                      Swal.fire({
                        icon: 'error',
                        title: this.translations()?.fileNoCorrectService.label,
                        showConfirmButton: true,
                        showCancelButton: true,
                        confirmButtonText: this.translations()?.fileNoCorrectServiceConfirmBtnName.label,
                        cancelButtonText: this.translations()?.fileNoCorrectServiceCancelBtnName.label
                      }).then((result) => {
                        if (result.isConfirmed) {
                          this.router.navigate(['Inbox'])
                        }
                        this.control?.reset();
                        let fileInput = document.getElementById(this.field.InternalFieldName) as HTMLInputElement;
                        if (fileInput) {
                          fileInput.value = '';
                          this.selectedFile.update((files) => {
                            delete files[this.field.InternalFieldName];
                            return files;
                          })
                        }
                      })
                      break;
                    }
                  }

                  continue;
                }
                const fieldToUpdate = this.newApplicationService.uiResponseAllFields()!.find(f => f.AiMappingName === key && f.RelatedAIInternalFieldName === this.field.InternalFieldName);
                if (fieldToUpdate && fieldData.valueString && fieldToUpdate.RelatedAIInternalFieldName === this.field.InternalFieldName) {
                  if (fieldToUpdate.FieldType === 3 || fieldToUpdate.FieldType === 23) {
                    fieldData.valueString = this.ensureDDMMYYYY(fieldData.valueString);
                    console.log(fieldData.valueString);
                  }
                  if (fieldToUpdate.FieldType === 4 || fieldToUpdate.FieldType === 19 || fieldToUpdate.FieldType === 6) {

                    fieldData.valueString = fieldToUpdate.LookupValues!.find((lv) => {
                      return [
                        lv.ISOLookupID,
                        lv.ISOTitleAr?.toLowerCase(),
                        lv.ISOTitleEn?.toLowerCase(),
                        lv.TitleAr?.toLowerCase(),
                        lv.TitleEn?.toLowerCase(),
                        lv.TitleEn.toLowerCase(),
                        lv.TitleAr.toLowerCase()
                      ].includes(fieldData.valueString.toLowerCase());
                    })?.LookupID

                  }
                  if (fieldData) {
                    let value = this.form.get(fieldToUpdate.InternalFieldName)?.value;
                    if (fieldToUpdate.hasDataFromAiPriority && this.field.AIExtractDataPriority! !== fieldToUpdate.hasDataFromAiPriority!) {
                      if (this.form.get(fieldToUpdate.InternalFieldName)?.value !== fieldData.valueString) {
                        this.fieldChanged.emit({
                          [this.store.index.locale === 'en' ? fieldToUpdate.TitleEn : fieldToUpdate.TitleAr]:
                          {
                            value: fieldData.valueString,
                            fieldIDs: [this.field.ServiceFieldID, fieldToUpdate.ServiceFieldID],
                            aiPriorities: [fieldToUpdate.hasDataFromAiPriority, this.field.AIExtractDataPriority]
                          }
                        })
                        if (this.field.UploadFileIfAIDataMismatch === false) {
                          this.control?.reset();
                          if (this.aiPercent()[this.field.InternalFieldName] > 0) {
                            this.clearAnalyzedData();
                          }
                          let fileInput = document.getElementById(this.field.InternalFieldName) as HTMLInputElement;
                          if (fileInput) {
                            fileInput.value = '';
                          }
                          this.selectedFile.update((files) => {
                            delete files[this.field.InternalFieldName];
                            return files;
                          })
                        }
                      }
                    }
                    if ((fieldToUpdate.hasDataFromAiPriority && this.field.AIExtractDataPriority! <= fieldToUpdate.hasDataFromAiPriority!) || !fieldToUpdate.hasDataFromAiPriority) {
                      this.form.get(fieldToUpdate.InternalFieldName)?.patchValue(fieldData.valueString);
                    }



                    this.setFieldPriority(key, fieldData);

                  }

                }
              }
              if (res.AnalysisResult.DescriptionTemplates) {
                for (const key in res.AnalysisResult.DescriptionTemplates) {
                  if (!Object.hasOwn(res.AnalysisResult.DescriptionTemplates, key)) continue;
                  let fieldData = res.AnalysisResult.DescriptionTemplates[key];
                  const fieldToUpdate = this.newApplicationService.uiResponseAllFields()!.find(f => f.AiMappingName === key);
                  if (fieldToUpdate && fieldData && fieldToUpdate.RelatedAIInternalFieldName === this.field.InternalFieldName) {
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

                    let value = this.form.get(fieldToUpdate.InternalFieldName)?.value;
                    if (value) {
                      if (this.field.AIExtractDataPriority! <= fieldToUpdate.hasDataFromAiPriority!) {
                        this.form.get(fieldToUpdate.InternalFieldName)?.patchValue(fieldData);
                      }
                    } else {
                      fieldToUpdate.hasDataFromAiPriority = this.field.AIExtractDataPriority!
                      this.form.get(fieldToUpdate.InternalFieldName)?.patchValue(fieldData);
                    }
                  }


                }
              }

              if (res.AnalysisResult.AnnualReport) {
                for (const key in res.AnalysisResult.AnnualReport) {
                  if (!Object.hasOwn(res.AnalysisResult.AnnualReport, key)) continue;
                  let fieldData = res.AnalysisResult.AnnualReport[key];
                  const fieldToUpdate = this.newApplicationService.uiResponseAllFields()!.find(f => f.AiMappingName === key);
                  if (fieldToUpdate && fieldData && fieldToUpdate.RelatedAIInternalFieldName === this.field.InternalFieldName) {
                    if (fieldToUpdate.FieldType !== 8) {
                      if (Array.isArray(fieldData)) {
                        fieldData = fieldData[0];
                      }
                      this.form.get(fieldToUpdate.InternalFieldName)?.patchValue(fieldData);
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

                          this.addTableRow(fieldToUpdate.InternalFieldName, fieldToUpdate);
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
                          this.addTableRow(fieldToUpdate.InternalFieldName, fieldToUpdate);
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
                            // at the START (^) or END ($) of the string.12
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
                            this.addTableRow(fieldToUpdate.InternalFieldName, fieldToUpdate);
                          }
                        }
                        console.log(fieldData);
                      }
                      this.newApplicationService.reTriggerTable.set(!this.newApplicationService.reTriggerTable());

                    }
                  }
                }
              }

            }

          },
          error: (err) => {
            console.log(err);
            /* Swal.close(); */
            this.fileLoading.set(false);
            this.emitLoadingState.emit(false);
            Swal.fire({
              icon: 'error',
              title: this.translations()?.swalFileErrMsg.label,
              showConfirmButton: true,
              confirmButtonText: this.translations()?.validationMsgBtn.label
            })
          }
        })

    } else {
      this.fileLoading.set(false);
      this.emitLoadingState.emit(false);
    }
  }

  findByServiceId(tree: any[], serviceId: any): any | null {
    // ensure serviceId is a number
    const targetId = Number(serviceId);

    for (const item of tree) {
      if (Number(item.ServiceID) === targetId) {
        return item;
      }

      if (item.children?.length) {
        const found = this.findByServiceId(item.children, targetId);
        if (found) return found;
      }
    }
    return null;
  }
  findByCRServiceCode(tree: any[], CRServiceCode: any): any | null {
    // ensure serviceId is a number
    const targetId = Number(CRServiceCode);

    for (const item of tree) {
      if (Number(item.CRServiceCode) === targetId) {
        return item;
      }

      if (item.children?.length) {
        const found = this.findByCRServiceCode(item.children, targetId);
        if (found) return found;
      }
    }
    return null;
  }
  public getControlFromGroup(formGroup: AbstractControl, fieldName: string): FormControl | undefined {
    return formGroup.get(fieldName) as FormControl;
  }
  private isValidFileType(file: File, field: TableServiceField | FieldJson): boolean {
    const fileName = file.name.toLowerCase();
    const acceptedExtensions = field.AllowedFileTypes!.toLowerCase().split(',').map(ext => ext.trim());

    return acceptedExtensions.some(ext => {
      if (ext.startsWith('.')) {
        return fileName.endsWith(ext);
      }
      // Handle MIME types if needed
      return fileName.endsWith(ext);
    });
  }
  private isValidFileSize(file: File, tableField: TableServiceField | FieldJson) {
    // Check file size
    const fileSizeKB = file.size / 1024;
    return fileSizeKB < tableField.MaxAttachmentSizeKB!
  }
  onEditRow(index: number) {
    this.editFlag.set(true);
    this.editIndex = index;
    const formGroup = this.getFormArray(this.field.InternalFieldName)!.at(index - 1);
    const updateFormGroup = this.getFormArray(this.field.InternalFieldName)!.at(this.getFormArray(this.field.InternalFieldName)!.length - 1);
    updateFormGroup.patchValue(formGroup.getRawValue());
    const tableFieldsFileType10 = this.field.TableServiceFields!.filter(tableField => tableField.FieldType === 10);

    const selectedFileObj = tableFieldsFileType10.reduce((obj: Record<string, any>, tableField) => {
      obj[tableField.InternalFieldName] = this.rows()[this.editIndex - 1][tableField.InternalFieldName];
      return obj;
    }, {});
    this.selectedFile.update((selectedFile) => {
      return { ...selectedFile, ...selectedFileObj }
    });
    const element = document.getElementById(this.field.InternalFieldName);
    if (element) {
      element.focus()
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  editIndex: any = null;
  applyEdit() {
    let isDuplicate = this.validateDuplicateRow(this.editIndex);
    if (isDuplicate !== false) {
      let hostElement: HTMLElement | null = null;
      hostElement = document.querySelector<HTMLElement>(`#${isDuplicate}`);
      let focusableElement: HTMLElement | null = hostElement;

      if (focusableElement) {
        focusableElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const active = document.activeElement as HTMLElement | null;
      if (active) active.blur();
      Swal.fire({
        icon: 'error',
        title: this.store.index.locale == 'en' ? `${this.translations()?.rowDuplicateMsg.label} ${this.field.TableServiceFields?.find((tableField) => tableField.InternalFieldName == isDuplicate)?.TitleEn}` : `${this.translations()?.rowDuplicateMsg.label} ${this.field.TableServiceFields?.find((tableField) => tableField.InternalFieldName == isDuplicate)?.TitleAr}`,
        showConfirmButton: true,
        confirmButtonText: this.translations()?.validationMsgBtn.label
      }).then(() => {
        if (focusableElement) {
          focusableElement.focus();
        }
      });

      Swal.getPopup()?.addEventListener('afterClose', () => {
        if (focusableElement) {
          focusableElement.focus({ preventScroll: true });
        }
      });
      return;
    }
    let isValid = this.validateTable();
    if (isValid === true) {
      let editedRow: FormGroup = this.getFormArray(this.field.InternalFieldName)!
        .at(this.editIndex - 1) as FormGroup;

      editedRow.patchValue(this.getFormArray(this.field.InternalFieldName)!
        .at(this.getFormArray(this.field.InternalFieldName)!.length - 1).value);
      for (const key in editedRow.controls) {
        if (!Object.hasOwn(editedRow.controls, key)) continue;
        let tableField = this.field.TableServiceFields?.find((tableField) => tableField.InternalFieldName === key)
        if (tableField) {
          this.shouldBeRequired(tableField!, editedRow.get(key) as FormControl);
        }


      }
      let payload = this.getFormArray(this.field.InternalFieldName)!
        .at(this.getFormArray(this.field.InternalFieldName)!.length - 1).value;
      for (const key in payload) {
        if (Object.prototype.hasOwnProperty.call(payload, key)) {
          let tableField = this.field.TableServiceFields?.find((tableField) => tableField.InternalFieldName === key)
          if (tableField && (tableField.FieldType === 6 || tableField.FieldType === 4 || tableField.FieldType === 19)) {
            let newVal = tableField.LookupValues!.find((Lookup) => Lookup.LookupID === payload[key])
            if (newVal?.ValueCategoryEn || newVal?.ValueCategoryAr) {
              this.lookupCategories.forEach((category: any) => {
                payload[`${key}-${category}`] = ''
              })
              let category = this.store.index.locale === 'en' ? newVal?.ValueCategoryEn : newVal?.ValueCategoryAr
              payload[`${key}-${category}`] = this.store.index.locale === 'en' ? newVal?.TitleEn : newVal?.TitleAr;
            } else {
              payload[key] = this.store.index.locale === 'en' ? newVal?.TitleEn : newVal?.TitleAr;
            }
          }
          if (tableField && tableField.FieldType === 10) {
            let newVal = this.selectedFile()[key]
            payload[key] = newVal;
          }
        }
      }
      this.rows.update((rows: any[]) => {
        const updatedRows = [...rows];
        updatedRows[this.editIndex - 1] = { ...updatedRows[this.editIndex - 1], ...payload };
        return updatedRows;
      });
      const defaultValues: any = {};
      this.field.TableServiceFields?.forEach(tableField => {
        if (tableField.FieldType === 6 || tableField.FieldType === 5 || tableField.FieldType === 19) {
          defaultValues[tableField.InternalFieldName] = +tableField.FieldDefaultValue || tableField.LookupValues!.find((lv) => lv.LookupID === -1)?.LookupID;
        } else {
          defaultValues[tableField.InternalFieldName] = null; // or '' for text fields
        }
      });
      defaultValues['GDXTableFieldIDs'] = ""
      const formGroup = this.getFormArray(this.field.InternalFieldName)!.at(this.getFormArray(this.field.InternalFieldName)!.length - 1).reset(defaultValues);
      let tablefields = this.field.TableServiceFields?.filter((item) => {
        return item.FieldType === 10
      })
      tablefields?.forEach((item) => {
        this.selectedFile.update((selectedFile) => {
          return { ...selectedFile, [item.InternalFieldName]: '' }
        });
      })
      this.editIndex = null;
      this.newApplicationService.rowIndex.set(null);
      this.editFlag.set(false);
      Swal.fire({
        icon: 'success',
        title: this.translations()?.swalSuccessfulEditMsg.label,
        showConfirmButton: true,
        confirmButtonText: this.translations()?.validationMsgBtn.label
      })
    } else {
      Swal.fire({
        icon: 'error',
        title: this.store.index.locale == 'en' ? this.field.TableServiceFields?.find((tableField) => tableField.InternalFieldName == isValid)?.ValidationMsgEn : this.field.TableServiceFields?.find((tableField) => tableField.InternalFieldName == isValid)?.ValidationMsgAr,
        showConfirmButton: true,
        confirmButtonText: this.translations()?.validationMsgBtn.label
      })
    }
  }
  deleteRow(index: number): void {
    Swal.fire({
      title: this.translations()?.swalConfirmTitle.label,
      text: this.translations()?.swalConfirmDeleteText.label,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.translations()?.validationMsgBtn.label,
      cancelButtonText: this.translations()?.validationMsgCancelBtn.label,
    }).then((result: any) => {
      if (result.isConfirmed) {
        const formArray = this.getFormArray(this.field.InternalFieldName)!;
        if (this.editIndex === index) {
          const defaultValues: any = {};
          this.field.TableServiceFields?.forEach(tableField => {
            if (tableField.FieldType === 6 || tableField.FieldType === 5 || tableField.FieldType === 19) {
              defaultValues[tableField.InternalFieldName] = +tableField.FieldDefaultValue || tableField.LookupValues!.find((lv) => lv.LookupID === -1)?.LookupID;
            } else {
              defaultValues[tableField.InternalFieldName] = null; // or '' for text fields
            }
          });
          formArray.at(formArray.length - 1).reset(defaultValues);
          let tablefields = this.field.TableServiceFields?.filter((item) => {
            return item.FieldType === 10
          })
          tablefields?.forEach((item) => {
            this.selectedFile.update((selectedFile) => {
              return { ...selectedFile, [item.InternalFieldName]: '' }
            });
          })
          this.editFlag.set(false)
        }
        if (this.newApplicationService.requestData() && (formArray.at(index! - 1) as FormGroup)?.controls.hasOwnProperty('ServiceTablesDataID')) {
          (formArray.at(index! - 1) as FormGroup).addControl('IsDeleted', new FormControl(true));
          let newIndex = 1;
          this.rows.update((rows: any[]) => rows.filter((_: any, i: number) => i !== index - 1).map((item) => {
            item.currentIndex = newIndex;
            ++newIndex;
            return item;
          }));
        } else {
          if (formArray.length > 1) {
            formArray.removeAt(index! - 1);
          }
          let newIndex = 1;
          this.rows.update((rows: any[]) => rows.filter((_: any, i: number) => i !== index - 1).map((item) => {
            item.currentIndex = newIndex;
            ++newIndex;
            return item;
          }));
        }
        Swal.fire({
          icon: 'success',
          title: this.translations()?.swalDeleteSuccess.label,
          showConfirmButton: true,
          confirmButtonText: this.translations()?.validationMsgBtn.label
        })
      }
    })
  }
  validateTable() {
    const formArray = this.getFormArray(this.field.InternalFieldName)!
    const lastElementIndex = formArray.length - 1;
    const lastElementControls = (formArray.at(lastElementIndex) as FormGroup).controls;
    let controlNames = this.field.TableServiceFields?.filter((item) => !!item.OrderID).sort((a, b) => {
      return a.OrderID - b.OrderID
    });
    if (controlNames) {
      for (let controlName of controlNames) {
        if (lastElementControls[controlName.InternalFieldName]?.invalid) {
          lastElementControls[controlName.InternalFieldName].markAsTouched()
          return controlName.InternalFieldName;
        }
      }
    }
    return true;
  }
  validateDuplicateRow(editIndex: number | null = null) {
    const formArray = this.getFormArray(this.field.InternalFieldName)!
    const lastElementIndex = formArray.length - 1;
    const lastElementControls = (formArray.at(lastElementIndex) as FormGroup).controls;
    let duplicateField = this.field.TableServiceFields?.find((tableField) => tableField.AllowDuplicateValues === false);
    if (duplicateField) {
      const valueToCheck = lastElementControls[duplicateField.InternalFieldName].value;
      for (let i = 0; i < lastElementIndex; i++) {
        const currentControls = (formArray.at(i) as FormGroup).controls;
        if (currentControls[duplicateField.InternalFieldName].value === valueToCheck) {
          if (editIndex !== null && editIndex - 1 === i) {
            continue; // Skip the check if it's the same row being edited
          }
          return duplicateField.InternalFieldName;
        }
      }
      return false;
    } else {
      return false;
    }
  }
  openFile(tableField: TableServiceField | FieldJson, index?: number) {
    if (this.fileUrl) {
      const imageUrl = `${this.fileUrl[tableField.InternalFieldName + index!] || `${this.baseUrl}/api/Files/read/` + this.control?.value}`;

      // Use window.open() to open the image URL in a new tab.
      window.open(imageUrl, '_blank');
    }
  }
  // Declare a boolean property to control the visibility
  isComponentHidden: any = {}
  // Method to handle the emitted event
  onHidden(hidden: boolean, id: any) {
    // Set the property to the value of the emitted event
    if (this.isHiddenState() !== hidden) {
      this.isComponentHidden[id] = hidden;
    }
  }
  isArabic: boolean = false;

  // Regular expression to detect Arabic characters
  private arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

  checkDirection(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const value = inputElement.value;

    // Check if the input value contains any Arabic characters
    this.isArabic = this.arabicRegex.test(value);
  }

  getNestedValue(obj: any, path: any) {
    // Split the path string by the dot '.'
    const keys = path.split('.');

    // Use a reducer to iterate through the object
    // and access each nested key
    return keys.reduce((currentObj: any, key: any) => {
      // If the current object is valid, return the next level.
      // Otherwise, return null or undefined to prevent an error.
      return currentObj && currentObj[key] !== undefined ? currentObj[key] : undefined;
    }, obj); // Start the reduction with the original object
  }
  seeMore: boolean = false;
  toggleSeeMore() {
    this.seeMore = !this.seeMore;
  }


  // Cache to store the last array output for each field
  private _memoizedFilteredValuesCache: { [fieldId: string]: any[] } = {};
  // Cache to store the last source data reference for each field
  private _lastLookupValuesCache: { [fieldId: string]: any[] | null } = {};
  // This is now a METHOD, not a getter, so it can accept parameters
  filteredLookupValues(tableField?: any): any[] {
    // Determine the relevant field object
    let fieldToProcess: any
    if (tableField) {
      fieldToProcess = tableField;
    } else {
      fieldToProcess = this.field
    }

    // Generate a unique ID for this specific field instance (crucial for caching)
    const fieldId = fieldToProcess.InternalFieldName;

    if (this.field.FieldType === 19) {
      if (this.newApplicationService.requestData() || this.newApplicationService.newRequestData()) {
        if (this.newApplicationService.requestData()?.['OldSecondaryActivity'] || this.newApplicationService.newRequestData()?.['OldSecondaryActivity']) {
          let lookups = this.field.LookupValues!.filter((Lookup) => [...(this.newApplicationService.requestData()?.['OldSecondaryActivity']?.split(',') || []), ...(this.newApplicationService.newRequestData()?.['OldSecondaryActivity']?.split(',') || [])].includes(`${Lookup.LookupID}`))
          if (
            lookups.length > 0
            && [this.newApplicationService.requestData()?.FkProcessID, this.newApplicationService.newRequestData()?.FkProcessID].includes(1597)
          ) {
            lookups.forEach(lookup => {
              lookup.disabled = true
            })
          }

        }
      }
    }

    // 1. Determine Current Source Data
    const currentLookupValues = fieldToProcess.LookupValues!;

    // Get the cache values for this specific field
    const lastLookupValues = this._lastLookupValuesCache[fieldId];
    const memoizedValues = this._memoizedFilteredValuesCache[fieldId];

    // 2. Memoization Check: If the source data reference hasn't changed, return the cache
    if (currentLookupValues === lastLookupValues) {
      return memoizedValues || [];
    }

    // 3. Update the cache trackers with new data
    this._lastLookupValuesCache[fieldId] = currentLookupValues || null;

    // Handle null/empty data
    if (!currentLookupValues) {
      this._memoizedFilteredValuesCache[fieldId] = [];
      return [];
    }

    // 4. Perform the Filtering
    let newFilteredValues: any;
    if (this.field.FieldType === 19 || tableField?.FieldType === 19) {
      newFilteredValues = currentLookupValues.filter(
        (item: any) => item.LookupID !== -1
      );
    } else {
      newFilteredValues = currentLookupValues.filter(
        (item: any) => {
          if (item.FkClubID) {
            let formFkClubID = this.form.get('FkClubID')?.value
            if (formFkClubID) {
              return formFkClubID === item.FkClubID || item.LookupID === -1
            }
          }
          return item.isFiltered !== true
        }
      )
    }

    // 5. Store and Return the New Result
    this._memoizedFilteredValuesCache[fieldId] = newFilteredValues;
    return newFilteredValues;
  }
  private invalidateLookupCache() {
    this._memoizedFilteredValuesCache = {};
    this._lastLookupValuesCache = {};
  }


  expandedRowId = signal<number | null>(null); // Or whatever type your row ID is

  toggleRow(index: any) {
    if (this.expandedRowId() === index) {
      this.expandedRowId.set(null); // Collapse the row if it's already expanded
      this.showSideDrawer = false;
    } else {
      this.expandedRowId.set(index); // Expand the new row
      this.expandedRow.set(this.rows()[index - 1])

      /* console.log(this.expandedRow());
      console.log(this.expandedFields); */
      this.showSideDrawer = true;
    }
  }
  closeSideDrawer() {
    this.expandedRowId.set(null);
    this.expandedRow.set(null);
    this.showSideDrawer = false;
  }
  allFilesEmpty() {
    return this.getFormArray(this.field.InternalFieldName)?.value.every((attachment: any) => attachment.files.length === 0);
  }
  deleteFile(tableField?: TableServiceField) {
    if (this.aiPercent()[tableField?.InternalFieldName || this.field.InternalFieldName] > 0) {
      this.clearAnalyzedData();
    }
    if (this.field.FieldType !== 8) {
      this.control?.reset();
      this.selectedFile.update((files) => {
        delete files[this.field.InternalFieldName];
        return files;
      })
      let fileInput = document.getElementById(this.field.InternalFieldName) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } else {
      let formArray = this.getFormArray(this.field.InternalFieldName)!;
      let tableFieldControl = formArray.at(-1).get(tableField!.InternalFieldName);
      if (tableFieldControl) {
        tableFieldControl.reset();
      }
      /* const defaultValues: any = {};
      this.field.TableServiceFields?.forEach(tableField => {
        if (tableField.FieldType === 6 || tableField.FieldType === 5 || tableField.FieldType === 19) {
          defaultValues[tableField.InternalFieldName] = +tableField.FieldDefaultValue || tableField.LookupValues!.find((lv) => lv.LookupID === -1)?.LookupID;
        } else {
          defaultValues[tableField.InternalFieldName] = null; // or '' for text fields12
        }
      }); */
      this.selectedFile.update((files) => {
        delete files[tableField!.InternalFieldName];
        return files;
      })
      let fileInput = document.querySelector<HTMLElement>(`#${this.field.InternalFieldName} #${tableField!.InternalFieldName}`) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    }
  }
  cpModalVisible: boolean = false;
  crModalVisible: boolean = false;
  openCpModal() {
    this.cpModalVisible = true;
    console.log('modal opened!');
  }
  closeCpModal() {
    this.cpModalVisible = false;
    console.log('modal closed!');
  }
  openCrModal() {
    this.crModalVisible = true;
    console.log('modal opened!');
  }
  closeCrModal() {
    this.crModalVisible = false;
    console.log('modal closed!');
  }

  readonly errorPrecedence: string[] = [
    'required',         // 1. Must always be first
    'noNegativeOne',    // 2. Custom required check for dropdowns/radios
    'minYears',         // 3. Custom min-age check (date field)
    'min',              // 4. Standard min value check
    'maxLength',        // 5. Standard max length
    'numberMinLength',  // 6. Custom min length check
    'email',            // 7. Email format check
    'pattern',          // 8. Standard pattern check
    'exactValue',
    'compareWithToday',
    'invalidDate',
    'compareWithOtherControl',
    'conditionalValueCompare',
    'between'
    // Add other error keys here in their priority order
  ];
  // Component: field-renderer.component.ts

  /**
   * Finds the highest-priority validation error on the control.
   */
  getHighestPriorityError(control: AbstractControl | null): { key: string, error: any } | null {
    if (!control?.errors) {
      return null;
    }

    // Iterate through the precedence list
    for (const key of this.errorPrecedence) {
      if (control.hasError(key)) {
        // Return the error key and the error object itself
        return { key, error: control.errors[key] };
      }
    }

    return null; // No errors found from the defined list
  }
  getRecordedFiles(ID: number) {
    return this.newApplicationService.requestData()?.Attachments?.find((attachment: any) => attachment.FkAttachmentTypeID === ID) || this.newApplicationService.newRequestData()?.Attachments?.find((attachment: any) => attachment.FkAttachmentTypeID === ID) || null;
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
    // like "http://"), forms the Url.n
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


  openHistoryModal() {
    this.newApplicationService.auditLog({
      RequestID: this.newApplicationService.requestData()?.RequestID,
      FieldName: this.field.InternalFieldName
    }).subscribe((res: any) => {
      Swal.fire({
        title: this.translations()?.swalPrevValueTitle.label,
        html: this.store.index.locale === 'en' ? res.result.items[0].FieldValueWas || res.result.items[0].FieldTextValueENWas : res.result.items[0].FieldTextValueWas || res.result.items[0].FieldValueWas ||
          this.translations()?.swalPreviousValuePlaceholder.label,
        confirmButtonText: this.translations()?.validationMsgBtn.label
      })

    })
  }

  showCustomLoader(isAiFile: boolean): void {
    const customLoaderHtml = `
      <div class="col-span-full flex justify-center">
        <span
          class="animate-spin border-4 border-black border-l-transparent rounded-full w-12 h-12 inline-block align-middle m-auto">
        </span>
      </div>
      <h2 style="margin-top: 10px; font-size: 1.5em; color: #333;">
      ${isAiFile ? this.translations()?.aiFileLoaderMsg.label : this.translations()?.fileLoaderMsg.label}
      </h2>
    `;
    const options: SweetAlertOptions = {
      // Note: Use 'titleText' for simple text or 'title' for HTML title if needed. 
      // Since we're using custom HTML for the content, it's best to use `html` and skip `title`.

      // We omit 'title' and 'icon' to have more control over the modal's top area
      // icon: undefined,
      // title: undefined,

      html: customLoaderHtml, // Inject your custom spinner and title here

      // Configuration to make it a proper loader
      showConfirmButton: false,
      showCancelButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,

      // You can also add a custom class for styling the whole modal
      // customClass: {
      //   popup: 'my-custom-loader-popup'
      // }
    };

    Swal.fire(options);
  }

  openAnalysisModel = signal(false);
  triggerAiAnalysis(fileID: string) {
    if (!this.fileService.fileAnalysisData()[this.field.InternalFieldName]) {
      this.fileService.readFileAnalysis(fileID).subscribe((res: any) => {
        this.fileService.fileAnalysisData.set({ ...this.fileService.fileAnalysisData(), [this.field.InternalFieldName]: res })
        this.openAnalysisModel.set(true)
      })
    } else {
      this.openAnalysisModel.set(true)
    }
  }
  onUserClose(event: any) {
    this.openAnalysisModel.set(false)
  }

  readFileAnalysis(fileID: string) {
    this.aiPercent.update((value) => {
      value[this.field.InternalFieldName] = +this.fileService.fileAnalysisData()[this.field.InternalFieldName].Confidence
      return value;
    });
    /* this.fileService.readFileAnalysis(fileID).subscribe((res: any) => {
      console.log(res);
      this.fileService.fileAnalysisData.set({ ...this.fileService.fileAnalysisData(), [this.field.InternalFieldName]: res })

    }) */
  }

  TechnicalApprovalFileClickedMap: any = {}
  clickItem(TechnicalApprovalFile: any) {
    this.TechnicalApprovalFileClickedMap[TechnicalApprovalFile.TechnicalApprovalFile] = TechnicalApprovalFile
    this.newApplicationService.technicalApprovalFilesClicked.update((allFiles: any) => {
      let index = allFiles.findIndex((file: any) => file.TechnicalApprovalFile === TechnicalApprovalFile.TechnicalApprovalFile);
      if (index !== -1) {
        allFiles[index].isClicked = true;
      }
      return allFiles
    })
  }

  areItemsClicked = signal<boolean>(false);
  allFilesRead() {
    let counter = 0;
    this.techFiles().forEach((file: any) => {
      if (this.TechnicalApprovalFileClickedMap[file.TechnicalApprovalFile]) {
        counter++;
      }
    })
    this.areItemsClicked.set(counter === this.techFiles().length)

    return this.areItemsClicked()
  }

  closeAddRow = false;
  closeGDXFieldsAfterPatch(field: FieldJson, targetControl: AbstractControl) {
    if (field.GDXDim && (field.isGDXVal || (this.newApplicationService.rowsFromApi() && this.field.isGDXVal))) {
      if (field.FieldType !== 8) {
        this.field.FieldDim = true
        this.shouldBeDim.set(true);
        return;

      }

      if (field.FieldType === 8) {
        this.shouldBeDim.set(true);
        this.field.FieldDim = true
        this.closeAddRow = true;

      }

    }

  }

  clearAnalyzedData(tableField?: TableServiceField): void {
    // Assuming 'res' is accessible or you know which fields to clear
    // We'll iterate through the structure as in your original code to find the InternalFieldName
    // For simplicity and safety, we'll try to find ALL fields and clear them.

    // 1. Clear simple fields (from AnalysisResult.fields and AnalysisResult.DescriptionTemplates)
    const allUiFields = this.newApplicationService.uiResponseAllFields();

    if (!allUiFields) {
      console.warn('UI fields data is not available for clearing.');
      return;
    }
    if (tableField) {
      const fieldsToClear = this.field.TableServiceFields!.filter(f => f.RelatedAIInternalFieldName === tableField.InternalFieldName);

      let formGroup = this.getFormArray(this.field.InternalFieldName)!.at(this.getFormArray(this.field.InternalFieldName)!.length - 1) as FormGroup;
      for (const fieldToUpdate of fieldsToClear) {
        const control = formGroup.get(fieldToUpdate.InternalFieldName);

        if (control) {
          // Clear simple controls (like input, date, dropdowns, etc.)
          /* if(fieldToUpdate.hasDataFromAiPriority ) */
          if (fieldToUpdate.FieldType === 6 || fieldToUpdate.FieldType === 4) {
            control!.patchValue(-1);
          } else if (fieldToUpdate.FieldType === 19) {
            control!.patchValue([]);
          } else {
            control.patchValue(''); // or '' for string inputs
          }
        }
      }
    }

    // Filter fields relevant to the current attachment ID (if needed)
    const fieldsToClear = allUiFields.filter(f => f.RelatedAIInternalFieldName === this.field.InternalFieldName);

    for (const fieldToUpdate of fieldsToClear) {
      const control = this.form.get(fieldToUpdate.InternalFieldName);

      if (control) {
        if (fieldToUpdate.hasDataFromAiPriority && this.field.AIExtractDataPriority && fieldToUpdate.hasDataFromAiPriority! === this.field.AIExtractDataPriority!) {


          fieldToUpdate.hasDataFromAiPriority = undefined;
          // Clear simple controls (like input, date, dropdowns, etc.)
          if (fieldToUpdate.FieldType !== 8) { // Assuming 8 is FormArray/Table
            if (fieldToUpdate.FieldType === 6 || fieldToUpdate.FieldType === 4) {
              control!.patchValue(-1);

            } else if (fieldToUpdate.FieldType === 19) {
              control!.patchValue([]);
            } else {
              control.patchValue(''); // or '' for string inputs
            }
            // Note: For checkboxes/radios, you might need a specific default value, 
            // but null/empty string is a good general clear.
          } else {
            // 2. Clear FormArray/Table data (FieldType === 8)
            const formArray = control as FormArray;
            while (formArray.length !== 1) {
              formArray.removeAt(0);
            }
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
    this.aiPercent.update((value) => {
      value[this.field.InternalFieldName] = undefined;
      return value;
    })// Assuming 0 or null is the clear state

    console.log('Analyzed data cleared from the form.');
  }

  setFieldPriority(key: any, fieldData: any, tableField?: any, fileField?: any): void {
    const targetKey = key;
    const targetInternalFieldName = tableField ? fileField.InternalFieldName : this.field.InternalFieldName;
    const newPriority = this.field.AIExtractDataPriority!;
    const newValueString = fieldData.valueString;
    // ------------------------------------------------------------------


    let stateWasUpdated = false; // Flag to determine if we need to commit the new state

    // 1. Get the entire state structure (the source of truth)
    const currentTabs = tableField ? this.field.TableServiceFields! : this.newApplicationService.uiResponseAllFields()!;

    // 2. Perform a deep immutable update using map()
    const updatedTabs = currentTabs.map(field => {

      // Check if this is the target field
      if (field.AiMappingName === targetKey && field.RelatedAIInternalFieldName === targetInternalFieldName) {

        let formControl = this.form.get(field.InternalFieldName);
        let formValue = formControl?.value;

        if (tableField) {
          formControl = this.getFormArray(this.field.InternalFieldName)!.at(this.getFormArray(this.field.InternalFieldName)!.length - 1).get(tableField.InternalFieldName)
          formValue = this.getFormArray(this.field.InternalFieldName)!.at(this.getFormArray(this.field.InternalFieldName)!.length - 1).get(tableField.InternalFieldName)?.value
        }

        // --- START OF YOUR LOGIC REFACTORED IMMUTABLY ---
        if (newPriority <= (field.hasDataFromAiPriority ?? 0) || !field.hasDataFromAiPriority) {
          if (this.field.ModelURL === 'CP' || this.field.ModelURL === 'CR') {
            this.newApplicationService.hasDataFromAiPriority.set(this.field.AIExtractDataPriority)
          }
        }
        // Equivalent to your 'if (value && value !== -1)' block
        if (formValue && formValue !== -1) {
          if (newPriority <= (field.hasDataFromAiPriority ?? 0)) {
            // Priority is sufficient: Patch form and emit if needed
            // (Mocking this.fieldChanged.emit({...}))
            if (!tableField) {
              formControl?.patchValue(newValueString);
            } else {
              this.getFormArray(this.field.InternalFieldName)!.at(this.getFormArray(this.field.InternalFieldName)!.length - 1).get(tableField.InternalFieldName)?.patchValue(newValueString);
            }
          }
          // Since no priority change happened here, return the original field object.
          return field;

          // Equivalent to your 'if (!value)' block
        } else {
          stateWasUpdated = true; // Signal that the state needs to be saved
          /* if (!tableField) {
            formControl?.patchValue(newValueString);
          } else {
            this.getFormArray(this.field.InternalFieldName)!.at(this.getFormArray(this.field.InternalFieldName)!.length - 1).get(tableField.InternalFieldName)?.patchValue(newValueString);
          } */

          // CRITICAL FIX: Return a NEW Field object reference with the updated priority.
          return {
            ...field, // Copy all existing field properties
            hasDataFromAiPriority: newPriority // Set the new, persisted priority
          };
        }
      }
      // If it's not the target field, return the original reference
      return field;
    })

    // 3. CRITICAL: Commit the entire new structure back to your service/store.
    if (stateWasUpdated && !tableField) {
      // You MUST call a setter method on your service to update the source of navigationTabs.
      // Replace 'yourService.setNavigationTabs' with the actual method you use.
      this.newApplicationService.uiResponseAllFields.set(updatedTabs as FieldJson[]);
    }
    if (stateWasUpdated && tableField) {
      this.field.TableServiceFields = updatedTabs as TableServiceField[]
    }

  }

  getLocalizedPlaceholder(tableField: TableServiceField | FieldJson): string {
    // 1. Find the target lookup value where LookupID is -1.
    const placeholderLookup = tableField.LookupValues?.find((lv) => lv.LookupID === -1);

    // 2. Safety check for when the -1 LookupID is missing. 
    if (!placeholderLookup) {
      // FIX: Changed template literal backticks to standard string concatenation
      console.warn('Placeholder (LookupID: -1) missing for field: ' + tableField.InternalFieldName);
      return '';
    }

    // 3. Determine the current locale from the store.
    const currentLocale = this.store.index.locale;

    // 4. Return the correct localized title. 
    if (currentLocale === 'en') {
      return placeholderLookup.TitleEn;
    } else {
      // Assuming 'ar' or any other language defaults to Arabic title
      return placeholderLookup.TitleAr;
    }
  }
  openSelect: string | null = null;


  onOpen(name: string) { this.openSelect = name; }
  onClose(name: string) {
    if (this.openSelect === name) this.openSelect = null;
  }
  setupExtraValidations(field: FieldJson): any[] {
    const validators: any[] = [];
    let tableValidators: any[] = [];

    const addOperatorValidator = (
      operator?: string,
      value?: any,
      fieldType?: number,
      isTable?: boolean
    ) => {
      if (!operator || value == null) return;
      if (isTable) {
        switch (operator) {
          case '>=':
            tableValidators.push(
              fieldType === 3
                ? (
                  typeof value === 'string'
                    ? value.toLowerCase() === 'currentdate'
                      ? CustomValidators.compareWithToday(operator)
                      : CustomValidators.compareWithOtherControl(value, this.form!, operator)
                    : CustomValidators.minYears(+value))
                : Validators.min(+value)
            );
            break;

          case '=':
            tableValidators.push(
              CustomValidators.exactValue(
                isNaN(+value) ? value : +value
              )
            );
            break;

          case '>':
            tableValidators.push(
              fieldType === 3
                ? (
                  typeof value === 'string'
                    ? value.toLowerCase() === 'currentdate'
                      ? CustomValidators.compareWithToday(operator)
                      : CustomValidators.compareWithOtherControl(value, this.form!, operator)
                    : CustomValidators.minYears(+value))
                : Validators.min(+value)
            );
            break;
        }
      }

      switch (operator) {
        case '>=':
          validators.push(
            fieldType === 3
              ? (
                typeof value === 'string'
                  ? value.toLowerCase() === 'currentdate'
                    ? CustomValidators.compareWithToday(operator)
                    : CustomValidators.compareWithOtherControl(value, this.form!, operator)
                  : CustomValidators.minYears(+value))
              : Validators.min(+value)
          );
          break;

        case '=':
          validators.push(
            CustomValidators.exactValue(
              isNaN(+value) ? value : +value
            )
          );
          break;

        case '>':
          validators.push(
            fieldType === 3
              ? (
                typeof value === 'string'
                  ? value.toLowerCase() === 'currentdate'
                    ? CustomValidators.compareWithToday(operator)
                    : CustomValidators.compareWithOtherControl(value, this.form!, operator)
                  : CustomValidators.minYears(+value))
              : Validators.min(+value)
          );
          break;
      }
    };


    // ---------- Main field ----------
    if (field.ExtraValidationOperator) {
      if (![8, 3].includes(field.FieldType)) {
        addOperatorValidator(
          field.ExtraValidationOperator,
          field.ExtraValidationValue,
          field.FieldType
        );
      } else if (field.FieldType === 8) {
        field.TableServiceFields?.forEach(tableField => {
          if (![8, 3].includes(tableField.FieldType)) {
            addOperatorValidator(
              tableField.ExtraValidationOperator,
              tableField.ExtraValidationValue,
              tableField.FieldType
            );
          } else {
            addOperatorValidator(
              tableField.ExtraValidationOperator,
              tableField.ExtraValidationValue,
              tableField.FieldType
            );
          }


        });
      } else {
        addOperatorValidator(
          field.ExtraValidationOperator,
          field.ExtraValidationValue,
          field.FieldType
        );
      }
    }

    // ---------- URL validation ----------
    if (field.FieldType === 22) {
      const URLRegex =
        /[a-z0-z]+(?:[\-\.]{1}[a-z0-9]+)*\.[a-z]{2,63}/i;
      validators.push(Validators.pattern(URLRegex));
    }
    if (field.FieldType === 8) {
      field.TableServiceFields?.forEach(tableField => {
        tableValidators = []
        if (tableField.FieldType === 22) {
          const URLRegex =
            /[a-z0-z]+(?:[\-\.]{1}[a-z0-9]+)*\.[a-z]{2,63}/i;
          tableValidators.push(Validators.pattern(URLRegex));
        }
        if (![8, 3].includes(tableField.FieldType)) {
          addOperatorValidator(
            tableField.ExtraValidationOperator,
            tableField.ExtraValidationValue,
            tableField.FieldType,
            true
          );
        } else {
          addOperatorValidator(
            tableField.ExtraValidationOperator,
            tableField.ExtraValidationValue,
            tableField.FieldType,
            true
          );
        }
        let lastIndex = (this.form!.get(field.InternalFieldName) as FormArray).length - 1;
        let formArray = this.form!.get(field.InternalFieldName) as FormArray
        if (tableValidators.length > 0) {
          formArray.at(lastIndex).get(tableField.InternalFieldName)?.addValidators(tableValidators);
          formArray.at(lastIndex).get(tableField.InternalFieldName)?.updateValueAndValidity();
        }
      })
      return [];

    }

    return validators;
  }

  exportPDFBtnLoader = signal<boolean>(false);
  @ViewChild('GDXCRContent') GDXCRContent!: ElementRef;
  @ViewChild('GDXCPContent') GDXCPContent!: ElementRef;
  async exportDashboard(event: any) {
    this.exportPDFBtnLoader.set(true);
    // 1. **CRITICAL STEP: WAIT FOR ALL DOCUMENT FONTS TO LOAD**
    // This waits for all @font-face rules to resolve, ensuring correct metrics for html2canvas.
    await document.fonts.ready;

    // Optional: Add a slight safety delay (e.g., 50ms) just to ensure the DOM is stable
    // after the font ready event. This is often not needed, but can act as a safeguard.
    await new Promise(resolve => setTimeout(resolve, 50));
    let data = event.querySelector('div.modal-body')
    if (!data) return;

    // Find all inputs and textareas
    const inputs = data.querySelectorAll('input, textarea');
    const replacements: HTMLElement[] = [];

    // Temporarily replace inputs with spans
    inputs.forEach((input: any) => {
      const replacement = document.createElement('span');
      replacement.innerText = input.value;
      replacement.className = input.className; // Keep styling
      replacement.style.display = 'inline-block';
      replacement.style.border = '1px solid #ccc'; // Optional: mimic input look

      input.style.display = 'none'; // Hide input
      input.parentNode.insertBefore(replacement, input);
      replacements.push(replacement);
    });

    data.style.width = '1400px';
    data.style.maxWidth = '1400px';
    const canvas = await html2canvas(data, {
      scale: 2, // Keep this for quality
      useCORS: true,
      windowWidth: 1400
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');

    const pdfWidth = pdf.internal.pageSize.getWidth();    // Get PDF page width dynamically
    const pdfHeight = pdf.internal.pageSize.getHeight();  // Get PDF page height dynamically

    const margin = 25; // 10mm margin on all sides (top, right, bottom, left)
    const contentWidth = pdfWidth - (margin * 2);  // Usable width for content
    const contentHeight = pdfHeight - (margin * 2); // Usable height for content

    // Calculate image height based on contentWidth to maintain aspect ratio
    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    let heightLeft = imgHeight; // Total height of the captured image
    let currentYPosition = margin; // Start position (Y) on the PDF page, with top margin

    let pageNum = 1;

    // Add the first page
    pdf.addImage(imgData, 'PNG', margin, currentYPosition, contentWidth, imgHeight); // x, y, width, height

    heightLeft -= (contentHeight + margin); // Subtract content height of one page + bottom margin

    // Handle multiple pages
    while (heightLeft > 0) {
      pdf.addPage();
      pageNum++;

      // Calculate the Y position for the next part of the image.
      // This is the negative offset from the top of the *original* image
      // plus the margin for the current page.
      const imgYOffset = (imgHeight - heightLeft); // How much of the image has already been displayed

      // Add the image again, but shift it up by imgYOffset to show the next part
      // currentYPosition is now just the top margin for the new page
      pdf.addImage(imgData, 'PNG', margin, margin - imgYOffset, contentWidth, imgHeight);

      heightLeft -= (contentHeight + margin); // Subtract content height + bottom margin for next iteration
    }

    // Cleanup: Remove replacements and show original inputs
    replacements.forEach((span, index) => {
      span.remove();
      (inputs[index] as HTMLElement).style.display = '';
    });
    data.style.width = '';
    data.style.maxWidth = '';
    this.exportPDFBtnLoader.set(false);
    pdf.save('GDX.pdf');
  }
  setupLookupSanitizer(field: any) {
    const control = this.form.get(field.InternalFieldName);
    if (!control) return;
    control.valueChanges.subscribe((value: number[]) => {
      if (!Array.isArray(value)) return;

      const lookup = this.filteredLookupValues();
      if (!lookup || !lookup.length) return;

      const validIds = new Set(lookup.map(i => i.LookupID));
      const sanitized = value.filter(id => validIds.has(id));

      // If nothing changed → do nothing (important to avoid loops)
      if (sanitized.length === value.length) return;

      // 🚨 silent correction
      control.setValue(sanitized, { emitEvent: false });
    });
    let currValue = control.value;
    if (!Array.isArray(currValue)) return;

    const lookup = this.filteredLookupValues();
    if (!lookup || !lookup.length) return;

    const validIds = new Set(lookup.map(i => i.LookupID));
    const sanitized = currValue.filter(id => validIds.has(id));

    // If nothing changed → do nothing (important to avoid loops)
    if (sanitized.length === currValue.length) return;

    // 🚨 silent correction
    control.setValue(sanitized, { emitEvent: false });
  }

  navigateToDetails(listItem: any) {
    let roleID = JSON.parse(sessionStorage.getItem('user')!).FkRoleID
    const payload: ServiceApiPayload = {
      FKServiceID: listItem.ServiceID,
      //FKServiceID: +(listItem.ItemURL.split('=')[1]),
      FKProcessID: +listItem.FKProcessID,
      FKCurrentStatusID: null,
      FKRoleID: roleID
    };
    this.newApplicationService.requestData.set(null);
    this.newApplicationService.serviceApiPayload.set(payload)
    this.router.navigate([listItem.ItemURL.split('?')[0]], {
      state: {
        data: payload, pageName: this.store.index.locale === 'en' ? listItem.TitleEn : listItem.TitleAr,
        itemURL: listItem.ItemURL,
        newRequestData: null
      },

      queryParams: { ServiceID: listItem.ServiceID }
    });
  }
  exportTOExcel() {
    const isArabic = this.store.index.locale === 'ae';
    const headerMap: Record<string, string> = {};

    const excludedFields = ['currentIndex', 'actions', 'expand'];
    this.expandedFields.forEach(col => {
      if (col.field && col.title && !excludedFields.includes(col.field)) {
        headerMap[col.field] = col.title;
      }
    });

    const data = this.rows().map((item: any) => {
      const row: any = {};
      Object.keys(headerMap).forEach(field => {
        let value: any;
        let tableField = this.field.TableServiceFields?.find((f: any) => f.InternalFieldName === field);
        if (tableField && tableField.FieldType === 10) {
          const imageUrl = `${this.fileUrl[field + item.currentIndex] || ''}`;

          // SheetJS supports simple strings or cell objects. 
          // To make it a clickable link, we'll format it as a string for now, 
          // or post-process the worksheet.
          value = imageUrl;
        } else {
          value = item[field];
        }

        row[headerMap[field]] = value ?? '';
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data);

    // تطبيق RTL على الـ worksheet
    if (isArabic) {
      ws['!views'] = [{ RTL: true }];
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isArabic ? this.field.TitleAr : this.field.TitleEn);

    if (isArabic) {
      if (!wb.Workbook) wb.Workbook = {};
      if (!wb.Workbook.Views) wb.Workbook.Views = [];
      wb.Workbook.Views[0] = { RTL: true };
    }

    const filename = isArabic ? `${this.field.TitleAr}.xlsx` : `${this.field.TitleEn}.xlsx`;
    XLSX.writeFile(wb, filename);

  }
}
