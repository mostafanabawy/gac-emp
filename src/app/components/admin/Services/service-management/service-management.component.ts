import { Component, OnInit, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, HostListener } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { FeesTableComponent } from 'src/app/components/fees-table/fees-table.component';

@Component({
  selector: 'app-dynamic-attachments',
  standalone: true,
  imports: [ComponentsModule, TranslateModule, FormsModule, FlatpickrModule, NgSelectModule, CommonModule, ReactiveFormsModule, DataTableModule, IconModule, FeesTableComponent],
  templateUrl: './service-management.component.html',
  styleUrl: './service-management.component.css'
})
export class ServiceManagementComponent implements OnInit, AfterViewInit {
  servicemanagementForm!: FormGroup;
  basic = basic;
  hide = true;
  showAddAttachmentModal = false;
  isEditMode = false;
  AddserviceproceduresForm!: FormGroup;
  translations: any = {};
  isArabic = this.translate.currentLang === 'ae';
  AllAttachments: any[] = [];
  showSections: boolean = false;
  Departments: any[] = [];
  Section: any[] = [];
  Request: any[] = [];
  search = '';
  itemURL: any = null;
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
  expandedRow: any = null;
  expandedRowDetails: any[] = [];
  isLoading: boolean = false;
  currentSortField: string = 'ServiceID';
  currentSortDirection: number = 2;
  private lastFetchParams: string | null = null;
  viewMode: 'table' | 'cards' = 'table';
  sortableColumns: any[] = [];
  selectedSortColumn: any = null;
  toggleColumnsDropdown = false;
  toggleSortDropdown = false;

  // Default allowed file types

  constructor(
    private router: Router,
    private fb: FormBuilder,
    public translate: TranslateService,
    private ServiceService: ServiceService,
    private cdr: ChangeDetectorRef
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

  get DepartmentID(): any {
    return this.AddserviceproceduresForm.get('DepartmentID');
  }
  get ServiceTitleAr(): any {
    return this.AddserviceproceduresForm.get('ServiceTitleAr');
  }

  get ServiceTitleEn(): any {
    return this.AddserviceproceduresForm.get('ServiceTitleEn');
  }

  get SectionID(): any {
    return this.AddserviceproceduresForm.get('SectionID');
  }
  get RequestTypeID(): any {
    return this.AddserviceproceduresForm.get('RequestTypeID');
  }
  get AppPrefixCode(): any {
    return this.AddserviceproceduresForm.get('AppPrefixCode');
  }
  get LicensePrefixCode(): any {
    return this.AddserviceproceduresForm.get('LicensePrefixCode');
  }
  get ServiceDescAr(): any {
    return this.AddserviceproceduresForm.get('ServiceDescAr');
  }
  get ServiceDescEn(): any {
    return this.AddserviceproceduresForm.get('ServiceDescEn');
  }
  get ServiceTermsAr(): any {
    return this.AddserviceproceduresForm.get('ServiceTermsAr');
  }
  get ServiceTermsEn(): any {
    return this.AddserviceproceduresForm.get('ServiceTermsEn');
  }
  get LicensePeriod(): any {
    return this.AddserviceproceduresForm.get('LicensePeriod');
  }
  notMinusOneValidator(control: AbstractControl) {
    return control.value === -1 ? { invalidOption: true } : null;
  }
  ngOnInit(): void {
    this.translations = this.loadEServicesTranslationsFromLocalStorage();

    const self = this;
    (window as any).editUserFromOutside = (ServiceID: any) => {
      this.edit(ServiceID);
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
        field: 'ServiceTitleAr',
        title: this.translations?.ServiceTitleAr?.label,
        sort: true,
        visible: true
      },
      {
        field: 'ServiceTitleEn',
        title: this.translations?.ServiceTitleEn?.label,
        sort: true,
        visible: true
      },
      {
        field: 'Department',
        title: this.translations?.Department?.label,
        sort: true,
        visible: false
      },
      {
        field: 'Section',
        title: this.translations?.Section?.label,
        sort: true,
        visible: false
      },
      {
        field: 'RequestType',
        title: this.translations?.RequestType?.label,
        sort: true,
        visible: true
      },
      {
        field: 'CreationDate',
        title: this.translations?.CreationDate?.label,
        sort: true,
        visible: true
      },
      {
        field: 'Active',
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
        this.Departments = res.Lookup.Departments;
        this.Section = res.Lookup.Section;
        this.Request = res.Lookup.Request;

        this.servicemanagementForm.controls['DepartmentID'].setValue(this.Departments[0].ID);
        this.servicemanagementForm.controls['SectionID'].setValue(this.Section[0].LookupID);
        this.servicemanagementForm.controls['RequestTypeID'].setValue(this.Request[0].ID);
        this.AddserviceproceduresForm.controls['DepartmentID'].setValue(this.Departments[0].ID);
        this.AddserviceproceduresForm.controls['SectionID'].setValue(this.Section[0].LookupID);
        this.AddserviceproceduresForm.controls['RequestTypeID'].setValue(this.Request[0].ID);
      }
    });

