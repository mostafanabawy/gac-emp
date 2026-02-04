import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { FlatpickrModule } from 'angularx-flatpickr';
import { LicensesService } from '../../service/licenses.service';
import { LocalizationService } from 'src/app/service/localization.service';
import { TranslateService } from '@ngx-translate/core';
import { ComponentsModule } from "../components.module";
import { basic } from 'src/app/helpers/date-helper';
import { animate, style, transition, trigger, query, stagger } from '@angular/animations';
import * as XLSX from 'xlsx';
import { Router } from '@angular/router';
import { DashboardService } from 'src/app/service/dashboard/dashboard.service';

@Component({
  selector: 'app-total-rpt',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgSelectModule,
    FlatpickrModule,
    ComponentsModule,
    FormsModule
  ],
  templateUrl: './total-rpt.component.html',
  styleUrl: './total-rpt.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('listAnimation', [
      transition('* <=> *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger('50ms', animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })))
        ], { optional: true })
      ])
    ]),
    trigger('cardAnimation', [
      transition(':enter', [
        style({ opacity: 0, scale: 0.9 }),
        animate('400ms cubic-bezier(0.175, 0.885, 0.32, 1.275)', style({ opacity: 1, scale: 1 }))
      ])
    ])
  ]
})
export class TotalRPTComponent implements OnInit {
  searchForm!: FormGroup;
  isLoading = false;
  isSearchCollapsed = false;
  isArabic = false;
  translations = signal<any>({});
  basic = basic;

  // Lookups
  departments: any[] = [];
  sections: any[] = [];
  services: any[] = [];
  requestTypes: any[] = [];
  clubs: any[] = [];
  statuses: any[] = [];
  processes: any[] = [];
  secondaryActivities: any[] = [];
  paymentWays: any[] = [];
  submissionWays: any[] = [];
  // Data
  rows: any[] = [];
  totals: any = null;
  clubsData: any[] = [];
  clubsTotals: any = null;
  hasMembershipsData: boolean = true; // Show clubs by default

  // Expandable sections state
  expandedSections = {
    totals: true,    // الإجماليات مفتوحة بشكل افتراضي
    services: false, // الخدمات مغلقة بشكل افتراضي
    clubs: false     // الأندية مغلقة بشكل افتراضي
  };

  // Search terms for each section
  sectionSearchTerms = {
    services: '',
    clubs: ''
  };

  // Expandable totals categories state
  expandedTotalsCategories = {
    fees: true,
    requests: true,
    requestTypes: true,
    licenses: true,
    membership: true
  };

  // Filtered data arrays
  filteredServicesData: any[] = [];
  filteredClubsData: any[] = [];

  // Expanded row state for services table
  expandedServiceRow: any = null;
  expandedServiceRowDetails: any[] = [];

  // Expanded row state for clubs table
  expandedClubRow: any = null;
  expandedClubRowDetails: any[] = [];

  // Process reference control
  showProcessReference: boolean = false;

  // Sorting state
  currentServicesSortField: string = 'ServiceID';
  currentServicesSortDirection: number = 1; // 1 = ASC, 2 = DESC

  currentClubsSortField: string = 'clubName';
  currentClubsSortDirection: number = 1;

  // View mode and controls state
  viewMode: string = 'table';
  toggleSortDropdown: boolean = false;
  toggleColumnsDropdown: boolean = false;
  selectedSortColumn: any = null;
  allColumns: any[] = [];
  sortableColumns: any[] = [];
  currentSortDirection: number = 1; // Add this for the dropdown controls

  constructor(
    private fb: FormBuilder,
    private licensesService: LicensesService,
    private localizationService: LocalizationService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private dashboardService: DashboardService,

  ) { }

