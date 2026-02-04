import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { FlatpickrModule } from 'angularx-flatpickr';
import { ServiceFeesService } from '../../service/service-fees.service';
import { LocalizationService } from 'src/app/service/localization.service';
import { TranslateService } from '@ngx-translate/core';
import { ComponentsModule } from "../components.module";
import { MenuLinksService } from 'src/app/service/menu-links.service';
import * as XLSX from 'xlsx';
import { NewApplicationService } from 'src/app/service/new-application.service';
import { ServiceApiPayload } from 'src/types/newApplication.types';
import { Router, ActivatedRoute } from '@angular/router';
import { AppState } from 'src/types/auth.types';
import { basic } from 'src/app/helpers/date-helper';
import { Store } from '@ngrx/store';
import { FeesTableComponent } from '../fees-table/fees-table.component';

@Component({
  selector: 'app-service-fees',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgSelectModule,
    FlatpickrModule,
    ComponentsModule,
    FormsModule,
    FeesTableComponent
  ],
  templateUrl: './service-fees.component.html',
  styleUrls: ['./service-fees.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ServiceFeesComponent implements OnInit {
  @ViewChild('feesTable') feesTable!: FeesTableComponent;

  pageName!: string;
  breadCrumb: any;
  itemURL: any;
  translations = signal<any>({});
  store!: AppState;

  basic: any = basic


  searchForm!: FormGroup;

  paymentMethods: any[] = [];
  services: any[] = [];
  departments: any[] = [];
  administrations: any[] = [];
  clubNames: any[] = [];
  requestStatuses: any[] = [];
  procedures: any[] = [];
  Requests: any[] = [];

  allAdministrations: any[] = [];
  allServices: any[] = [];
  allRequests: any[] = [];
  allProcedures: any[] = [];
  allStatuses: any[] = [];

  isArabic: boolean = false;
  toggleColumnsDropdown = false;
  toggleSortDropdown = false;
  isAdvancedSearch = false;
  isSearchCollapsed = false;
  globalSearchTerm = '';
  searchCriteria: any[] = [];
  allColumns: any[] = [];
  defaultColumnsState: any[] = []; // حفظ الحالة الافتراضية للأعمدة
  sortableColumns: any[] = [];
  selectedSortColumn: any = null;
  viewMode: 'table' | 'cards' = 'table'; // table or cards
  originalRows: any[] = []; // للاحتفاظ بالنتائج الأصلية
  paginationInfo = {
    TotalPages: 1,
    CurrentPage: 1,
    PageSize: 10,
    TotalRows: 0
  };
  cols: any[] = [];
  currentSortField: string = '';
  currentSortDirection: number = 2;
  isLoading: boolean = false;
  rows: any[] = [];
  expandedRow: any = null;
  expandedRowDetails: any[] = [];





  get paginationInfoText(): string {
    const currentPage = this.paginationInfo.CurrentPage || 1;
    const pageSize = this.paginationInfo.PageSize || 10;
    const totalRows = this.paginationInfo.TotalRows || 0;
    const start = totalRows > 0 ? (currentPage - 1) * pageSize + 1 : 0;
    const end = Math.min(currentPage * pageSize, totalRows);
    return totalRows > 0
      ? `${this.translations()?.showing?.label} ${start} ${this.translations()?.to?.label} ${end} ${this.translations()?.of?.label} ${totalRows}`
      : '';
  }
  ngAfterViewInit(): void {
    setTimeout(() => this.fixAccessibility(), 1000);
  }
  constructor(
    private fb: FormBuilder,
    private serviceFeesService: ServiceFeesService,
    private localizationService: LocalizationService,
    private translate: TranslateService,
    public menuLinksService: MenuLinksService,
    private cdr: ChangeDetectorRef,
    private newApplicationService: NewApplicationService,
    private router: Router,
    public storeData: Store<AppState>,
    private route: ActivatedRoute

  ) {
    this.initStore();

  }

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
  ngOnInit(): void {
    this.isArabic = this.translate.currentLang === 'ae';
    this.translations.set(this.localizationService.getTranslations());

    // Initialize store from sessionStorage
    const userData = sessionStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      this.store = {
        index: {
          locale: this.translate.currentLang
        }
      } as AppState;
    }

    this.initializeForm();

    // Check for query params from dashboard first
    this.route.queryParams.subscribe(params => {
      console.log('Received URL params:', params);

      // Check if we have any filter parameters
      const filterParams = [
        'FeesPaymentDateFrom', 'FeesPaymentDateTo', 'ServiceID', 'PaymentWay', 'FkClubID',
        'DepartmentID', 'SectionID', 'RequestTypeID', 'FkStatusID', 'FkProcessID',
        'ApplicationNumber', 'ApprovedLicense', 'ReceiptNumber', 'TransactionID', 'FeesValue',
        'LicenseCreationDateFrom', 'LicenseCreationDateTo', 'LicenseExpirationDateFrom', 'LicenseExpirationDateTo',
        'CreationDateFrom', 'CreationDateTo'
      ];

      const hasFilters = filterParams.some(param => params[param]);

      // Load lookups first, then apply filters
      this.serviceFeesService.getById(null).subscribe(data => {
        this.paymentMethods = data.Lookup?.PaymentWay || [];
        this.departments = data.Lookup?.Departments || [];
        this.clubNames = data.Lookup?.Clubs || [];

        this.allAdministrations = data.Lookup?.Section || [];
        this.allServices = data.Lookup?.Services || [];
        this.allRequests = data.Lookup?.Request || [];
        this.allProcedures = data.Lookup?.Process || [];
        this.allStatuses = data.Lookup?.StatusesFees || [];

        this.administrations = [...this.allAdministrations];
        this.services = [...this.allServices];
        this.Requests = [...this.allRequests];
        this.procedures = [...this.allProcedures];
        this.requestStatuses = [...this.allStatuses];

        // Now apply filters after lookups are loaded
        if (hasFilters) {
          const patchData: any = {};

          // Handle all possible parameters
          filterParams.forEach(param => {
            if (params[param]) {
              let value = params[param];

              // Handle multi-select fields (convert single values to arrays)
              if (['DepartmentID', 'SectionID', 'ServiceID', 'RequestTypeID', 'PaymentWay', 'FkClubID', 'FkStatusID', 'FkProcessID'].includes(param)) {
                if (Array.isArray(value)) {
                  patchData[param] = value.map((v: string) => parseInt(v)).filter((v: number) => !isNaN(v));
                } else {
                  const numValue = parseInt(value);
                  if (!isNaN(numValue)) {
                    patchData[param] = [numValue];
                  }
                }
              }
              // Handle number fields
              else if (['ApplicationNumber', 'ApprovedLicense', 'ReceiptNumber', 'TransactionID', 'FeesValue'].includes(param)) {
                const numValue = parseInt(value);
                if (!isNaN(numValue)) {
                  patchData[param] = numValue;
                }
              }
              // Handle date fields
              else if (param.includes('Date')) {
                patchData[param] = value;
              }
              // Handle other string fields
              else {
                patchData[param] = value;
              }
            }
          });

          console.log('Applied filters from URL:', patchData);
          this.searchForm.patchValue(patchData);

          // Update dependent dropdowns if needed
          if (patchData.DepartmentID) {
            this.getSection(this.departments.filter(d => patchData.DepartmentID.includes(d.ID)));
          }
          if (patchData.SectionID) {
            this.getServices(this.allAdministrations.filter(s => patchData.SectionID.includes(s.LookupID)));
          }
          if (patchData.ServiceID) {
            this.getRequests(this.allServices.filter(s => patchData.ServiceID.includes(s.ServiceID)));
          }

          // Search with filters and HIDE search (coming from external source)
          this.search(true);
        } else {
          // بحث تلقائي لعرض الجدول - البحث يبقى ظاهر
          this.search(false);
        }

        this.cdr.markForCheck();
      });
    });
    this.itemURL = history.state.menuData?.ItemURL;
    this.pageName = this.isArabic
      ? history.state.menuData?.TitleAr
      : history.state.menuData?.TitleEn;

    const t = this.translations();

    // ترتيب الأعمدة حسب ترتيب البحث: الإدارة → القسم → نوع الطلب → الخدمة
    this.cols = [
      { field: 'expand', title: '', sort: false, visible: true, fixed: true, width: '50px' },
      { field: 'serial', title: '#', sort: false, isNumber: true, visible: true, fixed: true, width: '40px' },
      { field: 'openRequest', title: this.isArabic ? 'فتح الطلب' : 'Open Request', sort: false, visible: true, fixed: true, width: '100px' },
      // Row 1 من البحث
      { field: this.isArabic ? 'DeptAr' : 'DeptEn', title: t?.DepartmentID?.label, sort: true, visible: true, width: '200px' },
      { field: this.isArabic ? 'SectionAr' : 'SectionEn', title: t?.Section?.label, sort: true, visible: false, width: '180px' },
      { field: this.isArabic ? 'ReqTypeAr' : 'ReqTypeEn', title: t?.RequestTypeID?.label, sort: true, visible: false, width: '180px' },
      { field: this.isArabic ? 'ServiceTitleAr' : 'ServiceTitleEn', title: t?.ServiceType?.label, sort: true, visible: true, width: '250px' },
      // Row 2 من البحث
      { field: this.isArabic ? 'StatusAr' : 'StatusEn', title: t?.Status?.label, sort: true, visible: true, width: '150px' },
      { field: this.isArabic ? 'ProcessAr' : 'ProcessEn', title: t?.ProcessID?.label, sort: true, visible: true, width: '180px' },
      { field: 'ApplicationNumber', title: t?.requestNumber?.label, sort: true, isNumber: true, visible: true, width: '150px' },
      { field: 'ApprovedLicense', title: t?.licenseNumber?.label, sort: true, isNumber: true, visible: true, width: '150px' },
      // Row 3 من البحث
      { field: 'ReceiptNumber', title: t?.receiptNumber?.label, sort: true, isNumber: true, visible: true, width: '150px' },
      { field: 'TransactionID', title: t?.operationNumber?.label, sort: true, isNumber: true, visible: true, width: '150px' },
      { field: 'FeesValue', title: t?.feeValue?.label, sort: true, isNumber: true, visible: true, width: '120px' },
      { field: this.isArabic ? 'PaymentWayAr' : 'PaymentWayEn', title: t?.PaymentWay?.label, sort: true, visible: true, width: '150px' },
      { field: 'FeesPaymentDate', title: t?.paymentDate?.label, sort: true, visible: true, width: '150px' },
      { field: 'LicenseCreationDate', title: t?.licenseStartDate?.label, sort: true, visible: false, width: '150px' },
      { field: 'LicenseExpirationDate', title: t?.licenseEndDate?.label, sort: true, visible: false, width: '150px' },
      { field: 'CreationDate', title: t?.requestCreationDate?.label, sort: true, visible: false },
      { field: this.isArabic ? 'ClubNameAr' : 'ClubNameEn', title: t?.Club?.label, sort: true, visible: false },
    ];
    this.allColumns = this.cols
      .filter(col => col.field !== 'expand' && col.field !== 'serial' && col.field !== 'openRequest')
      .map(col => ({ ...col }));

    // حفظ الحالة الافتراضية للأعمدة
    this.defaultColumnsState = this.cols.map(col => ({
      field: col.field,
      visible: col.visible
    }));

    this.sortableColumns = this.cols
      .filter(col => col.sort && col.field !== 'expand' && col.field !== 'serial')
      .map(col => ({
        field: col.field,
        title: col.title,
        isArabic: col.field.includes('Ar')
      }));

    this.selectedSortColumn = this.sortableColumns.find(
      col => col.field === 'FeesPaymentDate'
    ) || this.sortableColumns[0];

    // Setup configurations
    this.setupSearchFields();

    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  setupSearchFields() {
    const t = this.translations();

    // Simple Search Fields


  }



  handleFieldChange(event: { field: string; value: any }) {
    if (event.field === 'DepartmentID') {
      this.getSection(event.value);
    } else if (event.field === 'SectionID') {
      this.getServices(event.value);
    } else if (event.field === 'ServiceID') {
      this.getRequests(event.value);
    }
    this.cdr.markForCheck();
  }

  initializeForm() {
    this.searchForm = this.fb.group({
      ReportName: ['FeesDetails'],
      DepartmentID: [[]],
      SectionID: [[]],
      ServiceID: [[]],
      RequestTypeID: [[]],
      PaymentWay: [[]],
      FkClubID: [[]],
      FkStatusID: [[]],
      FkProcessID: [[]],
      ApplicationNumber: [null],
      ApprovedLicense: [null],
      ReceiptNumber: [null],
      TransactionID: [null],
      FeesValue: [null],
      FeesPaymentDateFrom: [null],
      FeesPaymentDateTo: [null],
      LicenseCreationDateFrom: [null],
      LicenseCreationDateTo: [null],
      LicenseExpirationDateFrom: [null],
      LicenseExpirationDateTo: [null],
      CreationDateFrom: [null],
      CreationDateTo: [null],
      PageSize: [10],
      PageNum: [1],
      SortField: ['FeesPaymentDate'],
      SortDirection: [2]
    });

    // إضافة listener لتنظيف القيم من -1 تلقائياً
    this.setupFormValueCleaning();
  }

  // دالة لتنظيف القيم من -1 تلقائياً
  setupFormValueCleaning() {
    const multiSelectFields = ['DepartmentID', 'SectionID', 'ServiceID', 'RequestTypeID', 'PaymentWay', 'FkClubID', 'FkStatusID', 'FkProcessID'];

    multiSelectFields.forEach(fieldName => {
      const control = this.searchForm.get(fieldName);
      if (control) {
        control.valueChanges.subscribe(value => {
          if (Array.isArray(value) && value.includes(-1)) {
            const cleanValue = value.filter(v => v !== -1);
            control.setValue(cleanValue, { emitEvent: false });
          }
        });
      }
    });
  }

  // Format date to YYYY-MM-DD
  formatDate(date: any): string | null {
    if (!date) return null;

    try {
      let dateObj: Date;

      // If it's already a Date object
      if (date instanceof Date) {
        dateObj = date;
      }
      // If it's a string, parse it
      else if (typeof date === 'string') {
        // Check if it's in d/m/Y format (from flatpickr)
        if (date.includes('/')) {
          const parts = date.split('/');
          if (parts.length === 3) {
            // Convert d/m/Y to YYYY-MM-DD
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            dateObj = new Date(`${year}-${month}-${day}`);
          } else {
            dateObj = new Date(date);
          }
        } else {
          dateObj = new Date(date);
        }
      }
      // If it's a timestamp
      else if (typeof date === 'number') {
        dateObj = new Date(date);
      }
      else {
        return null;
      }

      // Check if valid date
      if (isNaN(dateObj.getTime())) {
        console.error('Invalid date:', date);
        return null;
      }

      // Format to YYYY-MM-DD
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return null;
    }
  }



  search(collapseSearch: boolean = false) {
    const formValue = this.searchForm.value;

    // Convert arrays and format dates
    const searchPayload = Object.keys(formValue).reduce((acc, key) => {
      let value = formValue[key];

      // Handle multi-select arrays and clean -1 values
      if (Array.isArray(value)) {
        const cleanValues = value.filter(v => v !== null && v !== undefined && v !== -1);
        value = cleanValues.length > 0 ? cleanValues : null;
      } else if (value === -1) {
        value = null;
      }

      // Format date fields to YYYY-MM-DD
      if (value && (key.includes('Date') || key.includes('date'))) {
        value = this.formatDate(value);
      }

      acc[key] = value;
      return acc;
    }, {} as any);

    // بناء معايير البحث للعرض
    this.buildSearchCriteria(formValue);

    // تحديد إذا كان البحث متقدم وفيه قيم
    const hasAdvancedSearchValues = this.hasAdvancedSearchValues(formValue);

    this.isLoading = true;

    this.serviceFeesService.search(searchPayload).subscribe(
      data => {
        console.log('Search results:', data);
        console.log('First row FeesValue:', data?.resultData?.[0]?.FeesValue);

        this.rows = data?.resultData || [];
        this.originalRows = [...this.rows]; // حفظ النتائج الأصلية
        const p = data?.TotalPages?.[0];

        this.paginationInfo = {
          TotalPages: p?.TotalPages ?? 1,
          CurrentPage: p?.CurrentPage ?? 1,
          PageSize: p?.PageSize ?? 10,
          TotalRows: p?.TotalRows ?? 0
        };

        // إخفاء البحث إذا كان مطلوب أو إذا كان بحث متقدم بقيم ولقى نتائج
        if (collapseSearch || (hasAdvancedSearchValues && this.rows.length > 0)) {
          this.isSearchCollapsed = true;
        } else {
          this.isSearchCollapsed = false;
        }

        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error => {
        console.error('Search error:', error);
        this.isLoading = false;
        this.rows = [];
        this.originalRows = [];
        // لو حصل error، البحث يفضل ظاهر (ما عدا لو جاي من الداشبورد أو بحث متقدم)
        if (!collapseSearch && !hasAdvancedSearchValues) {
          this.isSearchCollapsed = false;
        }
        this.cdr.markForCheck();
      }
    );
  }

  // تحديد إذا كان البحث متقدم وفيه قيم
  hasAdvancedSearchValues(formValue: any): boolean {
    // الحقول المتقدمة (غير ApplicationNumber اللي هو البحث البسيط)
    const advancedFields = [
      'DepartmentID', 'SectionID', 'ServiceID', 'RequestTypeID', 'PaymentWay', 'FkClubID',
      'FkStatusID', 'FkProcessID', 'ApprovedLicense', 'ReceiptNumber', 'TransactionID', 'FeesValue',
      'FeesPaymentDateFrom', 'FeesPaymentDateTo', 'LicenseCreationDateFrom', 'LicenseCreationDateTo',
      'LicenseExpirationDateFrom', 'LicenseExpirationDateTo', 'CreationDateFrom', 'CreationDateTo'
    ];

    return advancedFields.some(field => {
      const value = formValue[field];
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== null && value !== undefined && value !== -1 && value !== '';
    });
  }

  // بناء معايير البحث للعرض
  buildSearchCriteria(formValue: any) {
    this.searchCriteria = [];
    const t = this.translations();

    // الحقول النصية والأرقام
    const textFields = [
      { key: 'ApplicationNumber', label: t?.requestNumber?.label },
      { key: 'ApprovedLicense', label: t?.licenseNumber?.label },
      { key: 'ReceiptNumber', label: t?.receiptNumber?.label },
      { key: 'FeesValue', label: t?.feeValue?.label }
    ];

    textFields.forEach(field => {
      if (formValue[field.key]) {
        this.searchCriteria.push({
          label: field.label,
          value: formValue[field.key],
          key: field.key
        });
      }
    });

    // الـ Dropdowns - Multi-select
    if (Array.isArray(formValue.DepartmentID) && formValue.DepartmentID.length > 0) {
      const selectedDepts = this.departments.filter((d: any) => formValue.DepartmentID.includes(d.ID));
      if (selectedDepts.length > 0) {
        const values = selectedDepts.map((d: any) => this.isArabic ? d.TitleAr : d.TitleEn).join(', ');
        this.searchCriteria.push({
          label: t?.DepartmentID?.label,
          value: values,
          key: 'DepartmentID'
        });
      }
    }

    if (Array.isArray(formValue.SectionID) && formValue.SectionID.length > 0) {
      const selectedSections = this.administrations.filter((s: any) => formValue.SectionID.includes(s.LookupID));
      if (selectedSections.length > 0) {
        const values = selectedSections.map((s: any) => this.isArabic ? s.TitleAr : s.TitleEn).join(', ');
        this.searchCriteria.push({
          label: t?.Section?.label,
          value: values,
          key: 'SectionID'
        });
      }
    }

    if (Array.isArray(formValue.ServiceID) && formValue.ServiceID.length > 0) {
      const selectedServices = this.services.filter((s: any) => formValue.ServiceID.includes(s.ServiceID));
      if (selectedServices.length > 0) {
        const values = selectedServices.map((s: any) => this.isArabic ? s.ServiceTitleAr : s.ServiceTitleEn).join(', ');
        this.searchCriteria.push({
          label: t?.ServiceType?.label,
          value: values,
          key: 'ServiceID'
        });
      }
    }

    if (Array.isArray(formValue.RequestTypeID) && formValue.RequestTypeID.length > 0) {
      const selectedReqTypes = this.Requests.filter((r: any) => formValue.RequestTypeID.includes(r.ID));
      if (selectedReqTypes.length > 0) {
        const values = selectedReqTypes.map((r: any) => this.isArabic ? r.TitleAr : r.TitleEn).join(', ');
        this.searchCriteria.push({
          label: t?.RequestTypeID?.label,
          value: values,
          key: 'RequestTypeID'
        });
      }
    }

    if (Array.isArray(formValue.FkStatusID) && formValue.FkStatusID.length > 0) {
      const selectedStatuses = this.requestStatuses.filter((s: any) => formValue.FkStatusID.includes(s.LookupID));
      if (selectedStatuses.length > 0) {
        const values = selectedStatuses.map((s: any) => this.isArabic ? s.TitleAr : s.TitleEn).join(', ');
        this.searchCriteria.push({
          label: t?.Status?.label,
          value: values,
          key: 'FkStatusID'
        });
      }
    }

    if (Array.isArray(formValue.FkProcessID) && formValue.FkProcessID.length > 0) {
      const selectedProcesses = this.procedures.filter((p: any) => formValue.FkProcessID.includes(p.LookupID));
      if (selectedProcesses.length > 0) {
        const values = selectedProcesses.map((p: any) => this.isArabic ? p.TitleAr : p.TitleEn).join(', ');
        this.searchCriteria.push({
          label: t?.ProcessID?.label,
          value: values,
          key: 'FkProcessID'
        });
      }
    }

    if (Array.isArray(formValue.PaymentWay) && formValue.PaymentWay.length > 0) {
      const selectedPayments = this.paymentMethods.filter((p: any) => formValue.PaymentWay.includes(p.LookupID));
      if (selectedPayments.length > 0) {
        const values = selectedPayments.map((p: any) => this.isArabic ? p.TitleAr : p.TitleEn).join(', ');
        this.searchCriteria.push({
          label: t?.PaymentWay?.label,
          value: values,
          key: 'PaymentWay'
        });
      }
    }

    if (Array.isArray(formValue.FkClubID) && formValue.FkClubID.length > 0) {
      const selectedClubs = this.clubNames.filter((c: any) => formValue.FkClubID.includes(c.LookupID));
      if (selectedClubs.length > 0) {
        const values = selectedClubs.map((c: any) => this.isArabic ? c.TitleAr : c.TitleEn).join(', ');
        this.searchCriteria.push({
          label: t?.Club?.label,
          value: values,
          key: 'FkClubID'
        });
      }
    }

    // التواريخ
    if (formValue.FeesPaymentDateFrom || formValue.FeesPaymentDateTo) {
      const fromDate = formValue.FeesPaymentDateFrom || '';
      const toDate = formValue.FeesPaymentDateTo || '';
      this.searchCriteria.push({
        label: t?.paymentDate?.label,
        value: `${fromDate} ${fromDate && toDate ? '-' : ''} ${toDate}`.trim(),
        key: 'FeesPaymentDate'
      });
    }

    if (formValue.LicenseCreationDateFrom || formValue.LicenseCreationDateTo) {
      const fromDate = formValue.LicenseCreationDateFrom || '';
      const toDate = formValue.LicenseCreationDateTo || '';
      this.searchCriteria.push({
        label: t?.licenseStartDate?.label,
        value: `${fromDate} ${fromDate && toDate ? '-' : ''} ${toDate}`.trim(),
        key: 'LicenseCreationDate'
      });
    }

    if (formValue.LicenseExpirationDateFrom || formValue.LicenseExpirationDateTo) {
      const fromDate = formValue.LicenseExpirationDateFrom || '';
      const toDate = formValue.LicenseExpirationDateTo || '';
      this.searchCriteria.push({
        label: t?.licenseEndDate?.label,
        value: `${fromDate} ${fromDate && toDate ? '-' : ''} ${toDate}`.trim(),
        key: 'LicenseExpirationDate'
      });
    }

    if (formValue.CreationDateFrom || formValue.CreationDateTo) {
      const fromDate = formValue.CreationDateFrom || '';
      const toDate = formValue.CreationDateTo || '';
      this.searchCriteria.push({
        label: t?.creationDate?.label || (this.isArabic ? 'تاريخ الإنشاء' : 'Creation Date'),
        value: `${fromDate} ${fromDate && toDate ? '-' : ''} ${toDate}`.trim(),
        key: 'CreationDate'
      });
    }
  }

  // إزالة معيار بحث واحد
  removeCriteria(key: string) {
    // مسح القيمة من الفورم
    if (key === 'FeesPaymentDate') {
      this.searchForm.patchValue({
        FeesPaymentDateFrom: null,
        FeesPaymentDateTo: null
      });
    } else if (key === 'LicenseCreationDate') {
      this.searchForm.patchValue({
        LicenseCreationDateFrom: null,
        LicenseCreationDateTo: null
      });
    } else if (key === 'LicenseExpirationDate') {
      this.searchForm.patchValue({
        LicenseExpirationDateFrom: null,
        LicenseExpirationDateTo: null
      });
    } else if (key === 'CreationDate') {
      this.searchForm.patchValue({
        CreationDateFrom: null,
        CreationDateTo: null
      });
    } else {
      const control = this.searchForm.get(key);
      if (control) {
        // For multi-select fields, set to empty array
        if (['DepartmentID', 'SectionID', 'ServiceID', 'RequestTypeID', 'PaymentWay', 'FkClubID', 'FkStatusID', 'FkProcessID'].includes(key)) {
          control.setValue([]);
        } else if (typeof control.value === 'number') {
          control.setValue(-1);
        } else {
          control.setValue(null);
        }
      }
    }

    // إعادة البحث
    this.search();
  }

  // التبديل بين وضع البحث ووضع العرض
  toggleSearchView() {
    this.isSearchCollapsed = !this.isSearchCollapsed;
    this.cdr.markForCheck();
  }

  // البحث العام في كل الحقول
  globalSearch() {
    if (!this.globalSearchTerm || this.globalSearchTerm.trim() === '') {
      // لو فاضي، نرجع النتائج الأصلية
      this.rows = [...this.originalRows];
      this.cdr.markForCheck();
      return;
    }

    // تطبيق الفلتر على الصفوف الأصلية
    const term = this.globalSearchTerm.toLowerCase().trim();

    // البحث في كل الحقول
    this.rows = this.originalRows.filter((row: any) => {
      return Object.keys(row).some(key => {
        const value = row[key];
        if (value === null || value === undefined) return false;

        // Convert value to string
        let searchValue = String(value).toLowerCase();

        // If it's a date field, try multiple formats
        if (key.includes('Date') || key.includes('date')) {
          try {
            const dateObj = new Date(value);
            if (!isNaN(dateObj.getTime())) {
              // Format date in multiple ways for better search
              const formats = [
                // YYYY-MM-DD
                dateObj.toISOString().split('T')[0],
                // DD/MM/YYYY
                `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`,
                // MM/DD/YYYY
                `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}/${dateObj.getFullYear()}`,
                // DD-MM-YYYY
                `${String(dateObj.getDate()).padStart(2, '0')}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${dateObj.getFullYear()}`,
                // Year only
                String(dateObj.getFullYear()),
                // Month name (Arabic and English)
                dateObj.toLocaleDateString('ar-EG', { month: 'long' }),
                dateObj.toLocaleDateString('en-US', { month: 'long' }),
                // Day
                String(dateObj.getDate()),
                // Month number
                String(dateObj.getMonth() + 1)
              ];

              // Check if search term matches any date format
              return formats.some(format => format.toLowerCase().includes(term));
            }
          } catch (e) {
            // If date parsing fails, fall back to string search
          }
        }

        // Regular string search
        return searchValue.includes(term);
      });
    });

    this.cdr.markForCheck();
  }

  // إعادة تعيين Global Search
  resetGlobalSearch() {
    this.globalSearchTerm = '';
    this.rows = [...this.originalRows];
    this.cdr.markForCheck();
  }

  // الرجوع للوضع الافتراضي (إعادة فتح البحث)
  backToSearch() {
    // إعادة فتح البحث
    this.isSearchCollapsed = false;

    // مسح البيانات
    this.globalSearchTerm = '';
    this.rows = [];
    this.originalRows = [];
    this.searchCriteria = [];

    // إعادة تعيين الفورم للحالة الافتراضية
    this.resetForm();
  }

  // إعادة تعيين الأعمدة للحالة الافتراضية
  resetColumns() {
    this.defaultColumnsState.forEach(defaultCol => {
      const colInAll = this.allColumns.find(c => c.field === defaultCol.field);
      const colInCols = this.cols.find(c => c.field === defaultCol.field);

      if (colInAll) {
        colInAll.visible = defaultCol.visible;
      }
      if (colInCols && !colInCols.fixed) {
        colInCols.visible = defaultCol.visible;
      }
    });

    // Force array reference change to trigger change detection
    this.cols = [...this.cols];

    // لو التفاصيل مفتوحة، نحدثها
    if (this.expandedRow) {
      this.expandedRowDetails = this.getHiddenColumnsDetails(this.expandedRow);
    }

    this.cdr.markForCheck();
  }

  // إعادة تعيين الترتيب
  resetSort() {
    this.currentSortField = 'FeesPaymentDate';
    this.currentSortDirection = 2;
    this.selectedSortColumn = this.sortableColumns.find(
      col => col.field === this.currentSortField
    ) || this.sortableColumns[0];

    this.searchForm.patchValue({
      SortField: this.currentSortField,
      SortDirection: this.currentSortDirection,
      PageNum: 1
    });

    this.search();
    this.cdr.markForCheck();
  }



  // دالة global لمسح أي dropdown
  clearDropdown(fieldName: string) {
    const control = this.searchForm.get(fieldName);
    if (control) {
      // For multi-select fields, set to empty array
      if (['DepartmentID', 'SectionID', 'ServiceID', 'RequestTypeID', 'PaymentWay', 'FkClubID', 'FkStatusID', 'FkProcessID'].includes(fieldName)) {
        control.setValue([]);
      } else {
        control.setValue(-1);
      }
    }

    // تحديث القوائم المتأثرة بناءً على الاختيارات الحالية
    if (fieldName === 'DepartmentID') {
      // مسح الإدارة: إرجاع كل الأقسام والخدمات والطلبات
      this.administrations = [...this.allAdministrations];
      this.services = [...this.allServices];
      this.Requests = [...this.allRequests];
      // مسح القيم التابعة
      this.searchForm.patchValue({
        SectionID: [],
        ServiceID: [],
        RequestTypeID: []
      });
    } else if (fieldName === 'SectionID') {
      // مسح القسم: نحتفظ بالأقسام المفلترة حسب الإدارة المختارة
      // ونرجع الخدمات والطلبات للحالة الأصلية
      const selectedDeptIds = this.searchForm.get('DepartmentID')?.value;
      if (!selectedDeptIds || selectedDeptIds.length === 0) {
        // لو مفيش إدارة مختارة، نعرض كل الأقسام
        this.administrations = [...this.allAdministrations];
      }
      // إرجاع الخدمات والطلبات
      this.services = [...this.allServices];
      this.Requests = [...this.allRequests];
      // مسح القيم التابعة
      this.searchForm.patchValue({
        ServiceID: [],
        RequestTypeID: []
      });
    } else if (fieldName === 'ServiceID') {
      // مسح الخدمة: نحتفظ بالخدمات المفلترة حسب القسم المختار
      // ونرجع الطلبات للحالة الأصلية
      const selectedSectionIds = this.searchForm.get('SectionID')?.value;
      if (!selectedSectionIds || selectedSectionIds.length === 0) {
        // لو مفيش قسم مختار، نعرض كل الخدمات
        this.services = [...this.allServices];
      }
      // إرجاع الطلبات
      this.Requests = [...this.allRequests];
      // مسح القيم التابعة
      this.searchForm.patchValue({
        RequestTypeID: []
      });
    }

    this.cdr.markForCheck();
  }

  getSection(selectedDepartments: any) {
    // تنظيف القيم من -1
    const cleanDepartments = this.cleanFormValue('DepartmentID', selectedDepartments);

    if (!cleanDepartments || cleanDepartments.length === 0) {
      this.administrations = [...this.allAdministrations];
      this.services = [...this.allServices];
      this.Requests = [...this.allRequests];
      this.searchForm.patchValue({ SectionID: [], ServiceID: [], RequestTypeID: [] });
      this.cdr.markForCheck();
      return;
    }

    // فلترة الأقسام حسب الإدارات المختارة
    const filteredAdmins = this.allAdministrations.filter(
      (admin: any) => cleanDepartments.some((dept: any) => dept.ID === admin.DepartmentID)
    );

    // التأكد من وجود أقسام
    if (filteredAdmins.length > 0) {
      this.administrations = filteredAdmins;
    } else {
      // لو مفيش أقسام، نعرض كل الأقسام
      this.administrations = [...this.allAdministrations];
    }

    // مسح القوائم التابعة
    this.services = [...this.allServices];
    this.Requests = [...this.allRequests];
    this.searchForm.patchValue({ SectionID: [], ServiceID: [], RequestTypeID: [] });
    this.cdr.markForCheck();
  }

  getServices(selectedSections: any) {
    // تنظيف القيم من -1
    const cleanSections = this.cleanFormValue('SectionID', selectedSections);

    if (!cleanSections || cleanSections.length === 0) {
      this.services = [...this.allServices];
      this.Requests = [...this.allRequests];
      this.searchForm.patchValue({ ServiceID: [], RequestTypeID: [] });
      this.cdr.markForCheck();
      return;
    }

    // فلترة الخدمات حسب الأقسام المختارة
    this.services = this.allServices.filter(
      (srv: any) => cleanSections.some((section: any) => section.LookupID === srv.SectionID)
    );

    // مسح القوائم التابعة
    this.Requests = [...this.allRequests];
    this.searchForm.patchValue({ ServiceID: [], RequestTypeID: [] });
    this.cdr.markForCheck();
  }

  getRequests(selectedServices: any) {
    // تنظيف القيم من -1
    const cleanServices = this.cleanFormValue('ServiceID', selectedServices);

    if (!cleanServices || cleanServices.length === 0) {
      this.Requests = [...this.allRequests];
      this.searchForm.patchValue({ RequestTypeID: [] });
      return;
    }

    // فلترة الطلبات حسب الخدمات المختارة
    const requestTypeIds = cleanServices.map((service: any) => service.RequestTypeID).filter((id: any) => id);

    if (requestTypeIds.length > 0) {
      this.Requests = this.allRequests.filter(
        (req: any) => requestTypeIds.includes(req.ID)
      );
    } else {
      this.Requests = [...this.allRequests];
    }

    this.cdr.markForCheck();
  }

  onSortChange(event: any) {
    const newField = event?.field || this.currentSortField;

    if (this.currentSortField === newField) {
      this.currentSortDirection = this.currentSortDirection === 1 ? 2 : 1;
    } else {
      this.currentSortField = newField;
      this.currentSortDirection = 1;
    }

    this.searchForm.patchValue({
      SortField: this.currentSortField,
      SortDirection: this.currentSortDirection,
      PageNum: 1
    });

    this.search();
    this.cdr.markForCheck();
  }

  // تغيير الترتيب من الـ dropdown
  onSortColumnChange(column: any) {
    if (!column) return;

    this.selectedSortColumn = column;
    this.currentSortField = column.field;

    this.searchForm.patchValue({
      SortField: this.currentSortField,
      SortDirection: this.currentSortDirection,
      PageNum: 1
    });

    this.search();
    this.toggleSortDropdown = false;
    this.cdr.markForCheck();
  }

  // تبديل اتجاه الترتيب
  toggleSortDirection() {
    this.currentSortDirection = this.currentSortDirection === 1 ? 2 : 1;

    this.searchForm.patchValue({
      SortField: this.currentSortField,
      SortDirection: this.currentSortDirection,
      PageNum: 1
    });

    this.search();
    this.cdr.markForCheck();
  }

  // تعيين اتجاه الترتيب
  setSortDirection(direction: number) {
    if (this.currentSortDirection === direction) return; // لو نفس الاتجاه، مفيش داعي نعمل حاجة

    this.currentSortDirection = direction;

    this.searchForm.patchValue({
      SortField: this.currentSortField,
      SortDirection: this.currentSortDirection,
      PageNum: 1
    });

    this.search();
    this.cdr.markForCheck();
  }

  // التبديل بين البحث البسيط والمتقدم
  toggleAdvancedSearch() {
    this.isAdvancedSearch = !this.isAdvancedSearch;

    // لو رجعنا للبحث البسيط، نمسح الحقول الإضافية
    if (!this.isAdvancedSearch) {
      this.searchForm.patchValue({
        DepartmentID: [],
        SectionID: [],
        RequestTypeID: [],
        FkStatusID: [],
        FkProcessID: [],
        PaymentWay: [],
        FkClubID: [],
        ApprovedLicense: null,
        ReceiptNumber: null,
        FeesValue: null,
        FeesPaymentDateFrom: null,
        FeesPaymentDateTo: null,
        LicenseCreationDateFrom: null,
        LicenseCreationDateTo: null,
        LicenseExpirationDateFrom: null,
        LicenseExpirationDateTo: null,
        CreationDateFrom: null,
        CreationDateTo: null
      });
    }

    this.cdr.markForCheck();
  }

  onRowClick(event: any) {
    this.toggleRowExpand(event.row.ApplicationNumber);
  }

  toggleRowExpand(applicationNumber: any) {
    if (this.expandedRow?.ApplicationNumber === applicationNumber) {
      this.expandedRow = null;
      this.expandedRowDetails = [];
    } else {
      this.expandedRow = this.rows.find(row => row.ApplicationNumber === applicationNumber);
      this.expandedRowDetails = this.expandedRow ? this.getHiddenColumnsDetails(this.expandedRow) : [];
    }
    this.cdr.markForCheck();
  }

  onPageChange(event: any) {
    let newPage = 1;

    if (typeof event === 'number') {
      newPage = event;
    } else if (event?.page) {
      newPage = event.page;
    } else if (event?.currentPage) {
      newPage = event.currentPage;
    }

    if (this.paginationInfo.CurrentPage !== newPage) {
      this.paginationInfo.CurrentPage = newPage;

      this.searchForm.patchValue({
        PageNum: newPage,
        PageSize: this.paginationInfo.PageSize,
        SortField: this.currentSortField,
        SortDirection: this.currentSortDirection
      });

      this.search();
    }

    this.cdr.markForCheck();
  }

  getPageNumbers(): number[] {
    const total = this.paginationInfo.TotalPages;
    const current = this.paginationInfo.CurrentPage;

    if (total <= 1) return [1];

    const pages: number[] = [];
    let start = Math.max(1, current - 2);
    let end = Math.min(total, current + 2);

    if (start > 1) pages.push(1, -1);

    for (let i = start; i <= end; i++) pages.push(i);

    if (end < total) pages.push(-1, total);

    return pages;
  }



  onPageSizeChange(event: any) {
    const newPageSize = parseInt(event?.target?.value || event, 10);

    if (isNaN(newPageSize) || this.paginationInfo.PageSize === newPageSize) {
      this.cdr.markForCheck();
      return;
    }

    this.paginationInfo.PageSize = newPageSize;
    this.paginationInfo.CurrentPage = 1;

    this.searchForm.patchValue({
      PageSize: newPageSize,
      PageNum: 1
    });

    this.search();
    this.cdr.markForCheck();
  }

  // دالة تبديل العمود (الآن بتعدل على cols و allColumns معًا)
  toggleColumn(field: string) {
    const colInAll = this.allColumns.find(c => c.field === field);
    const colInCols = this.cols.find(c => c.field === field);

    if (colInAll && colInCols && !colInCols.fixed) {
      const newValue = !colInAll.visible;
      colInAll.visible = newValue;
      colInCols.visible = newValue;

      // Force array reference change to trigger change detection
      this.cols = [...this.cols];

      // لو التفاصيل مفتوحة، نحدثها
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

    // Force array reference change to trigger change detection
    this.cols = [...this.cols];

    // لو التفاصيل مفتوحة، نحدثها
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

    // Force array reference change to trigger change detection
    this.cols = [...this.cols];

    // لو التفاصيل مفتوحة، نحدثها
    if (this.expandedRow) {
      this.expandedRowDetails = this.getHiddenColumnsDetails(this.expandedRow);
    }

    this.cdr.markForCheck();
  }

  // عدد الأعمدة المرئية (للـ colspan)
  get visibleColumnsCount(): number {
    return this.cols.filter(col => col.visible !== false).length;
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



  // التحقق من وجود أعمدة مخفية
  get hasHiddenColumns(): boolean {
    const isMobile = window.innerWidth <= 768;

    return this.cols.some(col => {
      if (col.fixed) return false;

      if (isMobile) {
        // في الموبايل: نعرض الزر لو فيه أعمدة مخفية بالـ toggle أو في الموبايل
        return col.visible === false || this.shouldHideOnMobile(col.field);
      } else {
        // في الديسكتوب: نعرض الزر لو فيه أعمدة مخفية بالـ toggle فقط
        return col.visible === false;
      }
    });
  }

  // التفاصيل المخفية فقط (الأعمدة غير المرئية في الجدول أو المخفية في الموبايل)
  getHiddenColumnsDetails(row: any): any[] {
    const details: any[] = [];
    const isMobile = window.innerWidth <= 768;

    this.cols.forEach(col => {
      // تجاهل أعمدة التوسيع والرقم التسلسلي
      if (col.fixed) {
        return;
      }

      let shouldShow = false;

      if (isMobile) {
        // في الموبايل: نعرض الأعمدة المخفية بالـ toggle أو المخفية في الموبايل
        const isHiddenByToggle = col.visible === false;
        const isHiddenOnMobile = this.shouldHideOnMobile(col.field);
        shouldShow = isHiddenByToggle || isHiddenOnMobile;
      } else {
        // في الديسكتوب: نعرض الأعمدة المخفية بالـ toggle فقط
        shouldShow = col.visible === false;
      }

      if (shouldShow) {
        let value = row[col.field];
        let label = col.title;

        // معالجة الحقول الديناميكية (العربي/الإنجليزي)
        if (col.field.includes('ServiceTitle')) {
          value = this.isArabic ? row.ServiceTitleAr : row.ServiceTitleEn;
        } else if (col.field.includes('Dept')) {
          value = this.isArabic ? row.DeptAr : row.DeptEn;
        } else if (col.field.includes('Section')) {
          value = this.isArabic ? row.SectionAr : row.SectionEn;
        } else if (col.field.includes('ReqType')) {
          value = this.isArabic ? row.ReqTypeAr : row.ReqTypeEn;
        } else if (col.field.includes('Status')) {
          value = this.isArabic ? row.StatusAr : row.StatusEn;
        } else if (col.field.includes('Process')) {
          value = this.isArabic ? row.ProcessAr : row.ProcessEn;
        } else if (col.field.includes('ClubName')) {
          value = this.isArabic ? row.ClubNameAr : row.ClubNameEn;
        } else if (col.field.includes('PaymentWay')) {
          value = this.isArabic ? row.PaymentWayAr : row.PaymentWayEn;
        }

        // إصلاح الأرقام المقلوبة
        if (value && col.isNumber) {
          value = String(value);
        }

        // إضافة الأعمدة المخفية فقط
        details.push({ label, value: value || '-', isNumber: col.isNumber });
      }
    });

    return details;
  }

  // دالة للحصول على قيمة الخلية للـ tooltip
  getCellValue(row: any, col: any): string {
    if (col.field === 'expand' || col.field === 'serial') {
      return '';
    }

    let value = row[col.field];

    // معالجة الحقول الديناميكية
    if (col.field.includes('ServiceTitle')) {
      value = this.isArabic ? row.ServiceTitleAr : row.ServiceTitleEn;
    } else if (col.field.includes('Dept')) {
      value = this.isArabic ? row.DeptAr : row.DeptEn;
    } else if (col.field.includes('Section')) {
      value = this.isArabic ? row.SectionAr : row.SectionEn;
    } else if (col.field.includes('ReqType')) {
      value = this.isArabic ? row.ReqTypeAr : row.ReqTypeEn;
    } else if (col.field.includes('Status')) {
      value = this.isArabic ? row.StatusAr : row.StatusEn;
    } else if (col.field.includes('Process')) {
      value = this.isArabic ? row.ProcessAr : row.ProcessEn;
    } else if (col.field.includes('ClubName')) {
      value = this.isArabic ? row.ClubNameAr : row.ClubNameEn;
    } else if (col.field.includes('PaymentWay')) {
      value = this.isArabic ? row.PaymentWayAr : row.PaymentWayEn;
    }

    // إصلاح الأرقام المقلوبة - نتأكد إنها string
    if (value && col.isNumber) {
      value = String(value);
    }

    return value || '-';
  }

  // دالة لتحديد الأعمدة اللي تتخفي في الموبايل
  shouldHideOnMobile(field: string): boolean {
    const showFields = ['expand', 'serial', 'ApplicationNumber', 'ApprovedLicense', 'FeesValue'];
    return !showFields.includes(field);
  }

  // دالة إعادة تعيين الفورم
  resetForm() {
    this.searchForm.reset({
      ReportName: 'FeesDetails',
      DepartmentID: [],
      SectionID: [],
      ServiceID: [],
      RequestTypeID: [],
      PaymentWay: [],
      FkClubID: [],
      FkStatusID: [],
      FkProcessID: [],
      ApplicationNumber: null,
      ApprovedLicense: null,
      ReceiptNumber: null,
      TransactionID: null,
      FeesValue: null,
      FeesPaymentDateFrom: null,
      FeesPaymentDateTo: null,
      LicenseCreationDateFrom: null,
      LicenseCreationDateTo: null,
      LicenseExpirationDateFrom: null,
      LicenseExpirationDateTo: null,
      CreationDateFrom: null,
      CreationDateTo: null,
      PageSize: 10,
      PageNum: 1,
      SortField: 'FeesPaymentDate',
      SortDirection: 2
    });
    this.administrations = [...this.allAdministrations];
    this.services = [...this.allServices];
    this.Requests = [...this.allRequests];
    this.cdr.markForCheck();
    this.search();
  }

  // دالة تصدير لـ Excel - جلب النتائج المفلترة بتنسيق RTL
  exportToExcel() {
    // التحقق من وجود بيانات
    if (!this.rows || this.rows.length === 0) {
      alert(this.isArabic ? 'لا توجد بيانات للتصدير' : 'No data to export');
      return;
    }

    // إنشاء payload لجلب النتائج المفلترة
    const formValue = this.searchForm.value;
    const exportPayload = Object.keys(formValue).reduce((acc, key) => {
      let value = formValue[key];

      // Handle multi-select arrays
      if (Array.isArray(value)) {
        value = value.length > 0 ? value : null;
      } else if (value === -1) {
        value = null;
      }

      // Format date fields to YYYY-MM-DD
      if (value && (key.includes('Date') || key.includes('date'))) {
        value = this.formatDate(value);
      }

      acc[key] = value;
      return acc;
    }, {} as any);

    // تغيير PageSize لجلب كل النتائج المفلترة
    exportPayload.PageSize = 999999;
    exportPayload.PageNum = 1;

    this.isLoading = true;
    this.cdr.markForCheck();

    // جلب كل البيانات المفلترة
    this.serviceFeesService.search(exportPayload).subscribe(
      data => {
        const allRows = data?.resultData || [];

        if (allRows.length === 0) {
          alert(this.isArabic ? 'لا توجد بيانات للتصدير' : 'No data to export');
          this.isLoading = false;
          this.cdr.markForCheck();
          return;
        }

        const headerMap: Record<string, string> = {};
        const excludedFields = ['expand', 'serial', 'openRequest'];

        // تصدير كل الأعمدة (حتى المخفية)
        this.cols.forEach(col => {
          if (col.field && col.title && !excludedFields.includes(col.field)) {
            headerMap[col.field] = col.title;
          }
        });

        const excelData = allRows.map((item: any) => {
          const row: any = {};

          Object.keys(headerMap).forEach(field => {
            let value = item[field];

            if (field.includes('ServiceTitle')) {
              value = this.isArabic ? item.ServiceTitleAr : item.ServiceTitleEn;
            } else if (field.includes('Dept')) {
              value = this.isArabic ? item.DeptAr : item.DeptEn;
            } else if (field.includes('Section')) {
              value = this.isArabic ? item.SectionAr : item.SectionEn;
            } else if (field.includes('ReqType')) {
              value = this.isArabic ? item.ReqTypeAr : item.ReqTypeEn;
            } else if (field.includes('Status')) {
              value = this.isArabic ? item.StatusAr : item.StatusEn;
            } else if (field.includes('Process')) {
              value = this.isArabic ? item.ProcessAr : item.ProcessEn;
            } else if (field.includes('ClubName')) {
              value = this.isArabic ? item.ClubNameAr : item.ClubNameEn;
            } else if (field.includes('PaymentWay')) {
              value = this.isArabic ? item.PaymentWayAr : item.PaymentWayEn;
            }

            row[headerMap[field]] = value ?? '';
          });

          return row;
        });

        // إنشاء ملف Excel بتنسيق RTL
        const ws = XLSX.utils.json_to_sheet(excelData);

        // تطبيق RTL على الـ worksheet
        if (this.isArabic) {
          ws['!views'] = [{ RTL: true }];
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, this.isArabic ? 'رسوم الخدمات' : 'Service Fees');

        // تطبيق RTL على الـ workbook
        if (this.isArabic) {
          if (!wb.Workbook) wb.Workbook = {};
          if (!wb.Workbook.Views) wb.Workbook.Views = [];
          wb.Workbook.Views[0] = { RTL: true };
        }

        const filename = this.isArabic ? 'تقرير_رسوم_الخدمات.xlsx' : 'Service_Fees_Report.xlsx';
        XLSX.writeFile(wb, filename);

        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error => {
        console.error('Export error:', error);
        alert(this.isArabic ? 'حدث خطأ أثناء التصدير' : 'Error during export');
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    );
  }
  fixAccessibility() {
    const buttons = document.querySelectorAll('button.bh-page-item');
    buttons.forEach((btn: Element) => {
      const el = btn as HTMLButtonElement;
      if (!el.hasAttribute('aria-label')) {
        if (el.classList.contains('first-page')) {
          el.setAttribute('aria-label', this.translations()?.FirstPageFirstPage?.label);
        } else if (el.classList.contains('previous-page')) {
          el.setAttribute('aria-label', this.translations()?.PreviousPage?.label);
        } else if (el.classList.contains('next-page')) {
          el.setAttribute('aria-label', this.translations()?.NextPage?.label);
        } else {
          el.setAttribute('aria-label', this.translations()?.NavigationButton?.label);
        }
      }
    });

    const pageSizeEl = document.querySelector('.bh-pagesize');
    if (pageSizeEl && !pageSizeEl.hasAttribute('aria-label')) {
      pageSizeEl.setAttribute('aria-label', this.translations()?.TotalItems?.label);
    }

    const inputs = document.querySelectorAll('.ng-input input');
    inputs.forEach((input: Element) => {
      if (!input.hasAttribute('aria-label')) {
        (input as HTMLInputElement).setAttribute('aria-label', this.translations()?.SelectItem?.label);
      }
    });
  }
  initStore() {
    this.storeData
      .select(({ index, auth }) => ({ index, auth }))
      .subscribe((d) => {
        this.store = d;
      });
  }
  handleSpanClick(requestID: any) {
    console.log(requestID)
    let roleID = JSON.parse(sessionStorage.getItem('user')!).FkRoleID
    this.newApplicationService.getRequest(requestID).subscribe((res: any) => {

      const payload: ServiceApiPayload = {
        FKServiceID: res.ServiceID,
        FKProcessID: res.FkProcessID,
        FKCurrentStatusID: res.FkStatusID,
        FKRoleID: roleID
      };
      // 1. Assemble the data you want to pass
      const navigationState = {
        data: payload,
        RequestID: res.RequestID,
        pageName: this.store.index.locale === 'en' ? res.ServiceTitleEn : res.ServiceTitleAr,
        itemURL: 'Inbox/RequestData'
      };

      // 2. Define a unique key for the data. Using a dynamic value like RequestID is best.
      const uniqueID = res.RequestID; // Assuming RequestID is unique and available
      const storageKey = `requestData`;

      // 3. Save the JSON string to sessionStorage
      sessionStorage.setItem(storageKey, JSON.stringify(navigationState));

      // 4. Generate the URL path *with the key as a query parameter*
      const urlTree = this.router.createUrlTree(['/Inbox/RequestData'], {
        queryParams: { stateKey: storageKey } // <-- This adds the key to the URL
      });

      const url = this.router.serializeUrl(urlTree);

      // 5. Open the URL in a new tab
      window.open(url, '_blank');
      setTimeout(() => {
        sessionStorage.removeItem(storageKey);
      }, 1000)
    })
  }

  // Reset table layout (columns and widths)
  resetTableLayout() {
    // Reset column visibility
    this.resetColumns();

    // Reset column widths in child component


    this.cdr.markForCheck();
  }

  // Handle reset from child component
  onTableReset() {
    this.cdr.markForCheck();
  }

  // Toggle between table and cards view
  toggleViewMode(mode: 'table' | 'cards') {
    this.viewMode = mode;
    this.cdr.markForCheck();
  }

  // Check if license is expired
  isLicenseExpired(row: any): boolean {
    if (!row.LicenseExpirationDate) return false;

    try {
      const expirationDate = new Date(row.LicenseExpirationDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to compare dates only

      return expirationDate < today;
    } catch (error) {
      return false;
    }
  }

  // Get payment method text
  getPaymentMethodText(row: any): string {
    // إذا كان النص موجود، استخدمه
    if (row.PaymentWayAr || row.PaymentWayEn) {
      return this.isArabic ? row.PaymentWayAr : row.PaymentWayEn;
    }

    // إذا لم يكن النص موجود لكن المعرف موجود، استخدم المعرف لتحديد النص
    const paymentId = row.PaymentWay;
    if (paymentId) {
      switch (paymentId) {
        case 2820:
          return this.isArabic ? 'إلكتروني' : 'Electronic';
        case 2821:
          return this.isArabic ? 'يدوي' : 'Manual';
        case 2857:
          return this.isArabic ? 'إلكتروني أوتوماتيك' : 'Electronic Automatic';
        default:
          return this.isArabic ? 'غير معروف' : 'Unknown';
      }
    }

    // إذا لم يكن هناك معرف أو نص
    return this.isArabic ? 'غير محدد' : 'Not specified';
  }

  // Get payment method badge class based on PaymentWay LookupID
  getPaymentBadgeClass(row: any): string {
    const paymentId = row.PaymentWay;

    // إذا لم تكن طريقة الدفع محددة
    if (!paymentId || paymentId === -1 || paymentId === null) {
      return 'bg-gray-100 text-gray-700 border border-gray-200';
    }

    // Based on LookupID with gradient backgrounds
    switch (paymentId) {
      case 2820: // Electronic (إلكتروني)
        return 'bg-gradient-to-br from-green-50 to-green-100 text-green-800 border-2 border-green-300';

      case 2821: // Manual (يدوي)
        return 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-800 border-2 border-blue-300';

      case 2857: // Electronic automatic (إلكتروني أوتوماتيك)
        return 'bg-gradient-to-br from-purple-50 to-purple-100 text-purple-800 border-2 border-purple-300';

      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  }

  // Get license status badge class (for cards view)
  getLicenseStatusClass(row: any): string {
    if (this.isLicenseExpired(row)) {
      return 'bg-red-100 text-red-800 border border-red-200';
    } else if (row.LicenseExpirationDate) {
      return 'bg-green-100 text-green-800 border border-green-200';
    } else {
      return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  }

  // Get license status text
  getLicenseStatusText(row: any): string {
    if (this.isLicenseExpired(row)) {
      return this.isArabic ? 'منتهية' : 'Expired';
    } else if (row.LicenseExpirationDate) {
      return this.isArabic ? 'سارية' : 'Active';
    } else {
      return this.isArabic ? 'غير محدد' : 'N/A';
    }
  }

  // تحديد متى يظهر زر المسح في الـ multi-select
  shouldShowClearButton(fieldName: string): boolean {
    const control = this.searchForm.get(fieldName);
    if (!control) return false;

    const value = control.value;
    // إذا كان array وفيه قيم حقيقية (مش فاضي ومش فيه -1)، يظهر زر المسح
    if (Array.isArray(value)) {
      const realValues = value.filter(v => v !== null && v !== undefined && v !== -1);
      return realValues.length > 0;
    }

    return false;
  }

  // دالة للحصول على placeholder text للـ multi-select
  getPlaceholderText(fieldName: string): string {
    const control = this.searchForm.get(fieldName);
    if (!control) return this.isArabic ? 'من فضلك اختر' : 'Please Choose';

    const value = control.value;
    if (Array.isArray(value)) {
      // تنظيف القيم من -1 تلقائياً
      const cleanValues = value.filter(v => v !== null && v !== undefined && v !== -1);
      if (cleanValues.length !== value.length) {
        // إذا كان فيه قيم -1، نشيلها من الـ form
        control.setValue(cleanValues, { emitEvent: false });
      }

      if (cleanValues.length === 0) {
        return this.isArabic ? 'من فضلك اختر' : 'Please Choose';
      }
    }

    return this.translations()?.all?.label || (this.isArabic ? 'الكل' : 'All');
  }

  // دالة لتنظيف القيم من -1 عند التغيير
  cleanFormValue(fieldName: string, value: any): any {
    if (Array.isArray(value)) {
      return value.filter(v => v !== null && v !== undefined && v !== -1);
    }
    return value === -1 ? null : value;
  }
}

