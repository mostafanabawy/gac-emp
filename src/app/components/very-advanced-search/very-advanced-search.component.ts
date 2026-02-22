import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Store } from '@ngrx/store';
import { AllApplicationsService } from 'src/app/service/all-applications.service';
import { LicensesService } from 'src/app/service/licenses.service';
import { LocalizationService } from 'src/app/service/localization.service';
import { AppState } from 'src/types/auth.types';
import { basic } from 'src/app/helpers/date-helper';

@Component({
  selector: 'app-very-advanced-search',
  templateUrl: './very-advanced-search.component.html'
})
export class VeryAdvancedSearchComponent {
  searchForm!: FormGroup;
  store!: AppState;
  mainTabsData = input<any>();
  pageSize = input.required<number>();
  translations = signal<any>(null);
  currentTabData = input<any>();
  paginationInfo = output<any>();
  ServicesType = input.required();
  isArabic: boolean = false;
  searchPayload = output<any>();
  basic = basic
  lookupsData = input<any>();
  empLookup = input<any>();
  normalLookupsServiceID = input<any>();
  constructor(
    public allApplicationsService: AllApplicationsService,
    private fb: FormBuilder,
    private storeData: Store<AppState>,
    private localizationService: LocalizationService,
    private LicensesService: LicensesService
  ) {
    this.initStore();
    effect(() => {
      if (this.ServicesType()) {
        this.initForm();
      }
    })
    this.translations.set(this.localizationService.getTranslations());
    effect(() => {
      if (this.normalLookupsServiceID()) {
        let res = this.normalLookupsServiceID();
        this.allServiceIDLookup.set(res.items)
      }
    }, { allowSignalWrites: true })
    effect(() => {
      if (this.lookupsData()) {
        let data = this.lookupsData();
        this.paymentMethods = data.Lookup?.PaymentWay || [];
        this.departments = data.Lookup?.Departments || [];
        this.clubNames = data.Lookup?.Clubs || [];
        this.submissionMethods = data.Lookup?.SubmissionWay || [];
        this.secondaryActivities = data.Lookup?.SecondaryActivity || [];

        this.allAdministrations = data.Lookup?.Section || [];
        this.allServices = data.Lookup?.Services || [];
        this.allRequests = data.Lookup?.Request || [];
        this.allProcedures = data.Lookup?.Process || [];
        this.allStatuses = data.Lookup?.Statuses || [];

        this.administrations = [...this.allAdministrations];
        this.services = [...this.allServices];
        this.Requests = [...this.allRequests];
        this.procedures = [...this.allProcedures];
        this.requestStatuses = [...this.allStatuses];
      }
    }, { allowSignalWrites: true })
  }
  allServiceIDLookup = signal<any>([]);

