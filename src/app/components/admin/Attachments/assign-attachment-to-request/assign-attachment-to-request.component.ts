import { Component, OnInit, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ComponentsModule } from 'src/app/components/components.module';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { DataTableModule } from '@bhplugin/ng-datatable';
import { NgSelectModule } from '@ng-select/ng-select';
import { AttachmentsService } from 'src/app/service/Attachments/attachments.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { IconModule } from 'src/app/shared/icon/icon.module';

@Component({
  selector: 'app-assign-attachment-to-request',
  standalone: true,
  imports: [ComponentsModule, TranslateModule, NgSelectModule, CommonModule, ReactiveFormsModule, DataTableModule, IconModule],
  templateUrl: './assign-attachment-to-request.component.html',
  styleUrls: ['./assign-attachment-to-request.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignAttachmentToRequestComponent implements OnInit, AfterViewInit {
  AssignAttachmentToRequestForm!: FormGroup;
  showAddUserModal = false;
  isEditMode = false;
  AddAttachmentForm!: FormGroup;
  showTimeFields = false;
  translations: any = {};
  itemURL: any = null;
  isArabic = this.translate.currentLang === 'ae';
  Sections: any[] = [];
  AllAttachments: any[] = [];
  showSections = false;
  Roles: any[] = [];
  ServiceList: any[] = [];
  RequestList: any[] = [];
  ProcessList: any[] = [];
  Title: any[] = [];
  Clubses: any[] = [];
  showClubs = false;
  Notifications: any[] = [];
  showNotifications = false;
  search = '';
  cols: any[] = [];
  id: any = null;
  rowsCount: any = null;
  lastUserId = 0;
  Processes: any[] = [];
  rows: any[] = [];
  allRows: any[] = [];
  paginationInfo = {
    TotalPages: 1,
    CurrentPage: 1,
    PageSize: 20,
    TotalRows: 0
  };
  showProcessType = false;
  showData = false;
  isLoading = false;
  currentSortField = 'ID';
  currentSortDirection = 1;
  filteredRows: any[] = [];
  searchTerm = '';

  constructor(
    private router: Router,
    private fb: FormBuilder,
    public translate: TranslateService,
    private AttachmentsService: AttachmentsService,
    private cdr: ChangeDetectorRef
  ) { }

  get paginationInfoText(): string {
    const currentPage = this.paginationInfo.CurrentPage || 1;
    const pageSize = this.paginationInfo.PageSize || 20;
    const totalRows = this.paginationInfo.TotalRows || 0;
    const start = totalRows > 0 ? (currentPage - 1) * pageSize + 1 : 0;
    const end = Math.min(currentPage * pageSize, totalRows);
    return totalRows > 0
      ? `${this.translations?.showing?.label} ${start} ${this.translations?.to?.label} ${end} ${this.translations?.of?.label} ${totalRows}`
      : '';
  }

  ngOnInit(): void {

    this.translations = this.loadEServicesTranslationsFromLocalStorage();
    (window as any).angularComponentRef = {
      onCheckboxClick: (id: number, checked: boolean, field: string) => {
        this.onCheckboxChange(id, checked, field);
      }
    };

    this.cols = [
      { field: 'Serial', title: this.translations?.Serial?.label, sort: false },
      { field: 'AttachmentTitle', title: this.translations?.AttachmentName?.label, sort: true },

      {
        field: 'AttachVisiable',
        title: `${this.translations?.ShowAttachment?.label}`,
        sort: false,
        html: true,
        cellRenderer: (row: any) => {
          const checked = row.AttachVisiable ? 'checked' : '';
          return `<input type="checkbox" class="show-attachment" data-id="${row.ID}" ${checked} onclick="window.angularComponentRef.onCheckboxClick(${row.ID}, this.checked, 'AttachVisiable')">`;
        }
      },
      {
        field: 'Required',
        title: this.translations?.Required?.label,
        sort: false,
        html: true,
        cellRenderer: (row: any) => {
          const checked = row.IsRequired ? 'checked' : '';
          const disabled = !row.AttachVisiable ? 'disabled' : '';
          return `<input type="checkbox" class="required-checkbox" data-id="${row.ID}" ${checked} ${disabled} onclick="window.angularComponentRef.onCheckboxClick(${row.ID}, this.checked, 'Required')">`;
        }
      }
    ];

    // Initialize form
    this.AssignAttachmentToRequestForm = this.fb.group({
      FKServiceID: [null],
      ProcessID: [null]
    });

    // Subscribe to FKServiceID changes
    this.AssignAttachmentToRequestForm.get('FKServiceID')?.valueChanges.subscribe((serviceId) => {
      this.showProcessType = !!serviceId && serviceId !== '-1';
      this.filterProcesses(serviceId);
      this.AssignAttachmentToRequestForm.controls['ProcessID'].setValue(null);
      this.rows = [];
      this.showData = false;
      this.cdr.markForCheck();
    });

    // Subscribe to ProcessID changes
    this.AssignAttachmentToRequestForm.get('ProcessID')?.valueChanges.subscribe((processId) => {
      const serviceId = this.AssignAttachmentToRequestForm.get('FKServiceID')?.value;
      if (processId && processId !== '-1' && serviceId && serviceId !== '-1') {
        this.onProcessSelected(serviceId, processId);
      } else {
        this.rows = [];
        this.showData = false;
        this.cdr.markForCheck();
      }
    });

    // Fetch initial data
    this.AttachmentsService.getAttachmentById(null).subscribe({
      next: (res) => {
        this.ServiceList = res?.Lookup?.Services || [];
        this.ProcessList = this.ServiceList
          .map(s => s.Processes)
          .flat()
          .filter(Boolean);
        this.cdr.markForCheck();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          confirmButtonText: this.translations?.confrim?.label,
          title: this.translations?.TryAgainLater?.label
        });
      }
    });
  }

  onServiceSelected(serviceId: any) {
    this.showProcessType = !!serviceId && serviceId !== '-1';
    this.Processes = serviceId.Processes
    this.showData = false;
    this.cdr.markForCheck();
  }
  private filterProcesses(serviceId: any) {
    if (serviceId && serviceId !== '-1') {
      const selectedService = this.ServiceList.find(service => service.ServiceID === serviceId);
      this.ProcessList = selectedService?.Processes || [];
    } else {
      this.ProcessList = [];
    }
    this.cdr.markForCheck();
  }



  fetchData(setting?: any, searchData?: any) {
    if (!setting) {
      setting = {
        pageNo: this.paginationInfo.CurrentPage,
        pageSize: this.paginationInfo.PageSize,
        sortField: this.currentSortField,
        sortDirection: this.currentSortDirection
      };
    }
    if (!searchData) {
      const formValues = this.AssignAttachmentToRequestForm.value;
      const filterMinusOne = (value: any) => (value === -1 ? null : value);
      searchData = {
        FKServiceID: filterMinusOne(formValues.FKServiceID),
        FKProcessID: filterMinusOne(formValues.ProcessID)
      };
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    this.AttachmentsService.getAssignAttachmentsPageWithSearch(setting, searchData).subscribe({
      next: (res) => {
        const items = res?.result?.items || [];
        this.rows = this.mapRowsWithSerial(items);
        const pagingInfo = res?.result?.PagingInfo?.[0] || {};
        const totalRows = pagingInfo.TotalRows || items.length || 0;
        const pageSize = pagingInfo.PageSize || setting.pageSize || 20;
        const totalPages = Math.max(Math.ceil(totalRows / pageSize), 1);
        let currentPage = setting.pageNo || 1;
        if (currentPage > totalPages || currentPage < 1) {
          currentPage = 1;
          setting.pageNo = 1;
          this.fetchData(setting, searchData);
          return;
        }
        this.paginationInfo = {
          TotalRows: totalRows,
          PageSize: pageSize,
          CurrentPage: currentPage,
          TotalPages: totalPages
        };

        this.isLoading = false;
        this.showData = true;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.rows = [];
        this.paginationInfo = {
          TotalRows: 0,
          PageSize: this.paginationInfo.PageSize || 20,
          CurrentPage: 1,
          TotalPages: 1
        };
        Swal.fire({
          icon: 'error',
          confirmButtonText: this.translations?.confrim?.label,
          title: this.translations?.TryAgainLater?.label
        });
        this.isLoading = false;
        this.showData = false;
        this.cdr.markForCheck();
      }
    });
  }

  onServiceCleared() {
    this.AssignAttachmentToRequestForm.reset({
      FKServiceID: null,
      ProcessID: null
    });
    this.Processes = [];
    this.rows = [];
    this.showProcessType = false;
    this.showData = false;
    this.cdr.markForCheck();
  }


  onAssignAttachments() {
    const body = {
      FKServiceID: Number(this.AssignAttachmentToRequestForm.get('FKServiceID')?.value),
      FKProcessID: Number(this.AssignAttachmentToRequestForm.get('ProcessID')?.value),
      Common_AssignAttachment_To_RequestList: this.allRows
        .filter(row => row.AttachVisiable === true)
        .map(row => ({
          FkAttachmetID: row.FkAttachmetID,
          IsRequired: row.IsRequired ? 1 : 0,
        }))
    };

    Swal.fire({
      title: this.translations?.AreYouSure?.label,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.translations?.Yes?.label,
      cancelButtonText: this.translations?.No?.label,
    }).then((result) => {
      if (result.isConfirmed) {
        this.AttachmentsService.assignAttachmentsToRequest(body).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              confirmButtonText: this.translations?.confrim?.label,
              title: this.translations?.ModifiedSuccessfully?.label
            });
          },
          error: () => {
            Swal.fire({
              icon: 'error',
              confirmButtonText: this.translations?.confrim?.label,
              title: this.translations?.TryAgainLater?.label
            });
          }
        });
      }
    });
  }


  customSearchFn(term: string, item: any) {
    term = term.toLowerCase();
    return item.TitleAr?.toLowerCase().includes(term) || item.TitleEn?.toLowerCase().includes(term);
  }
  updatePageRows() {
    const startIndex = (this.paginationInfo.CurrentPage - 1) * this.paginationInfo.PageSize;
    const endIndex = startIndex + this.paginationInfo.PageSize;

    this.rows = this.allRows.slice(startIndex, endIndex);
    this.paginationInfo.TotalRows = this.allRows.length;
    this.paginationInfo.TotalPages = Math.max(Math.ceil(this.allRows.length / this.paginationInfo.PageSize), 1);
  }



  ngAfterViewInit(): void {
    setTimeout(() => this.fixAccessibility(), 1000);
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

    return data.map((item, index) => ({
      ...item,
      Serial: pageIndex * pageSize + index + 1,
      AttachmentTitle: isArabic ? item.AttachmentTitleAr : item.AttachmentTitleEn,
      AttachVisiable: item.AttachVisiable ? true : false,
      IsRequired: item.IsRequired ?? false,
      FkAttachmetID: item.FkAttachmetID
    }));
  }

  private loadEServicesTranslationsFromLocalStorage(): any {
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



  private fetchDataForSelection(serID: number, proID: number) {
    this.isLoading = true;
    this.cdr.markForCheck();

    const setting = {
      pageNo: 1,
      pageSize: 2000,        // ثابت حسب طلبك
      sortField: 'ID',       // الفرز الحقيقي هيكون Client-Side، بس بنبعتها عادي
      sortDirection: 2
    };

    const searchData = {
      FKServiceID: serID,
      FKProcessID: proID
    };

    this.AttachmentsService.getAssignAttachmentsPageWithSearch(setting, searchData).subscribe({
      next: (res) => {
        const items = res?.result?.items || [];
        // خزّن كل الداتا مرة واحدة
        this.allRows = items.map((item: any) => ({
          ...item,
          AttachmentTitle: this.translate.currentLang === 'ae' ? item.AttachmentTitleAr : item.AttachmentTitleEn,
          AttachVisiable: !!item.AttachVisiable,
          IsRequired: item.IsRequired ?? false
        }));

        // صفّر البحث والصفحة، وطبّق الريندر المحلي
        this.searchTerm = '';
        this.paginationInfo.CurrentPage = 1;
        this.applyClientSideView();

        this.isLoading = false;
        this.showData = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.allRows = [];
        this.filteredRows = [];
        this.rows = [];
        this.paginationInfo = {
          TotalRows: 0,
          PageSize: this.paginationInfo.PageSize || 20,
          CurrentPage: 1,
          TotalPages: 1
        };
        this.isLoading = false;
        this.showData = false;
        Swal.fire({
          icon: 'error', title: this.translations?.TryAgainLater?.label,
          confirmButtonText: this.translations?.confrim?.label,
        });
        this.cdr.markForCheck();
      }
    });
  }
  private applyClientSideView() {
    const term = (this.searchTerm || '').toLowerCase().trim();
    this.filteredRows = term
      ? this.allRows.filter(r => (r.AttachmentTitle || '').toLowerCase().includes(term))
      : [...this.allRows];

    if (this.currentSortField) {
      const dir = this.currentSortDirection === 1 ? 1 : -1;
      const field = this.currentSortField;

      this.filteredRows.sort((a: any, b: any) => {
        const av = a?.[field];
        const bv = b?.[field];
        if (av == null && bv == null) return 0;
        if (av == null) return -1 * dir;
        if (bv == null) return 1 * dir;

        if (typeof av === 'number' && typeof bv === 'number') {
          return (av - bv) * dir;
        }
        return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
      });
    }

    // 3) Pagination
    const pageSize = this.paginationInfo.PageSize || 20;
    const totalRows = this.filteredRows.length;
    const totalPages = Math.max(Math.ceil(totalRows / pageSize), 1);

    // تأكد إن الصفحة داخل المدى
    if (this.paginationInfo.CurrentPage < 1) this.paginationInfo.CurrentPage = 1;
    if (this.paginationInfo.CurrentPage > totalPages) this.paginationInfo.CurrentPage = totalPages;

    const start = (this.paginationInfo.CurrentPage - 1) * pageSize;
    const end = start + pageSize;

    // 4) قصّ الصفحة الحالية + حسبة Serial
    this.rows = this.filteredRows.slice(start, end).map((item, idx) => ({
      ...item,
      Serial: start + idx + 1
    }));

    // 5) تحديث أرقام الـ Pagination
    this.paginationInfo.TotalRows = totalRows;
    this.paginationInfo.TotalPages = totalPages;

    this.cdr.markForCheck();
  }
  onProcessSelected(serID: any, proID: any) {
    if (proID && proID !== '-1' && serID && serID !== '-1') {
      this.fetchDataForSelection(Number(serID), Number(proID));
    } else {
      this.allRows = [];
      this.filteredRows = [];
      this.rows = [];
      this.showData = false;
      this.cdr.markForCheck();
    }
  }
  onSortChange(event: any) {
    const newSortField = event?.field || this.currentSortField;

    if (this.currentSortField === newSortField) {
      // 1: asc, 2: desc
      this.currentSortDirection = this.currentSortDirection === 1 ? 2 : 1;
    } else {
      this.currentSortField = newSortField;
      this.currentSortDirection = 1; // ابدأ بـ asc
    }

    this.paginationInfo.CurrentPage = 1;
    this.applyClientSideView(); // بدون أي Calls للسيرفر
  }
  filterRows(searchTerm: string) {
    this.searchTerm = searchTerm || '';
    this.paginationInfo.CurrentPage = 1;
    this.applyClientSideView();
  }
  onPageChange(page: number) {
    this.paginationInfo.CurrentPage = page;
    this.applyClientSideView();
  }

  onPageSizeChange(newPageSize: number) {
    this.paginationInfo.PageSize = Number(newPageSize) || 20;
    this.paginationInfo.CurrentPage = 1;
    this.applyClientSideView();
  }
  onCheckboxChange(id: number, checked: boolean, field: string) {
    const updateRow = (row: any) => {
      if (!row) return;
      if (field === 'AttachVisiable') {
        row.AttachVisiable = checked;
        row.FkAttachmetID = checked ? row.FkAttachmetID : null;
        if (!checked) {
          row.IsRequired = false;
        }
      } else if (field === 'Required') {
        row.IsRequired = row.AttachVisiable ? checked : false;
      }
    };

    // حدّث السطر في rows
    updateRow(this.rows.find(r => r.ID === id));
    // وحدّث النسخة الأصلية برضه
    updateRow(this.allRows.find(r => r.ID === id));

    this.cdr.markForCheck();
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

}