  ngOnInit(): void {
    setTimeout(() => this.fixAccessibility(), 1000);
    this.isArabic = this.translate.currentLang === 'ae';
    this.translations.set(this.localizationService.getTranslations());
    this.initializeForm();
    this.loadLookups();
    this.updateAllColumns();
    this.search();
    this.hasmemberships();
    // Add click listener to close dropdowns
    document.addEventListener('click', () => {
      this.toggleSortDropdown = false;
      this.toggleColumnsDropdown = false;
      this.cdr.markForCheck();
    });
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

  initializeForm() {
    this.searchForm = this.fb.group({
      PageSize: [10000],
      PageNum: [1],
      SortField: ['ServiceID'],
      FeesPaymentDateFrom: [null],
      FeesPaymentDateTo: [null],
      LicenseCreationDateFrom: [null],
      LicenseCreationDateTo: [null],
      LicenseExpirationDateFrom: [null],
      LicenseExpirationDateTo: [null],
      CreationDateFrom: [null],
      CreationDateTo: [null],
      DepartmentID: [[]],  // Multi-select array
      SectionID: [[]],     // Multi-select array
      ServiceID: [[]],     // Multi-select array
      RequestTypeID: [[]],  // Multi-select array
      PaymentWay: [[]],    // Multi-select array
      SubmissionWay: [[]],  // Multi-select array
      FkClubID: [[]],      // Multi-select array
      FkStatusID: [[]],    // Multi-select array
      FkProcessID: [[]],   // Multi-select array
      FeesValue: [null],
      FkSecondaryActivityID: [[]], // Multi-select array
      ProcessLookupID: [null]
    });
  }

  loadLookups() {
    this.licensesService.getById(null).subscribe(data => {
      this.departments = data.Lookup?.Departments || [];
      this.sections = data.Lookup?.Section || [];
      this.services = data.Lookup?.Services || [];
      this.requestTypes = data.Lookup?.Request || [];
      this.clubs = data.Lookup?.Clubs || [];
      this.statuses = data.Lookup?.Statuses || [];
      this.processes = data.Lookup?.Process || [];
      this.secondaryActivities = data.Lookup?.SecondaryActivity || [];
      this.paymentWays = data.Lookup?.PaymentWay || [];
      this.submissionWays = data.Lookup?.SubmissionWay || [];
      this.cdr.markForCheck();
    });
  }
  formatDate(date: any): string | null {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  search() {
    this.isLoading = true;
    this.isSearchCollapsed = false;
    const formValue = this.searchForm.value;

    // تحويل ProcessLookupID إلى FkProcessID إذا تم إدخاله
    if (formValue.ProcessLookupID && !formValue.FkProcessID?.includes(formValue.ProcessLookupID)) {
      const currentProcesses = formValue.FkProcessID || [];
      formValue.FkProcessID = [...currentProcesses, formValue.ProcessLookupID];
    }

    const payload = {
      ...formValue,
      FeesPaymentDateFrom: this.formatDate(formValue.FeesPaymentDateFrom),
      FeesPaymentDateTo: this.formatDate(formValue.FeesPaymentDateTo),
      LicenseCreationDateFrom: this.formatDate(formValue.LicenseCreationDateFrom),
      LicenseCreationDateTo: this.formatDate(formValue.LicenseCreationDateTo),
      LicenseExpirationDateFrom: this.formatDate(formValue.LicenseExpirationDateFrom),
      LicenseExpirationDateTo: this.formatDate(formValue.LicenseExpirationDateTo),
      CreationDateFrom: this.formatDate(formValue.CreationDateFrom),
      CreationDateTo: this.formatDate(formValue.CreationDateTo)
    };

    // إزالة ProcessLookupID من الـ payload لأنه مجرد helper field
    delete payload.ProcessLookupID;

    this.licensesService.searchGetTotalRPT(payload).subscribe({
      next: (res) => {
        this.rows = res.resultData || [];
        this.totals = res.Totals?.[0] || null;
        this.clubsData = res.resultClubs || [];
        this.clubsTotals = res.TotalClubs?.[0] || null;

        // Initialize filtered data
        this.initializeFilteredData();

        this.isLoading = false;
        if (this.rows.length > 0) this.isSearchCollapsed = true;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Search error', err);
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // Initialize filtered data arrays
  initializeFilteredData() {
    this.filteredServicesData = [...this.servicesTableData];
    this.filteredClubsData = [...this.clubsTableData];
  }

  // Search functions for each section
  searchInSection(section: 'services' | 'clubs') {
    const searchTerm = this.sectionSearchTerms[section].toLowerCase().trim();

    switch (section) {
      case 'services':
        if (!searchTerm) {
          this.filteredServicesData = [...this.servicesTableData];
        } else {
          this.filteredServicesData = this.servicesTableData.filter(item =>
            item.serviceName?.toLowerCase().includes(searchTerm) ||
            item.ServiceID?.toString().includes(searchTerm) ||
            item.totalFees?.toString().includes(searchTerm) ||
            item.totalRequests?.toString().includes(searchTerm)
          );
        }
        break;

      case 'clubs':
        if (!searchTerm) {
          this.filteredClubsData = [...this.clubsTableData];
        } else {
          this.filteredClubsData = this.clubsTableData.filter(item =>
            item.clubName?.toLowerCase().includes(searchTerm) ||
            item.totalFeesClub?.toString().includes(searchTerm) ||
            item.totalClubLicenses?.toString().includes(searchTerm)
          );
        }
        break;
    }

    this.cdr.markForCheck();
  }
  // Clear search for specific section
  clearSectionSearch(section: 'services' | 'clubs') {
    this.sectionSearchTerms[section] = '';
    this.searchInSection(section);
  }

  // Toggle totals categories
  toggleTotalsCategory(category: 'fees' | 'requests' | 'requestTypes' | 'licenses' | 'membership') {
    this.expandedTotalsCategories[category] = !this.expandedTotalsCategories[category];
    this.cdr.markForCheck();
  }

  // Helper method to get process by LookupID
  getProcessByLookupID(lookupID: number): any {
    return this.processes.find(process => process.LookupID === lookupID);
  }

  // Method to search and auto-select process by LookupID
  onProcessLookupIDChange() {
    const lookupID = this.searchForm.get('ProcessLookupID')?.value;
    if (lookupID && this.processes.length > 0) {
      const process = this.getProcessByLookupID(lookupID);
      if (process) {
        // Auto-select the process in the FkProcessID dropdown
        const currentProcesses = this.searchForm.get('FkProcessID')?.value || [];
        if (!currentProcesses.includes(process.LookupID)) {
          this.searchForm.get('FkProcessID')?.setValue([...currentProcesses, process.LookupID]);
          this.cdr.markForCheck();
        }
      }
    }
  }

  // دالة لمسح ProcessLookupID
  clearProcessLookupID() {
    this.searchForm.get('ProcessLookupID')?.setValue(null);
    this.cdr.markForCheck();
  }

  resetForm() {
    this.searchForm.reset({
      PageSize: 10000,
      PageNum: 1,
      SortField: 'ServiceID',
      DepartmentID: [],
      SectionID: [],
      ServiceID: [],
      RequestTypeID: [],
      PaymentWay: [],
      SubmissionWay: [],
      FkClubID: [],
      FkStatusID: [],
      FkProcessID: [],
      ProcessLookupID: null,
      FkSecondaryActivityID: []
    });
    this.showProcessReference = false;
    this.search();
  }

  toggleSearch() {
    this.isSearchCollapsed = !this.isSearchCollapsed;
    this.cdr.markForCheck();
  }

  // Toggle expandable sections
  toggleSection(section: 'totals' | 'services' | 'clubs') {
    if (this.expandedSections[section]) {
      this.expandedSections[section] = false;
    } else {
      Object.keys(this.expandedSections).forEach(key => {
        this.expandedSections[key as keyof typeof this.expandedSections] = false;
      });
      this.expandedSections[section] = true;
    }
    this.cdr.markForCheck();
  }
  // New method to handle tab navigation from cards
  openTabSection(section: 'totals' | 'services' | 'clubs') {
    Object.keys(this.expandedSections).forEach(key => {
      this.expandedSections[key as keyof typeof this.expandedSections] = false;
    });

    this.expandedSections[section] = true;

    if (section === 'totals') {
      this.expandedTotalsCategories = {
        fees: true,
        requests: true,
        requestTypes: true,
        licenses: true,
        membership: true
      };
    }

    this.cdr.markForCheck();

    // Auto-scroll to the section after a delay to allow the section to expand
    setTimeout(() => {
      const sectionId = `${section}-section`;
      const element = document.getElementById(sectionId);
      if (element) {
        // Get the element's position
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - 120; // 120px offset from top for header

        // Smooth scroll to the calculated position
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }, 400); // Longer delay to ensure section is fully expanded
  }

  // Handle service row expand
  onServiceRowExpand(ServiceID: any) {
    const service = this.rows.find(s => s.ServiceID === ServiceID);
    if (!service) return;

    if (this.expandedServiceRow && this.expandedServiceRow.ServiceID === ServiceID) {
      this.expandedServiceRow = null;
      this.expandedServiceRowDetails = [];
    } else {
      this.expandedServiceRow = service;
      this.expandedServiceRowDetails = [];
    }

    this.cdr.markForCheck();
  }

  // Handle club row expand
  onClubRowExpand(clubId: any) {
    const club = this.clubsTableData.find(c => c.id === clubId);
    if (!club) return;

    if (this.expandedClubRow && this.expandedClubRow.id === clubId) {
      this.expandedClubRow = null;
      this.expandedClubRowDetails = [];
    } else {
      this.expandedClubRow = club;
      this.expandedClubRowDetails = [];
    }

    this.cdr.markForCheck();
  }

  // Navigation method to clubs dashboard
  navigateToClubsDashboard() {
    this.router.navigate(['/ClubsDashboard']);
  }

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
  // Track by functions
  trackByServiceId(index: number, service: any): any {
    return service.ServiceID;
  }

  trackByClubId(index: number, club: any): any {
    return club.id || club.FkClubID || index;
  }

  // Helper methods
  hasValidMembership(service: any): boolean {
    return (service.validMembership > 0) ||
      (service.finishedMembership > 0) ||
      (service.suspendedMembership > 0) ||
      (service.voidedMembership > 0) ||
      (service.resignedMembership > 0) ||
      (service.withdrawedMembership > 0);
  }

  hasValidClubMembership(club: any): boolean {
    return (club.totalValidMembershipClub > 0) ||
      (club.totalFinishedMembershipClub > 0) ||
      (club.totalSuspendedMembershipClub > 0) ||
      (club.totalVoidedMembershipClub > 0) ||
      (club.totalResignedMembershipClub > 0) ||
      (club.totalWithdrawedMembershipClub > 0);
  }

  updateAllColumns() {
    // This method will be implemented when needed for column management
    this.allColumns = [];
    this.sortableColumns = [];
  }

  // Getter methods for computed properties
  get totalsData() {
    if (!this.totals) return [];

    return [{
      label: this.isArabic ? 'اجمالى الرسوم' : 'Total Fees',
      value: this.totals.TotalFees || 0
    }, {
      label: this.isArabic ? 'الكترونى' : 'Electronic Fees',
      value: this.totals.TotalElectronicFees || 0
    }, {
      label: this.isArabic ? 'يدوى' : 'Manual Fees',
      value: this.totals.TotalManualFees || 0
    }, {
      label: this.isArabic ? 'اجمالى الطلبات' : 'Total Requests',
      value: this.totals.TotalRequests || 0
    }, {
      label: this.isArabic ? 'اونلاين' : 'Online Requests',
      value: this.totals.TotalOnlineRequests || 0
    }, {
      label: this.isArabic ? 'موظف' : 'Employee Requests',
      value: this.totals.TotalEmpRequests || 0
    }, {
      label: this.isArabic ? 'تم الموافقة' : 'Approved Requests',
      value: this.totals.TotalApprovedRequests || 0
    }, {
      label: this.isArabic ? 'تم الرفض' : 'Rejected Requests',
      value: this.totals.TotalRejectedRequests || 0
    }, {
      label: this.isArabic ? 'طلب جديد' : 'New Requests',
      value: this.totals.TotalNewRequests || 0
    }, {
      label: this.isArabic ? 'طلب تعديل بيانات' : 'Edit Requests',
      value: this.totals.TotalEditRequests || 0
    }, {
      label: this.isArabic ? 'طلب تجديد' : 'Renew Requests',
      value: this.totals.TotalRenewRequests || 0
    }, {
      label: this.isArabic ? 'طلب إلغاء' : 'Cancel Requests',
      value: this.totals.TotalCancelRequests || 0
    }, {
      label: this.isArabic ? 'اجمالى التراخيص' : 'Total Licenses',
      value: this.totals.TotalLicenses || 0
    }, {
      label: this.isArabic ? 'رخصة سارية' : 'Valid Licenses',
      value: this.totals.TotalValidLicenses || 0
    }, {
      label: this.isArabic ? 'رخصة مسحوبة' : 'Withdrawn Licenses',
      value: this.totals.TotalWithdrawnLicenses || 0
    }, {
      label: this.isArabic ? 'رخصة منتهية' : 'Expired Licenses',
      value: this.totals.TotalExpiredLicenses || 0
    }, {
      label: this.isArabic ? 'رخصة ملغية' : 'Canceled Licenses',
      value: this.totals.TotalCanceledLicenses || 0
    }, {
      label: this.isArabic ? 'تم الاخلاء' : 'Clearance Licenses',
      value: this.totals.TotalClearanceLicenses || 0
    }, {
      label: this.isArabic ? 'عضوية سارية' : 'Valid Membership',
      value: this.totals.TotalValidMembership || 0
    }, {
      label: this.isArabic ? 'عضوية منتهية' : 'Finished Membership',
      value: this.totals.TotalFinishedMembership || 0
    }, {
      label: this.isArabic ? 'عضوية معلقة' : 'Suspended Membership',
      value: this.totals.TotalSuspendedMembership || 0
    }, {
      label: this.isArabic ? 'عضوية ساقطة' : 'Voided Membership',
      value: this.totals.TotalVoidedMembership || 0
    }, {
      label: this.isArabic ? 'عضو مستقيل' : 'Resigned Membership',
      value: this.totals.TotalResignedMembership || 0
    }, {
      label: this.isArabic ? 'عضوية مسحوبة' : 'Withdrawed Membership',
      value: this.totals.TotalWithdrawedMembership || 0
    }];
  }
  get servicesTableData() {
    return this.rows.map((service: any, index: number) => ({
      id: index + 1,
      ServiceID: service.ServiceID,
      serviceName: this.isArabic ? service.ServiceTitleAr : service.ServiceTitleEn,
      licenses: service.LicensesPerService || 0,
      totalRequests: service.TotalRequestsPerService || 0,
      onlineRequests: service.RequestsOnlinePerService || 0,
      empRequests: service.RequestsEmpPerService || 0,
      electronicFees: service.ElectronicFeesPerService || 0,
      manualFees: service.ManualFeesPerService || 0,
      totalFees: (service.ElectronicFeesPerService || 0) + (service.ManualFeesPerService || 0),

      // Request types - all the different procedures
      newRequests: service.NewRequestsPerService || 0,
      renewRequests: service.RenewRequestsPerService || 0,
      editRequests: service.EditRequestsPerService || 0,
      cancelRequests: service.CancelRequestsPerService || 0,
      approvedRequests: service.ApprovedRequestsPerService || 0,
      rejectedRequests: service.RejectedRequestsPerService || 0,

      // License status - all the different license states
      validLicenses: service.ValidLicensesPerService || 0,
      expiredLicenses: service.ExpiredLicensesPerService || 0,
      withdrawnLicenses: service.WithdrawnLicensesPerService || 0,
      canceledLicenses: service.CanceledLicensesPerService || 0,
      clearanceLicenses: service.ClearanceLicensesPerService || 0,

      // Membership status - all the different membership states
      validMembership: service.ValidMembershipPerService || 0,
      finishedMembership: service.FinishedMembershipPerService || 0,
      suspendedMembership: service.SuspendedMembershipPerService || 0,
      voidedMembership: service.VoidedMembershipPerService || 0,
      resignedMembership: service.ResignedMembershipPerService || 0,
      withdrawedMembership: service.WithdrawedMembershipPerService || 0,

      // Add all original service data
      ...service
    }));
  }

  get clubsTableData() {
    return this.clubsData.map((club: any, index: number) => ({
      id: index + 1,
      LookupID: club.LookupID,
      clubName: this.isArabic ? club.ClubAr : club.ClubEn,
      totalFeesClub: club.TotalFeesPerClub || 0,
      totalElectronicFeesClub: club.ElectronicFeesPerClub || 0,
      totalManualFeesClub: club.ManualFeesPerClub || 0,
      totalClubLicenses: club.ApprovedLicensePerClub || 0,
      totalRequestsClub: club.RequestsPerClub || 0,
      totalOnlineRequestsClub: club.OnlineRequestsPerClub || 0,
      totalEmpRequestsClub: club.EmpRequestsPerClub || 0,
      totalApprovedRequestsClub: club.ApprovedRequestsPerClub || 0,
      totalRejectedRequestsClub: club.RejectedRequestsPerClub || 0,
      totalNewRequestsClub: club.NewRequestsPerClub || 0,
      totalEditRequestsClub: club.EditRequestsPerClub || 0,
      totalRenewRequestsClub: club.RenewRequestsPerClub || 0,
      totalValidMembershipClub: club.ValidMembershipPerClub || 0,
      totalFinishedMembershipClub: club.FinishedMembershipPerClub || 0,
      totalSuspendedMembershipClub: club.SuspendedMembershipPerClub || 0,
      totalVoidedMembershipClub: club.VoidedMembershipPerClub || 0,
      totalResignedMembershipClub: club.ResignedMembershipPerClub || 0,
      totalWithdrawedMembershipClub: club.WithdrawedMembershipPerClub || 0,
      // Add all original club data
      ...club
    }));
  }

  get totalClubRequests() {
    return this.clubsData.reduce((sum, club) => sum + (club.RequestsPerClub || 0), 0);
  }

  get totalClubLicenses() {
    return this.clubsData.reduce((sum, club) => sum + (club.ApprovedLicensePerClub || 0), 0);
  }

  get totalClubFees() {
    return this.clubsData.reduce((sum, club) => sum + (club.TotalFeesPerClub || 0), 0);
  }

  get totalElectronicFeesClubs() {
    return this.clubsData.reduce((sum, club) => sum + (club.ElectronicFeesPerClub || 0), 0);
  }

  get totalManualFeesClubs() {
    return this.clubsData.reduce((sum, club) => sum + (club.ManualFeesPerClub || 0), 0);
  }
  // إضافة دوال للحصول على البيانات حسب الفئة
  get totalsDataByCategory() {
    const data = this.totalsData;
    return {
      fees: data.filter(item => item.label.includes('رسوم') || item.label.includes('Fees')),
      requests: data.filter(item => item.label.includes('طلب') || item.label.includes('Request')),
      licenses: data.filter(item => item.label.includes('رخص') || item.label.includes('License')),
      membership: data.filter(item => item.label.includes('عضو') || item.label.includes('Member'))
    };
  }

  // دالة للتحقق من وجود بيانات للعرض
  get hasTotalsData(): boolean {
    if (!this.totals) return false;
    const categories = this.totalsDataByCategory;
    return categories.fees.some(item => item.value > 0) ||
      categories.requests.some(item => item.value > 0) ||
      categories.licenses.some(item => item.value > 0) ||
      categories.membership.some(item => item.value > 0);
  }

  get currentServicesTableData() {
    return this.filteredServicesData.length > 0 ? this.filteredServicesData : this.servicesTableData;
  }

  get currentClubsTableData() {
    return this.filteredClubsData.length > 0 ? this.filteredClubsData : this.clubsTableData;
  }

  // Navigation methods
  navigateToFeesDetails(paymentWay?: number, serviceId?: number, clubId?: number) {
    const baseUrl = '/FeesDetails';
    const params = new URLSearchParams();

    if (paymentWay) params.set('PaymentWay', paymentWay.toString());
    if (serviceId) params.set('ServiceID', serviceId.toString());
    if (clubId) params.set('FkClubID', clubId.toString());

    const formValue = this.searchForm.value;
    // Exclude explicitly passed fields from the form loop to avoid duplication
    const excludeFields = ['PageSize', 'PageNum', 'SortField', 'SortDirection', 'ProcessLookupID', 'PaymentWay', 'ServiceID', 'FkClubID'];

    Object.keys(formValue).forEach(key => {
      if (!excludeFields.includes(key) && formValue[key] !== null && formValue[key] !== undefined && formValue[key] !== '') {
        if (Array.isArray(formValue[key]) && formValue[key].length > 0) {
          formValue[key].forEach((val: any) => {
            if (val !== null && val !== undefined && val !== -1) {
              params.append(key, val.toString());
            }
          });
        } else if (!Array.isArray(formValue[key]) && formValue[key] !== -1) {
          params.append(key, formValue[key].toString());
        }
      }
    });

    const url = `${baseUrl}?${params.toString()}`;
    window.open(url, '_blank');
  }

  navigateToRequestsDetails(submissionWay?: number, serviceId?: number, clubId?: number) {
    const baseUrl = '/RequestDetails';
    const params = new URLSearchParams();

    if (submissionWay) params.append('SubmissionWay', submissionWay.toString());
    if (serviceId) params.append('ServiceID', serviceId.toString());
    if (clubId) params.append('FkClubID', clubId.toString());

    const formValue = this.searchForm.value;
    const excludeFields = ['PageSize', 'PageNum', 'SortField', 'SortDirection', 'ProcessLookupID'];

    Object.keys(formValue).forEach(key => {
      if (!excludeFields.includes(key) && formValue[key] !== null && formValue[key] !== undefined && formValue[key] !== '') {
        if (Array.isArray(formValue[key]) && formValue[key].length > 0) {
          formValue[key].forEach((val: any) => {
            if (val !== null && val !== undefined && val !== -1) {
              params.append(key, val.toString());
            }
          });
        } else if (!Array.isArray(formValue[key]) && formValue[key] !== -1) {
          params.append(key, formValue[key].toString());
        }
      }
    });

    const url = `${baseUrl}?${params.toString()}`;
    window.open(url, '_blank');
  }
  navigateToLicensesDetails(statusId?: number, serviceId?: number, clubId?: number) {
    const baseUrl = '/LicenseDetails';
    const params = new URLSearchParams();

    if (statusId) params.append('FkStatusID', statusId.toString());
    if (serviceId) params.append('ServiceID', serviceId.toString());
    if (clubId) params.append('FkClubID', clubId.toString());

    const formValue = this.searchForm.value;
    const excludeFields = ['PageSize', 'PageNum', 'SortField', 'SortDirection', 'ProcessLookupID'];

    Object.keys(formValue).forEach(key => {
      if (!excludeFields.includes(key) && formValue[key] !== null && formValue[key] !== undefined && formValue[key] !== '') {
        if (Array.isArray(formValue[key]) && formValue[key].length > 0) {
          formValue[key].forEach((val: any) => {
            if (val !== null && val !== undefined && val !== -1) {
              params.append(key, val.toString());
            }
          });
        } else if (!Array.isArray(formValue[key]) && formValue[key] !== -1) {
          params.append(key, formValue[key].toString());
        }
      }
    });

    const url = `${baseUrl}?${params.toString()}`;
    window.open(url, '_blank');
  }

  navigateToLicensesDetailsWithStatus(statusLookupID: number, serviceId?: number, clubId?: number) {
    this.navigateToLicensesDetails(statusLookupID, serviceId, clubId);
  }

  navigateToMembershipDetails(statusId?: number, serviceId?: number, clubId?: number) {
    const baseUrl = '/MembershipDetails';
    const params = new URLSearchParams();

    if (statusId) params.append('FkStatusID', statusId.toString());
    if (serviceId) params.append('ServiceID', serviceId.toString());
    if (clubId) params.append('FkClubID', clubId.toString());

    const formValue = this.searchForm.value;
    const excludeFields = ['PageSize', 'PageNum', 'SortField', 'SortDirection', 'ProcessLookupID'];

    Object.keys(formValue).forEach(key => {
      if (!excludeFields.includes(key) && formValue[key] !== null && formValue[key] !== undefined && formValue[key] !== '') {
        if (Array.isArray(formValue[key]) && formValue[key].length > 0) {
          formValue[key].forEach((val: any) => {
            if (val !== null && val !== undefined && val !== -1) {
              params.append(key, val.toString());
            }
          });
        } else if (!Array.isArray(formValue[key]) && formValue[key] !== -1) {
          params.append(key, formValue[key].toString());
        }
      }
    });

    const url = `${baseUrl}?${params.toString()}`;
    window.open(url, '_blank');
  }

  navigateToRequestsDetailsWithProcess(processId: number, clubId?: number, serviceId?: number) {
    const formValue = this.searchForm.value;
    const params = new URLSearchParams();

    params.append('FkProcessID', processId.toString());

    // إضافة معرف النادي إذا تم تمريره
    if (clubId) {
      params.append('FkClubID', clubId.toString());
    }

    // إضافة معرف الخدمة إذا تم تمريره
    if (serviceId) {
      params.append('ServiceID', serviceId.toString());
    }

    const excludeFields = ['PageSize', 'PageNum', 'SortField', 'SortDirection', 'ProcessLookupID'];

    // If serviceId is passed, also exclude ServiceID from form to avoid duplication
    if (serviceId) excludeFields.push('ServiceID');
    // If clubId is passed, also exclude FkClubID from form to avoid duplication
    if (clubId) excludeFields.push('FkClubID');

    Object.keys(formValue).forEach(key => {
      if (!excludeFields.includes(key) && formValue[key] !== null && formValue[key] !== undefined && formValue[key] !== '') {
        if (Array.isArray(formValue[key]) && formValue[key].length > 0) {
          formValue[key].forEach((val: any) => {
            if (val !== null && val !== undefined && val !== -1) {
              params.append(key, val.toString());
            }
          });
        } else if (!Array.isArray(formValue[key]) && formValue[key].length > 0) {
          params.append(key, formValue[key].toString());
        }
      }
    });

    const url = `/RequestDetails?${params.toString()}`;
    window.open(url, '_blank');
  }

  // Specific navigation methods for totals section
  navigateToElectronicFeesReport() {
    this.navigateToFeesDetails(2820);
  }

  navigateToManualFeesReport() {
    this.navigateToFeesDetails(2821);
  }

  navigateToOnlineRequestsReport() {
    this.navigateToRequestsDetails(2820);
  }

  navigateToEmployeeRequestsReport() {
    this.navigateToRequestsDetails(2897);
  }

  navigateToApprovedRequestsReport(clubId?: number) {
    // إضافة فلتر للطلبات الموافق عليها مع معرف النادي إذا تم تمريره
    const formValue = this.searchForm.value;
    const params = new URLSearchParams();

    // إضافة فلتر الحالة للطلبات الموافق عليها (يمكن تحديد الحالة المناسبة)
    // params.append('FkStatusID', 'APPROVED_STATUS_ID'); // يجب تحديد معرف الحالة المناسب

    // إضافة معرف النادي إذا تم تمريره
    if (clubId) {
      params.append('FkClubID', clubId.toString());
    }

    const excludeFields = ['PageSize', 'PageNum', 'SortField', 'SortDirection', 'ProcessLookupID'];

    Object.keys(formValue).forEach(key => {
      if (!excludeFields.includes(key) && formValue[key] !== null && formValue[key] !== undefined && formValue[key] !== '') {
        if (Array.isArray(formValue[key]) && formValue[key].length > 0) {
          formValue[key].forEach((val: any) => {
            if (val !== null && val !== undefined && val !== -1) {
              params.append(key, val.toString());
            }
          });
        } else if (!Array.isArray(formValue[key]) && formValue[key] !== -1) {
          params.append(key, formValue[key].toString());
        }
      }
    });

    const url = `/RequestDetails?${params.toString()}`;
    window.open(url, '_blank');
  }

  navigateToRejectedRequestsReport(clubId?: number) {
    // إضافة فلتر للطلبات المرفوضة مع معرف النادي إذا تم تمريره
    const formValue = this.searchForm.value;
    const params = new URLSearchParams();

    // إضافة فلتر الحالة للطلبات المرفوضة (يمكن تحديد الحالة المناسبة)
    // params.append('FkStatusID', 'REJECTED_STATUS_ID'); // يجب تحديد معرف الحالة المناسب

    // إضافة معرف النادي إذا تم تمريره
    if (clubId) {
      params.append('FkClubID', clubId.toString());
    }

    const excludeFields = ['PageSize', 'PageNum', 'SortField', 'SortDirection', 'ProcessLookupID'];

    Object.keys(formValue).forEach(key => {
      if (!excludeFields.includes(key) && formValue[key] !== null && formValue[key] !== undefined && formValue[key] !== '') {
        if (Array.isArray(formValue[key]) && formValue[key].length > 0) {
          formValue[key].forEach((val: any) => {
            if (val !== null && val !== undefined && val !== -1) {
              params.append(key, val.toString());
            }
          });
        } else if (!Array.isArray(formValue[key]) && formValue[key] !== -1) {
          params.append(key, formValue[key].toString());
        }
      }
    });

    const url = `/RequestDetails?${params.toString()}`;
    window.open(url, '_blank');
  }

  navigateToRequestsReport() {
    this.navigateToRequestsDetails();
  }

  // Additional navigation method for service details
  navigateToServiceDetails(serviceId: number, serviceName: string, section: string) {
    // Navigate to service details page with specific service
    const params = new URLSearchParams();
    params.append('ServiceID', serviceId.toString());

    const formValue = this.searchForm.value;
    const excludeFields = ['PageSize', 'PageNum', 'SortField', 'SortDirection', 'ProcessLookupID'];

    Object.keys(formValue).forEach(key => {
      if (!excludeFields.includes(key) && formValue[key] !== null && formValue[key] !== undefined && formValue[key] !== '') {
        if (Array.isArray(formValue[key]) && formValue[key].length > 0) {
          formValue[key].forEach((val: any) => {
            if (val !== null && val !== undefined && val !== -1) {
              params.append(key, val.toString());
            }
          });
        } else if (!Array.isArray(formValue[key]) && formValue[key] !== -1) {
          params.append(key, formValue[key].toString());
        }
      }
    });

    let url = '';
    if (section === 'requests') {
      url = `/RequestDetails?${params.toString()}`;
    } else if (section === 'licenses') {
      url = `/LicenseDetails?${params.toString()}`;
    } else if (section === 'fees') {
      url = `/FeesDetails?${params.toString()}`;
    }

    if (url) {
      window.open(url, '_blank');
    }
  }
  // Export and print methods
  exportSectionToExcel(section: string) {
    try {
      const wb = XLSX.utils.book_new();

      if (section === 'totals' && this.totals && this.hasTotalsData) {
        const totalsData = this.totalsData.filter(item => item.value > 0).map(item => ({
          [this.isArabic ? 'البيان' : 'Description']: item.label,
          [this.isArabic ? 'القيمة' : 'Value']: item.value
        }));

        const totalsWs = XLSX.utils.json_to_sheet(totalsData);
        if (this.isArabic) {
          totalsWs['!views'] = [{ RTL: true }];
        }
        XLSX.utils.book_append_sheet(wb, totalsWs, this.isArabic ? 'الإحصائيات' : 'Statistics');
      } else if (section === 'services' && this.rows.length > 0) {
        const servicesData = this.currentServicesTableData.map(service => ({
          [this.isArabic ? 'رقم الخدمة' : 'Service ID']: service.ServiceID,
          [this.isArabic ? 'اسم الخدمة' : 'Service Name']: service.serviceName,
          [this.isArabic ? 'إجمالي الرسوم' : 'Total Fees']: service.totalFees,
          [this.isArabic ? 'الرسوم الإلكترونية' : 'Electronic Fees']: service.electronicFees,
          [this.isArabic ? 'الرسوم اليدوية' : 'Manual Fees']: service.manualFees,
          [this.isArabic ? 'إجمالي الطلبات' : 'Total Requests']: service.totalRequests,
          [this.isArabic ? 'إجمالي التراخيص' : 'Total Licenses']: service.licenses
        }));

        const servicesWs = XLSX.utils.json_to_sheet(servicesData);
        if (this.isArabic) {
          servicesWs['!views'] = [{ RTL: true }];
        }
        XLSX.utils.book_append_sheet(wb, servicesWs, this.isArabic ? 'الخدمات' : 'Services');
      } else if (section === 'clubs' && this.clubsData.length > 0) {
        const clubsData = this.currentClubsTableData.map(club => ({
          [this.isArabic ? 'اسم النادي' : 'Club Name']: club.clubName,
          [this.isArabic ? 'إجمالي الرسوم' : 'Total Fees']: club.totalFeesClub,
          [this.isArabic ? 'الرسوم الإلكترونية' : 'Electronic Fees']: club.totalElectronicFeesClub,
          [this.isArabic ? 'الرسوم اليدوية' : 'Manual Fees']: club.totalManualFeesClub,
          [this.isArabic ? 'إجمالي الطلبات' : 'Total Requests']: club.totalRequestsClub,
          [this.isArabic ? 'إجمالي التراخيص' : 'Total Licenses']: club.totalClubLicenses
        }));

        const clubsWs = XLSX.utils.json_to_sheet(clubsData);
        if (this.isArabic) {
          clubsWs['!views'] = [{ RTL: true }];
        }
        XLSX.utils.book_append_sheet(wb, clubsWs, this.isArabic ? 'الأندية' : 'Clubs');
      }

      // تطبيق RTL على الـ workbook
      if (this.isArabic) {
        if (!wb.Workbook) wb.Workbook = {};
        if (!wb.Workbook.Views) wb.Workbook.Views = [];
        wb.Workbook.Views[0] = { RTL: true };
      }

      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const filename = `${section}_${this.isArabic ? 'تقرير' : 'report'}_${dateStr}.xlsx`;

      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error('Export error:', error);
      alert(this.isArabic ? 'حدث خطأ أثناء التصدير' : 'Export error occurred');
    }
  }

  printSection(section: string) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let content = '';
    if (section === 'totals' && this.totals && this.hasTotalsData) {
      content = this.generateTotalsPrintContent();
    } else if (section === 'services' && this.rows.length > 0) {
      content = this.generateServicesPrintContent();
    } else if (section === 'clubs' && this.clubsData.length > 0) {
      content = this.generateClubsPrintContent();
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${this.isArabic ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <title>${this.isArabic ? 'طباعة التقرير' : 'Print Report'}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; direction: ${this.isArabic ? 'rtl' : 'ltr'}; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: ${this.isArabic ? 'right' : 'left'}; }
          th { background-color: #8B1538; color: white; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #8B1538; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        ${content}
      </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }
  private generateTotalsPrintContent(): string {
    const totalsData = this.totalsData.filter(item => item.value > 0);

    let content = `
      <div class="header">
        <h1>${this.isArabic ? 'الإحصائيات الإجمالية' : 'Total Statistics'}</h1>
      </div>
      <table>
        <thead>
          <tr>
            <th>${this.isArabic ? 'البيان' : 'Description'}</th>
            <th>${this.isArabic ? 'القيمة' : 'Value'}</th>
          </tr>
        </thead>
        <tbody>
    `;

    totalsData.forEach(item => {
      content += `
        <tr>
          <td>${item.label}</td>
          <td>${item.value.toLocaleString()}</td>
        </tr>
      `;
    });

    content += `
        </tbody>
      </table>
    `;

    return content;
  }

  private generateServicesPrintContent(): string {
    let content = `
      <div class="header">
        <h1>${this.isArabic ? 'تفاصيل الخدمات' : 'Services Details'}</h1>
      </div>
      <table>
        <thead>
          <tr>
            <th>${this.isArabic ? 'رقم الخدمة' : 'Service ID'}</th>
            <th>${this.isArabic ? 'اسم الخدمة' : 'Service Name'}</th>
            <th>${this.isArabic ? 'إجمالي الرسوم' : 'Total Fees'}</th>
            <th>${this.isArabic ? 'الرسوم الإلكترونية' : 'Electronic Fees'}</th>
            <th>${this.isArabic ? 'الرسوم اليدوية' : 'Manual Fees'}</th>
            <th>${this.isArabic ? 'إجمالي الطلبات' : 'Total Requests'}</th>
            <th>${this.isArabic ? 'إجمالي التراخيص' : 'Total Licenses'}</th>
          </tr>
        </thead>
        <tbody>
    `;

    this.currentServicesTableData.forEach(service => {
      content += `
        <tr>
          <td>${service.ServiceID}</td>
          <td>${service.serviceName}</td>
          <td>${service.totalFees.toLocaleString()}</td>
          <td>${service.electronicFees.toLocaleString()}</td>
          <td>${service.manualFees.toLocaleString()}</td>
          <td>${service.totalRequests.toLocaleString()}</td>
          <td>${service.licenses.toLocaleString()}</td>
        </tr>
      `;
    });

    content += `
        </tbody>
      </table>
    `;

    return content;
  }

  private generateClubsPrintContent(): string {
    let content = `
      <div class="header">
        <h1>${this.isArabic ? 'الأندية الرياضية' : 'Sports Clubs'}</h1>
      </div>
      <table>
        <thead>
          <tr>
            <th>${this.isArabic ? 'اسم النادي' : 'Club Name'}</th>
            <th>${this.isArabic ? 'إجمالي الرسوم' : 'Total Fees'}</th>
            <th>${this.isArabic ? 'الرسوم الإلكترونية' : 'Electronic Fees'}</th>
            <th>${this.isArabic ? 'الرسوم اليدوية' : 'Manual Fees'}</th>
            <th>${this.isArabic ? 'إجمالي الطلبات' : 'Total Requests'}</th>
            <th>${this.isArabic ? 'إجمالي التراخيص' : 'Total Licenses'}</th>
          </tr>
        </thead>
        <tbody>
    `;

    this.currentClubsTableData.forEach(club => {
      content += `
        <tr>
          <td>${club.clubName}</td>
          <td>${club.totalFeesClub.toLocaleString()}</td>
          <td>${club.totalElectronicFeesClub.toLocaleString()}</td>
          <td>${club.totalManualFeesClub.toLocaleString()}</td>
          <td>${club.totalRequestsClub.toLocaleString()}</td>
          <td>${club.totalClubLicenses.toLocaleString()}</td>
        </tr>
      `;
    });

    content += `
        </tbody>
      </table>
    `;

    return content;
  }

  // دالة تصدير Excel شاملة لجميع البيانات
  exportToExcel() {
    if ((!this.rows || this.rows.length === 0) && (!this.totals) && (!this.clubsData || this.clubsData.length === 0)) {
      alert(this.isArabic ? 'لا توجد بيانات للتصدير' : 'No data to export');
      return;
    }

    const wb = XLSX.utils.book_new();
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    // تصدير الإجماليات
    if (this.totals) {
      this.exportTotalsSheet(wb);
    }

    // تصدير الخدمات
    if (this.rows && this.rows.length > 0) {
      this.exportServicesSheet(wb);
    }

    // تصدير الأندية
    if (this.hasMembershipsData && this.clubsData && this.clubsData.length > 0) {
      this.exportClubsSheet(wb);
    }

    // تطبيق RTL على الـ workbook
    if (!wb.Workbook) wb.Workbook = {};
    if (!wb.Workbook.Views) wb.Workbook.Views = [];
    wb.Workbook.Views[0] = { RTL: this.isArabic };

    // تحديد اسم الملف مع التاريخ
    const filename = this.isArabic
      ? `تقرير_الخدمات_الشامل_${dateStr}.xlsx`
      : `Comprehensive_Services_Report_${dateStr}.xlsx`;

    XLSX.writeFile(wb, filename);
  }
  // تصدير ورقة الإجماليات
  private exportTotalsSheet(wb: any) {
    const totalsData = this.totalsData.map((item, index) => ({
      [this.isArabic ? 'الرقم' : 'No.']: index + 1,
      [this.isArabic ? 'البيان' : 'Description']: item.label,
      [this.isArabic ? 'القيمة' : 'Value']: item.value
    }));

    const ws = XLSX.utils.json_to_sheet(totalsData);

    // تنسيق الأعمدة
    ws['!cols'] = [
      { width: 8 },   // No.
      { width: 50 },  // Description
      { width: 15 }   // Value
    ];

    // تطبيق RTL
    ws['!views'] = [{ rightToLeft: this.isArabic }];

    XLSX.utils.book_append_sheet(wb, ws, this.isArabic ? 'الإجماليات' : 'Totals');
  }

  // تصدير ورقة الخدمات
  private exportServicesSheet(wb: any) {
    const servicesData = this.rows.map((service: any, index: number) => ({
      [this.isArabic ? 'الرقم التسلسلي' : 'Serial No.']: index + 1,
      [this.isArabic ? 'رقم الخدمة' : 'Service ID']: service.ServiceID,
      [this.isArabic ? 'اسم الخدمة' : 'Service Name']: this.isArabic ? service.ServiceTitleAr : service.ServiceTitleEn,
      [this.isArabic ? 'عدد التراخيص' : 'Licenses Count']: service.LicensesPerService || 0,
      [this.isArabic ? 'إجمالي الطلبات' : 'Total Requests']: service.TotalRequestsPerService || 0,
      [this.isArabic ? 'الطلبات الإلكترونية' : 'Online Requests']: service.RequestsOnlinePerService || 0,
      [this.isArabic ? 'طلبات الموظفين' : 'Employee Requests']: service.RequestsEmpPerService || 0,
      [this.isArabic ? 'الرسوم الإلكترونية' : 'Electronic Fees']: service.ElectronicFeesPerService || 0,
      [this.isArabic ? 'الرسوم اليدوية' : 'Manual Fees']: service.ManualFeesPerService || 0,
      [this.isArabic ? 'إجمالي الرسوم' : 'Total Fees']: (service.ElectronicFeesPerService || 0) + (service.ManualFeesPerService || 0)
    }));

    // إضافة صف الإجماليات
    if (this.totals) {
      servicesData.push({
        [this.isArabic ? 'الرقم التسلسلي' : 'Serial No.']: '',
        [this.isArabic ? 'رقم الخدمة' : 'Service ID']: '',
        [this.isArabic ? 'اسم الخدمة' : 'Service Name']: this.isArabic ? '*** الإجماليات ***' : '*** TOTALS ***',
        [this.isArabic ? 'عدد التراخيص' : 'Licenses Count']: this.totals.TotalLicenses || 0,
        [this.isArabic ? 'إجمالي الطلبات' : 'Total Requests']: this.totals.TotalRequests || 0,
        [this.isArabic ? 'الطلبات الإلكترونية' : 'Online Requests']: this.totals.TotalOnlineRequests || 0,
        [this.isArabic ? 'طلبات الموظفين' : 'Employee Requests']: this.totals.TotalEmpRequests || 0,
        [this.isArabic ? 'الرسوم الإلكترونية' : 'Electronic Fees']: this.totals.TotalElectronicFees || 0,
        [this.isArabic ? 'الرسوم اليدوية' : 'Manual Fees']: this.totals.TotalManualFees || 0,
        [this.isArabic ? 'إجمالي الرسوم' : 'Total Fees']: this.totals.TotalFees || 0
      });
    }

    const ws = XLSX.utils.json_to_sheet(servicesData);

    // تنسيق الأعمدة
    const colWidths = [
      { width: 8 },   // Serial
      { width: 12 },  // Service ID
      { width: 40 },  // Service Name
      { width: 12 },  // Licenses
      { width: 12 },  // Total Requests
      { width: 15 },  // Online Requests
      { width: 15 },  // Employee Requests
      { width: 15 },  // Electronic Fees
      { width: 12 },  // Manual Fees
      { width: 12 }   // Total Fees
    ];

    ws['!cols'] = colWidths;
    ws['!views'] = [{ rightToLeft: this.isArabic }];

    XLSX.utils.book_append_sheet(wb, ws, this.isArabic ? 'تفاصيل الخدمات' : 'Services Details');
  }

  // تصدير ورقة الأندية
  private exportClubsSheet(wb: any) {
    const clubsData = this.clubsData.map((club: any, index: number) => ({
      [this.isArabic ? 'الرقم التسلسلي' : 'Serial No.']: index + 1,
      [this.isArabic ? 'اسم النادي' : 'Club Name']: this.isArabic ? club.ClubAr : club.ClubEn,
      [this.isArabic ? 'عدد الطلبات' : 'Requests Count']: club.RequestsPerClub || 0,
      [this.isArabic ? 'التراخيص المعتمدة' : 'Approved Licenses']: club.ApprovedLicensePerClub || 0
    }));

    // إضافة صف الإجماليات
    clubsData.push({
      [this.isArabic ? 'الرقم التسلسلي' : 'Serial No.']: '',
      [this.isArabic ? 'اسم النادي' : 'Club Name']: this.isArabic ? '*** الإجماليات ***' : '*** TOTALS ***',
      [this.isArabic ? 'عدد الطلبات' : 'Requests Count']: this.totalClubRequests,
      [this.isArabic ? 'التراخيص المعتمدة' : 'Approved Licenses']: this.totalClubLicenses
    });

    const ws = XLSX.utils.json_to_sheet(clubsData);

    // تنسيق الأعمدة
    ws['!cols'] = [
      { width: 8 },   // Serial
      { width: 40 },  // Club Name
      { width: 15 },  // Requests
      { width: 18 }   // Licenses
    ];

    ws['!views'] = [{ rightToLeft: this.isArabic }];

    XLSX.utils.book_append_sheet(wb, ws, this.isArabic ? 'الأندية الرياضية' : 'Sports Clubs');
  }

  // دالة الطباعة المحسنة للتصميم الجديد
  printReport() {
    const printContent = this.generateNewPrintContent();
    const printWindow = window.open('', '_blank');

    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="${this.isArabic ? 'rtl' : 'ltr'}" lang="${this.isArabic ? 'ar' : 'en'}">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${this.isArabic ? 'تقرير الخدمات الإجمالي' : 'Total Services Report'}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: ${this.isArabic ? '"Segoe UI", Tahoma, Arial, sans-serif' : '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'};
              font-size: 14px;
              line-height: 1.6;
              color: #333;
              background: white;
              direction: ${this.isArabic ? 'rtl' : 'ltr'};
              padding: 20px;
            }
            
            .header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 3px solid #8B1538;
              padding-bottom: 20px;
            }
            
            .header h1 {
              color: #8B1538;
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            
            .header p {
              color: #666;
              font-size: 16px;
            }
            
            .print-date {
              text-align: ${this.isArabic ? 'left' : 'right'};
              color: #666;
              font-size: 12px;
              margin-bottom: 30px;
            }
            
            .summary-cards {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
              margin-bottom: 40px;
            }
            
            .summary-card {
              border: 2px solid #8B1538;
              border-radius: 10px;
              padding: 20px;
              text-align: center;
              background: #f9f9f9;
            }
            
            .summary-card h3 {
              color: #8B1538;
              font-size: 16px;
              margin-bottom: 10px;
            }
            
            .summary-card .value {
              font-size: 24px;
              font-weight: bold;
              color: #333;
            }
            
            .section {
              margin-bottom: 40px;
              page-break-inside: avoid;
            }
            
            .section-header {
              background: #8B1538;
              color: white;
              padding: 15px;
              font-size: 18px;
              font-weight: bold;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            
            .section-content {
              border: 2px solid #8B1538;
              border-top: none;
              border-radius: 0 0 10px 10px;
              padding: 20px;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              font-size: 12px;
            }
            
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: ${this.isArabic ? 'right' : 'left'};
            }
            
            th {
              background: #8B1538;
              color: white;
              font-weight: bold;
            }
            
            tr:nth-child(even) {
              background: #f9f9f9;
            }
            
            @media print {
              body {
                font-size: 12px;
                padding: 10px;
              }
              
              .summary-cards {
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
                margin-bottom: 20px;
              }
              
              .summary-card {
                padding: 10px;
                font-size: 11px;
              }
              
              .summary-card h3 {
                font-size: 12px;
                margin-bottom: 5px;
              }
              
              .summary-card .value {
                font-size: 16px;
              }
              
              .section {
                page-break-inside: avoid;
                margin-bottom: 20px;
              }
              
              .section-header {
                font-size: 14px;
                padding: 10px;
              }
              
              .section-content {
                padding: 10px;
              }
              
              table {
                font-size: 9px;
              }
              
              th, td {
                padding: 3px;
                font-size: 9px;
              }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
        </html>
      `);

      printWindow.document.close();

      // انتظار تحميل المحتوى ثم الطباعة
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  }
  // توليد محتوى الطباعة الجديد
  private generateNewPrintContent(): string {
    const today = new Date();
    const dateStr = today.toLocaleDateString(this.isArabic ? 'ar-QA' : 'en-US');

    let content = `
      <div class="header">
        <h1>${this.isArabic ? 'تقرير الخدمات الإجمالي' : 'Total Services Report'}</h1>
        <p>${this.isArabic ? 'تحليل شامل لأداء الخدمات والرسوم المالية' : 'Comprehensive analysis of service performance and financial revenue'}</p>
      </div>
      
      <div class="print-date">
        ${this.isArabic ? 'تاريخ الطباعة: ' : 'Print Date: '}${dateStr}
      </div>
      
      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="summary-card">
          <h3>${this.isArabic ? 'إجمالي الرسوم' : 'Total Revenue'}</h3>
          <div class="value">${(this.totals?.TotalFees || 0).toLocaleString()} ${this.isArabic ? 'ر.ق' : 'QAR'}</div>
        </div>
        <div class="summary-card">
          <h3>${this.isArabic ? 'إجمالي الطلبات' : 'Total Requests'}</h3>
          <div class="value">${(this.totals?.TotalRequests || 0).toLocaleString()}</div>
        </div>
        <div class="summary-card">
          <h3>${this.isArabic ? 'إجمالي التراخيص' : 'Total Licenses'}</h3>
          <div class="value">${(this.totals?.TotalLicenses || 0).toLocaleString()}</div>
        </div>
        <div class="summary-card">
          <h3>${this.isArabic ? 'عدد الخدمات' : 'Total Services'}</h3>
          <div class="value">${this.rows.length}</div>
        </div>
      </div>
      
      <!-- إحصائيات إضافية للأندية -->
      ${this.hasMembershipsData ? `
      <div class="summary-cards">
        <div class="summary-card">
          <h3>${this.isArabic ? 'عدد الأندية' : 'Total Clubs'}</h3>
          <div class="value">${this.clubsData.length}</div>
        </div>
        <div class="summary-card">
          <h3>${this.isArabic ? 'إجمالي طلبات الأندية' : 'Total Club Requests'}</h3>
          <div class="value">${this.totalClubRequests.toLocaleString()}</div>
        </div>
        <div class="summary-card">
          <h3>${this.isArabic ? 'إجمالي تراخيص الأندية' : 'Total Club Licenses'}</h3>
          <div class="value">${this.totalClubLicenses.toLocaleString()}</div>
        </div>
        <div class="summary-card">
          <h3>${this.isArabic ? 'إجمالي رسوم الأندية' : 'Total Club Fees'}</h3>
          <div class="value">${this.totalClubFees.toLocaleString()}</div>
        </div>
      </div>
      ` : ''}

    `;

    // إضافة الجداول
    content += this.generatePrintTotalsSection();
    content += this.generatePrintServicesSection();
    if (this.hasMembershipsData) {
      content += this.generatePrintClubsSection();
    }


    return content;
  }

  // توليد قسم الإجماليات للطباعة
  private generatePrintTotalsSection(): string {
    if (!this.totals) return '';

    let section = `
      <div class="section">
        <div class="section-header">${this.isArabic ? 'الإحصائيات التفصيلية' : 'Detailed Statistics'}</div>
        <div class="section-content">
          <table>
            <thead>
              <tr>
                <th>${this.isArabic ? 'البيان' : 'Description'}</th>
                <th>${this.isArabic ? 'القيمة' : 'Value'}</th>
              </tr>
            </thead>
            <tbody>
    `;

    const totalsToPrint = this.totalsData.filter(item => {
      if (item.value <= 0) return false;
      if (!this.hasMembershipsData && (item.label.includes('عضو') || item.label.includes('Member'))) return false;
      return true;
    });

    totalsToPrint.forEach(item => {

      section += `
        <tr>
          <td>${item.label}</td>
          <td>${item.value.toLocaleString()}</td>
        </tr>
      `;
    });

    section += `
            </tbody>
          </table>
        </div>
      </div>
    `;

    return section;
  }

  // توليد قسم الخدمات للطباعة
  private generatePrintServicesSection(): string {
    if (!this.rows || this.rows.length === 0) return '';

    let section = `
      <div class="section">
        <div class="section-header">${this.isArabic ? 'تفاصيل الخدمات' : 'Services Details'}</div>
        <div class="section-content">
          <table>
            <thead>
              <tr>
                <th>${this.isArabic ? 'رقم الخدمة' : 'Service ID'}</th>
                <th>${this.isArabic ? 'اسم الخدمة' : 'Service Name'}</th>
                <th>${this.isArabic ? 'إجمالي التراخيص' : 'Licenses'}</th>
                <th>${this.isArabic ? 'الطلبات' : 'Requests'}</th>
                <th>${this.isArabic ? 'الرسوم الإلكترونية' : 'Electronic Fees'}</th>
                <th>${this.isArabic ? 'الرسوم اليدوية' : 'Manual Fees'}</th>
                <th>${this.isArabic ? 'إجمالي الرسوم' : 'Total Fees'}</th>
              </tr>
            </thead>
            <tbody>
    `;

    // عرض أول 20 خدمة للطباعة
    this.rows.slice(0, 20).forEach(service => {
      const serviceName = this.isArabic ? service.ServiceTitleAr : service.ServiceTitleEn;
      const shortName = serviceName.length > 35 ? serviceName.substring(0, 35) + '...' : serviceName;

      section += `
        <tr>
          <td>${service.ServiceID}</td>
          <td>${shortName}</td>
          <td>${(service.LicensesPerService || 0).toLocaleString()}</td>
          <td>${(service.TotalRequestsPerService || 0).toLocaleString()}</td>
          <td>${(service.ElectronicFeesPerService || 0).toLocaleString()}</td>
          <td>${(service.ManualFeesPerService || 0).toLocaleString()}</td>
          <td>${((service.ElectronicFeesPerService || 0) + (service.ManualFeesPerService || 0)).toLocaleString()}</td>
        </tr>
      `;
    });

    if (this.rows.length > 20) {
      section += `
        <tr>
          <td colspan="7" style="text-align: center; font-style: italic; color: #666;">
            ${this.isArabic ? `... و ${this.rows.length - 20} خدمة أخرى` : `... and ${this.rows.length - 20} more services`}
          </td>
        </tr>
      `;
    }

    section += `
            </tbody>
          </table>
        </div>
      </div>
    `;

    return section;
  }

  // توليد قسم الأندية للطباعة
  private generatePrintClubsSection(): string {
    if (!this.clubsData || this.clubsData.length === 0) return '';

    let section = `
      <div class="section">
        <div class="section-header">${this.isArabic ? 'الأندية الرياضية' : 'Sports Clubs'}</div>
        <div class="section-content">
          <table>
            <thead>
              <tr>
                <th>${this.isArabic ? 'اسم النادي' : 'Club Name'}</th>
                <th>${this.isArabic ? 'العضويات' : 'Licenses'}</th>
                <th>${this.isArabic ? 'الطلبات' : 'Requests'}</th>
              </tr>
            </thead>
            <tbody>
    `;

    // عرض جميع الأندية
    this.clubsData.forEach(club => {
      const clubName = this.isArabic ? club.ClubAr : club.ClubEn;

      section += `
        <tr>
          <td>${clubName}</td>
          <td>${(club.ApprovedLicensePerClub || 0).toLocaleString()}</td>
          <td>${(club.RequestsPerClub || 0).toLocaleString()}</td>
        </tr>
      `;
    });

    section += `
            </tbody>
          </table>
        </div>
      </div>
    `;

    return section;
  }



  hasmemberships() {
    this.dashboardService.getDashboardReport().subscribe((res: any) => {
      const totalMemberships = res.Memberships;
      if (totalMemberships.length > 0) {
        this.hasMembershipsData = true;
      } else {
        this.hasMembershipsData = false;
      }
    });
  }
}