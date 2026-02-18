import { Component, computed, effect, ElementRef, input, signal, ViewChild, OnInit, output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { firstValueFrom, forkJoin, Observable } from 'rxjs';
import { basic } from 'src/app/helpers/date-helper';
import { AllApplicationsService } from 'src/app/service/all-applications.service';
import { EmployeeApplicationsService } from 'src/app/service/employee-applications.service';
import { FileActionsService } from 'src/app/service/file-actions.service';
import { LicensesService } from 'src/app/service/licenses.service';
import { LocalizationService } from 'src/app/service/localization.service';
import { MenuLinksService } from 'src/app/service/menu-links.service';
import { NewApplicationService } from 'src/app/service/new-application.service';
import { ServiceSelectService } from 'src/app/service/service-select.service';
import { WizardServiceService } from 'src/app/service/wizard-service.service';
import { reverseChevron, toggleAnimation } from 'src/app/shared/animations';
import { AppState } from 'src/types/auth.types';
import { Action, FieldJson, NavigationTab, ServiceApiPayload } from 'src/types/newApplication.types';
import Swal, { SweetAlertOptions } from 'sweetalert2';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-all-applications-table',
  templateUrl: './all-applications-table.component.html',
  animations: [toggleAnimation, reverseChevron]
})
export class AllApplicationsTableComponent implements OnInit {
  search = '';
  tabData = input<any>();
  evalRes = input<any>();
  cols = [
    { field: 'expand', title: '', sort: false, visible: true, fixed: true, width: '50px' },
    { field: 'serial', title: '#', sort: false, isNumber: true, visible: true, fixed: true, width: '60px' },
    { field: 'ai', title: '', sort: false, visible: true, fixed: true, width: '60px' },
    // الأعمدة الأساسية
    { field: 'ApplicationNumber', title: 'رقم الطلب', sort: true, visible: true, width: '150px', isNumber: true },
    { field: 'ServiceTitleAr', title: 'نوع الخدمة', sort: true, visible: true, width: '250px' },
    { field: 'FkStatusID_TitleAr', title: 'حالة الطلب', sort: true, visible: true, width: '150px', featured: true },
    { field: 'FkProcessID_TitleAr', title: 'نوع الإجراء', sort: true, visible: true, width: '180px' },
    { field: 'ApprovedLicense', title: 'رقم الرخصة', sort: true, visible: false, width: '180px', isNumber: true },
    { field: 'CreationDate', title: 'تاريخ الإنشاء', sort: true, visible: true, width: '150px' },
    { field: 'Actions', title: 'الإجراءات', sort: false, visible: true, fixed: true, width: '200px' },
    // الأعمدة المخفية
  ];
  translations = signal<any>('')
  page = input<any>();
  rows = computed<any>(() => {
    return this.allApplicationsService.cardsData()
  });
  isWideScreen: boolean = false;

  store!: AppState;
  activeTab = input<string>();
  tableLoader: boolean = false;
  TotalRows = signal<number>(0);
  CurrentPage = signal<number>(1);
  PageSize = signal<number>(0);
  navigationTabs = signal<any>([]);
  requestConfidence = signal<any>({});
  allConfidences: any = [];
  ServicesType = input.required<any>();
  rowsSelected = signal<any[]>([]);

  // Add Math property for template usage
  Math = Math;
  searchForm!: FormGroup;
  isAdvancedSearch = false;
  isSearchCollapsed = false;
  isGlobalSearch = false;
  globalSearchTerm = '';
  searchCriteria: any[] = [];
  mainTabsData = input<any>();
  allColumns: any[] = [];
  defaultColumnsState: any[] = []; // حفظ الحالة الافتراضية للأعمدة
  sortableColumns: any[] = [];
  selectedSortColumn: any = null;
  viewMode: 'table' | 'cards' = 'table';
  currentSortField: string = '';
  currentSortDirection: number = 2;
  toggleColumnsDropdown = false;
  toggleSortDropdown = false;
  isLoading: boolean = false;
  expandedRow: any = null;
  expandedRowDetails: any[] = [];
  isArabic: boolean = false;
  originalRows: any = []
  basic = basic

  get areAllColumnsVisible(): boolean {
    return this.allColumns.every(col => {
      const colInCols = this.cols.find(c => c.field === col.field);
      return !colInCols || colInCols.fixed || col.visible;
    });
  }

  get areAllColumnsHidden(): boolean {
    return this.allColumns.every(col => {
      const colInCols = this.cols.find(c => c.field === col.field);
      return !colInCols || colInCols.fixed || !col.visible;
    });
  }

  get hasHiddenColumns(): boolean {
    const isMobile = window.innerWidth <= 768;
    return this.cols.some(col => {
      if (col.fixed) return false;
      if (isMobile) {
        return col.visible === false || this.shouldHideOnMobile(col.field);
      } else {
        return col.visible === false;
      }
    });
  }

  shouldHideOnMobile(field: string): boolean {
    // في الموبايل نعرض فقط الحقول الأساسية
    const showFields = ['expand', 'serial', 'openRequest', 'ApplicationNumber', 'ServiceTitleAr', 'ServiceTitleEn', 'FkStatusID_TitleAr', 'FkStatusID_TitleEn'];
    return !showFields.includes(field);
  }
  newTotalRows = input<any>();

  paginationInfoText = computed(() => {
    const currentPage = this.CurrentPage() || 1;
    const pageSize = this.PageSize() || 10;
    const totalRows = this.TotalRows() || 0;
    const start = totalRows > 0 ? (currentPage - 1) * pageSize + 1 : 0;
    const end = Math.min(currentPage * pageSize, totalRows);

    return this.store?.index?.locale === 'ae'
      ? `عرض ${start} إلى ${end} من ${totalRows} نتيجة`
      : `Showing ${start} to ${end} of ${totalRows} results`;
  });

  empLookup = signal<any>([]);
  constructor(private router: Router, private route: ActivatedRoute, private employeeApplicationService: EmployeeApplicationsService,
    private localizationService: LocalizationService,
    public allApplicationsService: AllApplicationsService,
    private storeData: Store<AppState>,
    private fileService: FileActionsService,
    private wizardService: WizardServiceService,
    private newApplicationService: NewApplicationService,
    private selectServiceModal: ServiceSelectService,
    private menuLinksService: MenuLinksService,
    private fb: FormBuilder,
    private LicensesService: LicensesService
  ) {
    this.isWideScreen = this.router.url.includes('allApplications');
    this.initStore();
    this.initializeForm();

    effect(() => {
      if (this.tabData()) {
        console.log(this.tabData());
        this.allApplicationsService.tableLoader.set(true);
        this.tableLoader = true;
        this.allApplicationsService.disableTabs.set(true);
        this.allApplicationsService.getCardsData(this.tabData()?.InboxType || this.employeeApplicationService.tab().InboxType, this.ServicesType(), { PageSize: 10, PageNum: 1 }).subscribe((res) => {
          console.log(res);
          let pagingInfo = JSON.parse(res.PagingInfo);
          this.PageSize.set(pagingInfo.PageSize);
          this.TotalRows.set(pagingInfo.TotalRows);
          this.CurrentPage.set(pagingInfo.CurrentPage);
          this.allApplicationsService.cardsData.set(res.Data || [])
          this.originalRows = res.Data || [];
          this.allApplicationsService.tableLoader.set(false);
          this.tableLoader = false
          this.allApplicationsService.disableTabs.set(false);
          let isNoActions = this.allApplicationsService.cardsData().every((item: any) => item.Actions === null || item.Actions === undefined || item.Actions.length === 0);
          if (isNoActions) {
            let actions = this.cols.find(c => c.field === 'Actions')
            if (actions) {
              actions.visible = false
            }
          } else {
            let actions = this.cols.find(c => c.field === 'Actions')
            if (actions) {
              actions.visible = true
            }
          }
        })
      }
    }, { allowSignalWrites: true });
    effect(() => {
      if (this.allApplicationsService.tableLoader()) {
        this.tableLoader = true;
      } else {
        this.tableLoader = false;
      }
    }, { allowSignalWrites: true });
    effect(() => {
      if (this.newTotalRows()) {
        this.TotalRows.set(this.newTotalRows());
      }
    }, { allowSignalWrites: true });
    effect(() => {
      if (this.ServicesType() &&
        ['YouthEventService', 'YouthPermitService', 'YouthActivitiesService', 'YouthCenterService'].includes(this.ServicesType())) {
        this.allApplicationsService.EServicesLoginSelectall().subscribe((res: any) => {
          this.empLookup.set(res.items.filter((item: any) => item.FkRoleID === 840 && item.FkSectionId === 1729 && item.Activited === true) || []);
        });
      }
    })
  }

