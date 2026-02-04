
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
  selector: 'app-service-roles',
  standalone: true,
  imports: [ComponentsModule, FormsModule, TranslateModule, FlatpickrModule, NgSelectModule, CommonModule, ReactiveFormsModule, DataTableModule, IconModule, FeesTableComponent],
  templateUrl: './service-roles.component.html',
  styleUrl: './service-roles.component.css'
})
export class ServiceRolesComponent implements OnInit, AfterViewInit {
  basic = basic;
  hide = true;
  showAddAttachmentModal = false;
  isEditMode = false;
  serachForm!: FormGroup;
  AddserviceproceduresForm!: FormGroup;
  translations: any = {};
  isArabic = this.translate.currentLang === 'ae';
  AllAttachments: any[] = [];
  showSections: boolean = false;
  ServiceName = '';
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
  Service: any = [];
  Roles: any = [];
  Sections: any = [];
  expandedRow: any = null;
  expandedRowDetails: any[] = [];
  isLoading: boolean = false;
  currentSortField: string = 'RowId';
  currentSortDirection: number = 2;
  private lastFetchParams: string | null = null;
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
  get FkRoleID(): any {
    return this.AddserviceproceduresForm.get('FkRoleID');
  }
  get SectionID(): any {
    return this.AddserviceproceduresForm.get('SectionID');
  }

