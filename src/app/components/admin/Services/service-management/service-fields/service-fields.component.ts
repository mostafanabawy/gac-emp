import { Component, OnInit, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ComponentsModule } from "src/app/components/components.module";
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { DataTableModule } from '@bhplugin/ng-datatable';
import { NgSelectModule } from '@ng-select/ng-select';
import { ServiceService } from 'src/app/service/service/service.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { FlatpickrModule } from 'angularx-flatpickr';
import { basic, formatDateDisplay } from 'src/app/helpers/date-helper';
import * as XLSX from 'xlsx';
import { IconModule } from "src/app/shared/icon/icon.module";
import { forkJoin, lastValueFrom } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { FeesTableComponent } from 'src/app/components/fees-table/fees-table.component';
@Component({
  selector: 'app-service-fields',
  standalone: true,
  imports: [ComponentsModule, FormsModule, TranslateModule, FlatpickrModule, NgSelectModule, CommonModule, ReactiveFormsModule, DataTableModule, IconModule, FeesTableComponent],
  templateUrl: './service-fields.component.html',
  styleUrl: './service-fields.component.css'
})
export class ServiceFieldsComponent implements OnInit, AfterViewInit {
  basic = basic;
  hide = true;
  expandedRow: any = null;
  expandedRowDetails: any[] = [];
  showAddAttachmentModal = false;
  isEditMode = false;
  serachForm!: FormGroup;
  ServiceName = '';
  AddserviceproceduresForm!: FormGroup;
  translations: any = {};
  isArabic = this.translate.currentLang === 'ae';
  AllAttachments: any[] = [];
  showSections: boolean = false;
  OldFieldName: any;
  search = '';
  showTermsModal = false;
  showTermsModalEn = false;
  terms = '';
  cols: any[] = [];
  allColumns: any[] = [];
  defaultColumnsState: any[] = [];
  id: any = null;
  lastUserId: number = 0;
  rows: any[] = [];
  paginationInfo = {
    TotalPages: 1,
    CurrentPage: 1,
    PageSize: 20,
    TotalRows: 0
  };
  selectValueText = "";
  Service: any = [];
  FieldSource: any = [];
  ServiceTypes: any = [];
  RelevantServiceFieldID: any = [];
  SourceTableID: any = [];
  isLoading: boolean = false;
  currentSortField: string = 'ServiceFieldID';
  currentSortDirection: number = 2;
  showSouresTableID: boolean = false;
  private lastFetchParams: string | null = null;
  oldTitleAr: any;
  oldTitleEn: any;
  viewMode: 'table' | 'cards' = 'table';
  sortableColumns: any[] = [];
  selectedSortColumn: any = null;
  toggleColumnsDropdown = false;
  toggleSortDropdown = false;
  constructor(
    private router: Router,
    private fb: FormBuilder,
    public translate: TranslateService,
    private ServiceService: ServiceService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
  ) { }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const isClickInsideDropdown = target.closest('.dropdown-container');
    const isClickOnToggleButton = target.closest('.toggle-columns-btn');
    const isClickOnSortButton = target.closest('.toggle-sort-btn');

    if (!isClickInsideDropdown && !isClickOnToggleButton && this.toggleColumnsDropdown) {
      this.toggleColumnsDropdown = false;
      this.cdr.markForCheck();
    }