  normalLookupsServiceID = signal<any>(null);
  lookupsData = signal<any>(null);
  ngOnInit() {
    this.translations.set(this.localizationService.getTranslations());
    this.isArabic = this.store?.index?.locale === 'ae';
    this.allApplicationsService.getServiceLookup().subscribe((res: any) => {
      this.normalLookupsServiceID.set(res)
    })
    this.LicensesService.getById(null).subscribe(data => {
      this.lookupsData.set(data);
    })
    this.allApplicationsService.getAllLookup().subscribe((res: any) => {
      this.allApplicationsService.lookupValues.set(res.items)
    })


    // Initialize columns after translations are loaded
    this.initializeColumns();

    // Add click listener to close dropdowns
    document.addEventListener('click', (event) => {
      this.toggleColumnsDropdown = false;
      this.toggleSortDropdown = false;
    });

  }

  initializeColumns() {
    const t = this.translations();

    this.cols = [
      { field: 'expand', title: t?.tableMoreDetailsHeader?.label || '', sort: false, visible: true, fixed: true, width: '50px' },
      { field: 'serial', title: '#', sort: false, isNumber: true, visible: true, fixed: true, width: '60px' },
      { field: 'openRequest', title: this.isArabic ? 'فتح الطلب' : 'Open Request', sort: false, visible: true, fixed: true, width: '100px' },
      // الأعمدة الأساسية
      { field: 'ApplicationNumber', title: t?.requestNumber?.label || 'رقم الطلب', sort: true, visible: true, width: '150px', isNumber: true },
      { field: this.isArabic ? 'ServiceTitleAr' : 'ServiceTitleEn', title: t?.ServiceType?.label || 'نوع الخدمة', sort: true, visible: true, width: '250px' },
      { field: this.isArabic ? 'FkStatusID_TitleAr' : 'FkStatusID_TitleEn', title: t?.Status?.label || 'حالة الطلب', sort: true, visible: true, width: '150px', featured: true },
      /* { field: 'CompanyName', title: t?.CompanyNameTitleInput?.label || 'اسم الشركة', sort: true, visible: false, width: '150px', featured: true },
      { field: 'CompanyNameEn', title: t?.CompanyNameEnTitleInput?.label || 'اسم الشركة بالانجليزية', sort: true, visible: false, width: '150px', featured: true }, */
      { field: 'CommercialName', title: t?.CommercialNameTitleInput?.label || 'اسم التجاري', sort: true, visible: false, width: '150px', featured: true },
      { field: 'ApplicantName', title: t?.ApplicantNameTitleInput?.label || 'اسم المتقدم', sort: true, visible: false, width: '150px', featured: true },
      { field: 'ApplicantQID', title: t?.ApplicantQIDTitleInput?.label || 'رقم التسجيل', sort: true, visible: false, width: '150px', featured: true },
      { field: 'OwnerName', title: t?.OwnerNameTitleInput?.label || 'اسم المالك', sort: true, visible: false, width: '150px', featured: true },
      { field: 'OwnerQID', title: t?.OwnerQIDTitleInput?.label || 'رقم التسجيل', sort: true, visible: false, width: '150px', featured: true },
      { field: 'ManagerQID', title: t?.managerQID?.label || 'رقم التسجيل', sort: true, visible: false, width: '150px', featured: true },
      /* { field: this.isArabic ? 'FkClubID_TitleAr': 'FkClubID_TitleEn', title: t?.FkClubID?.label || 'اسم النادي', sort: true, visible: false, width: '150px', featured: true }, */
      { field: this.isArabic ? 'FkProcessID_TitleAr' : 'FkProcessID_TitleEn', title: t?.ProcessID?.label || 'نوع الإجراء', sort: true, visible: true, width: '180px' },
      { field: 'ApprovedLicense', title: t?.licenseNumber?.label || 'رقم الرخصة', sort: true, visible: false, width: '180px', isNumber: true },
      { field: 'CreationDate', title: t?.CreationDate?.label || 'تاريخ الإنشاء', sort: true, visible: true, width: '150px' },
      { field: 'ai', title: t?.aiAnalysisTitle.label, sort: false, visible: true, fixed: true, width: '60px' },
      { field: 'Actions', title: t?.actions?.label || (this.isArabic ? 'الإجراءات' : 'Actions'), sort: false, visible: true, fixed: true, width: '200px' },
    ];

    this.allColumns = this.cols
      .filter(col => col.field !== 'expand' && col.field !== 'serial' && col.field !== 'Actions' && col.field !== 'openRequest' && col.field !== 'checkbox')
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

    this.selectedSortColumn = this.sortableColumns.find(col => col.field === 'ApplicationNumber') || this.sortableColumns[0];
    if (this.selectedSortColumn) {
      this.currentSortField = this.selectedSortColumn.field;
      this.currentSortDirection = 2; // Descending
    }
  }

  initStore() {
    this.storeData
      .select(({ index, auth }) => ({ index, auth }))
      .subscribe((d) => {
        this.store = d;
        this.isArabic = this.store?.index?.locale === 'ae';
      });
  }

  ngAfterViewInit(): void {
    // Check if the element reference is available before calling the method
    if (this.elementRef) {
      this.checkDirection(this.elementRef.nativeElement);
    }
  }

  openMenus: { [key: string]: boolean } = {};
  toggleMenu(key: string) {
    this.openMenus = { [key]: !this.openMenus[key] };
  }

  preserveTabValue() {
    this.employeeApplicationService.setTab(this.tabData());
  }

