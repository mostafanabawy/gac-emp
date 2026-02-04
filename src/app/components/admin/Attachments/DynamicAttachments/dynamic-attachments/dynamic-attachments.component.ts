import { Component, OnInit, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ComponentsModule } from "src/app/components/components.module";
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { DataTableModule } from '@bhplugin/ng-datatable';
import { NgSelectModule } from '@ng-select/ng-select';
import { AttachmentsService } from 'src/app/service/Attachments/attachments.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { FlatpickrModule } from 'angularx-flatpickr';
import { basic, formatDateDisplay } from 'src/app/helpers/date-helper';
import * as XLSX from 'xlsx';
import { IconModule } from "src/app/shared/icon/icon.module";
import { forkJoin, lastValueFrom } from 'rxjs';
import { FeesTableComponent } from '../../../../fees-table/fees-table.component';

@Component({
  selector: 'app-dynamic-attachments',
  standalone: true,
  imports: [ComponentsModule, FormsModule, TranslateModule, FlatpickrModule, NgSelectModule, CommonModule, ReactiveFormsModule, DataTableModule, IconModule, FeesTableComponent],
  templateUrl: './dynamic-attachments.component.html',
  styleUrl: './dynamic-attachments.component.css'
})
export class DynamicAttachmentsComponent implements OnInit, AfterViewInit {
  @ViewChild('feesTable') feesTable!: FeesTableComponent;
  DynamicAttachmentForm!: FormGroup;
  basic = basic;
  showAddAttachmentModal = false;
  isEditMode = false;
  itemURL: any = null;
  AddAttachmentForm!: FormGroup;
  translations: any = {};
  isArabic: any = this.translate.currentLang === 'ae';
  AllAttachments: any[] = [];
  showSections: boolean = false;
  Services: any[] = [];
  search = '';
  cols: any[] = [];
  allColumns: any[] = [];
  defaultColumnsState: any[] = [];
  expandedRow: any = null;
  expandedRowDetails: any[] = [];
  id: any = null;
  lastUserId: number = 0;
  rows: any[] = [];
  paginationInfo = {
    TotalPages: 1,
    CurrentPage: 1,
    PageSize: 20,
    TotalRows: 0
  };

  isLoading: boolean = false;
  currentSortField: string = 'ID';
  currentSortDirection: number = 2;
  private lastFetchParams: string | null = null;
  viewMode: 'table' | 'cards' = 'table';
  sortableColumns: any[] = [];
  selectedSortColumn: any = null;
  toggleColumnsDropdown = false;
  toggleSortDropdown = false;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
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

  // فتح dropdown واحد فقط
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

  // Default allowed file types
  private defaultAllowedFileTypes = 'pdf,doc,docx,xls,xlsx,ppt,pptx,txt,rtf,csv,jpg,jpeg,png,gif,bmp,tiff,svg,heic,webp';

