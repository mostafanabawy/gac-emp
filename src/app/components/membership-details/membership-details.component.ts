import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { FlatpickrModule } from 'angularx-flatpickr';
import { LicensesService } from '../../service/licenses.service';
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
  selector: 'app-membership-details',
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
  templateUrl: './membership-details.component.html',
  styleUrl: './membership-details.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MembershipDetailsComponent implements OnInit {
  @ViewChild('feesTable') feesTable!: FeesTableComponent;

  pageName!: string;
  breadCrumb: any;
  itemURL: any;
  translations = signal<any>({});
  store!: AppState;
  secondaryActivities: any[] = [];

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
  geographicalAreas: any[] = [];

  allAdministrations: any[] = [];
  allServices: any[] = [];
  allRequests: any[] = [];
  allProcedures: any[] = [];
  allStatuses: any[] = [];
  allGeographicalAreas: any[] = [];

  isArabic: boolean = false;
  toggleColumnsDropdown = false;
  toggleSortDropdown = false;
  isAdvancedSearch = false;
  isSearchCollapsed = true;
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

  // متغيرات لعرض نتائج البحث
  hasExternalFilters: boolean = false;
  externalFiltersInfo: any = {};





  get paginationInfoText(): string {
    const currentPage = this.paginationInfo.CurrentPage || 1;
    const pageSize = this.paginationInfo.PageSize || 5;
    const totalRows = this.paginationInfo.TotalRows || 0;
    const start = totalRows > 0 ? (currentPage - 1) * pageSize + 1 : 0;
    const end = Math.min(currentPage * pageSize, totalRows);
    return totalRows > 0
      ? `${this.translations()?.showing?.label} ${start} ${this.translations()?.to?.label} ${end} ${this.translations()?.of?.label} ${totalRows}`
      : '';
  }

  // دالة لتنسيق رسالة نتائج البحث
  formatSearchResultsMessage(): void {
    if (!this.hasExternalFilters) {
      this.searchCriteria = [];
      return;
    }

    const criteria: any[] = [];
    
    // معرف النادي
    if (this.externalFiltersInfo.FkClubID) {
      const club = this.clubNames.find(c => c.ClubID == this.externalFiltersInfo.FkClubID);
      if (club) {
        criteria.push({
          key: 'FkClubID',
          label: this.translations()?.Club?.label || (this.isArabic ? 'النادي' : 'Club'),
          value: this.isArabic ? club.ClubAr : club.ClubEn
        });
      }
    }

    // تاريخ بداية العضوية
    if (this.externalFiltersInfo.LicenseCreationDateFromMem || this.externalFiltersInfo.LicenseCreationDateToMem) {
      const fromDate = this.externalFiltersInfo.LicenseCreationDateFromMem ? this.formatDisplayDate(this.externalFiltersInfo.LicenseCreationDateFromMem) : '';
      const toDate = this.externalFiltersInfo.LicenseCreationDateToMem ? this.formatDisplayDate(this.externalFiltersInfo.LicenseCreationDateToMem) : '';
      
      let dateValue = '';
      if (fromDate && toDate) {
        dateValue = this.isArabic ? `من ${fromDate} إلى ${toDate}` : `from ${fromDate} to ${toDate}`;
      } else if (fromDate) {
        dateValue = this.isArabic ? `من ${fromDate}` : `from ${fromDate}`;
      } else if (toDate) {
        dateValue = this.isArabic ? `حتى ${toDate}` : `until ${toDate}`;
      }
      
      if (dateValue) {
        criteria.push({
          key: 'LicenseCreationDate',
          label: this.isArabic ? 'تاريخ بداية العضوية' : 'Membership Start Date',
          value: dateValue
        });
      }
    }

    // تاريخ انتهاء العضوية
    if (this.externalFiltersInfo.LicenseExpirationDateFromMem || this.externalFiltersInfo.LicenseExpirationDateToMem) {
      const fromDate = this.externalFiltersInfo.LicenseExpirationDateFromMem ? this.formatDisplayDate(this.externalFiltersInfo.LicenseExpirationDateFromMem) : '';
      const toDate = this.externalFiltersInfo.LicenseExpirationDateToMem ? this.formatDisplayDate(this.externalFiltersInfo.LicenseExpirationDateToMem) : '';
      
      let dateValue = '';
      if (fromDate && toDate) {
        dateValue = this.isArabic ? `من ${fromDate} إلى ${toDate}` : `from ${fromDate} to ${toDate}`;
      } else if (fromDate) {
        dateValue = this.isArabic ? `من ${fromDate}` : `from ${fromDate}`;
      } else if (toDate) {
        dateValue = this.isArabic ? `حتى ${toDate}` : `until ${toDate}`;
      }
      
      if (dateValue) {
        criteria.push({
          key: 'LicenseExpirationDate',
          label: this.isArabic ? 'تاريخ انتهاء العضوية' : 'Membership End Date',
          value: dateValue
        });
      }
    }

    // تحديث searchCriteria لاستخدام الديزاين الموجود
    this.searchCriteria = criteria;
  }

  // دالة لتنسيق التاريخ للعرض
  private formatDisplayDate(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(this.isArabic ? 'ar-SA' : 'en-US');
    } catch {
      return dateString;
    }
  }
  ngAfterViewInit(): void {
    setTimeout(() => this.fixAccessibility(), 1000);
  }
  constructor(
    private fb: FormBuilder,
    private LicensesService: LicensesService,
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
    const userData = sessionStorage.getItem('user');
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
      console.log('Received URL params in LicenseDetails:', params);

      // Check if we have any filter parameters
      const filterParams = [
        'LicenseCreationDateFrom', 'LicenseCreationDateTo', 'LicenseExpirationDateFrom', 'LicenseExpirationDateTo',
        'LicenseCreationDateFromMem', 'LicenseCreationDateToMem', 'LicenseExpirationDateFromMem', 'LicenseExpirationDateToMem',
        'ServiceID', 'FkSecondaryActivityID', 'ActivityName', 'FkClubID', 'LicenseStatus',
        'DepartmentID', 'SectionID', 'RequestTypeID', 'FkStatusID', 'FkProcessID',
        'ApplicationNumber', 'ApprovedLicense', 'CreationDateFrom', 'CreationDateTo'
      ];

      const hasFilters = filterParams.some(param => params[param]);

      // Load lookups first, then apply filters
      this.LicensesService.getById(null).subscribe(data => {
        this.paymentMethods = data.Lookup?.PaymentWay || [];
        this.departments = data.Lookup?.Departments || [];
        this.clubNames = data.Lookup?.Clubs || [];

        this.allAdministrations = data.Lookup?.Section || [];
        this.allServices = data.Lookup?.Services || [];
        this.allRequests = data.Lookup?.Request || [];
        this.allProcedures = data.Lookup?.Process || [];
        this.allStatuses = data.Lookup?.StatusesLicense || [];
        this.secondaryActivities = data.Lookup?.SecondaryActivity || [];
        this.allGeographicalAreas = data.Lookup?.GeographicalArea || [];

        this.administrations = [...this.allAdministrations];
        this.services = [...this.allServices];
        this.Requests = [...this.allRequests];
        this.procedures = [...this.allProcedures];
        this.requestStatuses = [...this.allStatuses];
        this.geographicalAreas = [...this.allGeographicalAreas];

        // Now apply filters after lookups are loaded
        if (hasFilters) {
          this.hasExternalFilters = true;
          this.externalFiltersInfo = { ...params }; // حفظ المعاملات المستلمة
          
          const patchData: any = {};

          // Handle all possible parameters
          filterParams.forEach(param => {
            if (params[param]) {
              let value = params[param];

              // Handle multi-select fields (convert single values to arrays)
              if (['DepartmentID', 'SectionID', 'ServiceID', 'RequestTypeID', 'FkSecondaryActivityID', 'FkClubID', 'FkStatusID', 'FkProcessID'].includes(param)) {
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
              else if (['ApplicationNumber', 'ApprovedLicense'].includes(param)) {
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

          console.log('Applied filters from URL in LicenseDetails:', patchData);
          this.searchForm.patchValue(patchData);

          // تحديث رسالة نتائج البحث
          this.formatSearchResultsMessage();

          // Search with filters and HIDE search (coming from external source)
          this.search(true);
        } else {
          this.hasExternalFilters = false;
          this.searchCriteria = [];
          // بحث تلقائي لعرض الجدول - البحث يبقى ظاهر
          this.search(false);
        }

        this.cdr.markForCheck();
      });
    });
    // Initialize page info for breadcrumb with fallback
    this.itemURL = history.state.menuData?.ItemURL || 'LicenseDetails';
    this.pageName = history.state.menuData?.TitleAr || history.state.menuData?.TitleEn ||
      (this.isArabic ? 'تفاصيل الرخص' : 'License Details');

    const t = this.translations();

    // ترتيب الأعمدة حسب طلب المستخدم: رقم الطلب → رقم العضوية → التواريخ → الحالة
    this.cols = [
      { field: 'expand', title: '', sort: false, visible: true, fixed: true, width: '50px' },
      { field: 'serial', title: '#', sort: false, isNumber: true, visible: true, fixed: true, width: '60px' },
      { field: 'openRequest', title: this.isArabic ? 'فتح الطلب' : 'Open Request', sort: false, visible: true, fixed: true, width: '100px' },
      // الأعمدة الأساسية
      { field: 'ApplicationNumber', title: t?.requestNumber?.label || (this.isArabic ? 'رقم الطلب' : 'Request Number'), sort: true, visible: true, width: '150px', isNumber: true },
      { field: 'ApprovedLicense', title: this.isArabic ? 'رقم العضوية' : 'Membership Number', sort: true, visible: true, width: '180px', isNumber: true },
      { field: 'LicenseCreationDate', title: this.isArabic ? 'تاريخ بداية العضوية' : 'Membership Start Date', sort: true, visible: true, width: '160px' },
      { field: 'LicenseExpirationDate', title: this.isArabic ? 'تاريخ انتهاء العضوية' : 'Membership End Date', sort: true, visible: true, width: '160px' },
      { field: 'CreationDate', title: t?.creationDate?.label || (this.isArabic ? 'تاريخ تقديم الطلب' : 'Request Creation Date'), sort: true, visible: true, width: '160px' },

      { field: this.isArabic ? 'DeptAr' : 'DeptEn', title: t?.DepartmentID?.label, sort: true, visible: false, width: '200px' },
      { field: this.isArabic ? 'SectionAr' : 'SectionEn', title: t?.Section?.label, sort: true, visible: false, width: '180px' },
      { field: this.isArabic ? 'ReqTypeAr' : 'ReqTypeEn', title: t?.RequestTypeID?.label, sort: true, visible: false, width: '180px' },
      { field: this.isArabic ? 'ServiceTitleAr' : 'ServiceTitleEn', title: t?.ServiceType?.label, sort: true, visible: true, width: '250px' },
      { field: this.isArabic ? 'ClubAr' : 'ClubEn', title: t?.Club?.label || (this.isArabic ? 'النادي' : 'Club'), sort: true, visible: true, width: '180px' },
      { field: this.isArabic ? 'StatusAr' : 'StatusEn', title: t?.Status?.label, sort: true, visible: true, width: '150px', featured: true },
      { field: this.isArabic ? 'ProcessAr' : 'ProcessEn', title: t?.ProcessID?.label, sort: true, visible: true, width: '180px' },
      { field: this.isArabic ? 'SecondaryActivityAr' : 'SecondaryActivityEn', title: t?.SecondaryActivity?.label, sort: true, visible: false, width: '250px' },
      { field: 'HeadquarterGeographicalArea', title: this.isArabic ? 'المنطقة الجغرافية' : 'Geographical Area', sort: true, visible: false, width: '200px' },
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
      col => col.field === 'LicenseCreationDate'
    ) || this.sortableColumns[0];

    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }




  initializeForm() {
    this.searchForm = this.fb.group({
      ReportName: ['MembershipDetails'],
      FkStatusID: [[]],
      FkProcessID: [[]],
      FkClubID: [[]],
      ApprovedLicense: [null],
      LicenseCreationDateFromMem: [null],
      LicenseCreationDateToMem: [null],
      LicenseExpirationDateFromMem: [null],
      LicenseExpirationDateToMem: [null],
      CreationDateFrom: [null],
      CreationDateTo: [null],
      PageSize: [10],
      PageNum: [1],
      SortField: ['LicenseCreationDate'],
      SortDirection: [2]
    });

    // إضافة listener لتنظيف القيم من -1 تلقائياً
    this.setupFormValueCleaning();
  }

  // دالة لتنظيف القيم من -1 تلقائياً
  setupFormValueCleaning() {
    const multiSelectFields = ['FkStatusID', 'FkProcessID', 'FkClubID'];

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

    // إضافة console.log لمراقبة البيانات المرسلة
    console.log('Search payload:', searchPayload);
    console.log('FkSecondaryActivityID in payload:', searchPayload.FkSecondaryActivityID);

    // بناء معايير البحث للعرض
    this.buildSearchCriteria(formValue);

    // تحديد إذا كان البحث متقدم وفيه قيم
    const hasAdvancedSearchValues = this.hasAdvancedSearchValues(formValue);

    this.isLoading = true;

    this.LicensesService.search(searchPayload).subscribe(
      data => {
        console.log('Search results:', data);

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
    // الحقول المتقدمة (غير الحقول الأساسية)
    const advancedFields = [
      'LicenseCreationDateFromMem', 'LicenseCreationDateToMem',
      'LicenseExpirationDateFromMem', 'LicenseExpirationDateToMem',
      'CreationDateFrom', 'CreationDateTo'
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

    if (formValue.ApprovedLicense) {
      this.searchCriteria.push({
        label: t?.licenseNumber?.label || (this.isArabic ? 'رقم الرخصة' : 'License Number'),
        value: formValue.ApprovedLicense,
        key: 'ApprovedLicense'
      });
    }

    if (Array.isArray(formValue.FkClubID) && formValue.FkClubID.length > 0) {
      const selectedClubs = this.clubNames.filter((c: any) => formValue.FkClubID.includes(c.LookupID));
      if (selectedClubs.length > 0) {
        const values = selectedClubs.map((c: any) => this.isArabic ? c.TitleAr : c.TitleEn).join(', ');
        this.searchCriteria.push({
          label: t?.Club?.label || (this.isArabic ? 'النادي' : 'Club'),
          value: values,
          key: 'FkClubID'
        });
      }
    }

    if (Array.isArray(formValue.FkStatusID) && formValue.FkStatusID.length > 0) {
      const selectedStatuses = this.requestStatuses.filter((s: any) => formValue.FkStatusID.includes(s.LookupID));
      if (selectedStatuses.length > 0) {
        const values = selectedStatuses.map((s: any) => this.isArabic ? s.TitleAr : s.TitleEn).join(', ');
        this.searchCriteria.push({
          label: t?.Status?.label || (this.isArabic ? 'الحالة' : 'Status'),
          value: values,
          key: 'FkStatusID'
        });
      }
    }

    if (Array.isArray(formValue.FkProcessID) && formValue.FkProcessID.length > 0) {
      const selectedProcedures = this.procedures.filter((p: any) => formValue.FkProcessID.includes(p.LookupID));
      if (selectedProcedures.length > 0) {
        const values = selectedProcedures.map((p: any) => this.isArabic ? p.TitleAr : p.TitleEn).join(', ');
        this.searchCriteria.push({
          label: t?.ProcessID?.label || (this.isArabic ? 'الإجراء' : 'Procedure'),
          value: values,
          key: 'FkProcessID'
        });
      }
    }

    // التواريخ
    if (formValue.LicenseCreationDateFromMem || formValue.LicenseCreationDateToMem) {
      const fromDate = formValue.LicenseCreationDateFromMem || '';
      const toDate = formValue.LicenseCreationDateToMem || '';
      this.searchCriteria.push({
        label: this.isArabic ? 'تاريخ بداية العضوية' : 'Membership Start Date',
        value: `${fromDate} ${fromDate && toDate ? '-' : ''} ${toDate}`.trim(),
        key: 'LicenseCreationDate'
      });
    }

    if (formValue.LicenseExpirationDateFromMem || formValue.LicenseExpirationDateToMem) {
      const fromDate = formValue.LicenseExpirationDateFromMem || '';
      const toDate = formValue.LicenseExpirationDateToMem || '';
      this.searchCriteria.push({
        label: this.isArabic ? 'تاريخ انتهاء العضوية' : 'Membership End Date',
        value: `${fromDate} ${fromDate && toDate ? '-' : ''} ${toDate}`.trim(),
        key: 'LicenseExpirationDate'
      });
    }

    if (formValue.CreationDateFrom || formValue.CreationDateTo) {
      const fromDate = formValue.CreationDateFrom || '';
      const toDate = formValue.CreationDateTo || '';
      this.searchCriteria.push({
        label: t?.creationDate?.label || (this.isArabic ? 'تاريخ تقديم الطلب' : 'Request Creation Date'),
        value: `${fromDate} ${fromDate && toDate ? '-' : ''} ${toDate}`.trim(),
        key: 'CreationDate'
      });
    }
  }

  // إزالة معيار بحث واحد
  removeCriteria(key: string) {
    // إذا كان من الفلاتر الخارجية، قم بإزالته من المعايير وإعادة البحث
    if (this.hasExternalFilters) {
      // إزالة المعيار من searchCriteria
      this.searchCriteria = this.searchCriteria.filter(c => c.key !== key);
      
      // إزالة من externalFiltersInfo
      if (key === 'FkClubID') {
        delete this.externalFiltersInfo.FkClubID;
      } else if (key === 'LicenseCreationDate') {
        delete this.externalFiltersInfo.LicenseCreationDateFromMem;
        delete this.externalFiltersInfo.LicenseCreationDateToMem;
      } else if (key === 'LicenseExpirationDate') {
        delete this.externalFiltersInfo.LicenseExpirationDateFromMem;
        delete this.externalFiltersInfo.LicenseExpirationDateToMem;
      }
      
      // إذا لم تعد هناك معايير، أخفي الفلاتر الخارجية
      if (this.searchCriteria.length === 0) {
        this.hasExternalFilters = false;
      }
    }

    // مسح القيمة من الفورم
    if (key === 'LicenseCreationDate') {
      this.searchForm.patchValue({
        LicenseCreationDateFromMem: null,
        LicenseCreationDateToMem: null
      });
    } else if (key === 'LicenseExpirationDate') {
      this.searchForm.patchValue({
        LicenseExpirationDateFromMem: null,
        LicenseExpirationDateToMem: null
      });
    } else if (key === 'CreationDate') {
      this.searchForm.patchValue({
        CreationDateFrom: null,
        CreationDateTo: null
      });
    } else if (key === 'FkClubID') {
      this.searchForm.patchValue({ FkClubID: [] });
    } else if (key === 'FkStatusID') {
      this.searchForm.patchValue({ FkStatusID: [] });
    } else if (key === 'FkProcessID') {
      this.searchForm.patchValue({ FkProcessID: [] });
    } else if (key === 'ApprovedLicense') {
      this.searchForm.patchValue({ ApprovedLicense: null });
    } else {
      const control = this.searchForm.get(key);
      if (control) {
        // For multi-select fields, set to empty array
        if (['DepartmentID', 'SectionID', 'ServiceID', 'RequestTypeID', 'FkStatusID', 'FkProcessID', 'FkSecondaryActivityID'].includes(key)) {
          control.setValue([]);
        } else if (typeof control.value === 'number') {
          control.setValue(-1);
        } else {
          control.setValue(null);
        }
      }
    }

    // إعادة البحث وتوسيع البحث لو مسحنا آخر معيار
    if (this.searchCriteria.length === 0) {
      this.isSearchCollapsed = false;
    }
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
    this.currentSortField = 'LicenseCreationDate';
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
      if (['FkStatusID', 'FkProcessID', 'FkClubID'].includes(fieldName)) {
        control.setValue([]);
      } else {
        control.setValue(-1);
      }
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
        FkStatusID: [],
        FkProcessID: [],
        FkClubID: [],
        ApprovedLicense: null,
        LicenseCreationDateFromMem: null,
        LicenseCreationDateToMem: null,
        LicenseExpirationDateFromMem: null,
        LicenseExpirationDateToMem: null,
        CreationDateFrom: null,
        CreationDateTo: null
      });
    }

    this.cdr.markForCheck();
  }

  onRowClick(event: any) {
    this.toggleRowExpand(event.row.RequestID);
  }

  toggleRowExpand(requestId: any) {
    if (this.expandedRow?.RequestID === requestId) {
      this.expandedRow = null;
      this.expandedRowDetails = [];
    } else {
      this.expandedRow = this.rows.find(row => row.RequestID === requestId);
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
        } else if (col.field.includes('HeadquarterGeographicalArea')) {
          value = row.HeadquarterGeographicalArea;
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
    } else if (col.field.includes('HeadquarterGeographicalArea')) {
      value = row.HeadquarterGeographicalArea;
    }

    // إصلاح الأرقام المقلوبة - نتأكد إنها string
    if (value && col.isNumber) {
      value = String(value);
    }

    return value || '-';
  }

  // دالة لتحديد الأعمدة اللي تتخفي في الموبايل
  shouldHideOnMobile(field: string): boolean {
    const showFields = ['expand', 'serial', 'openRequest'];
    return !showFields.includes(field);
  }

  // Get membership status badge class based on FkStatusID
  getStatusBadgeClass(row: any): string {
    const statusId = row.FkStatusID;

    if (!statusId) return 'inline-flex px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-700';

    // Based on status ID provided by user
    switch (statusId) {
      case 2098: // عضوية سارية - Valid membership
        return 'inline-flex px-2 py-1 rounded text-xs font-semibold bg-gradient-to-br from-green-50 to-green-100 text-green-700 border-2 border-green-300';

      case 2099: // عضوية منتهية - Finished membership
        return 'inline-flex px-2 py-1 rounded text-xs font-semibold bg-gradient-to-br from-blue-50 to-blue-100 text-blue-800 border-2 border-blue-300';

      case 2100: // عضوية معلقة - Suspended membership
        return 'inline-flex px-2 py-1 rounded text-xs font-semibold bg-gradient-to-br from-orange-50 to-orange-100 text-orange-700 border-2 border-orange-300';

      case 2101: // عضوية ساقطة - Voided membership
        return 'inline-flex px-2 py-1 rounded text-xs font-semibold bg-gradient-to-br from-red-50 to-red-100 text-red-800 border-2 border-red-300';

      case 2105: // عضو مستقيل - Resigned
        return 'inline-flex px-2 py-1 rounded text-xs font-semibold bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 border-2 border-gray-300';

      case 2106: // عضوية مسحوبة - Withdrawed
        return 'inline-flex px-2 py-1 rounded text-xs font-semibold bg-red-900 text-red-100 border-2 border-red-800';

      default:
        return 'inline-flex px-2 py-1 rounded text-xs font-semibold bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 border-2 border-gray-300';
    }
  }

  // دالة إعادة تعيين الفورم
  resetForm() {
    // Get current URL parameters to preserve them
    const currentParams = this.route.snapshot.queryParams;

    const resetData: any = {
      ReportName: 'MembershipDetails',
      FkStatusID: [],
      FkProcessID: [],
      FkClubID: [],
      ApprovedLicense: null,
      LicenseCreationDateFromMem: null,
      LicenseCreationDateToMem: null,
      LicenseExpirationDateFromMem: null,
      LicenseExpirationDateToMem: null,
      CreationDateFrom: null,
      CreationDateTo: null,
      PageSize: 10,
      PageNum: 1,
      SortField: 'LicenseCreationDate',
      SortDirection: 2
    };

    // Preserve URL parameters - البيانات اللي جاية من الداشبورد
    if (currentParams['LicenseCreationDateFrom']) {
      resetData.LicenseCreationDateFromMem = currentParams['LicenseCreationDateFrom'];
    }
    if (currentParams['LicenseCreationDateTo']) {
      resetData.LicenseCreationDateToMem = currentParams['LicenseCreationDateTo'];
    }
    if (currentParams['LicenseExpirationDateFrom']) {
      resetData.LicenseExpirationDateFromMem = currentParams['LicenseExpirationDateFrom'];
    }
    if (currentParams['LicenseExpirationDateTo']) {
      resetData.LicenseExpirationDateToMem = currentParams['LicenseExpirationDateTo'];
    }
    if (currentParams['ServiceID']) {
      resetData.ServiceID = [parseInt(currentParams['ServiceID'])];
    }
    if (currentParams['FkSecondaryActivityID']) {
      const activityId = currentParams['FkSecondaryActivityID'];
      resetData.FkSecondaryActivityID = !isNaN(Number(activityId)) ? [Number(activityId)] : [activityId];
    }
    if (currentParams['ActivityName']) {
      resetData.ActivityName = currentParams['ActivityName'];
    }
    if (currentParams['LicenseSecondActivity']) {
      resetData.LicenseSecondActivity = currentParams['LicenseSecondActivity'];
    }

    // إعادة تعيين الفورم مع الاحتفاظ بالـ URL parameters
    this.searchForm.reset(resetData);

    // إعادة تعيين القوائم للحالة الأصلية
    this.administrations = [...this.allAdministrations];
    this.services = [...this.allServices];
    this.Requests = [...this.allRequests];

    this.cdr.markForCheck();
    this.search();
  }

  // دالة تصدير لـ Excel - جلب كل النتائج بتنسيق RTL
  exportToExcel() {
    // التحقق من وجود بيانات
    if (!this.rows || this.rows.length === 0) {
      alert(this.isArabic ? 'لا توجد بيانات للتصدير' : 'No data to export');
      return;
    }

    // إنشاء payload لجلب كل النتائج
    const formValue = this.searchForm.value;
    const exportPayload = Object.keys(formValue).reduce((acc, key) => {
      acc[key] = formValue[key] === -1 ? null : formValue[key];
      return acc;
    }, {} as any);

    // تغيير PageSize لجلب كل النتائج
    exportPayload.PageSize = 999999;
    exportPayload.PageNum = 1;

    this.isLoading = true;
    this.cdr.markForCheck();

    // جلب كل البيانات
    this.LicensesService.search(exportPayload).subscribe(
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
            } else if (field.includes('Club')) {
              value = this.isArabic ? item.ClubAr : item.ClubEn;
            } else if (field.includes('PaymentWay')) {
              value = this.isArabic ? item.PaymentWayAr : item.PaymentWayEn;
            } else if (field.includes('HeadquarterGeographicalArea')) {
              value = item.HeadquarterGeographicalArea;
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
        XLSX.utils.book_append_sheet(wb, ws, this.isArabic ? 'بيانات العضويات' : 'Membership Details');

        // تطبيق RTL على الـ workbook
        if (this.isArabic) {
          if (!wb.Workbook) wb.Workbook = {};
          if (!wb.Workbook.Views) wb.Workbook.Views = [];
          wb.Workbook.Views[0] = { RTL: true };
        }

        const filename = this.isArabic ? 'تقرير_بيانات_العضويات.xlsx' : 'Membership_Details_Report.xlsx';
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

  // Get payment method badge class based on PaymentWay LookupID
  getPaymentBadgeClass(row: any): string {
    const paymentId = row.PaymentWay;

    if (!paymentId || paymentId === -1) return 'bg-gray-100 text-gray-700 border border-gray-200';

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

  // Get membership status badge class (for cards view)
  getMembershipStatusClass(row: any): string {
    return this.getStatusBadgeClass(row);
  }

  // Get membership status text
  getMembershipStatusText(row: any): string {
    const statusId = row.FkStatusID;
    if (!statusId) return this.isArabic ? 'غير محدد' : 'N/A';

    switch (statusId) {
      case 2098: return this.isArabic ? 'عضوية سارية' : 'Valid membership';
      case 2099: return this.isArabic ? 'عضوية منتهية' : 'Finished membership';
      case 2100: return this.isArabic ? 'عضوية معلقة' : 'Suspended membership';
      case 2101: return this.isArabic ? 'عضوية ساقطة' : 'Voided membership';
      case 2105: return this.isArabic ? 'عضو مستقيل' : 'Resigned';
      case 2106: return this.isArabic ? 'عضوية مسحوبة' : 'Withdrawed';
      default: return this.isArabic ? 'غير محدد' : 'N/A';
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

    return this.isArabic ? 'من فضلك اختر' : 'Please Choose';
  }

  // دالة لتنظيف القيم من -1 عند التغيير
  cleanFormValue(fieldName: string, value: any): any {
    if (Array.isArray(value)) {
      return value.filter(v => v !== null && v !== undefined && v !== -1);
    }
    return value === -1 ? null : value;
  }


}