  private loadCardsData(pagingInfo?: any): void {
    // 1. Get the InboxType for the API call
    const inboxType = this.tabData()?.InboxType || this.employeeApplicationService.tab().InboxType;
    const servicesType = this.ServicesType();

    // 2. Set loading state and disable tabs
    this.allApplicationsService.tableLoader.set(true);
    this.tableLoader = true; // Assumes 'tableLoader' is a property on the component
    this.allApplicationsService.disableTabs.set(true);

    // 3. Add default sorting if not provided
    if (!pagingInfo) {
      pagingInfo = {};
    }

    // Add default sorting if no sort is specified
    if (!pagingInfo.SortField && this.currentSortField) {
      pagingInfo.SortField = this.currentSortField;
      pagingInfo.SortDirection = this.currentSortDirection;
    }

    // 4. Call the API
    this.allApplicationsService.getCardsData(inboxType, servicesType, pagingInfo).subscribe({
      next: (res) => {
        console.log(res);
        // 5. Update the cards data Signal
        this.allApplicationsService.cardsData.set((res.Data || []).map((item: any, index: any) => {
          item.currentIndex = index + 1;
          return item;
        }));
        this.originalRows = this.allApplicationsService.cardsData || [];
        let pagingInfo = JSON.parse(res.PagingInfo);
        this.TotalRows.set(pagingInfo.TotalRows);
        this.PageSize.set(pagingInfo.PageSize);
        this.CurrentPage.set(pagingInfo.CurrentPage);
        let isNoActions = this.allApplicationsService.cardsData().every((item: any) => item.Actions === null || item.Actions === undefined || item.Actions.length === 0);
        if (isNoActions) {
          let actions = this.cols.find(c => c.field === 'Actions')
          if (actions) {
            actions.visible = false
          }
        } else {
          let actions = this.cols.find(c => c.field === 'Actions')
          if (actions) {
            actions.visible = true
          }
        }
      },
      error: (err) => {
        console.error('Error loading cards data:', err);
        // Optional: Add error handling logic here
      },
      complete: () => {
        // 6. Reset loading state and enable tabs when the request is complete (success or error)
        this.allApplicationsService.tableLoader.set(false);
        this.tableLoader = false;
        this.allApplicationsService.disableTabs.set(false);
      }
    });
  }

  onRowClicked(rowData: any) {
    let roleID = JSON.parse(sessionStorage.getItem('user')!).FkRoleID
    const payload: ServiceApiPayload = {
      FKServiceID: rowData.ServiceID,
      FKProcessID: rowData.FkProcessID,
      FKCurrentStatusID: rowData.FkStatusID,
      FKRoleID: roleID
    };
    if (this.page() === 'complaints') {
      this.router.navigate(['/ComplaintsRequests/RequestData'], {
        state: {
          data: payload, RequestID: rowData.RequestID, newRequestData: null,
          pageName: this.store.index.locale === 'en' ? rowData.ServiceTitleEn : rowData.ServiceTitleAr,
          itemURL: 'Inbox/RequestData',
          applicationNumber: rowData.ApplicationNumber,
          mainTab: this.allApplicationsService.mainTab,
          branchTab: this.allApplicationsService.branchTab
        }
      });
    } else {
      this.router.navigate(['/Inbox/RequestData'], {
        state: {
          data: payload, RequestID: rowData.RequestID, newRequestData: null,
          pageName: this.store.index.locale === 'en' ? rowData.ServiceTitleEn : rowData.ServiceTitleAr,
          itemURL: 'Inbox/RequestData',
          applicationNumber: rowData.ApplicationNumber,
          mainTab: this.allApplicationsService.mainTab,
          branchTab: this.allApplicationsService.branchTab
        }
      });
    }
  }

  // Handle action click from fees table (for actions column)
  onActionClick(event: any) {
    const { action, row } = event;

    if (action) {
      // Handle specific action
      this.handleAction(action, row);
    } else {
      // If no action provided, just navigate to details (default behavior)
      this.onRowClicked(row);
    }
  }

  showActionsMenu(rowData: any) {
    // Create a simple actions menu using SweetAlert or implement a custom dropdown
    const actions = rowData.Actions.map((action: any) => ({
      text: this.store.index.locale === 'en' ? action.TitleEN : action.TitleAR,
      value: action
    }));

    // For now, let's use the first action as default
    if (actions.length > 0) {
      this.handleAction(actions[0].value, rowData);
    }
  }

  private arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  @ViewChild('element') elementRef!: ElementRef;
  checkDirection(element: HTMLElement) {
    const text = element.textContent || '';
    this.isArabic = this.arabicRegex.test(text);
    console.log('Is Arabic:', this.isArabic);
    console.log('Text Content:', text);
    return this.arabicRegex.test(text);
  }

  showActivityLog(RequestID: string, ApplicationNumber: string, FkStatusID: string, ProcessID: string) {
    this.allApplicationsService.initActivityLog({ ItemID: RequestID }, ApplicationNumber, FkStatusID, ProcessID);
  }

  showRelatedRequests(RequestID: string) {
    this.allApplicationsService.initRelatedRequests(RequestID);
  }

  allData = signal<any>(null);

  async handleAction(action: Action, value: any, employee?: any, HasServiceID?: boolean) {
    this.allData.set(value);
    if (action.ActionStyle === 2839) {
      if (action.ActionID === 1859) {
        this.allApplicationsService.initActivityLog({ ItemID: this.allData().RequestID },
          this.allData().ApplicationNumber,
          this.store.index.locale === 'en' ? this.allData().FkStatusID_TitleEn : this.allData().FkStatusID_TitleAr,
          this.store.index.locale === 'en' ? this.allData().FkProcessID_TitleEn : this.allData().FkProcessID_TitleAr
        );
      }
      if (action.ActionID === 1865) {
        this.allApplicationsService.initRelatedRequests(this.allData().RequestID);
      }
      if (action.ActionID === 1850) {
        this.newApplicationService.auditLog({ RequestID: this.allData().RequestID }).subscribe(res => {
          this.newApplicationService.auditData.set(res.result.items);
          this.newApplicationService.auditDataMap = this.newApplicationService.auditData().reduce((acc: any, historyItem: any) => {
            acc[historyItem.FieldName] = historyItem;
            return acc;
          }, {} as Record<string, any>);
          this.newApplicationService.isAuditData.set(true);
        })
      }
      return;
    }
    if (action.SpecialAction) {
      if (action.ClickConditionId) {
        this.evaluateAndExecuteAction(action, undefined, undefined, undefined, HasServiceID);
      } else if (action.BusinessRuleFun) {
        this.newApplicationService.getRequest(this.allData().RequestID).subscribe((res: any) => {
          this.businessConditionAndExecuteAction(action, res, HasServiceID);
        })
      } else {
        let newService: number | null = null;
        if (HasServiceID) {
          try {
            // 1. Use await with firstValueFrom to wait for the result
            // The take(1) is NOT needed here because firstValueFrom automatically 
            // subscribes and resolves with the first value, then completes the subscription.
            Swal.close()
            const serviceId = await firstValueFrom(this.selectServiceModal.open());

            if (serviceId && serviceId > 0) {
              this.showCustomLoader();
              newService = serviceId;
              console.log(`New service ID selected: ${newService}`);
            } else {
              console.log('Modal was cancelled or returned an invalid ID.');
              return;
            }

          } catch (error) {
            // firstValueFrom throws an error if the Observable completes without emitting a value.
            // However, in your case, it will emit null on cancel, so this catch is less likely to trigger 
            // unless the modal service has an error in its observable chain.
            console.error('An error occurred while awaiting the modal result:', error);
          }
        }
        // If no ClickCondition, execute the action immediately
        this.executeAction(action, undefined, undefined, undefined, undefined, newService);
      }
      return;
    }
    this.showCustomLoader();
    let role = JSON.parse(sessionStorage.getItem('user')!).FkRoleID
    forkJoin([
      this.newApplicationService.getUI({
        FKServiceID: this.allData().ServiceID,
        FKProcessID: this.allData().FkProcessID,
        FKCurrentStatusID: this.allData().FkStatusID,
        FKRoleID: role,
        RequestID: this.allData().RequestID
      }),
      this.newApplicationService.GetServiceFieldsByActions({
        "ActionDetailsIDs": this.allData().Actions.map((action: Action) => action.ActionDetailsID),
      },
        this.allData().RequestID
      )
    ]).subscribe(async ([ui, dataToSend]) => {
      this.navigationTabs.set(ui.NavigationTabs);

      if (action.ClickConditionId) {
        this.evaluateAndExecuteAction(action, dataToSend, undefined, undefined, HasServiceID);
      } else if (action.BusinessRuleFun) {
        this.newApplicationService.getRequest(this.allData().RequestID).subscribe((res: any) => {
          this.businessConditionAndExecuteAction(action, res, HasServiceID);
        })
      } else {
        let newService: number | null = null;
        if (HasServiceID) {
          try {
            // 1. Use await with firstValueFrom to wait for the result
            // The take(1) is NOT needed here because firstValueFrom automatically 
            // subscribes and resolves with the first value, then completes the subscription.
            Swal.close()
            const serviceId = await firstValueFrom(this.selectServiceModal.open());

            if (serviceId && serviceId > 0) {
              this.showCustomLoader();
              newService = serviceId;
              console.log(`New service ID selected: ${newService}`);
            } else {
              console.log('Modal was cancelled or returned an invalid ID.');
              return;
            }

          } catch (error) {
            // firstValueFrom throws an error if the Observable completes without emitting a value.
            // However, in your case, it will emit null on cancel, so this catch is less likely to trigger 
            // unless the modal service has an error in its observable chain.
            console.error('An error occurred while awaiting the modal result:', error);
          }
        }
        // If no ClickCondition, execute the action immediately
        this.executeAction(action, dataToSend, ui.NavigationTabs, undefined, undefined, newService);
      }
    })
  }