  constructor(
    private router: Router,
    private fb: FormBuilder,
    public translate: TranslateService,
    private AttachmentsService: AttachmentsService,
    private cdr: ChangeDetectorRef
  ) { }

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
    return this.AddAttachmentForm.get('FKServiceID');
  }
  get TitleAr(): any {
    return this.AddAttachmentForm.get('TitleAr');
  }

  get TitleEn(): any {
    return this.AddAttachmentForm.get('TitleEn');
  }

  get allowedFileTypesArray(): any {
    const types = this.AddAttachmentForm.get('AllowedFileTypes') || this.defaultAllowedFileTypes;
    return types
  }

  get maxAttachmentSizeMB(): number | null | any {
    const kb = this.AddAttachmentForm.get('MaxAttachmentSizeKB');
    return kb
  }
  get AttachmentOrder(): any {
    return this.AddAttachmentForm.get('AttachmentOrder');
  }



  ngOnInit(): void {


    this.translations = this.loadEServicesTranslationsFromLocalStorage();

    (window as any).editUserFromOutside = (data: any) => {
      this.editAttachment(data);
    };

    (window as any).toggleRowExpand = (ID: any) => {
      this.toggleRowExpand(ID);
    };
    this.cols = [
      { field: 'expand', title: '', sort: false, visible: true, fixed: true, width: '50px' },
      { field: 'Serial', title: this.translations?.Serial?.label, sort: false, isNumber: true, visible: true, fixed: true, width: '80px' },
      { field: 'ServiceTitle', title: this.translations?.ServiceType?.label, sort: true, visible: true, width: '200px' },
      { field: 'TitleAr', title: this.translations?.TitleAr?.label, sort: true, visible: this.isArabic ? true : false, width: '180px' },
      { field: 'TitleEn', title: this.translations?.TitleEn?.label, sort: true, visible: this.isArabic ? false : true, width: '180px' },
      { field: 'MaxAttachmentSizeKB', title: this.translations?.MaxAttachmentSizeKB?.label, sort: true, visible: false, width: '150px' },
      { field: 'AttachmentOrder', title: this.translations?.AttachmentOrder?.label, sort: true, visible: false, width: '120px', isNumber: true },
      { field: 'AllowedFileTypes', title: this.translations?.AllowedFileTypes?.label, sort: true, visible: false, width: '200px' },
      { field: 'AddMoreThanOne', title: this.translations?.AddMoreThanOne?.label, sort: true, visible: true, width: '150px' },
      { field: 'CreationDate', title: this.translations?.CreationDate?.label, sort: true, visible: true, width: '150px' },
      { field: 'Active', title: this.translations?.Status?.label, sort: true, visible: true, width: '120px' },
      { field: 'actions', title: this.translations?.Actions?.label, sort: false, fixed: true, visible: true, width: '100px' }
    ];

    // نسخ الأعمدة لـ allColumns (بدون الأعمدة الثابتة)
    this.allColumns = this.cols
      .filter(col => !col.fixed)
      .map(col => ({ ...col }));

    // حفظ الحالة الافتراضية للأعمدة
    this.defaultColumnsState = this.cols.map(col => ({
      field: col.field,
      visible: col.visible
    }));

    // إعداد الأعمدة القابلة للترتيب
    this.sortableColumns = this.cols
      .filter(col => col.sort)
      .map(col => ({ field: col.field, title: col.title }));

    this.selectedSortColumn = this.sortableColumns.find(
      col => col.field === this.currentSortField
    ) || this.sortableColumns[0];
    this.AttachmentsService.getAttachmentById(null).subscribe((res) => {
      if (res?.Lookup?.Services) {
        this.Services = res.Lookup.Services;
        // this.AddAttachmentForm.controls['FKServiceID'].setValue(this.Services[0].ServiceID);
        this.DynamicAttachmentForm.controls['FKServiceID'].setValue(this.Services[0].ServiceID);
      } else {
        this.Services = [];
      }
    });
    // Initialize AddAttachmentForm with default AllowedFileTypes
    this.AddAttachmentForm = this.fb.group({
      FKServiceID: [null, [Validators.required]],
      TitleAr: [null, [Validators.required]],
      TitleEn: [null, [Validators.required]],
      MaxAttachmentSizeKB: [null, [Validators.required]],
      AllowedFileTypes: [this.defaultAllowedFileTypes, [Validators.required]],
      AttachmentOrder: ['', [Validators.required]],
      DescriptionAr: [''],
      DescriptionEn: [''],
      CreationDate: [new Date()],
      AIHelpAr: [''],
      AIHelpEn: [''],
      FkSectionId: ['-1'],
      Active: [true],
      AddMoreThanOne: [false],
    });

    console.log(this.AddAttachmentForm);


    this.DynamicAttachmentForm = this.fb.group({
      TitleAr: [null],
      TitleEn: [null],
      Start_CreationDate: [null],
      End_CreationDate: [null],
      FkSectionId: ['-1'],
      FKServiceID: [-1],
      Active: [null],
      MaxAttachmentSizeKB: [null],
      AllowedFileTypes: [null],
      AttachmentOrder: [''],
      AddMoreThanOne: [null],
    });

    this.fetchData();
  }

  // Convert KB to MB for display
  getMaxAttachmentSizeInMB(): number | null {
    const kb = this.AddAttachmentForm.get('MaxAttachmentSizeKB')?.value;
    return kb ? Math.round(kb / 1024) : null;
  }

  // Convert MB to KB when setting the value
  setMaxAttachmentSizeInMB(value: number | null): void {
    const kb = value ? value * 1024 : null;
    this.AddAttachmentForm.controls['MaxAttachmentSizeKB'].setValue(kb, { emitEvent: false });
  }

  onMaxAttachmentSizeInput(event: any) {
    let value: any = parseFloat(event.target.value);
    if (isNaN(value)) {
      value = null;
    } else if (value > 100) {
      value = 100;
      event.target.value = 100;
    }
    this.setMaxAttachmentSizeInMB(value);
  }

  onCheckboxChange(checked: boolean, id: number) {
    const row = this.rows.find(r => r.ID === id);
    if (row) {
      row.Active = checked;
    }
  }

  fetchData(setting?: any, searchData?: any) {
    const formValues = this.DynamicAttachmentForm.value;
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
      TitleAr: formValues.TitleAr || null,
      TitleEn: formValues.TitleEn || null,
      Start_CreationDate: toISOorNull(formValues.Start_CreationDate),
      End_CreationDate: toISOorNull(formValues.End_CreationDate),
      FKServiceID: filterMinusOne(formValues.FKServiceID),
      Active: formValues.Active ?? null,
      MaxAttachmentSizeKB: formValues.MaxAttachmentSizeKB
        ? Number(formValues.MaxAttachmentSizeKB) * 1024
        : null,
      AllowedFileTypes: formValues.AllowedFileTypes || null,
      AttachmentOrder: formValues.AttachmentOrder || null,
      AddMoreThanOne: formValues.AddMoreThanOne ?? null
    };

    if (!setting) {
      setting = {
        pageNo: this.paginationInfo.CurrentPage,
        pageSize: this.paginationInfo.PageSize,
        sortField: this.currentSortField || 'ID',
        sortDirection: this.currentSortDirection
      };
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    this.AttachmentsService.getDynamicAttachmentsPageWithSearch(setting, searchData).subscribe({
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
    this.AttachmentsService.getDynamicAttachmentsPageWithSearch(setting, searchData).subscribe({
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
    this.AttachmentsService.getDynamicAttachmentsPageWithSearch(setting, searchData).subscribe({
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

    const formValues = this.DynamicAttachmentForm.value;
    const filterMinusOne = (value: any) => (value === -1 ? null : value);

    const searchData = {
      TitleAr: formValues.TitleAr || null,
      TitleEn: formValues.TitleEn || null,
      Start_CreationDate: formValues.Start_CreationDate || null,
      End_CreationDate: formValues.End_CreationDate || null,
      FKServiceID: filterMinusOne(formValues.FKServiceID),
      Active: formValues.Active,
      MaxAttachmentSizeKB: formValues.MaxAttachmentSizeKB || null,
      AllowedFileTypes: formValues.AllowedFileTypes || null,
      AttachmentOrder: formValues.AttachmentOrder || null,
      AddMoreThanOne: formValues.AddMoreThanOne,
    };

    this.AttachmentsService.getDynamicAttachmentsPageWithSearch(setting, searchData).subscribe({
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
        sortField: this.currentSortField || 'ID',
        sortDirection: this.currentSortDirection
      };
      const formValues = this.DynamicAttachmentForm.value;
      const filterMinusOne = (value: any) => (value === -1 ? null : value);

      const searchData = {
        TitleAr: formValues.TitleAr || null,
        TitleEn: formValues.TitleEn || null,
        Start_CreationDate: formValues.Start_CreationDate || null,
        End_CreationDate: formValues.End_CreationDate || null,
        FKServiceID: filterMinusOne(formValues.FKServiceID),
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

    const formValues = this.DynamicAttachmentForm.value;
    const filterMinusOne = (value: any) => (value === -1 ? null : value);

    const searchData = {
      TitleAr: formValues.TitleAr || null,
      TitleEn: formValues.TitleEn || null,
      Start_CreationDate: formValues.Start_CreationDate || null,
      End_CreationDate: formValues.End_CreationDate || null,
      FKServiceID: filterMinusOne(formValues.FKServiceID),
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
    return item.TitleAr.toLowerCase().includes(term) ||
      item.TitleEn.toLowerCase().includes(term);
  }

  onReset() {
    this.DynamicAttachmentForm.reset({
      TitleAr: '',
      TitleEn: '',
      FKServiceID: -1,
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

  editAttachment(data: any) {
    const attachmentId = typeof data === 'number' ? data : data?.ID;

    this.isEditMode = true;
    this.isLoading = true;
    this.showAddAttachmentModal = true;

    this.AttachmentsService.AttachmentById(attachmentId).subscribe({
      next: (res) => {
        if (res && res.items && res.items.length > 0) {
          const attachmentData = res.items[0];
          this.id = attachmentData.ID;
          this.AddAttachmentForm.patchValue({
            ID: attachmentData.ID,
            FKServiceID: attachmentData.FKServiceID || -1,
            TitleAr: attachmentData.TitleAr || '',
            TitleEn: attachmentData.TitleEn || '',
            DescriptionAr: attachmentData.DescriptionAr || '',
            DescriptionEn: attachmentData.DescriptionEn || '',
            CreationDate: attachmentData.CreationDate ? new Date(attachmentData.CreationDate) : new Date(),
            AIHelpAr: attachmentData.AIHelpAr || '',
            AIHelpEn: attachmentData.AIHelpEn || '',
            FkSectionId: attachmentData.FkSectionId || '-1',
            AttachmentOrder: attachmentData.AttachmentOrder,
            AddMoreThanOne: attachmentData.AddMoreThanOne,
            Active: attachmentData.Active ?? true,
            MaxAttachmentSizeKB: attachmentData.MaxAttachmentSizeKB || null,
            AllowedFileTypes: attachmentData.AllowedFileTypes || this.defaultAllowedFileTypes,
          });
          this.cdr.markForCheck();
        } else {
          Swal.fire({
            icon: 'error',
            title: this.translations?.Error?.label,
            text: this.translations?.TryAgainLater?.label,
            confirmButtonText: this.translations?.confrim?.label,
          });
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

    headerMap['TitleAr'] = this.translations?.TitleAr?.label || (isArabic ? 'اسم المرفق (عربي)' : 'Attachment Title (Ar)');
    headerMap['TitleEn'] = this.translations?.TitleEn?.label || (isArabic ? 'اسم المرفق (إنجليزي)' : 'Attachment Title (En)');
    headerMap['MaxAttachmentSizeKB'] = this.translations?.MaxAttachmentSizeKB?.label || (isArabic ? 'أقصى حجم (كيلوبايت)' : 'Max Size (KB)');
    headerMap['AttachmentOrder'] = this.translations?.AttachmentOrder?.label || (isArabic ? 'الترتيب' : 'Order');
    headerMap['AddMoreThanOne'] = this.translations?.AddMoreThanOne?.label || (isArabic ? 'إضافة أكثر من واحد' : 'Add More Than One');
    headerMap['AllowedFileTypes'] = this.translations?.AllowedFileTypes?.label || (isArabic ? 'أنواع الملفات المسموحة' : 'Allowed File Types');

    // تجهيز البيانات
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
    XLSX.utils.book_append_sheet(wb, ws, isArabic ? 'المرفقات' : 'Attachments');

    // تطبيق RTL على הـ workbook
    if (isArabic) {
      if (!wb.Workbook) wb.Workbook = {};
      if (!wb.Workbook.Views) wb.Workbook.Views = [];
      wb.Workbook.Views[0] = { RTL: true };
    }

    const filename = isArabic ? 'تقرير_المرفقات.xlsx' : 'Attachments_Report.xlsx';
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
        this.editAttachment(id);
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

    this.lastUserId = Math.max(...data.map(item => item.ID || 0), 0);

    return data.map((item, index) => {
      return {
        ...item,
        Serial: pageIndex * pageSize + index + 1,
        ServiceTitle: isArabic ? item.ServiceTitleAr : item.ServiceTitleEn,
        MaxAttachmentSizeKB: item.MaxAttachmentSizeKB
          ? Math.round(item.MaxAttachmentSizeKB / 1024) + ' MB'
          : '',
        CreationDate: formatDateDisplay(item.CreationDate),
        // إضافة Actions array فارغ لعرض زر التعديل الافتراضي
        Actions: []
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
    const formData = this.AddAttachmentForm.value;
    if (this.AddAttachmentForm.invalid) {
      // Object.keys(this.AddAttachmentForm.controls).forEach(key => {
      //   this.AddAttachmentForm.get(key)?.markAsTouched();
      // });

      const firstInvalidControlName = Object.keys(this.AddAttachmentForm.controls)
        .find(key => this.AddAttachmentForm.get(key)?.invalid);

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
        const payload = {
          ID: this.isEditMode ? this.id : this.lastUserId + 1,
          TitleAr: formData.TitleAr || null,
          TitleEn: formData.TitleEn || null,
          DescriptionAr: formData.DescriptionAr || null,
          DescriptionEn: formData.DescriptionEn || null,
          CreationDate: formData.CreationDate ? new Date(formData.CreationDate).toISOString() : new Date().toISOString(),
          AIHelpAr: formData.AIHelpAr || null,
          AIHelpEn: formData.AIHelpEn || null,
          FkSectionId: formData.FkSectionId === '-1' ? null : formData.FkSectionId,
          FKServiceID: serviceID === -1 ? null : serviceID,
          Active: formData.Active ?? true,
          MaxAttachmentSizeKB: formData.MaxAttachmentSizeKB || null,
          AllowedFileTypes: formData.AllowedFileTypes || this.defaultAllowedFileTypes,
          AttachmentOrder: formData.AttachmentOrder || null,
          AddMoreThanOne: formData.AddMoreThanOne,
        };
        return this.isEditMode
          ? this.AttachmentsService.editAttachment(payload)
          : this.AttachmentsService.addAttachment(payload);
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
        this.AddAttachmentForm.reset({
          TitleAr: null,
          TitleEn: null,
          DescriptionAr: '',
          DescriptionEn: '',
          CreationDate: new Date(),
          AIHelpAr: '',
          AIHelpEn: '',
          FkSectionId: '-1',
          FKServiceID: this.Services.length > 0 ? this.Services[0].ServiceID : -1,
          Active: true,
          MaxAttachmentSizeKB: null,
          AllowedFileTypes: this.defaultAllowedFileTypes,
          AddMoreThanOne: false,
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
    this.AddAttachmentForm.reset({
      TitleAr: null,
      TitleEn: null,
      DescriptionAr: '',
      DescriptionEn: '',
      CreationDate: new Date(),
      AIHelpAr: '',
      AIHelpEn: '',
      FkSectionId: '-1',
      FKServiceID: null,
      Active: true,
      MaxAttachmentSizeKB: null,
      AllowedFileTypes: this.defaultAllowedFileTypes,
      AddMoreThanOne: false,
    });
    this.cdr.markForCheck();
  }
  onRowClick(event: any) {
    this.toggleRowExpand(event.row.ID);
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
  toggleRowExpand(ID: any) {
    if (this.expandedRow?.ID === ID) {
      this.expandedRow = null;
      this.expandedRowDetails = [];
    } else {
      this.expandedRow = this.rows.find(row => row.ID === ID);
      this.expandedRowDetails = this.expandedRow ? this.getHiddenColumnsDetails(this.expandedRow) : [];
    }
    this.cdr.markForCheck();
  }

  // Get hidden columns details for expanded row
  getHiddenColumnsDetails(row: any): any[] {
    const details: any[] = [];

    // إضافة الأعمدة المخفية فقط
    this.cols.forEach(col => {
      // تجاهل الأعمدة الثابتة والأعمدة الخاصة
      if (col.fixed || col.field === 'expand' || col.field === 'Serial' || col.field === 'actions') {
        return;
      }

      // إضافة فقط الأعمدة المخفية
      if (col.visible === false) {
        let value = row[col.field];
        let label = col.title;

        // معالجة خاصة لحقل AddMoreThanOne
        if (col.field === 'AddMoreThanOne') {
          value = row.AddMoreThanOne
            ? (this.isArabic ? 'نعم' : 'Yes')
            : (this.isArabic ? 'لا' : 'No');
        }

        // معالجة خاصة لحقل Active
        if (col.field === 'Active') {
          value = row.Active
            ? (this.isArabic ? 'مفعل' : 'Active')
            : (this.isArabic ? 'غير مفعل' : 'Inactive');
        }

        details.push({ label, value: value || '-' });
      }
    });

    return details;
  }

  // Toggle view mode between table and cards
  toggleViewMode(mode: 'table' | 'cards') {
    this.viewMode = mode;
    this.cdr.markForCheck();
  }

  // Handle action click from FeesTableComponent
  handleActionClick(event: any) {
    this.editAttachment(event.row.ID);
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

    this.cols = [...this.cols];

    if (this.expandedRow) {
      this.expandedRowDetails = this.getHiddenColumnsDetails(this.expandedRow);
    }

    this.cdr.markForCheck();
  }

  // إعادة تعيين الترتيب
  resetSort() {
    this.currentSortField = 'ID';
    this.currentSortDirection = 2;
    this.selectedSortColumn = this.sortableColumns.find(
      col => col.field === this.currentSortField
    ) || this.sortableColumns[0];

    this.paginationInfo.CurrentPage = 1;
    this.fetchData();
    this.cdr.markForCheck();
  }

  // دالة تبديل العمود
  toggleColumn(field: string) {
    const colInAll = this.allColumns.find(c => c.field === field);
    const colInCols = this.cols.find(c => c.field === field);

    if (colInAll && colInCols && !colInCols.fixed) {
      const newValue = !colInAll.visible;
      colInAll.visible = newValue;
      colInCols.visible = newValue;

      this.cols = [...this.cols];

      if (this.expandedRow) {
        this.expandedRowDetails = this.getHiddenColumnsDetails(this.expandedRow);
      }
    }
    this.cdr.markForCheck();
  }

  // دالة تحديد كل الأعمدة
  selectAllColumns() {
    this.allColumns.forEach(col => {
      const colInCols = this.cols.find(c => c.field === col.field);
      if (colInCols && !colInCols.fixed) {
        col.visible = true;
        colInCols.visible = true;
      }
    });

    this.cols = [...this.cols];

    if (this.expandedRow) {
      this.expandedRowDetails = this.getHiddenColumnsDetails(this.expandedRow);
    }

    this.cdr.markForCheck();
  }

  // دالة إخفاء كل الأعمدة
  hideAllColumns() {
    this.allColumns.forEach(col => {
      const colInCols = this.cols.find(c => c.field === col.field);
      if (colInCols && !colInCols.fixed) {
        col.visible = false;
        colInCols.visible = false;
      }
    });

    this.cols = [...this.cols];

    if (this.expandedRow) {
      this.expandedRowDetails = this.getHiddenColumnsDetails(this.expandedRow);
    }

    this.cdr.markForCheck();
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

  // تغيير اتجاه الترتيب
  setSortDirection(direction: number) {
    if (this.currentSortDirection === direction) return;

    this.currentSortDirection = direction;
    this.paginationInfo.CurrentPage = 1;
    this.fetchData();
    this.cdr.markForCheck();
  }

  // تغيير عمود الترتيب
  onSortColumnChange(column: any) {
    if (!column) return;

    this.selectedSortColumn = column;
    this.currentSortField = column.field;
    this.paginationInfo.CurrentPage = 1;
    this.fetchData();
    this.toggleSortDropdown = false;
    this.cdr.markForCheck();
  }
}