  ngOnInit(): void {
    this.translations = this.loadEServicesTranslationsFromLocalStorage();
    console.log(this.translations?.SectionID?.validation);
    console.log(this.translations?.FkRoleID?.validation);
    const self = this;
    (window as any).editUserFromOutside = (RowId: any) => {
      this.edit(RowId);
    };
    (window as any).deleteFromOutside = (RowId: any) => {
      this.delete(RowId);
    };
    (window as any).toggleRowExpand = (RowId: any) => {
      this.toggleRowExpand(RowId);
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
        field: 'RoleTitleAr',
        title: this.translations?.RoleTitleAr?.label,
        sort: true,
        visible: true
      },
      {
        field: 'RoleTitleEn',
        title: this.translations?.RoleTitleEn?.label,
        sort: true,
        visible: true
      },
      {
        field: 'SectionTitleAr',
        title: this.translations?.SectionTitleAr?.label,
        sort: true,
        visible: true
      },
      {
        field: 'SectionTitleEn',
        title: this.translations?.SectionTitleEn?.label,
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
        this.Roles = (res.Lookup?.Role || []).filter((role: any) => role.LookupID !== 666666);

        this.Sections = res.Lookup.Section;
        this.serachForm.controls['FkRoleID'].setValue(this.Roles[0].LookupID);

        if (this.isEditMode) {
          this.AddserviceproceduresForm.controls['FkRoleID'].setValue(this.Roles[0].LookupID);
          this.AddserviceproceduresForm.controls['SectionID'].setValue(this.Sections[0].LookupID);
        }

      }
    });
    const id = Number(this.route.snapshot.paramMap.get('id'));

    function nonEmptyArrayValidator(control: any) {
      return Array.isArray(control.value) && control.value.length === 0
        ? { required: true }
        : null;
    }

    // Update form initialization
    this.AddserviceproceduresForm = this.fb.group({
      FkRoleID: [[], [Validators.required, nonEmptyArrayValidator]],
      ServiceID: [id],
      ServiceName: [null],
      CreationDate: [new Date()],
    });
    this.serachForm = this.fb.group({
      FkRoleID: [null],
    });
    this.ServiceService.getByServiceID(id).subscribe({
      next: (Service: any) => {
        this.ServiceName = this.translate.currentLang == 'en' ? Service.items[0].ServiceTitleEn : Service.items[0].ServiceTitleAr,
          this.AddserviceproceduresForm.patchValue({
            ServiceName: this.translate.currentLang == 'en' ? Service.items[0].ServiceTitleEn : Service.items[0].ServiceTitleAr,
          })
      }
    });




    this.fetchData();
  }

  fetchData(setting?: any, searchData?: any) {
    const ServiceID = this.route.snapshot.paramMap.get('id')
    searchData = {
      ServiceID: ServiceID,
      FkRoleID: this.serachForm.controls['FkRoleID'].value
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

    this.ServiceService.getPageWithSearchRoles(setting, searchData).subscribe({
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

        // Debug log to check cols and rows
        console.log('Cols array:', this.cols);
        console.log('Rows array:', this.rows);
        if (this.rows.length > 0) {
          console.log('First row Actions:', this.rows[0].Actions);
        }
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
    this.ServiceService.getPageWithSearchRoles(setting, searchData).subscribe({
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
    this.ServiceService.getPageWithSearchRoles(setting, searchData).subscribe({
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
      sortField: 'RowId',
      sortDirection: 1
    };

    const ServiceID = this.route.snapshot.paramMap.get('id')

    const searchData = {

      ServiceID: ServiceID,
    };
    this.ServiceService.getPageWithSearchRoles(setting, searchData).subscribe({
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

        ServiceID: ServiceID,
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

      ServiceID: ServiceID,
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
      FkRoleID: null,
    });
    this.paginationInfo.CurrentPage = 1;
    this.fetchData();
    this.serachForm.reset({
      FkRoleID: -1,
    });
  }

  edit(data: any) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const Id = data;
    this.isEditMode = true;
    this.isLoading = true;
    this.showAddAttachmentModal = true;
    this.ServiceService.getByRolesRowId(Id).subscribe({
      next: (res) => {
        console.log(res)
        if (res && res.items && res.items.length > 0) {
          const serviceproceduresData = res.items[0];
          this.id = serviceproceduresData.RowId;
          this.AddserviceproceduresForm.patchValue({
            ID: serviceproceduresData.RowId,
            ServiceID: serviceproceduresData.ServiceID,
            FkRoleID: serviceproceduresData.UserRoleID,
            SectionID: serviceproceduresData.SectionID
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
          await lastValueFrom(this.ServiceService.deleteEServicesServiceRoles(id));

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

    this.cols.forEach(col => {
      if (col.field && col.title && !excludedFields.includes(col.field)) {
        headerMap[col.field] = col.title;
      }
    });

    headerMap['ServiceTitleAr'] = this.translations?.ServiceTitleAr?.label || (isArabic ? 'اسم الخدمة (عربي)' : 'Service Title (Ar)');
    headerMap['ServiceTitleEn'] = this.translations?.ServiceTitleEn?.label || (isArabic ? 'اسم الخدمة (إنجليزي)' : 'Service Title (En)');
    headerMap['RoleTitleAr'] = this.translations?.RoleTitleAr?.label || (isArabic ? 'الدور (عربي)' : 'Role (Ar)');
    headerMap['RoleTitleEn'] = this.translations?.RoleTitleEn?.label || (isArabic ? 'الدور (إنجليزي)' : 'Role (En)');
    headerMap['SectionTitleAr'] = this.translations?.SectionTitleAr?.label || (isArabic ? 'القسم (عربي)' : 'Section (Ar)');
    headerMap['SectionTitleEn'] = this.translations?.SectionTitleEn?.label || (isArabic ? 'القسم (إنجليزي)' : 'Section (En)');

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
    XLSX.utils.book_append_sheet(wb, ws, isArabic ? 'أدوار الخدمة' : 'Service Roles');

    // تطبيق RTL على הـ workbook
    if (isArabic) {
      if (!wb.Workbook) wb.Workbook = {};
      if (!wb.Workbook.Views) wb.Workbook.Views = [];
      wb.Workbook.Views[0] = { RTL: true };
    }

    const filename = isArabic ? 'تقرير_أدوار_الخدمة.xlsx' : 'Service_Roles_Report.xlsx';
    XLSX.writeFile(wb, filename);
  }



  ngAfterViewInit(): void {

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

    this.lastUserId = Math.max(...data.map(item => item.RowId || 0), 0);

    return data.map((item, index) => {
      const mappedItem = {
        ...item,
        Serial: pageIndex * pageSize + index + 1,
        Actions: [
          {
            ActionID: 861,
            TitleAR: 'تعديل',
            TitleEN: 'Edit',
            ActionNameAr: 'تعديل',
            ActionNameEn: 'Edit'
          },
          {
            ActionID: 865,
            TitleAR: 'حذف',
            TitleEN: 'Delete',
            ActionNameAr: 'حذف',
            ActionNameEn: 'Delete'
          }
        ]
      };

      // Debug log to check if Actions are being added
      console.log('Mapped item with Actions:', mappedItem.Actions);

      return mappedItem;
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





  async onAddAttachmentSubmit() {
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
        const fieldMessage = translationEntry?.validation;

        await Swal.fire({
          icon: 'warning',
          title: fieldMessage,
          confirmButtonText: this.translations?.confrim?.label,
        });
        return;
      }
    }

    const FkRoleIds = Array.isArray(formData.FkRoleID)
      ? formData.FkRoleID.filter((id: any) => id !== null && id !== undefined)
      : formData.FkRoleID ? [formData.FkRoleID] : [];
    const SectionIds = Array.isArray(formData.SectionID)
      ? formData.SectionID.filter((id: any) => id !== null && id !== undefined)
      : formData.SectionID ? [formData.SectionID] : [];
    const serviceID = Number(this.route.snapshot.paramMap.get('id'));

    if (FkRoleIds.length === 0) {
      await Swal.fire({
        icon: 'warning',
        title: this.translations?.FkRoleID?.validation,
        confirmButtonText: this.translations?.confrim?.label,
      });
      return;
    }

    const sectionsToUse = SectionIds.length > 0 ? SectionIds : [null];


    const result = await Swal.fire({
      title: this.translations?.AreYouSure?.label,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.translations?.Yes?.label,
      cancelButtonText: this.translations?.No?.label,
    });

    if (!result.isConfirmed) return;

    this.isLoading = true;

    const requests: any[] = [];

    FkRoleIds.forEach((roleId: any) => {
      sectionsToUse.forEach((sectionId: any) => {
        const payload: any = {
          ServiceID: serviceID,
          UserRoleID: roleId,
          CreationDate: formData.CreationDate
            ? new Date(formData.CreationDate).toISOString()
            : new Date().toISOString(),
        };

        if (sectionId !== null) {
          payload.SectionID = sectionId;
        }

        if (this.isEditMode) {
          payload.RowId = this.id;
        }

        requests.push(
          this.isEditMode
            ? this.ServiceService.updateEServicesServiceRoles(payload)
            : this.ServiceService.addEServicesServiceRoles(payload)
        );
      });
    });




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
      this.lastFetchParams = null;
      this.fetchData();
    } catch (err) {
      console.error('خطأ في onAddAttachmentSubmit:', err);
      await Swal.fire({
        icon: 'error',
        confirmButtonText: this.translations?.confrim?.label,
        title: this.translations?.TryAgainLater?.label,
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
      FkRoleID: [],
      SectionID: [],
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

  onRoleChange(e: any) {
    const allowedRoles = [840, 842, 843, 844, 1989, 1990, 1991, 1992];
    let requiresSection = false;

    if (Array.isArray(e)) {
      requiresSection = e.some((role: any) => allowedRoles.includes(role.LookupID));
    } else if (e && e.LookupID) {
      requiresSection = allowedRoles.includes(e.LookupID);
    }

    this.showSections = requiresSection;

    const sectionCtrl = this.AddserviceproceduresForm.get('SectionID');

    if (requiresSection) {
      sectionCtrl?.setValidators([Validators.required, this.nonEmptyArrayValidator]);
    } else {
      sectionCtrl?.clearValidators();
      sectionCtrl?.setValue([]);
    }

    sectionCtrl?.updateValueAndValidity();
    this.cdr.markForCheck();
  }

  private nonEmptyArrayValidator(control: any) {
    return Array.isArray(control.value) && control.value.length === 0
      ? { required: true }
      : null;
  }

  onRowClick(event: any) {
    this.toggleRowExpand(event.row.RowId);
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
    this.currentSortField = 'RowId';
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
    if (event && event.action && event.row) {
      const actionId = event.action.ActionID;
      const rowId = event.row.RowId;

      console.log('Action ID:', actionId, 'Row ID:', rowId);

      // تحديد نوع الإجراء بناءً على ActionID
      if (actionId === 861) { // Edit action
        this.edit(rowId);
      } else if (actionId === 865) { // Delete action
        this.delete(rowId);
      }
    } else if (event && event.row && event.row.RowId) {
      // Fallback for default edit action
      console.log('Opening edit for RowId:', event.row.RowId);
      this.edit(event.row.RowId);
    } else {
      console.error('Invalid event structure:', event);
    }
  }

  toggleRowExpand(serviceId: any) {
    console.log('Toggling row with RowId:', serviceId);
    if (this.expandedRow?.RowId === serviceId) {
      this.expandedRow = null;
      this.expandedRowDetails = [];
    } else {
      this.expandedRow = this.rows.find(row => row.RowId === serviceId);
      console.log('Expanded row:', this.expandedRow);

      // تحديد التفاصيل التي ستظهر في الصف الموسع
      if (this.expandedRow) {
        this.expandedRowDetails = [
          {
            label: this.translations?.RoleTitleAr?.label,
            value: this.expandedRow.RoleTitleAr,
            fullWidth: false
          },
          {
            label: this.translations?.RoleTitleEn?.label,
            value: this.expandedRow.RoleTitleEn,
            fullWidth: false
          },
          {
            label: this.translations?.SectionTitleAr?.label,
            value: this.expandedRow.SectionTitleAr,
            fullWidth: false
          },
          {
            label: this.translations?.SectionTitleEn?.label,
            value: this.expandedRow.SectionTitleEn,
            fullWidth: false
          }
        ];
      }
    }
    this.cdr.markForCheck();
  }

}