  private evaluateAndExecuteAction(action: Action, dataToSend: any, employee?: any, row?: any, HasServiceID?: boolean): void {
    this.newApplicationService.evaluateClickConditionApi({
      RequestID: this.allData()?.RequestID || row.RequestID,
      ActionDetailsID: action.ActionDetailsID,
      ClickConditionId: action.ClickConditionId
    }).subscribe(async (res) => {
      if (res.IsTrue) {
        if (action.BusinessRuleFun) {
          this.newApplicationService.getRequest(this.allData().RequestID).subscribe((res: any) => {
            this.businessConditionAndExecuteAction(action, res, HasServiceID);
          })
        } else {
          let newService: number | null = null;
          if (HasServiceID) {
            try {
              // 1. Use await with firstValueFrom to wait for the result
              // The take(1) is NOT needed here because firstValueFrom automatically 
              // subscribes and resolves with the first value, then completes the subscription.
              Swal.close()
              const serviceId = await firstValueFrom(this.selectServiceModal.open());

              if (serviceId && serviceId > 0) {
                this.showCustomLoader();
                newService = serviceId;
                console.log(`New service ID selected: ${newService}`);
              } else {
                console.log('Modal was cancelled or returned an invalid ID.');
                return;
              }

            } catch (error) {
              // firstValueFrom throws an error if the Observable completes without emitting a value.
              // However, in your case, it will emit null on cancel, so this catch is less likely to trigger 
              // unless the modal service has an error in its observable chain.
              console.error('An error occurred while awaiting the modal result:', error);
            }
          }
          this.executeAction(action, dataToSend, this.navigationTabs(), employee, undefined, newService);
        }
      } else {
        this.showConditionError(res);
      }
    });
  }

  private businessConditionAndExecuteAction(action: Action, requestData: any, HasServiceID?: boolean | null) {
    const currentTabFields = this.extractFields(this.navigationTabs());
    this.wizardService.businessCondition(requestData, currentTabFields, action.BusinessRuleColmns, requestData.RequestID, action.BusinessRuleFun, this.allData().ServiceID).subscribe(async (res) => {
      if (res[0]?.CanContinue) {
        let newService: number | null = null;
        if (HasServiceID) {
          try {
            // 1. Use await with firstValueFrom to wait for the result
            // The take(1) is NOT needed here because firstValueFrom automatically 
            // subscribes and resolves with the first value, then completes the subscription.
            Swal.close()
            const serviceId = await firstValueFrom(this.selectServiceModal.open());
            if (serviceId && serviceId > 0) {
              this.showCustomLoader();
              newService = serviceId;
              console.log(`New service ID selected: ${newService}`);
            } else {
              console.log('Modal was cancelled or returned an invalid ID.');
              return;
            }

          } catch (error) {
            // firstValueFrom throws an error if the Observable completes without emitting a value.
            // However, in your case, it will emit null on cancel, so this catch is less likely to trigger 
            // unless the modal service has an error in its observable chain.
            console.error('An error occurred while awaiting the modal result:', error);
          }
        }
        this.executeAction(action, requestData, this.navigationTabs(), undefined, undefined, newService);
      } else {
        let baseMessage: any;
        let businessRuleFun = action.BusinessRuleFun!;
        let isEn = this.store.index.locale === 'en';
        let ErrorMessageEn = action.BusinessRuleMessageEN!
        let ErrorMessageAR = action.BusinessRuleMessageAR!
        baseMessage = isEn
          ? ErrorMessageEn
          : ErrorMessageAR

        let buttonHtml: HTMLElement | string = '';
        let title = baseMessage;
        // If extra message exists → replace the placeholder
        if (res[0].ExtraMessage && res[0]) {
          buttonHtml = `<button class="text-primary underline cursor-pointer font-bold text-xl" id="appNum" dir="ltr">${res[0].ExtraMessage}</button>`;

          title = baseMessage?.replace('[ApplicationNumber]', '');
        }
        Swal.fire({
          icon: 'error',
          title: title,
          html: buttonHtml,
          showConfirmButton: true,
          confirmButtonText: this.translations()?.swalConfirmationBtn.label,
          didOpen: () => {
            document.getElementById('appNum')?.addEventListener('click', () => {
              this.handleSpanClick(res[0].RequestID);
            });
          }
        })
        return;
      }
    })
  }