    this.AddserviceproceduresForm = this.fb.group({
      ServiceTitleAr: [null, [Validators.required]],
      ServiceTitleEn: [null, [Validators.required]],
      DepartmentID: [null, [Validators.required, this.notMinusOneValidator]],
      SectionID: [null, [Validators.required, this.notMinusOneValidator]],
      RequestTypeID: [null, [Validators.required, this.notMinusOneValidator]],
      AppPrefixCode: [null, [Validators.required]],
      LicensePrefixCode: [null, [Validators.required]],
      LicensePeriod: [null, [Validators.required]],
      ServiceDescAr: [null, [Validators.required]],
      ServiceDescEn: [null, [Validators.required]],
      ServiceTermsAr: [null, [Validators.required]],
      ServiceTermsEn: [null, [Validators.required]],
      CreationDate: [new Date()],
      Active: [true],
      SuspendDateFrom: [null, []],
      SuspendDateTo: [null, []],
      SuspendTimeFrom: [null, []],
      SuspendTimeTo: [null, []],
      AllowablePeriodBefore: [null, []],
      AllowablePeriodAfter: [null, []],
      MinActivitiesCount: [null],
      MaxActivitiesCount: [null],
      MaxEventPeriodInDays: [null],
      EventSubmissionDateInDays: [null],
      MaxExtendEventDate: [null],
      MaxFounders: [null],
      DeleteDraftAutoInDays: [null],
      DeleteDraftActive: [false],
      HelpFileName: [null],
      CRServiceCode: [null],
      AiHelpTextAr: [null],
      AiHelpTextEn: [null],
      VideoUrl: [null],

    });



    this.servicemanagementForm = this.fb.group({
      ServiceTitleAr: [null],
      ServiceTitleEn: [null],
      Start_CreationDate: [null],
      End_CreationDate: [null],
      DepartmentID: [-1],
      SectionID: [-1],
      RequestTypeID: [-1],
      Active: [null],
    });