    if (!isClickInsideDropdown && !isClickOnSortButton && this.toggleSortDropdown) {
      this.toggleSortDropdown = false;
      this.cdr.markForCheck();
    }
  }

  openDropdown(type: 'columns' | 'sort') {
    if (type === 'columns') {
      this.toggleColumnsDropdown = !this.toggleColumnsDropdown;
      this.toggleSortDropdown = false;
    } else {
      this.toggleSortDropdown = !this.toggleSortDropdown;
      this.toggleColumnsDropdown = false;
    }
    this.cdr.markForCheck();
  }

  get paginationInfoText(): string {
    const currentPage = this.paginationInfo.CurrentPage || 1;
    const pageSize = this.paginationInfo.PageSize || 5;
    const totalRows = this.paginationInfo.TotalRows || 0;
    const start = totalRows > 0 ? (currentPage - 1) * pageSize + 1 : 0;
    const end = Math.min(currentPage * pageSize, totalRows);
    return totalRows > 0
      ? `${this.translations?.showing?.label} ${start} ${this.translations?.to?.label} ${end} ${this.translations?.of?.label} ${totalRows}`
      : '';
  }
  get ServiceID(): any {
    return this.AddserviceproceduresForm.get('ServiceID');
  }
  get InternalFieldName(): any {
    return this.AddserviceproceduresForm.get('InternalFieldName');
  }
  get Name(): any {
    return this.AddserviceproceduresForm.get('Name');
  }
  get NameEN(): any {
    return this.AddserviceproceduresForm.get('NameEN');
  }
  get FieldType(): any {
    return this.AddserviceproceduresForm.get('FieldType');
  }



  ngOnInit(): void {
    this.translations = this.loadEServicesTranslationsFromLocalStorage();

    const self = this;
    (window as any).editUserFromOutside = (ServiceFieldID: any) => {
      this.edit(ServiceFieldID);
    };
    (window as any).toggleRowExpand = (serviceId: any) => {
      this.toggleRowExpand(serviceId);
    };


    this.cols = [
      {
        field: 'expand',
        title: '',
        sort: false,
        fixed: true,
        visible: true,
        html: true,
        width: '50px'
      },
      {
        field: 'Serial',
        title: this.translations?.Serial?.label,
        sort: false,
        fixed: true,
        visible: true
      },
      {
        field: 'InternalFieldName',
        title: this.translations?.InternalFieldName?.label,
        sort: true,
        visible: true
      },
      {
        field: 'TitleAr',
        title: this.translations?.Name?.label,
        sort: true,
        visible: true
      },
      {
        field: 'TitleEn',
        title: this.translations?.NameEN?.label,
        sort: true,
        visible: true
      },
      {
        field: 'IsActive',
        title: this.translations?.Status?.label,
        sort: true,
        visible: true
      },
      {
        field: 'actions',
        title: this.translations?.Actions?.label,
        sort: false,
        fixed: true,
        visible: true
      }
    ];

    // نسخ الأعمدة لـ allColumns (بدون الأعمدة الثابتة)
    this.allColumns = this.cols
      .filter(col => !col.fixed)
      .map(col => ({ ...col }));

    // حفظ الحالة الافتراضية للأعمدة
    this.defaultColumnsState = JSON.parse(JSON.stringify(this.allColumns));

    // إعداد الأعمدة القابلة للترتيب
    this.sortableColumns = this.cols
      .filter(col => col.sort)
      .map(col => ({ field: col.field, title: col.title }));

    this.selectedSortColumn = this.sortableColumns.find(
      col => col.field === this.currentSortField
    ) || this.sortableColumns[0];
    this.ServiceService.getById(null).subscribe((res) => {
      if (res?.Lookup) {
        this.ServiceTypes = res.Lookup.FiledTypes;
        this.serachForm.controls['FieldType'].setValue(this.ServiceTypes[0].TypeID);
        if (this.isEditMode) {
          this.AddserviceproceduresForm.controls['FieldType'].setValue(this.ServiceTypes[0].TypeID);
        }
      }
    });

    this.ServiceService.getEServicesLookupType().subscribe((res) => {
      if (res?.items) {
        this.FieldSource = res.items;
        this.serachForm.controls['FieldSource'].setValue(this.FieldSource[0].TypeID);

      }
    })

    const id = Number(this.route.snapshot.paramMap.get('id'));


    this.serachForm = this.fb.group({
      InternalFieldName: [null],
      TitleAr: [null],
      TitleEn: [null],
      FieldType: [null],
      FieldSource: [null],
      MAX_Length: [null],
      IsActive: [null],
    });
    this.AddserviceproceduresForm = this.fb.group({
      ServiceFieldID: [id, Validators.required],
      InternalFieldName: [null, Validators.required],
      FieldType: [null, Validators.required],
      Name: [null, Validators.required],
      NameEN: [null, Validators.required],
      FieldSource: [null],
      IsActive: [true],
      ServiceName: [null],
      CreationDate: [new Date()],
      MAX_Length: [null],
      IsSystemField: [false],
      ValidationMsgAr: [null],
      ValidationMsgEn: [null],
      RelevantInternalName: [null],
      RelevantVisibleValue: [null],
      RelevantVisibleOperator: [null],
      RelevantServiceFieldID: [null],
      SourceTableID: [null],
      MaxAttachmentSizeKB: [null],
      AllowedFileTypes: [null],
      ValidMsgArAllowedFile: [null],
      ValidMsgEnAllowedFile: [null],
      ValidMsgArMaxSize: [null],
      ValidMsgEnMaxSize: [null],
    });
    this.ServiceService.getByServiceID(id).subscribe({
      next: (Service: any) => {
        this.ServiceName = this.translate.currentLang == 'en' ? Service.items[0].ServiceTitleEn : Service.items[0].ServiceTitleAr,
          this.AddserviceproceduresForm.patchValue({
            ServiceName: this.translate.currentLang == 'en' ? Service.items[0].ServiceTitleEn : Service.items[0].ServiceTitleAr,
          })
      }
    });




    this.fetchDataRelevantServiceFieldID();
    this.fetchDataSourceTableID();
    this.fetchData();
  }


  fetchDataRelevantServiceFieldID(setting?: any, searchData?: any) {
    const ServiceID = this.route.snapshot.paramMap.get('id')
    searchData = {
      FKServiceID: ServiceID,
      IsActive: true,
    };
    if (!setting) {
      setting = {
        pageNo: this.paginationInfo.CurrentPage,
        pageSize: 10000,
        sortField: this.currentSortField,
        sortDirection: this.currentSortDirection
      };
    }
    this.isLoading = true;
    this.cdr.markForCheck();

    this.ServiceService.getPageWithSearchFiled(setting, searchData).subscribe({
      next: (res) => {
        const items = res?.result?.items || [];
        this.RelevantServiceFieldID = items;

      },
      error: () => {
        this.rows = [];

      }
    });
  }
  fetchDataSourceTableID(setting?: any, searchData?: any) {
    const ServiceID = this.route.snapshot.paramMap.get('id')
    searchData = {
      FKServiceID: ServiceID,
      IsActive: true,
      SourceTableID: 187
    };
    if (!setting) {
      setting = {
        pageNo: this.paginationInfo.CurrentPage,
        pageSize: 10000,
        sortField: this.currentSortField,
        sortDirection: this.currentSortDirection
      };
    }
    this.isLoading = true;
    this.cdr.markForCheck();

    this.ServiceService.getPageWithSearchFiled(setting, searchData).subscribe({
      next: (res) => {
        const items = res?.result?.items || [];
        this.SourceTableID = items;
      },
      error: () => {
        this.rows = [];

      }
    });
  }
  fetchData(setting?: any, searchData?: any) {
    const ServiceID = this.route.snapshot.paramMap.get('id')
    searchData = {
      FKServiceID: ServiceID,
      IsActive: this.serachForm.controls['IsActive'].value,
      InternalFieldName: this.serachForm.controls['InternalFieldName'].value,
      TitleAr: this.serachForm.controls['TitleAr'].value,
      TitleEn: this.serachForm.controls['TitleEn'].value,
      MAX_Length: this.serachForm.controls['MAX_Length'].value,
      FieldType: this.serachForm.controls['FieldType'].value,

    };
    if (!setting) {
      setting = {
        pageNo: this.paginationInfo.CurrentPage,
        pageSize: this.paginationInfo.PageSize,
        sortField: this.currentSortField,
        sortDirection: this.currentSortDirection
      };
    }
    this.isLoading = true;
    this.cdr.markForCheck();

    this.ServiceService.getPageWithSearchFiled(setting, searchData).subscribe({
      next: (res) => {
        const items = res?.result?.items || [];
        this.rows = this.mapRowsWithSerial(items);
        const pagingInfo = res?.result?.PagingInfo?.[0] || {};
        const totalRows = pagingInfo.TotalRows || items.length || 0;
        const pageSize = pagingInfo.PageSize || setting.pageSize || 5;
        const totalPages = Math.max(Math.ceil(totalRows / pageSize), 1);
        let currentPage = setting.pageNo || 1;
        if (currentPage > totalPages || currentPage < 1) currentPage = 1;

        this.paginationInfo = {
          TotalRows: totalRows,
          PageSize: pageSize,
          CurrentPage: currentPage,
          TotalPages: totalPages
        };

        this.cdr.markForCheck();
        this.isLoading = false;
      },
      error: () => {
        this.rows = [];
        this.paginationInfo = {
          TotalRows: 0,
          PageSize: this.paginationInfo.PageSize || 5,
          CurrentPage: 1,
          TotalPages: 1
        };

        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }








  onSubmit() {
    this.paginationInfo.CurrentPage = 1;
    this.fetchData();
  }

  oncheckboxsubmitNotActive(event: any) {
    const setting = {
      pageNo: 1,
      pageSize: 536,
      sortField: 'ID',
      sortDirection: 2
    };
    let searchData = {
      Active: !event,
    };
    if (event == true)
      searchData.Active = false;
    else {
      event = null;
      searchData.Active = event;
    }
    this.ServiceService.getPageWithSearchFiled(setting, searchData).subscribe({
      next: (res) => {
        const pageIndex = res?.result.PagingInfo?.[0]?.CurrentPage || 1;
        const pageSize = res?.result.PagingInfo?.[0]?.PageSize || 20;
        this.rows = this.mapRowsWithSerial(res?.result?.items);

        if (res?.PagingInfo && res.PagingInfo.length > 0) {
          this.paginationInfo = {
            TotalPages: res.result.PagingInfo[0].TotalPages,
            CurrentPage: res.result.PagingInfo[0].CurrentPage,
            PageSize: res.result.PagingInfo[0].PageSize,
            TotalRows: res.result.PagingInfo[0].TotalRows
          };
        }
      },
      error: (err) => { }
    });
  }

  oncheckboxsubmitActive(event: any) {
    const setting = {
      pageNo: 1,
      pageSize: 536,
      sortField: 'ID',
      sortDirection: 2
    };
    let searchData = {
      Active: event,
    };
    if (event == true)
      searchData.Active = true;
    else {
      event = null;
      searchData.Active = event;
    }
    this.ServiceService.getPageWithSearchFiled(setting, searchData).subscribe({
      next: (res) => {
        const pageIndex = res?.result.PagingInfo?.[0]?.CurrentPage || 1;
        const pageSize = res?.result.PagingInfo?.[0]?.PageSize || 20;
        this.rows = this.mapRowsWithSerial(res?.result?.items);

        if (res?.PagingInfo && res.PagingInfo.length > 0) {
          this.paginationInfo = {
            TotalPages: res.result.PagingInfo[0].TotalPages,
            CurrentPage: res.result.PagingInfo[0].CurrentPage,
            PageSize: res.result.PagingInfo[0].PageSize,
            TotalRows: res.result.PagingInfo[0].TotalRows
          };
        }
      },
      error: (err) => { }
    });
  }

  onPageChange(event: any) {
    this.paginationInfo.CurrentPage = event;
    const setting = {
      pageNo: event,
      pageSize: this.paginationInfo.PageSize,
      sortField: 'ID',
      sortDirection: 1
    };

    const ServiceID = this.route.snapshot.paramMap.get('id')

    const searchData = {

      FKServiceID: ServiceID,
    };
    this.ServiceService.getPageWithSearchFiled(setting, searchData).subscribe({
      next: (res) => {
        if (res?.result.PagingInfo && res.result.PagingInfo.length > 0) {
          this.paginationInfo = {
            TotalPages: res.result.PagingInfo[0].TotalPages,
            CurrentPage: res.result.PagingInfo[0].CurrentPage,
            PageSize: res.result.PagingInfo[0].PageSize,
            TotalRows: res.result.PagingInfo[0].TotalRows
          };
        }
        const pageIndex = res?.result.PagingInfo?.[0]?.CurrentPage || 1;
        const pageSize = res?.result.PagingInfo?.[0]?.PageSize || 20;
        this.rows = this.mapRowsWithSerial(res?.result?.items);
      },
      error: (err) => { }
    });
  }

  onServerChange(data: any) {
    switch (data.change_type) {
      case 'page':
        this.onPageChange(data.current_page);
        break;
      case 'pagesize':
        this.onPageSizeChange(data.pagesize);
        break;
      case 'sort':
        this.onSortChange({ field: data.sort_column, direction: data.sort_direction === 1 ? 'asc' : 'desc' });
        break;
    }
  }

  onPageSizeChange(event: any) {
    const newPageSize = parseInt(event?.target?.value || event, 10);
    if (!isNaN(newPageSize) && this.paginationInfo.PageSize !== newPageSize) {
      this.paginationInfo.PageSize = newPageSize;
      this.paginationInfo.CurrentPage = 1;
      const setting = {
        pageNo: 1,
        pageSize: newPageSize,
        sortField: this.currentSortField,
        sortDirection: this.currentSortDirection
      };

      const ServiceID = this.route.snapshot.paramMap.get('id')

      const searchData = {

        FKServiceID: ServiceID,
      };
      this.fetchData(setting, searchData);
    } else {
      this.cdr.markForCheck();
    }
  }

  onSortChange(event: any) {
    const newSortField = event?.field || this.currentSortField;

    if (this.currentSortField === newSortField) {
      this.currentSortDirection = this.currentSortDirection === 1 ? 2 : 1;
    } else {
      this.currentSortField = newSortField;
      this.currentSortDirection = 1;
    }

    this.paginationInfo.CurrentPage = 1;

    const setting = {
      pageNo: 1,
      pageSize: this.paginationInfo.PageSize,
      sortField: this.currentSortField,
      sortDirection: this.currentSortDirection
    };

    const ServiceID = this.route.snapshot.paramMap.get('id')

    const searchData = {

      FKServiceID: ServiceID,
    };
    this.fetchData(setting, searchData);
    this.cdr.markForCheck();
  }

  customSearchFn(term: string, item: any) {
    term = term.toLowerCase();
    return item.ServiceTitleAr.toLowerCase().includes(term) ||
      item.ServiceTitleEn.toLowerCase().includes(term);
  }

  onReset() {
    this.serachForm.reset({
      IsSystemField: false,
      IsActive: null
    });
    this.fetchData();
    this.paginationInfo.CurrentPage = 1;
  }

  edit(data: any) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const Id = data;
    this.isEditMode = true;
    this.isLoading = true;
    this.hide = false;
    this.showAddAttachmentModal = true;
    this.ServiceService.getByServiceFieldID(Id).subscribe({
      next: (res) => {
        if (res && res.items && res.items.length > 0) {
          const serviceproceduresData = res.items[0];
          this.id = serviceproceduresData.ServiceFieldID;
          this.OldFieldName = serviceproceduresData.OldFieldName;
          console.log(this.OldFieldName);
          this.AddserviceproceduresForm.patchValue({
            ID: serviceproceduresData.ServiceFieldID,
            FKServiceID: serviceproceduresData.FKServiceID,
            InternalFieldName: serviceproceduresData.InternalFieldName,
            Name: serviceproceduresData.TitleAr,
            NameEN: serviceproceduresData.TitleEn,
            FieldType: serviceproceduresData.FieldType,
            FieldSource: serviceproceduresData.FieldSource,
            IsActive: serviceproceduresData.IsActive,
            CreationDate: serviceproceduresData.CreationDate
              ? new Date(serviceproceduresData.CreationDate).toISOString()
              : new Date().toISOString(),
            MAX_Length: serviceproceduresData.MAX_Length,
            IsSystemField: serviceproceduresData.IsSystemField,
            ValidationMsgAr: serviceproceduresData.ValidationMsgAr,
            ValidationMsgEn: serviceproceduresData.ValidationMsgEn,
            RelevantInternalName: serviceproceduresData.RelevantInternalName,
            RelevantVisibleValue: serviceproceduresData.RelevantVisibleValue,
            RelevantVisibleOperator: serviceproceduresData.RelevantVisibleOperator,
            RelevantServiceFieldID: serviceproceduresData.RelevantServiceFieldID,
            SourceTableID: serviceproceduresData.SourceTableID,
            MaxAttachmentSizeKB: serviceproceduresData.MaxAttachmentSizeKB,
            AllowedFileTypes: serviceproceduresData.AllowedFileTypes,
            ValidMsgArAllowedFile: serviceproceduresData.ValidMsgArAllowedFile,
            ValidMsgEnAllowedFile: serviceproceduresData.ValidMsgEnAllowedFile,
            ValidMsgArMaxSize: serviceproceduresData.ValidMsgArMaxSize,
            ValidMsgEnMaxSize: serviceproceduresData.ValidMsgEnMaxSize,
          });
          this.cdr.markForCheck();
        }
        this.isLoading = false;
      },
      error: (err) => {

        this.isLoading = false;
        this.showAddAttachmentModal = false;
        this.cdr.markForCheck();
      },
    });
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.ServiceService.getByServiceID(id).subscribe({
      next: (Service: any) => {
        this.AddserviceproceduresForm.patchValue({
          ServiceName: this.translate.currentLang == 'en' ? Service.items[0].ServiceTitleEn : Service.items[0].ServiceTitleAr,
        })
      }
    });
  }

  delete(id: any) {
    Swal.fire({
      title: this.translations?.AreYouSure?.label,
      text: this.translations?.YouWontBeAbleToRevertThis?.label,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.translations?.Yes?.label,
      cancelButtonText: this.translations?.No?.label,
    }).then(async (result) => {
      if (result.isConfirmed) {
        this.isLoading = true;
        try {
          await lastValueFrom(this.ServiceService.deleteEServicesServiceStatuses(id));

          Swal.fire({
            icon: 'success',
            title: this.translations?.DeletedSuccessfully?.label,
            confirmButtonText: this.translations?.confrim?.label,
          });

          this.fetchData();
        } catch (err) {
          console.error(err);
          Swal.fire({
            icon: 'error',
            title: this.translations?.TryAgainLater?.label,
            confirmButtonText: this.translations?.confrim?.label,
          });
        } finally {
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      }
    });
  }

  exportTOExcel() {
    const isArabic = this.translate.currentLang === 'ae';
    const headerMap: Record<string, string> = {};

    const excludedFields = ['Serial', 'Actions', 'expand'];

    // الأعمدة الأساسية من الجدول
    this.cols.forEach(col => {
      if (col.field && col.title && !excludedFields.includes(col.field)) {
        headerMap[col.field] = col.title;
      }
    });

    // الأعمدة الإضافية
    headerMap['FieldType'] = this.translations?.FieldType?.label || (isArabic ? 'نوع الحقل' : 'Field Type');
    headerMap['InternalFieldName'] = this.translations?.InternalFieldName?.label || (isArabic ? 'اسم الحقل الداخلي' : 'Internal Field Name');
    headerMap['MAX_Length'] = this.translations?.MAX_Length?.label || (isArabic ? 'أقصى طول' : 'Max Length');
    headerMap['CreationDate'] = this.translations?.CreationDate?.label || (isArabic ? 'تاريخ الإنشاء' : 'Creation Date');

    // تجهيز البيانات
    const data = this.rows.map((item: any) => {
      const row: any = {};
      Object.keys(headerMap).forEach(field => {
        let value = item[field];

        if (field === 'Active' || field === 'IsActive') {
          value = value
            ? (isArabic ? 'مفعل' : 'Active')
            : (isArabic ? 'غير مفعل' : 'Inactive');
        } else if (field === 'AddMoreThanOne') {
          value = value
            ? (isArabic ? 'نعم' : 'Yes')
            : (isArabic ? 'لا' : 'No');
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
    XLSX.utils.book_append_sheet(wb, ws, isArabic ? 'حقول الخدمة' : 'Service Fields');

    // تطبيق RTL على הـ workbook
    if (isArabic) {
      if (!wb.Workbook) wb.Workbook = {};
      if (!wb.Workbook.Views) wb.Workbook.Views = [];
      wb.Workbook.Views[0] = { RTL: true };
    }

    const filename = isArabic ? 'تقرير_حقول_الخدمة.xlsx' : 'Service_Fields_Report.xlsx';
    XLSX.writeFile(wb, filename);
  }




  ngAfterViewInit(): void {
    document.addEventListener('click', (event: any) => {
      if (event.target && event.target.classList.contains('note-link')) {
        console.log('clicked')
        const text = this.selectValueText
        this.terms = text;
        this.openTerms(event);
      }
    });
    document.addEventListener('click', (event: any) => {
      if (event.target && event.target.classList.contains('note-link2')) {
        this.openTermsEn(event);
      }
    });
    document.addEventListener('click', (event: any) => {
      if (event.target && event.target.classList.contains('edit-btn')) {
        const id = Number(event.target.getAttribute('data-id'));
        this.edit(id);
      }
      if (event.target && event.target.classList.contains('delete-btn')) {
        const id = Number(event.target.getAttribute('data-id'));
        this.delete(id);
      }
    });

    const observer = new MutationObserver(() => {
      this.fixAccessibility();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  private mapRowsWithSerial(data: any[]): any[] {
    const isArabic = this.translate.currentLang === 'ae';
    const pageIndex = this.paginationInfo.CurrentPage - 1;
    const pageSize = this.paginationInfo.PageSize || 20;

    this.lastUserId = Math.max(...data.map(item => item.ServiceFieldID || 0), 0);

    return data.map((item, index) => {
      if (item.FieldType == 18) {
        this.oldTitleAr = item.TitleAr || 'لا يوجد بيانات';
        this.oldTitleEn = item.TitleEn || 'No Data';
        this.selectValueText = item.TitleAr || item.TitleEn;
        item.TitleAr = `<span class="note-link">الشروط والأحكام</span>`;
        item.TitleEn = `<span class="note-link2">Terms & Conditions</span>`;
      }

      return {
        ...item,
        Serial: pageIndex * pageSize + index + 1,
        FieldType: isArabic ? item.FieldTypeAr : item.FieldTypeEn,
        CreationDate: formatDateDisplay(item.CreationDate),
        Actions: [
          {
            ActionID: 861,
            TitleAR: 'تعديل',
            TitleEN: 'Edit',
            ActionNameAr: 'تعديل',
            ActionNameEn: 'Edit'
          }
        ]
      };
    });
  }

  loadEServicesTranslationsFromLocalStorage(): any {
    const stored = localStorage.getItem('localization');
    if (!stored) return {};
    try {
      const items = JSON.parse(stored);
      return items.reduce((acc: any, item: any) => {
        acc[item.KeyName] = {
          label: this.translate.currentLang === 'ae' ? item.Translatear : item.Translateen,
          validation: this.translate.currentLang === 'ae' ? item.ValidationMessagear : item.ValidationMessageen,
          required: item.FieldRequired
        };
        return acc;
      }, {});
    } catch (error) {
      return {};
    }
  }

  fixAccessibility() {
    const buttons = document.querySelectorAll('button.bh-page-item');
    buttons.forEach((btn: Element) => {
      const el = btn as HTMLButtonElement;
      if (!el.hasAttribute('aria-label')) {
        if (el.classList.contains('first-page')) {
          el.setAttribute('aria-label', this.translations?.FirstPageFirstPage?.label);
        } else if (el.classList.contains('previous-page')) {
          el.setAttribute('aria-label', this.translations?.PreviousPage?.label);
        } else if (el.classList.contains('next-page')) {
          el.setAttribute('aria-label', this.translations?.NextPage?.label);
        } else {
          el.setAttribute('aria-label', this.translations?.NavigationButton?.label);
        }
      }
    });

    const pageSizeEl = document.querySelector('.bh-pagesize');
    if (pageSizeEl && !pageSizeEl.hasAttribute('aria-label')) {
      pageSizeEl.setAttribute('aria-label', this.translations?.TotalItems?.label);
    }

    const inputs = document.querySelectorAll('.ng-input input');
    inputs.forEach((input: Element) => {
      if (!input.hasAttribute('aria-label')) {
        (input as HTMLInputElement).setAttribute('aria-label', this.translations?.SelectItem?.label);
      }
    });
  }


  async onAddAttachmentSubmit() {
    const formData = this.AddserviceproceduresForm.value;
    console.log(formData);

    // ✅ Step 1: Validate form
    if (this.AddserviceproceduresForm.invalid) {
      // Object.keys(this.AddserviceproceduresForm.controls).forEach(key => {
      //   this.AddserviceproceduresForm.get(key)?.markAsTouched();
      // });

      const firstInvalidControlName = Object.keys(this.AddserviceproceduresForm.controls)
        .find(key => this.AddserviceproceduresForm.get(key)?.invalid);

      if (firstInvalidControlName) {
        const invalidElement = document.querySelector(
          `[formcontrolname="${firstInvalidControlName}"]`
        ) as HTMLElement;

        if (invalidElement) {
          invalidElement.focus();
        }

        const translationEntry = this.translations?.[firstInvalidControlName];
        const fieldMessage = translationEntry?.validation;

        await Swal.fire({
          icon: 'warning',
          title: `${fieldMessage}`,
          confirmButtonText: this.translations?.confrim?.label,
        });
      }
      return;
    }

    // ✅ Step 2: Extract arrays
    const serviceID = Number(this.route.snapshot.paramMap.get('id'));

    // ✅ Step 3: Confirm
    const result = await Swal.fire({
      title: this.translations?.AreYouSure?.label,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.translations?.Yes?.label,
      cancelButtonText: this.translations?.No?.label,
    });

    if (!result.isConfirmed) return;

    this.isLoading = true;

    // ✅ Step 4: Build requests for every combination
    const requests: any[] = [];



    const payload: any = {
      FKServiceID: serviceID,
      InternalFieldName: formData.InternalFieldName,
      OldFieldName: formData.InternalFieldName,
      TitleAr: formData.Name,
      TitleEn: formData.NameEN,
      FieldType: formData.FieldType,
      FieldSource: formData.FieldSource,
      IsActive: formData.IsActive,
      CreationDate: formData.CreationDate
        ? new Date(formData.CreationDate).toISOString()
        : new Date().toISOString(),
      MAX_Length: formData.MAX_Length,
      IsSystemField: formData.IsSystemField,
      ValidationMsgAr: formData.ValidationMsgAr,
      ValidationMsgEn: formData.ValidationMsgEn,
      RelevantInternalName: formData.RelevantInternalName,
      RelevantVisibleValue: formData.RelevantVisibleValue,
      RelevantVisibleOperator: formData.RelevantVisibleOperator,
      RelevantServiceFieldID: formData.RelevantServiceFieldID,
      SourceTableID: formData.SourceTableID,
      MaxAttachmentSizeKB: formData.MaxAttachmentSizeKB,
      AllowedFileTypes: formData.AllowedFileTypes,
      ValidMsgArAllowedFile: formData.ValidMsgArAllowedFile,
      ValidMsgEnAllowedFile: formData.ValidMsgEnAllowedFile,
      ValidMsgArMaxSize: formData.ValidMsgArMaxSize,
      ValidMsgEnMaxSize: formData.ValidMsgEnMaxSize,
    };

    if (this.isEditMode) {
      payload.ServiceFieldID = this.id;
      payload.OldFieldName = this.OldFieldName;
    }

    requests.push(
      this.isEditMode
        ? this.ServiceService.updateEServicesServiceFields(payload)
        : this.ServiceService.addEServicesServiceFields(payload)
    );


    // ✅ Step 5: Execute all requests
    try {
      await lastValueFrom(forkJoin(requests));

      await Swal.fire({
        icon: 'success',
        confirmButtonText: this.translations?.confrim?.label,
        title: this.isEditMode
          ? this.translations?.ModifiedSuccessfully?.label
          : this.translations?.AddedSuccessfully?.label,
      });

      this.isEditMode = false;
      this.showAddAttachmentModal = false;
      this.hide = true;
      this.lastFetchParams = null;
      this.fetchData();
    } catch (err) {
      console.error(err);
      await Swal.fire({
        icon: 'error',
        confirmButtonText: this.translations?.confrim?.label,
        title: this.translations?.TryAgainLater?.label || 'Error',
      });
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }
  closeAddUserModal() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.showAddAttachmentModal = false;
    this.hide = true
    this.isEditMode = false;
    this.AddserviceproceduresForm.reset({
      IsActive: true,
      IsSystemField: false,
      CreationDate: new Date(),
      ServiceID: [id],
      ServiceName: null
    });
    this.ServiceService.getByServiceID(id).subscribe({
      next: (Service: any) => {
        this.AddserviceproceduresForm.patchValue({
          ServiceName: this.translate.currentLang == 'en' ? Service.items[0].ServiceTitleEn : Service.items[0].ServiceTitleAr,
        })
      }
    });
    this.cdr.markForCheck();
  }
  onRowClick(event: any) {
    this.toggleRowExpand(event.row.ServiceFieldID);
  }

  getPageNumbers(): number[] {
    const totalPages = this.paginationInfo.TotalPages || 1;
    const currentPage = this.paginationInfo.CurrentPage || 1;
    const maxPagesToShow = 5;
    const pages: number[] = [];

    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) pages.push(-1); // Ellipsis
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push(-1); // Ellipsis
      pages.push(totalPages);
    }

    return pages;
  }
  toggleRowExpand(serviceId: any) {
    console.log('Toggling row with ServiceFieldID:', serviceId);
    if (this.expandedRow?.ServiceFieldID === serviceId) {
      this.expandedRow = null;
      this.expandedRowDetails = [];
    } else {
      this.expandedRow = this.rows.find(row => row.ServiceFieldID === serviceId);
      console.log('Expanded row:', this.expandedRow);

      // تحديد التفاصيل التي ستظهر في الصف الموسع
      if (this.expandedRow) {
        this.expandedRowDetails = [
          {
            label: this.translations?.FieldType?.label,
            value: this.expandedRow.FieldType,
            fullWidth: false
          },
          {
            label: this.translations?.MAX_Length?.label,
            value: this.expandedRow.MAX_Length,
            fullWidth: false
          },
          {
            label: this.translations?.ValidationMsgAr?.label,
            value: this.expandedRow.ValidationMsgAr,
            fullWidth: true
          },
          {
            label: this.translations?.ValidationMsgEn?.label,
            value: this.expandedRow.ValidationMsgEn,
            fullWidth: true
          }
        ];
      }
    }
    this.cdr.markForCheck();
  }

  // Toggle view mode between table and cards
  toggleViewMode(mode: 'table' | 'cards') {
    this.viewMode = mode;
    this.cdr.markForCheck();
  }

  // إعادة تعيين الأعمدة للحالة الافتراضية
  resetColumns() {
    this.defaultColumnsState.forEach(defaultCol => {
      const col = this.cols.find(c => c.field === defaultCol.field);
      const allCol = this.allColumns.find(c => c.field === defaultCol.field);

      if (col && !col.fixed) {
        col.visible = defaultCol.visible;
      }
      if (allCol) {
        allCol.visible = defaultCol.visible;
      }
    });
    this.cdr.detectChanges();
  }

  // إعادة تعيين الترتيب
  resetSort() {
    this.currentSortField = 'ServiceFieldID';
    this.currentSortDirection = 2;
    this.selectedSortColumn = this.sortableColumns.find(
      col => col.field === this.currentSortField
    ) || this.sortableColumns[0];

    this.paginationInfo.CurrentPage = 1;
    this.fetchData();
  }

  // دالة تبديل العمود
  toggleColumn(field: string) {
    console.log('Toggling column:', field);

    const colInAll = this.allColumns.find(c => c.field === field);
    const colInCols = this.cols.find(c => c.field === field);

    if (colInAll) {
      colInAll.visible = !colInAll.visible;
      console.log(`Column ${field} visibility changed to:`, colInAll.visible);
    }
    if (colInCols && !colInCols.fixed) {
      colInCols.visible = colInAll ? colInAll.visible : !colInCols.visible;
      console.log(`Column ${field} in cols visibility changed to:`, colInCols.visible);
    }

    // إنشاء array جديد لإجبار Angular على اكتشاف التغيير
    this.cols = [...this.cols];
    console.log('Updated cols array:', this.cols.map(c => ({ field: c.field, visible: c.visible })));

    // إجبار إعادة رسم الجدول
    this.cdr.detectChanges();
  }

  // دالة تحديد كل الأعمدة
  selectAllColumns() {
    this.allColumns.forEach(col => {
      col.visible = true;
      const colInCols = this.cols.find(c => c.field === col.field);
      if (colInCols && !colInCols.fixed) {
        colInCols.visible = true;
      }
    });

    // إنشاء array جديد لإجبار Angular على اكتشاف التغيير
    this.cols = [...this.cols];
    this.cdr.detectChanges();
  }

  // دالة إخفاء كل الأعمدة
  hideAllColumns() {
    this.allColumns.forEach(col => {
      col.visible = false;
      const colInCols = this.cols.find(c => c.field === col.field);
      if (colInCols && !colInCols.fixed) {
        colInCols.visible = false;
      }
    });

    // إنشاء array جديد لإجبار Angular على اكتشاف التغيير
    this.cols = [...this.cols];
    this.cdr.detectChanges();
  }

  // التحقق من أن كل الأعمدة ظاهرة
  get areAllColumnsVisible(): boolean {
    return this.allColumns.every(col => {
      const colInCols = this.cols.find(c => c.field === col.field);
      return !colInCols || colInCols.fixed || col.visible;
    });
  }

  // التحقق من أن كل الأعمدة مخفية
  get areAllColumnsHidden(): boolean {
    return this.allColumns.every(col => {
      const colInCols = this.cols.find(c => c.field === col.field);
      return !colInCols || colInCols.fixed || !col.visible;
    });
  }

  // تغيير عمود الترتيب
  onSortColumnChange(column: any) {
    if (column && column.field) {
      this.currentSortField = column.field;
      this.paginationInfo.CurrentPage = 1;
      this.fetchData();
    }
  }

  // تعيين اتجاه الترتيب
  setSortDirection(direction: number) {
    this.currentSortDirection = direction;
    this.paginationInfo.CurrentPage = 1;
    this.fetchData();
    this.toggleSortDropdown = false;
    this.cdr.markForCheck();
  }

  handleActionClick(event: any) {
    console.log('handleActionClick called with:', event);

    // fees-table يرسل { action, row, isEmp }
    if (event && event.row && event.row.ServiceFieldID) {
      console.log('Opening edit for ServiceFieldID:', event.row.ServiceFieldID);
      this.edit(event.row.ServiceFieldID);
    } else {
      console.error('Invalid event structure:', event);
    }
  }




  openTerms(event: Event) {
    event.preventDefault();
    this.showTermsModal = true;
  }

  closeTerms() {
    this.showTermsModal = false;
    this.terms = '';
  }

  openTermsEn(event: Event) {
    event.preventDefault();
    this.showTermsModalEn = true;
  }

  closeTermsEn() {
    this.showTermsModalEn = false;
  }


  onSouresTable(e: any) {
    if (e.TypeID === 8) {
      this.showSouresTableID = true;
    } else {
      this.showSouresTableID = false;
    }
  }



}