  handleSpanClick(requestID: any) {
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

  private executeAction(action: Action, dataToSend: any, navigationTabs?: NavigationTab[] | null, employee?: any, row?: any, newService?: number | null): void {
    if (action.SpecialAction) {
      this.handleSpecialAction(action, newService!);
    } else if (action.ActionID === 1877) {
      this.handleMoveEmployeeAction(action, dataToSend, navigationTabs!, employee, row);
    } else {
      this.handleRegularAction(action, dataToSend, navigationTabs!);
    }
  }
  handleRegularAction(action: Action, dataToSend: any, navigationTabs: NavigationTab[] | null) {
    const currentTabFields = this.extractFields(navigationTabs);
    const fieldsNeeded = currentTabFields.find(field => field.InternalFieldName === 'FkMoveEmployeeID');

    const payload = {};

    if (action.HasConfirmMsg) {
      this.confirmAndServiceDataAction(payload, action, dataToSend, currentTabFields);
    } else {
      this.wizardService.serviceDataActionApi(payload, action, dataToSend, currentTabFields, this.allData()?.RequestID).subscribe({
        next: (res: any) => {
          if (res.RequestID) {
            let msg = this.translations()?.allAppSuccess.label.replace('[ApplicationNumber]', res.ApplicationNumber);
            this.loadCardsData();
            Swal.close();
            Swal.fire({
              icon: 'success',
              title: msg,
              showConfirmButton: true,
              confirmButtonText: this.translations()?.validationMsgBtn.label
            })
          } else if (!res.redirectUrl) {
            let msg = this.allData().ApprovedLicense ? this.translations()?.oneLicenseFail.label
              .replace('[ApprovedLicense]', `<span dir="ltr">${this.allData().ApprovedLicense}</span>`)
              : this.translations()?.oneAppFailed.label
                .replace('[ApplicationNumber]', `<span dir="ltr">${this.allData().ApplicationNumber}</span>`);
            Swal.close();
            Swal.fire({
              icon: 'error',
              title: msg,
              showConfirmButton: true,
              confirmButtonText: this.translations()?.validationMsgBtn.label
            })
          } else {
            Swal.close();
          }
        },
        error: (error: any) => {
          let msg = this.allData().ApprovedLicense ? this.translations()?.oneLicenseFail.label
            .replace('[ApprovedLicense]', `<span dir="ltr">${this.allData().ApprovedLicense}</span>`)
            : this.translations()?.oneAppFailed.label
              .replace('[ApplicationNumber]', `<span dir="ltr">${this.allData().ApplicationNumber}</span>`);
          Swal.close();
          Swal.fire({
            icon: 'error',
            title: msg,
            showConfirmButton: true,
            confirmButtonText: this.translations()?.validationMsgBtn.label
          })
        }
      }); // Original only subscribes
    }
  }

  private handleSpecialAction(action: Action, newService: number | null): void {
    switch (action.ActionStyle) {
      case 2840: // Action Style: Execute API call with optional confirmation
        this.confirmAndPatchData(action, newService!);
        break;
      case 2854: // Action Style: Open Dim Fields
        Swal.close();
        this.onRowClicked(this.allData());
        this.newApplicationService.openDimFields.set(true);
        break;
      case 2839: // Action Style: Side panel/UI actions
        this.handleSidePanelAction(action);
        break;
    }
  }

  private handleSidePanelAction(action: Action): void {
    const requestData = this.newApplicationService.requestData();
    const locale = this.store.index.locale;

    switch (action.ActionID) {
      case 1859: // Activity Log
        this.allApplicationsService.initActivityLog(
          { ItemID: requestData.RequestID },
          requestData.ApplicationNumber,
          locale === 'en' ? requestData.FkStatusID_TitleEn : requestData.FkStatusID_TitleAr,
          locale === 'en' ? requestData.FkProcessID_TitleEn : requestData.FkProcessID_TitleAr
        );
        break;
      case 1865: // Related Requests
        this.allApplicationsService.initRelatedRequests(requestData.RequestID);
        break;
      case 1850: // Audit Data
        this.newApplicationService.isAuditData.set(true);
        break;
    }
  }

  private confirmAndPatchData(action: Action, newService?: number): void {
    const patchPayload = {
      RequestID: this.allData()?.RequestID,
      ActionDBName: action.ActionDBName!,
      FKProcessID: this.newApplicationService.defaultProcess() || null
    };

    if (action.HasConfirmMsg && this.rowsSelected().length === 0) {
      Swal.close();
      Swal.fire({
        title: this.translations()?.swalConfirmAppMsgTitle.label,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: this.translations()?.normalConfirmMsgBtn.label,
        cancelButtonText: this.translations()?.normalNoMsgBtn.label,
      }).then((result) => {
        if (result.value) {
          return this.patchDataForNewApplication(patchPayload, action, newService || null);
        }
      });
    } else {
      this.patchDataForNewApplication(patchPayload, action, newService || null);
    }
  }

  private handleMoveEmployeeAction(action: Action, dataToSend: any, navigationTabs: NavigationTab[] | null, employee: any, row?: any): void {
    const currentTabFields = this.extractFields(navigationTabs);
    const fieldsNeeded = currentTabFields.find(field => field.InternalFieldName === 'FkMoveEmployeeID');

    const payload = {
      "FkMoveEmployeeID": fieldsNeeded?.LookupValues?.find(lookup => lookup.LookupID === employee!.ID)?.LookupID || null
    };

    if (action.HasConfirmMsg && this.rowsSelected().length === 0) {
      this.confirmAndServiceDataAction(payload, action, dataToSend, currentTabFields);
    } else {
      this.wizardService.serviceDataActionApi(payload, action, dataToSend, currentTabFields, this.allData()?.RequestID || row.RequestID).subscribe((res: any) => {
        if (res.RequestID) {
          this.fulfilledCounter++;
          this.checkIfAllDone();
        } else {
          let msg = this.translations()?.oneAppFailed.label.replace('[ApplicationNumber]', res.ApplicationNumber);
          Swal.close();
          Swal.fire({
            icon: 'error',
            title: msg,
            showConfirmButton: true,
            confirmButtonText: this.translations()?.validationMsgBtn.label
          })
        }
      });
    }
  }

  fulfilledCounter: number = 0;
  checkIfAllDone() {
    if (this.fulfilledCounter === this.rowsSelected().length) {
      this.fulfilledCounter = 0;
      let msg = this.translations()?.allAppSuccess.label.replace('[ApplicationNumber]', this.rowsSelected().map((row: any) => row.ApplicationNumber).join('<br>'));
      Swal.close();
      Swal.fire({
        icon: 'success',
        title: msg,
        showConfirmButton: true,
        confirmButtonText: this.translations()?.validationMsgBtn.label
      })
    }
  }

  private extractFields(tabs: NavigationTab[] | null): FieldJson[] {
    const fields: FieldJson[] = [];
    tabs?.forEach((tab: NavigationTab) => {
      tab.TabSections.forEach(section => {
        fields.push(...section.FieldsJson);
      });
    });
    return fields;
  }

  private confirmAndServiceDataAction(payload: any, action: Action, dataToSend: any, currentTabFields: FieldJson[], row?: any): void {
    Swal.close();
    Swal.fire({
      title: this.translations()?.swalConfirmAppMsgTitle.label,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.translations()?.normalConfirmMsgBtn.label,
      cancelButtonText: this.translations()?.normalNoMsgBtn.label,
    }).then((result) => {
      if (result.value) {
        this.wizardService.serviceDataActionApi(
          payload,
          action,
          dataToSend,
          currentTabFields,
          this.allData()?.RequestID || row.RequestID
        ).subscribe({
          next: (res: any) => this.handleSuccess(res, action),
          error: (error) => this.handleError(error),
        });
      }
    });
  }

  private handleSuccess(res: any, action: Action): void {
    if (!res) return;

    Swal.close();

    if (this.newApplicationService.newRequestData()) {
      this.newApplicationService.newRequestData.set(null);
      this.newApplicationService.defaultProcess.set('');
    }

    const msg = this.formatSuccessMessage(res, action);

    const inboxState = {
      fromPage: this.menuLinksService.menuResponse().find((item: any) =>
        item.ItemURL === 'Inbox'
      )?.Services.split(',').includes(`${this.allData().FKServiceID}`)?.TitleEn
    };
    this.router.navigate(['/Inbox'], { state: inboxState });

    Swal.close();
    Swal.fire({
      icon: "success",
      title: msg,
      confirmButtonText: this.translations()?.swalConfirmationBtn.label,
      padding: '10px 20px',
    });

    this.loadCardsData();
  }

  private formatSuccessMessage(res: any, action: Action): any {
    const locale = this.store.index.locale;
    let msg = locale === 'en' ? action.SuperMsgEn : action.SuperMsgAr;
    const targetKey = locale === 'en' ? 'SuperMsgEn' : 'SuperMsgAr';

    if (msg?.includes('ApplicationNumber') && res.ApplicationNumber) {
      const key = 'ApplicationNumber';
      msg = msg.substring(0, msg.lastIndexOf(key)) +
        `<span dir="ltr">${res.ApplicationNumber}</span>` +
        msg.substring(msg.lastIndexOf(key) + key.length);
    } else if (msg?.includes('ApprovedLicense') && res.ApprovedLicense) {
      const key = 'ApprovedLicense';
      msg = msg.substring(0, msg.lastIndexOf(key)) +
        `<span dir="ltr">${res.ApprovedLicense}</span>` +
        msg.substring(msg.lastIndexOf(key) + key.length);
    }

    return msg;
  }

  private handleError(error: any): void {
    Swal.close();
    const locale = this.store.index.locale;

    if (error.error?.result === 'ERROR' && error.error.result.details) {
      let match = error.error.result.details.match(/Error ID:\s*([a-fA-F0-9]+)/);

      if (match) {
        let errorID = match[0].replace('Error ID: ', this.translations()?.submitErrMsgKeyLabel.label);
        let errorMessage = this.translations()?.submitErrMsg.label.replace('[err]', '<br>' + errorID);

        Swal.close();
        Swal.fire({
          icon: "error",
          title: errorMessage,
          confirmButtonText: this.translations()?.swalConfirmationBtn.label,
        });
      } else {
        this.showGenericError();
      }
    } else {
      this.showGenericError();
    }
    this.router.navigate(['/Inbox']);
  }

  private showConditionError(res: any): void {
    Swal.close();
    Swal.fire({
      icon: 'error',
      title: this.store.index.locale === 'en' ? res.ActionMessageEn : res.ActionMessageAr,
      showConfirmButton: true,
      confirmButtonText: this.translations()?.swalConfirmationBtn.label
    });
  }

  private showGenericError(): void {
    const genericErrorMsg = this.translations()?.submitErrMsg.label.replace('[err] <br>', '');
    Swal.close();
    Swal.fire({
      icon: "error",
      title: genericErrorMsg,
      confirmButtonText: this.translations()?.swalConfirmationBtn.label,
    });
  }

  defaultProcess: any;
  setDefaultProcess(processID: any) {
    this.defaultProcess = processID
    this.newApplicationService.defaultProcess.set(processID)
  }

  transformUpdateData(formData: any) {
    const currentTabFields: FieldJson[] = [];

    this.navigationTabs()!.forEach((tab: NavigationTab) => {
      tab.TabSections.forEach(section => {
        currentTabFields.push(...section.FieldsJson);
      });
    })
    for (const field of currentTabFields) {
      if (field.FieldType === 4 || field.FieldType === 19) {
        if (formData.ServiceTables) {
          let newData = formData.ServiceTables.filter((fieldData: any) => fieldData.SourceTableID == field.TableServiceFields!.find((arrItem) => arrItem.IsSystemField === false)!.SourceTableID).reduce((acc: any, fieldData: any) => [...acc, fieldData[field.TableServiceFields!.find((arrItem) => arrItem.IsSystemField === false)!.InternalFieldName]], []);
          formData[field.InternalFieldName] = newData;
        }
      }
      if (field.FieldType === 3) {
        let newData = formData[field.InternalFieldName];
        formData[field.InternalFieldName] = newData ? new Date(Date.parse(newData)).toLocaleDateString('en-GB') : '';
      }
      if (field.FieldType === 23) {
        let dateValue = formData[field.InternalFieldName];
        if (dateValue) {
          let dateParts = dateValue.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}/);
          if (dateParts) {
            let date = new Date(Date.parse(dateParts[0]));
            formData[field.InternalFieldName] = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-4)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
          }
        }
      }
      if (field.FieldType === 10 && field.HasModel && formData[field.InternalFieldName]) {
        this.fileService.readFileAnalysis(formData[field.InternalFieldName]).subscribe((res: any) => {
          this.fileService.fileAnalysisData.set({ ...this.fileService.fileAnalysisData(), [field.InternalFieldName]: res })
          this.allConfidences = [...this.allConfidences, +res.Confidence];
          this.calculateConfidenceForRequest(this.allConfidences)
        });
      }
    }
  }

  attachmentData = signal<any>('');
  transformAttachmentData(formData: any) {
    this.allConfidences = [...this.allConfidences, ...(formData.Attachments.filter((attachment: any) => !!attachment.Confidence).map((attachment: any) => attachment.Confidence))];
    let attachmentTypeKeys = Array.from(new Set(formData.Attachments.map((rData: any) => rData.FkAttachmentTypeID)))
    let data: any[] = attachmentTypeKeys.map((key: any) => {
      let newFile = formData.Attachments.reduce((acc: any, currentRData: any) => {
        return currentRData.FkAttachmentTypeID == key ? [...acc, currentRData] : [...acc];
      }, []);
      let newItem = { FkAttachmentTypeID: key, files: newFile }
      return newItem;
    });
    this.attachmentData.set(data);
    if (this.newApplicationService.requestData()) {
      this.newApplicationService.requestData.update((data) => {
        data.Attachments = this.attachmentData();
        return data;
      });
    } else {
      this.newApplicationService.newRequestData.update((data) => {
        data.Attachments = this.attachmentData();
        return data;
      });
    }
  }

  calculateConfidenceForRequest(confidences: number[]): any {
    if (!confidences || confidences.length === 0) {
      return;
    }

    const average = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;

    this.requestConfidence.set({ average: parseFloat(average.toFixed(2)) });
    return this.requestConfidence();
  }

  patchDataForNewApplication(payload: {
    "RequestID": string,
    "ActionDBName": string,
    "FKProcessID"?: number;
  }, action: Action, newService?: number | null) {
    this.wizardService.getSpActionRequest(payload).subscribe((res: any) => {
      console.log(res);
      this.newApplicationService.newRequestData.set(res)
      if (this.newApplicationService.defaultProcess()) {
        this.newApplicationService.newRequestData.update((data: any) => {
          if (!data) return { FkProcessID: this.newApplicationService.defaultProcess() };  // initialize if empty
          return { ...data, FkProcessID: this.newApplicationService.defaultProcess() };
        })
      }
      this.newApplicationService.CPResultResponse.set(null)
      this.newApplicationService.CRResultResponse.set(null)
      this.newApplicationService.requestData.set(null);

      let role = JSON.parse(sessionStorage.getItem('user')!).FkRoleID

      let routingPayload: ServiceApiPayload = {
        FKCurrentStatusID: res.FkStatusID,
        FKProcessID: this.defaultProcess || res.FkProcessID,
        FKRoleID: role,
        FKServiceID: newService || res.ServiceID,
      }
      Swal.close();
      this.router.navigate(['/Services/NewRequest/spAction'],
        {
          state: {
            data: routingPayload,
            itemURL: `Services/NewRequest?ServiceID=${res.ServiceID}`,
            pageName: this.store.index.locale === 'en' ? this.allData().ServiceTitleEn : this.allData().ServiceTitleAr,
            newRequestData: this.newApplicationService.newRequestData(),
            ActionDBName: payload.ActionDBName
          },
          queryParams: { ServiceID: newService || res.ServiceID }

        }
      )

    })
  }

  showCustomLoader(): void {
    const customLoaderHtml = `
        <div class="col-span-full flex justify-center">
          <span
            class="animate-spin border-4 border-black border-l-transparent rounded-full w-12 h-12 inline-block align-middle m-auto">
          </span>
        </div>
        <h2 style="margin-top: 10px; font-size: 1.5em; color: #333;">
        ${this.translations()?.submitLoader.label}
        </h2>
      `;

    const options: SweetAlertOptions = {
      html: customLoaderHtml,
      showConfirmButton: false,
      showCancelButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
    };

    Swal.fire(options);
  }

  onServerChange(event: any) {
    if (event.change_type === "page") {
      this.allApplicationsService.tableLoader.set(true);
      this.tableLoader = true;
      this.allApplicationsService.disableTabs.set(true);
      this.loadCardsData({ PageSize: event.pagesize, PageNum: event.current_page });
    }
  }
  searchAdvanced() {
    this.allApplicationsService.tableLoader.set(true);
    this.allApplicationsService.disableTabs.set(true);
    console.log(this.searchForm.value)
    let filterPayload = Object.keys(this.searchForm.value)
      .flatMap(key => {
        let value = this.searchForm.value[key];
        // If the value is an array and not null/undefined
        if (Array.isArray(value) && value.length > 0) {
          if (value) {
            // Map each item of the array to the desired object structure
            return {
              "Key": key,
              "Operator": "in",
              "Value": value.join(','),
              "SecondValue": null
            };
          }
        } else { // If the value is not an array (and not null/undefined) 
          if (value) {
            // Create a single object for the non-array value
            return {
              "Key": key,
              "Operator": "like",
              "Value": value,
              "SecondValue": null
            };
          }
        }
        // Return an empty array for falsy values to be flattened out
        return [];
      }).filter((item: any) => (item.Value && item.Value?.length > 0));
    let payload: any = {
      "pagingRequest": {
        "PageSize": this.PageSize(),
        "PageNum": "1",
        "SortField": "CreationDate",
        "SortOrder": "DESC"
      },

      "filters": filterPayload,
      "InboxType": this.tabData()?.InboxType,
      "ServicesType": this.ServicesType(),
      "Table8Filters": []
    }
    /* if (this.searchForm.value.FkStatusID) {
      payload.Statuses = this.searchForm.value.FkStatusID.join(',')
    } */
    this.allApplicationsService.getCardsDataWithSearch(payload).subscribe((res) => {
      console.log(res);
      this.allApplicationsService.cardsData.set(res.Data || [])
      let pagingInfo = JSON.parse(res.PagingInfo);
      this.PageSize.set(pagingInfo.PageSize);
      this.TotalRows.set(pagingInfo.TotalRows);
      this.CurrentPage.set(pagingInfo.CurrentPage);
      this.allApplicationsService.cardsData.set(res.Data || [])
      this.originalRows = res.Data || [];
      this.allApplicationsService.tableLoader.set(false);
      this.allApplicationsService.disableTabs.set(false);
    })
  }

  // New methods for reports-like functionality
  initializeForm() {
    this.searchForm = this.fb.group({

      DepartmentID: [[]],
      SectionID: [[]],
      ServiceID: [[]],
      RequestTypeID: [[]],
      FkStatusID: [[]],
      FkProcessID: [[]],
      SubmissionWay: [[]],
      ApplicationNumber: [null],
      ApprovedLicense: [null],
      CreationDate: [null],
      // تواريخ الرخصة
      LicenseFirstIssueDateFrom: [null],
      LicenseFirstIssueDateTo: [null],
      LicenseStartDateFrom: [null],
      LicenseStartDateTo: [null],
      LicenseEndDateFrom: [null],
      LicenseEndDateTo: [null],
      // تاريخ التقديم
      RequestDateFrom: [null],
      RequestDateTo: [null],
      PageSize: [10],
      PageNum: [1],
      SortField: ['CreationDate'],
      SortDirection: [2]
    });
  }

  toggleAdvancedSearch() {
    this.isAdvancedSearch = !this.isAdvancedSearch;
    this.isSearchCollapsed = this.isAdvancedSearch ? true : false;
    this.isGlobalSearch = false;
  }

  toggleSearchView() {
    this.isSearchCollapsed = !this.isSearchCollapsed;
    this.isAdvancedSearch = false;
    this.isGlobalSearch = this.isSearchCollapsed ? true : false;
  }
  toggleGlobalSearch() {
    this.isGlobalSearch = !this.isGlobalSearch;
    this.isSearchCollapsed = this.isGlobalSearch ? true : false;
    this.isAdvancedSearch = false;
  }

  searchApplications() {
    const formValue = this.searchForm.value;
    this.searchCriteria = [];

    // Build search criteria for display
    Object.keys(formValue).forEach(key => {
      if (formValue[key]) {
        const column = this.allColumns.find(col => col.field === key);
        if (column) {
          this.searchCriteria.push({
            key: key,
            label: column.title,
            value: formValue[key]
          });
        }
      }
    });

    // Perform actual search
    this.loadCardsData({ PageSize: this.PageSize(), PageNum: 1, ...formValue });
    this.isSearchCollapsed = true;
  }

  resetForm() {
    this.searchForm.reset();
    this.searchCriteria = [];
    this.loadCardsData({ PageSize: this.PageSize(), PageNum: 1 });
  }

  removeCriteria(key: string) {
    this.searchForm.patchValue({ [key]: '' });
    this.searchCriteria = this.searchCriteria.filter(criteria => criteria.key !== key);
    this.searchApplications();
  }

  globalSearch() {
    if (!this.globalSearchTerm || this.globalSearchTerm.trim() === '') {
      // لو فاضي، نرجع النتائج الأصلية
      this.allApplicationsService.cardsData.set([...this.originalRows]);
      return;
    }

    // تطبيق الفلتر على الصفوف الأصلية
    const term = this.globalSearchTerm.toLowerCase().trim();

    // البحث في كل الحقول
    this.allApplicationsService.cardsData.set(
      this.originalRows.filter((row: any) => {
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
      }))

  }

  resetGlobalSearch() {
    this.globalSearchTerm = '';
    this.loadCardsData({ PageSize: this.PageSize(), PageNum: 1 });
  }

  toggleViewMode(mode: 'table' | 'cards') {
    this.viewMode = mode;
  }

  openDropdown(type: 'sort' | 'columns') {
    if (type === 'sort') {
      this.toggleSortDropdown = !this.toggleSortDropdown;
      this.toggleColumnsDropdown = false;
    } else {
      this.toggleColumnsDropdown = !this.toggleColumnsDropdown;
      this.toggleSortDropdown = false;
    }
  }

  resetSort() {
    this.selectedSortColumn = null;
    this.currentSortField = '';
    this.currentSortDirection = 2;
    this.toggleSortDropdown = false;
    this.loadCardsData({ PageSize: this.PageSize(), PageNum: this.CurrentPage() });
  }

  onSortColumnChange(column: any) {
    this.selectedSortColumn = column;
    this.currentSortField = column?.field || '';
    this.applySorting();
  }

  setSortDirection(direction: number) {
    this.currentSortDirection = direction;
    this.applySorting();
  }

  applySorting() {
    if (this.currentSortField) {
      this.loadCardsData({
        PageSize: this.PageSize(),
        PageNum: this.CurrentPage(),
        SortField: this.currentSortField,
        SortDirection: this.currentSortDirection
      });
    }
    this.toggleSortDropdown = false;
  }

  resetColumns() {
    this.defaultColumnsState.forEach(defaultCol => {
      const colInAll = this.allColumns.find(c => c.field === defaultCol.field);
      const colInCols = this.cols.find(c => c.field === defaultCol.field);

      if (colInAll) {
        colInAll.visible = defaultCol.visible;
      }
      if (colInCols) {
        colInCols.visible = defaultCol.visible;
      }
    });

    // Force array reference change to trigger change detection
    this.cols = [...this.cols];

    this.toggleColumnsDropdown = false;

    // لو التفاصيل مفتوحة، نحدثها
    if (this.expandedRow) {
      this.buildExpandedRowDetails(this.expandedRow);
    }
  }

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
      this.buildExpandedRowDetails(this.expandedRow);
    }
  }

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
      this.buildExpandedRowDetails(this.expandedRow);
    }
  }

  toggleColumn(field: string) {
    const colInAll = this.allColumns.find(c => c.field === field);
    const colInCols = this.cols.find(c => c.field === field);

    if (colInAll && colInCols && !colInCols.fixed) {
      colInAll.visible = !colInAll.visible;
      colInCols.visible = colInAll.visible;

      // Force array reference change to trigger change detection
      this.cols = [...this.cols];

      // لو التفاصيل مفتوحة، نحدثها
      if (this.expandedRow) {
        this.buildExpandedRowDetails(this.expandedRow);
      }
    }
  }

  getNonFixedColumns() {
    return this.allColumns.filter(col => !col.fixed);
  }

  trackByField(index: number, col: any): string {
    return col.field;
  }

  onPageChange(page: number) {
    this.loadCardsData({ PageSize: this.PageSize(), PageNum: page });
  }

  onPageSizeChange(event: any) {
    const pageSize = typeof event === 'object' ? event.target.value : event;
    this.loadCardsData({ PageSize: parseInt(pageSize), PageNum: 1 });
  }

  onSortChange(event: any) {
    this.currentSortField = event.field;
    this.currentSortDirection = this.currentSortDirection === 1 ? 2 : 1;
    this.applySorting();
  }

  toggleRowExpand(identifier: any) {
    if (this.expandedRow && this.expandedRow.ApplicationNumber === identifier) {
      this.expandedRow = null;
      this.expandedRowDetails = [];
    } else {
      const row = this.rows().find((r: any) => r.ApplicationNumber === identifier);
      if (row) {
        this.expandedRow = row;
        this.buildExpandedRowDetails(row);
      }
    }
  }

  buildExpandedRowDetails(row: any) {
    const isMobile = window.innerWidth <= 768;

    // Get all hidden columns (non-fixed and visible = false, or hidden on mobile)
    const hiddenColumns = this.allColumns.filter(col => {
      const colInCols = this.cols.find(c => c.field === col.field);
      if (!colInCols || colInCols.fixed) return false;

      if (isMobile) {
        return col.visible === false || this.shouldHideOnMobile(col.field);
      } else {
        return col.visible === false;
      }
    });

    this.expandedRowDetails = hiddenColumns.map(col => {
      let value = '';

      // Handle different field mappings
      switch (col.field) {
        case 'ApprovedLicense':
          value = row.ApprovedLicense;
          break;
        case 'CreationDate':
          value = row.CreationDate;
          try {
            if (value) {
              const date = new Date(value);
              value = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-4)}`;
            }
          } catch (e) {
            // Keep original value if date parsing fails
          }
          break;
        case 'ServiceTitleAr':
        case 'ServiceTitleEn':
          value = this.isArabic ? row.ServiceTitleAr : row.ServiceTitleEn;
          break;
        case 'FkProcessID_TitleAr':
        case 'FkProcessID_TitleEn':
          value = this.isArabic ? row.FkProcessID_TitleAr : row.FkProcessID_TitleEn;
          break;
        case 'FkStatusID_TitleAr':
        case 'FkStatusID_TitleEn':
          value = this.isArabic ? row.FkStatusID_TitleAr : row.FkStatusID_TitleEn;
          break;
        default:
          value = row[col.field];
          break;
      }

      return {
        label: col.title,
        value: value,
        isNumber: col.isNumber || false // إضافة معلومة نوع البيانات
      };
    }).filter(detail => detail.value !== undefined && detail.value !== null && detail.value !== '' && detail.value !== '-'); // Only show fields that have values
  }

  getPageNumbers(): number[] {
    const totalPages = Math.ceil(this.TotalRows() / this.PageSize());
    const currentPage = this.CurrentPage();
    const pages: number[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push(-1); // ellipsis
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push(-1); // ellipsis
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push(-1); // ellipsis
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push(-1); // ellipsis
        pages.push(totalPages);
      }
    }

    return pages;
  }

  exportToExcel() {
    const data = this.rows().map((row: any, index: number) => {
      if (this.isArabic) {
        return {
          '#': index + 1,
          'رقم الطلب': row.ApplicationNumber || '',
          'رقم الرخصة': row.ApprovedLicense || '',
          'التاريخ': row.CreationDate || '',
          'نوع الخدمة': row.ServiceTitleAr || '',
          'نوع الإجراء': row.FkProcessID_TitleAr || '',
          'حالة الطلب': row.FkStatusID_TitleAr || ''
        };
      } else {
        return {
          '#': index + 1,
          'Application Number': row.ApplicationNumber || '',
          'License Number': row.ApprovedLicense || '',
          'Date': row.CreationDate || '',
          'Service Type': row.ServiceTitleEn || '',
          'Procedure Type': row.FkProcessID_TitleEn || '',
          'Status': row.FkStatusID_TitleEn || ''
        };
      }
    });

    const ws = XLSX.utils.json_to_sheet(data);

    // تطبيق RTL على الـ worksheet
    if (this.isArabic) {
      ws['!views'] = [{ RTL: true }];
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, this.isArabic ? 'الطلبات' : 'Applications');

    // تطبيق RTL على הـ workbook
    if (this.isArabic) {
      if (!wb.Workbook) wb.Workbook = {};
      if (!wb.Workbook.Views) wb.Workbook.Views = [];
      wb.Workbook.Views[0] = { RTL: true };
    }

    const filename = this.isArabic ? 'تقرير_الطلبات.xlsx' : 'Applications_Report.xlsx';
    XLSX.writeFile(wb, filename);
  }
  getClassesByStatusId(statusId: number): string {
    switch (statusId) {
      case 5:
      case 625:
      case 627:
      case 629:
      case 1670:
      case 1671:
      case 1672:
      case 1673:
      case 18:
      case 9:
      case 1827:
      case 1:
      case 7:
      case 19:
      case 2877:
      case 2879:
      case 2880:
      case 2881:
        return 'text-yellow-900 border-[#704d00] bg-[#FEBC2E19]';
      case 20:
      case 2878:
        return 'text-[#4CAF50] border-[#4CAF50] bg-[#4CAF5019]';
      case 1899:
        // Uses red-900/950 for a dark "Blood Red" or "Wine" look
        return 'inline-flex px-2 py-1 rounded font-semibold bg-red-900 text-red-100 border-2 border-red-800';
      case 111:
      case 675:
        return 'text-red-800 border-[#F44336] bg-[#F4433619]';
      case 0:
      case 1674:
      case 6:
        return 'text-gray-700 border-[#707070] bg-[#70707024]';
      case 1977:
      case 1978:
      case 2776:
      case 2779:
      case 2780:
      case 2781:
      case 2782:
      case 2783:
      case 2784:
      case 2785:
      case 2786:
      case 2787:
      case 2788:
      case 2789:
      case 2790:
      case 2791:
      case 622:
        return 'text-[#000] border-[#000] bg-gray-100';
      default:
        return 'text-red-800 border-[#F44336] bg-[#F4433619]';
    }
    /* text-[#4CAF50] text-sm border-[#4CAF50] border bg-[#4CAF5019] */
  }

  setPaginationInfo(pagingInfo: any) {
    this.PageSize.set(pagingInfo.PageSize);
    this.TotalRows.set(pagingInfo.TotalRows);
    this.CurrentPage.set(pagingInfo.CurrentPage);
  }

  openAnalysisModel = output<any>();
  openRequestAnalysis(row: any) {
    this.showCustomLoader();
    let role = JSON.parse(sessionStorage.getItem('user')!).FkRoleID
    this.fileService.readRequestAnalysis({
      FKServiceID: row.ServiceID,
      FKProcessID: row.FkProcessID,
      FKCurrentStatusID: row.FkStatusID,
      FKRoleID: role,
      RequestID: row.RequestID
    }).subscribe((res: any) => {
      Swal.close();
      this.fileService.fileAnalysisData.set({ ...this.fileService.fileAnalysisData(), 'request': res })
      this.openAnalysisModel.emit(true)
    })
  }
}