    this.fetchData();
  }


  toggleRowExpand(ServiceID: any) {
    console.log('Toggling row with ServiceID:', ServiceID);
    if (this.expandedRow?.ServiceID === ServiceID) {
      this.expandedRow = null;
      this.expandedRowDetails = [];
    } else {
      this.expandedRow = this.rows.find(row => row.ServiceID === ServiceID);
      console.log('Expanded row:', this.expandedRow);

      // تحديد التفاصيل التي ستظهر في الصف الموسع
      if (this.expandedRow) {
        this.expandedRowDetails = [
          {
            label: this.translations?.ServiceDescAr?.label,
            value: this.expandedRow.ServiceDescAr,
            fullWidth: true
          },
          {
            label: this.translations?.ServiceDescEn?.label,
            value: this.expandedRow.ServiceDescEn,
            fullWidth: true
          },
          {
            label: this.translations?.ServiceTermsAr?.label,
            value: this.expandedRow.ServiceTermsAr,
            fullWidth: true
          },
          {
            label: this.translations?.ServiceTermsEn?.label,
            value: this.expandedRow.ServiceTermsEn,
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
    this.currentSortField = 'ServiceID';
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
    if (event && event.row && event.row.ServiceID) {
      console.log('Opening edit for ServiceID:', event.row.ServiceID);
      this.edit(event.row.ServiceID);
    } else {
      console.error('Invalid event structure:', event);
    }
  }



  onCheckboxChange(checked: boolean, id: number) {
    const row = this.rows.find(r => r.ID === id);
    if (row) {
      row.Active = checked;
    }
  }

  fetchData(setting?: any, searchData?: any) {
    const formValues = this.servicemanagementForm.value;
    const filterMinusOne = (value: any) => (value === -1 ? null : value);

    const toISOorNull = (date: any) => {
      if (!date) return null;

      if (date.year && date.month && date.day) {
        const parsedDate = new Date(Date.UTC(date.year, date.month - 1, date.day));
        return parsedDate.toISOString();
      }

      if (typeof date === "string" && date.includes("/")) {
        const [day, month, year] = date.split("/").map(Number);
        const parsedDate = new Date(Date.UTC(year, month - 1, day));
        return parsedDate.toISOString();
      }

      const parsedDate = new Date(date);
      return isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
    };



    searchData = {
      ServiceTitleAr: formValues.ServiceTitleAr || null,
      ServiceTitleEn: formValues.ServiceTitleEn || null,
      Start_CreationDate: toISOorNull(formValues.Start_CreationDate),
      End_CreationDate: toISOorNull(formValues.End_CreationDate),
      DepartmentID: filterMinusOne(formValues.DepartmentID),
      Active: formValues.Active ?? null,
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

    this.ServiceService.getPageWithSearchServices(setting, searchData).subscribe({
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
    this.ServiceService.getPageWithSearchServices(setting, searchData).subscribe({
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
    this.ServiceService.getPageWithSearchServices(setting, searchData).subscribe({
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

    const formValues = this.servicemanagementForm.value;
    const filterMinusOne = (value: any) => (value === -1 ? null : value);

    const searchData = {
      ServiceTitleAr: formValues.ServiceTitleAr || null,
      ServiceTitleEn: formValues.ServiceTitleEn || null,
      Start_CreationDate: formValues.Start_CreationDate || null,
      End_CreationDate: formValues.End_CreationDate || null,
      DepartmentID: filterMinusOne(formValues.DepartmentID),
      Active: formValues.Active,
      MaxAttachmentSizeKB: formValues.MaxAttachmentSizeKB || null,
      AllowedFileTypes: formValues.AllowedFileTypes || null,
      AttachmentOrder: formValues.AttachmentOrder || null,
      AddMoreThanOne: formValues.AddMoreThanOne,
    };

    this.ServiceService.getPageWithSearchServices(setting, searchData).subscribe({
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
      const formValues = this.servicemanagementForm.value;
      const filterMinusOne = (value: any) => (value === -1 ? null : value);

      const searchData = {
        ServiceTitleAr: formValues.ServiceTitleAr || null,
        ServiceTitleEn: formValues.ServiceTitleEn || null,
        Start_CreationDate: formValues.Start_CreationDate || null,
        End_CreationDate: formValues.End_CreationDate || null,
        DepartmentID: filterMinusOne(formValues.DepartmentID),
        Active: formValues.Active,
        MaxAttachmentSizeKB: formValues.MaxAttachmentSizeKB || null,
        AllowedFileTypes: formValues.AllowedFileTypes || null,
        AttachmentOrder: formValues.AttachmentOrder || null,
        AddMoreThanOne: formValues.AddMoreThanOne,
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

    const formValues = this.servicemanagementForm.value;
    const filterMinusOne = (value: any) => (value === -1 ? null : value);

    const searchData = {
      ServiceTitleAr: formValues.ServiceTitleAr || null,
      ServiceTitleEn: formValues.ServiceTitleEn || null,
      Start_CreationDate: formValues.Start_CreationDate || null,
      End_CreationDate: formValues.End_CreationDate || null,
      DepartmentID: filterMinusOne(formValues.DepartmentID),
      Active: formValues.Active,
      MaxAttachmentSizeKB: formValues.MaxAttachmentSizeKB || null,
      AllowedFileTypes: formValues.AllowedFileTypes || null,
      AttachmentOrder: formValues.AttachmentOrder || null,
      AddMoreThanOne: formValues.AddMoreThanOne,
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
    this.servicemanagementForm.reset({
      ServiceTitleAr: '',
      ServiceTitleEn: '',
      DepartmentID: -1,
      Start_CreationDate: null,
      End_CreationDate: null,
      Active: null,
      MaxAttachmentSizeKB: null,
      AllowedFileTypes: null,
      AttachmentOrder: null,
      AddMoreThanOne: null,

    });
    this.paginationInfo.CurrentPage = 1;
    this.fetchData();
  }

  edit(id: number) {
    console.log(id);
    this.router.navigate(['/services/servicemanagement', id]);
  }

  exportTOExcel() {
    const isArabic = this.translate.currentLang === 'ae';
    const headerMap: Record<string, string> = {};

    const excludedFields = ['Serial', 'Actions', 'expand'];

    this.cols.forEach(col => {
      if (col.field && col.title && !excludedFields.includes(col.field)) {
        headerMap[col.field] = col.title;
      }
    });

    headerMap['Department'] = this.translations?.Department?.label || (isArabic ? 'الإدارة' : 'Department');
    headerMap['Section'] = this.translations?.Section?.label || (isArabic ? 'القسم' : 'Section');
    headerMap['RequestType'] = this.translations?.RequestType?.label || (isArabic ? 'نوع الطلب' : 'Request Type');
    headerMap['CreationDate'] = this.translations?.CreationDate?.label || (isArabic ? 'تاريخ الإنشاء' : 'Creation Date');
    headerMap['ServiceDescAr'] = this.translations?.ServiceDescAr?.label || (isArabic ? 'وصف الخدمة (عربي)' : 'Service Description (Ar)');
    headerMap['ServiceDescEn'] = this.translations?.ServiceDescEn?.label || (isArabic ? 'وصف الخدمة (إنجليزي)' : 'Service Description (En)');
    headerMap['ServiceTermsAr'] = this.translations?.ServiceTermsAr?.label || (isArabic ? 'شروط الخدمة (عربي)' : 'Service Terms (Ar)');
    headerMap['ServiceTermsEn'] = this.translations?.ServiceTermsEn?.label || (isArabic ? 'شروط الخدمة (إنجليزي)' : 'Service Terms (En)');
    headerMap['AppPrefixCode'] = this.translations?.AppPrefixCode?.label || (isArabic ? 'رمز الطلب' : 'App Prefix Code');
    headerMap['LicensePrefixCode'] = this.translations?.LicensePrefixCode?.label || (isArabic ? 'رمز الرخصة' : 'License Prefix Code');
    headerMap['LicensePeriod'] = this.translations?.LicensePeriod?.label || (isArabic ? 'مدة الرخصة' : 'License Period');

    const data = this.rows.map((item: any) => {
      const row: any = {};
      Object.keys(headerMap).forEach(field => {
        let value = item[field];

        if (field === 'Active') {
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
    XLSX.utils.book_append_sheet(wb, ws, isArabic ? 'إدارة الخدمات' : 'Service Management');

    // تطبيق RTL على الـ workbook
    if (isArabic) {
      if (!wb.Workbook) wb.Workbook = {};
      if (!wb.Workbook.Views) wb.Workbook.Views = [];
      wb.Workbook.Views[0] = { RTL: true };
    }

    const filename = isArabic ? 'تقرير_إدارة_الخدمات.xlsx' : 'Service_Management_Report.xlsx';
    XLSX.writeFile(wb, filename);
  }




  ngAfterViewInit(): void {
    document.addEventListener('change', (event: any) => {
      if (event.target && event.target.classList.contains('attachment-checkbox')) {
        const id = Number(event.target.getAttribute('data-id'));
        const checked = event.target.checked;
        this.onCheckboxChange(checked, id);
      }
    });
    document.addEventListener('click', (event: any) => {
      if (event.target && event.target.classList.contains('edit-btn')) {
        const id = Number(event.target.getAttribute('data-id'));
        this.edit(id);
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

  private mapRowsWithSerial(data: any[]): any[] {
    const isArabic = this.translate.currentLang === 'ae';
    const pageIndex = this.paginationInfo.CurrentPage - 1;
    const pageSize = this.paginationInfo.PageSize || 20;

    this.lastUserId = Math.max(...data.map(item => item.ServiceID || 0), 0);

    return data.map((item, index) => {
      return {
        ...item,
        Serial: pageIndex * pageSize + index + 1,
        Department: isArabic ? item.DepartmentTitleAr : item.DepartmentTitleEn,
        Section: isArabic ? item.SectionTitleAr : item.SectionTitleEn,
        RequestType: isArabic ? item.RequestTitleAr : item.RequestTitleEn,
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


  // دالة مساعده لدمج التاريخ الثابت مع وقت المستخدم
  combineDateWithTime(time: string): string | null {
    if (!time) return null;
    const baseDate = "2010-01-01";
    return `${baseDate}T${time}:00`;
  }


  onAddAttachmentSubmit() {
    const formData = this.AddserviceproceduresForm.value;
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
        const fieldMessage = translationEntry?.validation
        Swal.fire({
          icon: 'warning',
          title: `${fieldMessage}`,
          confirmButtonText: this.translations?.confrim?.label,

        });
      }
      return;
    }
    const serviceIDs = Array.isArray(formData.DepartmentID) ? formData.DepartmentID : [formData.DepartmentID];

    Swal.fire({
      title: this.translations?.AreYouSure?.label,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.translations?.Yes?.label,
      cancelButtonText: this.translations?.No?.label,
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      this.isLoading = true;
      const toISOorNull = (date: any) => {
        if (!date) return null;

        if (date.year && date.month && date.day) {
          const parsedDate = new Date(Date.UTC(date.year, date.month - 1, date.day));
          return parsedDate.toISOString();
        }

        if (typeof date === "string" && date.includes("/")) {
          const [day, month, year] = date.split("/").map(Number);
          const parsedDate = new Date(Date.UTC(year, month - 1, day));
          return parsedDate.toISOString();
        }

        const parsedDate = new Date(date);
        return isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
      };
      const requests = serviceIDs.map((serviceID: number) => {
        const payload: any = {
          ...formData,
          SuspendTimeFrom: formData.SuspendTimeFrom,
          SuspendTimeTo: formData.SuspendTimeTo,
          SuspendDateFrom: toISOorNull(formData.SuspendDateFrom),
          SuspendDateTo: toISOorNull(formData.SuspendDateTo),
          CreationDate: toISOorNull(formData.CreationDate),
          MaxExtendEventDate: toISOorNull(formData.MaxExtendEventDate),

        };

        return this.ServiceService.addEServicesServices(payload);
      });

      try {
        await lastValueFrom(forkJoin(requests));

        this.showAddAttachmentModal = false;
        this.hide = true
        Swal.fire({
          icon: 'success',
          confirmButtonText: this.translations?.confrim?.label,
          title: this.isEditMode ? this.translations?.ModifiedSuccessfully?.label : this.translations?.AddedSuccessfully?.label,
        });
        this.isEditMode = false;
        this.AddserviceproceduresForm.reset()



        this.lastFetchParams = null;
        this.fetchData();


      } catch (err) {
        console.error(err);
        Swal.fire({
          icon: 'error',
          confirmButtonText: this.translations?.confrim?.label,
          title: this.translations?.TryAgainLater?.label || 'Error',
        });
      } finally {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }


  closeAddUserModal() {
    this.showAddAttachmentModal = false;
    this.hide = true
    this.isEditMode = false;
    this.AddserviceproceduresForm.reset({
      ServiceTitleAr: null,
      ServiceTitleEn: null,

      CreationDate: new Date(),

      FkSectionId: '-1',
      DepartmentID: null,
      Active: true,
    });
    this.cdr.markForCheck();
  }
  onRowClick(event: any) {
    this.toggleRowExpand(event.row.ServiceID);
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
}