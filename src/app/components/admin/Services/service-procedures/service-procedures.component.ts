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
import { FeesTableComponent } from 'src/app/components/fees-table/fees-table.component';

@Component({
  selector: 'app-dynamic-attachments',
  standalone: true,
  imports: [ComponentsModule, FormsModule, TranslateModule, FlatpickrModule, NgSelectModule, CommonModule, ReactiveFormsModule, DataTableModule, IconModule, FeesTableComponent],
  templateUrl: './service-procedures.component.html',
  styleUrl: './service-procedures.component.css'
})
export class ServiceProceduresComponent implements OnInit, AfterViewInit {
  serviceproceduresForm!: FormGroup;
  basic = basic;
  showAddAttachmentModal = false;
  isEditMode = false;
  AddserviceproceduresForm!: FormGroup;
  translations: any = {};
  isArabic = this.translate.currentLang === 'ae';
  AllAttachments: any[] = [];
  showSections: boolean = false;
  Services: any[] = [];
  search = '';
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
  itemURL: any = null;
  expandedRow: any = null;
  expandedRowDetails: any[] = [];
  isLoading: boolean = false;
  currentSortField: string = 'MessageID';
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

  get FKServiceID(): any {
    return this.AddserviceproceduresForm.get('FKServiceID');
  }
  get MessageAr(): any {
    return this.AddserviceproceduresForm.get('MessageAr');
  }

  get MessageEn(): any {
    return this.AddserviceproceduresForm.get('MessageEn');
  }

  get Action(): any {
    return this.AddserviceproceduresForm.get('Action');
  }



  ngOnInit(): void {
    this.translations = this.loadEServicesTranslationsFromLocalStorage();

    (window as any).editUserFromOutside = (data: any) => {
      this.edit(data);
    };
    (window as any).toggleRowExpand = (MessageID: any) => {
      this.toggleRowExpand(MessageID);
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
        field: 'ServiceTitle',
        title: this.translations?.ServiceType?.label,
        sort: true,
        visible: true
      },
      {
        field: 'MessageAr',
        title: this.translations?.MessageAr?.label,
        sort: true,
        visible: false // مخفي في الجدول، يظهر في التفاصيل
      },
      {
        field: 'MessageEn',
        title: this.translations?.MessageEn?.label,
        sort: true,
        visible: false // مخفي في الجدول، يظهر في التفاصيل
      },
      {
        field: 'Action',
        title: this.translations?.Action?.label,
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
      if (res?.Lookup?.Services) {
        this.Services = res.Lookup.Services;
        // this.AddserviceproceduresForm.controls['FKServiceID'].setValue(this.Services[0].ServiceID);
        this.serviceproceduresForm.controls['FKServiceID'].setValue(this.Services[0].ServiceID);
      } else {
        this.Services = [];
      }
    });

    this.AddserviceproceduresForm = this.fb.group({
      FKServiceID: [null, [Validators.required]],
      MessageAr: [null, [Validators.required]],
      MessageEn: [null, [Validators.required]],
      Action: [null, [Validators.required]],
      CreationDate: [new Date()],
      FkSectionId: ['-1'],
      IsActive: [true],
    });



    this.serviceproceduresForm = this.fb.group({
      MessageAr: [null],
      MessageEn: [null],
      Start_CreationDate: [null],
      End_CreationDate: [null],
      FKServiceID: [-1],
      IsActive: [null],
      Action: [null],
    });