  serviceIDLookup = computed(() => {
    let lookup = this.allServiceIDLookup().filter((item: any) => {
      return this.mainTabsData().Services.includes(item.ServiceID);
    })
    return lookup
  });
  FkProcessLookup = computed(() => {
    if (this.allApplicationsService.lookupValues()) {

      let lookup = this.allApplicationsService.lookupValues().filter((item: any) => {
        return item.LookupTypeID === 5 || item.LookupID === -1
      }).sort((item1: any, item2: any) => item1.LookupID - item2.LookupID)
      return lookup
    } else {
      return null
    }
  });
  FkStatusLookup = computed(() => {
    if (this.allApplicationsService.lookupValues()) {

      let lookup = this.allApplicationsService.lookupValues().filter((item: any) => {
        return item.LookupTypeID === 4 || item.LookupID === -1
      }).sort((item1: any, item2: any) => item1.LookupID - item2.LookupID)
      console.log(lookup);
      return lookup
    } else {
      return null
    }
  });
  ngOnInit() {


  }
  initForm() {
    if (this.ServicesType() === 'SportAffairServices') {
      this.searchForm = this.fb.group({
        ApplicantQID: [''],
        OwnerName: [''],
        CreationDateFrom: [null],
        CreationDateTo: [null],
        DepartmentID: [[]],
        SectionID: [[]],
        ServiceID: [[]],
        FkStatusID: [[]],
        FkProcessID: [[]],
        SubmissionWay: [[]],
        ApplicationNumber: [null],
        ApprovedLicense: [null],
        CreationDate: [null],
        FkSecondaryActivityID: [[]],

        LicenseCreationDateFrom: [null],
        LicenseCreationDateTo: [null],
        LicenseExpirationDateFrom: [null],
        LicenseExpirationDateTo: [null],
        CompanyName: [''],
        CompanyNameEn: [''],
        CommercialRegistrationNo: [''],
        CommercialName: [''],
        // تاريخ التقديم
        RequestDateFrom: [null],
        RequestDateTo: [null],
        PageSize: [10],
        PageNum: [1],
        SortDirection: [2]
      });
    } else if (this.ServicesType() === 'SportOrganizationService') {
      this.searchForm = this.fb.group({
        ApplicantQID: [''],
        ApplicantName: [''],
        CreationDateFrom: [null],
        CreationDateTo: [null],
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
        FkSecondaryActivityID: [[]],

        LicenseCreationDateFrom: [null],
        LicenseCreationDateTo: [null],
        LicenseExpirationDateFrom: [null],
        LicenseExpirationDateTo: [null],
        CompanyName: [''],
        CompanyNameEn: [''],
        CommercialRegistrationNo: [''],
        CommercialName: [''],
        // تاريخ التقديم
        RequestDateFrom: [null],
        RequestDateTo: [null],
        PageSize: [10],
        PageNum: [1],
        SortDirection: [2]
      });
    } else if (this.ServicesType() === 'YouthEventService') {
      this.searchForm = this.fb.group({
        ApplicantQID: [''],
        OwnerQID: [''],
        OwnerName: [''],
        ApplicantName: [''],
        CreationDateFrom: [null],
        CreationDateTo: [null],
        DepartmentID: [[]],
        SectionID: [[]],
        RequestTypeID: [[]],
        FkStatusID: [[]],
        FkProcessID: [[]],
        SubmissionWay: [[]],
        ApplicationNumber: [null],
        ApprovedLicense: [null],
        CreationDate: [null],
        FkSecondaryActivityID: [[]],

        LicenseCreationDateFrom: [null],
        LicenseCreationDateTo: [null],
        LicenseExpirationDateFrom: [null],
        LicenseExpirationDateTo: [null],
        CommercialRegistrationNo: [''],
        CommercialName: [''],
        users: [''],
        // تاريخ التقديم
        RequestDateFrom: [null],
        RequestDateTo: [null],
        PageSize: [10],
        PageNum: [1],
        SortDirection: [2]
      });
    } else if (this.ServicesType() === 'YouthPermitService') {
      this.searchForm = this.fb.group({
        ApplicantQID: [''],
        OwnerQID: [''],
        OwnerName: [''],
        ApplicantName: [''],
        CreationDateFrom: [null],
        CreationDateTo: [null],
        DepartmentID: [[]],
        SectionID: [[]],
        RequestTypeID: [[]],
        FkStatusID: [[]],
        FkProcessID: [[]],
        SubmissionWay: [[]],
        ApplicationNumber: [null],
        ApprovedLicense: [null],
        CreationDate: [null],
        FkSecondaryActivityID: [[]],

        LicenseCreationDateFrom: [null],
        LicenseCreationDateTo: [null],
        LicenseExpirationDateFrom: [null],
        LicenseExpirationDateTo: [null],
        CommercialRegistrationNo: [''],
        CommercialName: [''],
        users: [''],
        // تاريخ التقديم
        RequestDateFrom: [null],
        RequestDateTo: [null],
        PageSize: [10],
        PageNum: [1],
        SortDirection: [2]
      });
    } else if (this.ServicesType() === 'YouthActivitiesService') {
      this.searchForm = this.fb.group({
        ApplicantQID: [''],
        OwnerQID: [''],
        OwnerName: [''],
        ApplicantName: [''],
        CreationDateFrom: [null],
        CreationDateTo: [null],
        DepartmentID: [[]],
        SectionID: [[]],
        RequestTypeID: [[]],
        FkStatusID: [[]],
        FkProcessID: [[]],
        SubmissionWay: [[]],
        ApplicationNumber: [null],
        ApprovedLicense: [null],
        CreationDate: [null],
        FkSecondaryActivityID: [[]],

        LicenseCreationDateFrom: [null],
        LicenseCreationDateTo: [null],
        LicenseExpirationDateFrom: [null],
        LicenseExpirationDateTo: [null],
        CommercialRegistrationNo: [''],
        CommercialName: [''],
        users: [''],
        // تاريخ التقديم
        RequestDateFrom: [null],
        RequestDateTo: [null],
        PageSize: [10],
        PageNum: [1],
        SortDirection: [2]
      });
    } else if (this.ServicesType() === 'YouthCenterService') {
      this.searchForm = this.fb.group({
        ApplicantQID: [''],
        OwnerQID: [''],
        OwnerName: [''],
        ApplicantName: [''],
        CreationDateFrom: [null],
        CreationDateTo: [null],
        DepartmentID: [[]],
        SectionID: [[]],
        RequestTypeID: [[]],
        FkStatusID: [[]],
        FkProcessID: [[]],
        SubmissionWay: [[]],
        ApplicationNumber: [null],
        ApprovedLicense: [null],
        CreationDate: [null],
        FkSecondaryActivityID: [[]],

        LicenseCreationDateFrom: [null],
        LicenseCreationDateTo: [null],
        LicenseExpirationDateFrom: [null],
        LicenseExpirationDateTo: [null],
        CommercialRegistrationNo: [''],
        CommercialName: [''],
        users: [''],
        // تاريخ التقديم
        RequestDateFrom: [null],
        RequestDateTo: [null],
        PageSize: [10],
        PageNum: [1],
        SortDirection: [2]
      });
    } else if (this.ServicesType() === 'MembershipService') {
      this.searchForm = this.fb.group({
        ApplicantQID: [''],
        ApplicantName: [''],
        CreationDateFrom: [null],
        FkClubID: [[]],
        CreationDateTo: [null],
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
        MembershipNumber: [null],

        LicenseCreationDateFrom: [null],
        LicenseCreationDateTo: [null],
        LicenseExpirationDateFrom: [null],
        LicenseExpirationDateTo: [null],
        // تاريخ التقديم
        RequestDateFrom: [null],
        RequestDateTo: [null],
        PageSize: [10],
        PageNum: [1],
        SortDirection: [2]
      });
    } else if (this.ServicesType() === 'GeneralAssemplyService') {
      this.searchForm = this.fb.group({
        ApplicantQID: [''],
        ApplicantName: [''],
        CreationDateFrom: [null],
        FkClubID: [[]],
        CreationDateTo: [null],
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
        MembershipNumber: [null],

        LicenseCreationDateFrom: [null],
        LicenseCreationDateTo: [null],
        LicenseExpirationDateFrom: [null],
        LicenseExpirationDateTo: [null],
        // تاريخ التقديم
        RequestDateFrom: [null],
        RequestDateTo: [null],
        PageSize: [10],
        PageNum: [1],
        SortDirection: [2]
      });
    } else {
      this.searchForm = this.fb.group({
        ApplicantQID: [''],
        ApplicantName: [''],
        CreationDateFrom: [null],
        CreationDateTo: [null],
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
        FkSecondaryActivityID: [[]],

        LicenseCreationDateFrom: [null],
        LicenseCreationDateTo: [null],
        LicenseExpirationDateFrom: [null],
        LicenseExpirationDateTo: [null],
        CompanyName: [''],
        CompanyNameEn: [''],
        CommercialRegistrationNo: [''],
        CommercialName: [''],
        // تاريخ التقديم
        RequestDateFrom: [null],
        RequestDateTo: [null],
        PageSize: [10],
        PageNum: [1],
        SortDirection: [2]
      });
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
  submitForm() {
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
            let operator: any;
            if (['CreationDateTo', 'LicenseCreationDateTo', 'LicenseExpirationDateTo'].includes(key)) {
              operator = '<='
              if (key === 'CreationDateTo') {
                key = 'CreationDate'
              } else if (key === 'LicenseCreationDateTo') {
                key = 'LicenseCreationDate'
              } else if (key === 'LicenseExpirationDateTo') {
                key = 'LicenseExpirationDate'
              }
              value = this.convertDateToISO(value)
            } else if (['CreationDateFrom', 'LicenseCreationDateFrom', 'LicenseExpirationDateFrom'].includes(key)) {
              operator = '>='
              if (key === 'CreationDateFrom') {
                key = 'CreationDate'
              } else if (key === 'LicenseCreationDateFrom') {
                key = 'LicenseCreationDate'
              } else if (key === 'LicenseExpirationDateFrom') {
                key = 'LicenseExpirationDate'
              }
              value = this.convertDateToISO(value)
            } else {
              operator = 'like'
            }
            return {
              "Key": key,
              "Operator": operator,
              "Value": value,
              "SecondValue": null
            };
          }
        }
        // Return an empty array for falsy values to be flattened out
        return [];
      }).filter((item: any) => (item.Value && item.Value?.length > 0 && item.Key !== 'FkSecondaryActivityID'));

    let table8FilterPayload = Object.keys(this.searchForm.value)
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
            let operator: any;
            if (['CreationDateTo', 'LicenseCreationDateTo', 'LicenseExpirationDateTo'].includes(key)) {
              operator = '<='
              if (key === 'CreationDateTo') {
                key = 'CreationDate'
              } else if (key === 'LicenseCreationDateTo') {
                key = 'LicenseCreationDate'
              } else if (key === 'LicenseExpirationDateTo') {
                key = 'LicenseExpirationDate'
              }
              value = this.convertDateToISO(value)
            } else if (['CreationDateFrom', 'LicenseCreationDateFrom', 'LicenseExpirationDateFrom'].includes(key)) {
              operator = '>='
              if (key === 'CreationDateFrom') {
                key = 'CreationDate'
              } else if (key === 'LicenseCreationDateFrom') {
                key = 'LicenseCreationDate'
              } else if (key === 'LicenseExpirationDateFrom') {
                key = 'LicenseExpirationDate'
              }
              value = this.convertDateToISO(value)
            } else {
              operator = 'like'
            }
            return {
              "Key": key,
              "Operator": operator,
              "Value": value,
              "SecondValue": null
            };
          }
        }
        // Return an empty array for falsy values to be flattened out
        return [];
      }).filter((item: any) => (item.Value && item.Value?.length > 0 && item.Key === 'FkSecondaryActivityID'));

    let payload: any = {
      "pagingRequest": {
        "PageSize": this.pageSize(),
        "PageNum": "1",
        "SortField": "CreationDate",
        "SortOrder": "DESC"
      },

      "filters": filterPayload,
      "Table8Filters": table8FilterPayload,
      "InboxType": this.currentTabData().InboxType,
      "ServicesType": this.ServicesType()
    }
    this.searchPayload.emit(payload);
    /* if (this.searchForm.value.FkStatusID) {
      payload.Statuses = this.searchForm.value.FkStatusID.join(',')
    } */
    this.allApplicationsService.getCardsDataWithSearch(payload).subscribe((res) => {
      console.log(res);
      this.allApplicationsService.cardsData.set(res.Data || [])
      let pagingInfo = JSON.parse(res.PagingInfo);
      this.paginationInfo.emit(pagingInfo);
      let dataToBeSent = this.allApplicationsService.cardsData().filter((item: any, index: number) => {
        let actionsToBeSent = (item.Actions && item.Actions.length) ? item.Actions.filter((item: any) => {
          return !!item.ShowConditionId
        }) : [];
        this.allApplicationsService.cardsData()[index].apiActions = actionsToBeSent
        return actionsToBeSent.length > 0
      })
      dataToBeSent = dataToBeSent.map((item: any) => {
        return {
          RequestID: item.RequestID,
          ActionDetailsIDs: item.apiActions.map((action: any) => action.ActionDetailsID)
        }
      })
      if (dataToBeSent.length > 0) {
        this.allApplicationsService.EvaluateActionConditionBulk(dataToBeSent).subscribe((evalRes: any) => {
          this.allApplicationsService.evalResSignal.set(evalRes);
        })
      }
      this.allApplicationsService.tableLoader.set(false);
      this.allApplicationsService.disableTabs.set(false);
    })
  }
  resetData() {
    this.allApplicationsService.tableLoader.set(true);
    this.allApplicationsService.disableTabs.set(true);
    this.searchForm.reset();
    let payload = {
      "pagingRequest": {
        "PageSize": this.pageSize(),
        "PageNum": "1",
        "SortField": "CreationDate",
        "SortOrder": "DESC"
      },
      "filters": [],
      "Table8Filters": [],
      "InboxType": this.currentTabData().InboxType,
      "ServicesType": this.ServicesType()
    }
    this.searchPayload.emit(payload);
    this.allApplicationsService.getCardsDataWithSearch(payload).subscribe((res) => {
      console.log(res);
      this.allApplicationsService.cardsData.set(res.Data || [])
      let pagingInfo = JSON.parse(res.PagingInfo);
      this.paginationInfo.emit(pagingInfo);
      let dataToBeSent = this.allApplicationsService.cardsData().filter((item: any, index: number) => {
            let actionsToBeSent = (item.Actions && item.Actions.length) ? item.Actions.filter((item: any) => {
              return !!item.ShowConditionId
            }) : [];
            this.allApplicationsService.cardsData()[index].apiActions = actionsToBeSent
            return actionsToBeSent.length > 0
          })
          dataToBeSent = dataToBeSent.map((item: any) => {
            return {
              RequestID: item.RequestID,
              ActionDetailsIDs: item.apiActions.map((action: any) => action.ActionDetailsID)
            }
          })
          if (dataToBeSent.length > 0) {
            this.allApplicationsService.EvaluateActionConditionBulk(dataToBeSent).subscribe((evalRes: any) => {
              this.allApplicationsService.evalResSignal.set(evalRes);
            })
          }
      this.allApplicationsService.tableLoader.set(false);
      this.allApplicationsService.disableTabs.set(false);
    })
  }

  onToggleSearch = output<boolean>();
  onToggleAdvancedSearch = output<boolean>();
  onToggleGlobalSearch = output<boolean>();
  isSearchCollapsed = input<boolean>();
  isAdvancedSearchCollapsed = input<boolean>();
  isGlobalSearchCollapsed = input<boolean>();
  toggleSearchView() {
    this.onToggleSearch.emit(!this.isSearchCollapsed());
  }
  toggleAdvancedSearchView() {
    this.onToggleAdvancedSearch.emit(!this.isAdvancedSearchCollapsed());
  }
  toggleGlobalSearchView() {
    this.onToggleGlobalSearch.emit(!this.isGlobalSearchCollapsed());
  }

  /* advanced search code------------------------------------- */
  paymentMethods: any[] = [];
  services: any[] = [];
  departments: any[] = [];
  administrations: any[] = [];
  clubNames: any[] = [];
  requestStatuses: any[] = [];
  procedures: any[] = [];
  Requests: any[] = [];
  secondaryActivities: any[] = [];

  submissionMethods: any[] = [];
  allAdministrations: any[] = [];
  allServices: any[] = [];
  allRequests: any[] = [];
  allProcedures: any[] = [];
  allStatuses: any[] = [];

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
  getSection(selectedDepartments: any) {
    // تنظيف القيم من -1
    const cleanDepartments = this.cleanFormValue('DepartmentID', selectedDepartments);

    if (!cleanDepartments || cleanDepartments.length === 0) {
      this.administrations = [...this.allAdministrations];
      this.services = [...this.allServices];
      this.Requests = [...this.allRequests];
      this.searchForm.patchValue({ SectionID: [], ServiceID: [], RequestTypeID: [] });
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
  }

  getServices(selectedSections: any) {
    // تنظيف القيم من -1
    const cleanSections = this.cleanFormValue('SectionID', selectedSections);

    if (!cleanSections || cleanSections.length === 0) {
      this.services = [...this.allServices];
      this.Requests = [...this.allRequests];
      this.searchForm.patchValue({ ServiceID: [], RequestTypeID: [] });
      return;
    }

    // فلترة الخدمات حسب الأقسام المختارة
    this.services = this.allServices.filter(
      (srv: any) => cleanSections.some((section: any) => section.LookupID === srv.SectionID)
    );

    // مسح القوائم التابعة
    this.Requests = [...this.allRequests];
    this.searchForm.patchValue({ ServiceID: [], RequestTypeID: [] });
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

  }

  private convertDateToISO(dateValue: string): string {
    // Check if the dateValue is null, undefined, or not a string.
    if (!dateValue || typeof dateValue !== 'string') {
      return dateValue;
    }

    // Define a regular expression to match dd/mm/yyyy format.
    const ddmmyyyyRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;

    // Check if the string is in dd/mm/yyyy format.
    const match = dateValue.match(ddmmyyyyRegex);

    if (match) {
      // Extract the day, month, and year from the matched groups.
      const day = match[1];
      const month = match[2];
      const year = match[3];

      // Create a new string in YYYY-MM-DD format, which the Date constructor can parse.
      const isoString = `${year}-${month}-${day}`;
      const d = new Date(isoString);

      // Validate that the new Date object is not an "Invalid Date".
      if (!isNaN(d.getTime())) {
        return d.toISOString();
      }
    }

    // If the string is already an ISO 8601 format, return it directly.
    const d = new Date(dateValue);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }

    // If none of the above, log an error and return null.
    console.error('Invalid date format:', dateValue);
    return dateValue;
  }

}