    this.fetchData();
  }






  onCheckboxChange(checked: boolean, id: number) {
    const row = this.rows.find(r => r.ID === id);
    if (row) {
      row.IsActive = checked;
    }
  }

  fetchData(setting?: any, searchData?: any) {
    const formValues = this.serviceproceduresForm.value;
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
      MessageAr: formValues.MessageAr || null,
      MessageEn: formValues.MessageEn || null,
      Start_CreationDate: toISOorNull(formValues.Start_CreationDate),
      End_CreationDate: toISOorNull(formValues.End_CreationDate),
      FKServiceID: filterMinusOne(formValues.FKServiceID),
      IsActive: formValues.IsActive ?? null,
      Action: formValues.Action ?? null
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

    this.ServiceService.getPageWithSearch(setting, searchData).subscribe({
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

  oncheckboxsubmitNotIsActive(event: any) {
    const setting = {
      pageNo: 1,
      pageSize: 536,
      sortField: 'ID',
      sortDirection: 2
    };
    let searchData = {
      IsActive: !event,
    };
    if (event == true)
      searchData.IsActive = false;
    else {
      event = null;
      searchData.IsActive = event;
    }
    this.ServiceService.getPageWithSearch(setting, searchData).subscribe({
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

  oncheckboxsubmitIsActive(event: any) {
    const setting = {
      pageNo: 1,
      pageSize: 536,
      sortField: 'ID',
      sortDirection: 2
    };
    let searchData = {
      IsActive: event,
    };
    if (event == true)
      searchData.IsActive = true;
    else {
      event = null;
      searchData.IsActive = event;
    }
    this.ServiceService.getPageWithSearch(setting, searchData).subscribe({
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

    const formValues = this.serviceproceduresForm.value;
    const filterMinusOne = (value: any) => (value === -1 ? null : value);

    const searchData = {
      MessageAr: formValues.MessageAr || null,
      MessageEn: formValues.MessageEn || null,
      Start_CreationDate: formValues.Start_CreationDate || null,
      End_CreationDate: formValues.End_CreationDate || null,
      FKServiceID: filterMinusOne(formValues.FKServiceID),
      IsActive: formValues.IsActive,
      MaxAttachmentSizeKB: formValues.MaxAttachmentSizeKB || null,
      AllowedFileTypes: formValues.AllowedFileTypes || null,
      AttachmentOrder: formValues.AttachmentOrder || null,
      AddMoreThanOne: formValues.AddMoreThanOne,
    };

    this.ServiceService.getPageWithSearch(setting, searchData).subscribe({
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
      const formValues = this.serviceproceduresForm.value;
      const filterMinusOne = (value: any) => (value === -1 ? null : value);

      const searchData = {
        MessageAr: formValues.MessageAr || null,
        MessageEn: formValues.MessageEn || null,
        Start_CreationDate: formValues.Start_CreationDate || null,
        End_CreationDate: formValues.End_CreationDate || null,
        FKServiceID: filterMinusOne(formValues.FKServiceID),
        IsActive: formValues.IsActive,
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

    const formValues = this.serviceproceduresForm.value;
    const filterMinusOne = (value: any) => (value === -1 ? null : value);

    const searchData = {
      MessageAr: formValues.MessageAr || null,
      MessageEn: formValues.MessageEn || null,
      Start_CreationDate: formValues.Start_CreationDate || null,
      End_CreationDate: formValues.End_CreationDate || null,
      FKServiceID: filterMinusOne(formValues.FKServiceID),
      IsActive: formValues.IsActive,
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
    return item.MessageAr.toLowerCase().includes(term) ||
      item.MessageEn.toLowerCase().includes(term);
  }

  onReset() {
    this.serviceproceduresForm.reset({
      MessageAr: '',
      MessageEn: '',
      FKServiceID: -1,
      Start_CreationDate: null,
      End_CreationDate: null,
      IsActive: null,
      MaxAttachmentSizeKB: null,
      AllowedFileTypes: null,
      AttachmentOrder: null,
      AddMoreThanOne: null,

    });
    this.paginationInfo.CurrentPage = 1;
    this.fetchData();
  }

  edit(data: any) {
    const Id = typeof data === 'number' ? data : data?.MessageID;

    this.isEditMode = true;
    this.isLoading = true;
    this.showAddAttachmentModal = true;

    this.ServiceService.getByMessageID(Id).subscribe({
      next: (res) => {
        if (res && res.items && res.items.length > 0) {
          const serviceproceduresData = res.items[0];
          this.id = serviceproceduresData.MessageID;
          this.AddserviceproceduresForm.patchValue({
            ID: serviceproceduresData.MessageID,
            FKServiceID: serviceproceduresData.FKServiceID || -1,
            MessageAr: serviceproceduresData.MessageAr || '',
            MessageEn: serviceproceduresData.MessageEn || '',
            CreationDate: serviceproceduresData.CreationDate ? new Date(serviceproceduresData.CreationDate) : new Date(),
            IsActive: serviceproceduresData.IsActive ?? true,
            Action: serviceproceduresData.Action || '',
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

    headerMap['MessageAr'] = this.translations?.MessageAr?.label || (isArabic ? 'نص الرسالة (عربي)' : 'Message (Ar)');
    headerMap['MessageEn'] = this.translations?.MessageEn?.label || (isArabic ? 'نص الرسالة (إنجليزي)' : 'Message (En)');

    // تجهيز البيانات
    const data = this.rows.map((item: any) => {
      const row: any = {};
      Object.keys(headerMap).forEach(field => {
        let value = item[field];

        if (field === 'IsActive') {
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
    XLSX.utils.book_append_sheet(wb, ws, isArabic ? 'إعدادات تتبع حركة الخدمة' : 'Service Procedures');

    // تطبيق RTL على الـ workbook
    if (isArabic) {
      if (!wb.Workbook) wb.Workbook = {};
      if (!wb.Workbook.Views) wb.Workbook.Views = [];
      wb.Workbook.Views[0] = { RTL: true };
    }

    const filename = isArabic ? 'تقرير_تتبع_حركة_الخدمة.xlsx' : 'Service_Procedures_Report.xlsx';
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

    this.lastUserId = Math.max(...data.map(item => item.MessageID || 0), 0);

    return data.map((item, index) => {
      return {
        ...item,
        Serial: pageIndex * pageSize + index + 1,
        ServiceTitle: isArabic ? item.ServiceTitleAr : item.ServiceTitleEn,
        CreationDate: formatDateDisplay(item.CreationDate),
        Active: item.IsActive, // إضافة Active لـ fees-table
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
    const serviceIDs = Array.isArray(formData.FKServiceID) ? formData.FKServiceID : [formData.FKServiceID];

    Swal.fire({
      title: this.translations?.AreYouSure?.label,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.translations?.Yes?.label,
      cancelButtonText: this.translations?.No?.label,
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      this.isLoading = true;

      const requests = serviceIDs.map((serviceID: number) => {
        const payload: any = {
          MessageAr: formData.MessageAr || null,
          MessageEn: formData.MessageEn || null,
          CreationDate: formData.CreationDate ? new Date(formData.CreationDate).toISOString() : new Date().toISOString(),
          FKServiceID: serviceID === -1 ? null : serviceID,
          IsActive: formData.IsActive ?? true,
          Action: formData.Action,
        };
        if (this.isEditMode) {
          payload.MessageID = this.id;
        }
        return this.isEditMode
          ? this.ServiceService.update(payload)
          : this.ServiceService.add(payload);
      });

      try {
        await lastValueFrom(forkJoin(requests));

        this.showAddAttachmentModal = false;
        Swal.fire({
          icon: 'success',
          confirmButtonText: this.translations?.confrim?.label,
          title: this.isEditMode ? this.translations?.ModifiedSuccessfully?.label : this.translations?.AddedSuccessfully?.label,
        });
        this.isEditMode = false;
        this.AddserviceproceduresForm.reset({
          MessageAr: null,
          MessageEn: null,
          DescriptionAr: '',
          DescriptionEn: '',
          CreationDate: new Date(),
          AIHelpAr: '',
          AIHelpEn: '',
          FkSectionId: '-1',
          FKServiceID: this.Services.length > 0 ? this.Services[0].ServiceID : -1,
          IsActive: true,

        });

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
    this.isEditMode = false;
    this.AddserviceproceduresForm.reset({
      MessageAr: null,
      MessageEn: null,

      CreationDate: new Date(),

      FkSectionId: '-1',
      FKServiceID: null,
      IsActive: true,
      Action: '',
    });
    this.cdr.markForCheck();
  }
  onRowClick(event: any) {
    this.toggleRowExpand(event.row.MessageID);
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
  toggleRowExpand(MessageID: any) {
    console.log('Toggling row with MessageID:', MessageID);
    if (this.expandedRow?.MessageID === MessageID) {
      this.expandedRow = null;
      this.expandedRowDetails = [];
    } else {
      this.expandedRow = this.rows.find(row => row.MessageID === MessageID);
      console.log('Expanded row:', this.expandedRow);

      // تحديد التفاصيل التي ستظهر في الصف الموسع (كل رسالة على سطر منفصل)
      if (this.expandedRow) {
        this.expandedRowDetails = [
          {
            label: this.translations?.MessageAr?.label,
            value: this.expandedRow.MessageAr,
            fullWidth: true // لجعلها تأخذ العرض الكامل
          },
          {
            label: this.translations?.MessageEn?.label,
            value: this.expandedRow.MessageEn,
            fullWidth: true // لجعلها تأخذ العرض الكامل
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
    this.currentSortField = 'MessageID';
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
    if (event && event.row && event.row.MessageID) {
      console.log('Opening edit modal for MessageID:', event.row.MessageID);
      this.edit(event.row.MessageID);
    } else {
      console.error('Invalid event structure:', event);
    }
  }
}