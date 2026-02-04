import { Component, OnInit, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, signal, HostListener } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { ServiceRolesComponent } from '../service-roles/service-roles.component';
import { ServiceProcessesComponent } from '../service-processes/service-processes.component';
import { ServiceStatusesComponent } from '../service-statuses/service-statuses.component';
import { ServiceFieldsComponent } from '../service-fields/service-fields.component';
@Component({
  selector: 'app-dynamic-attachments',
  standalone: true,
  imports: [ServiceFieldsComponent, ServiceRolesComponent, ServiceProcessesComponent, ServiceStatusesComponent, ComponentsModule, TranslateModule, FlatpickrModule, NgSelectModule, CommonModule, ReactiveFormsModule, DataTableModule, IconModule],
  templateUrl: './service-management-edit.html',
  styleUrl: './service-management-edit.css'
})
export class ServiceManagementEditComponent implements OnInit, AfterViewInit {
  basic = basic;
  activeTab: any = signal<string>('personal');
  previousTab: string | null = null;
  hide = true;
  showAddAttachmentModal = false;
  isEditMode = false;
  AddserviceproceduresForm!: FormGroup;
  translations: any = {};
  isArabic = this.translate.currentLang === 'ae';
  AllAttachments: any[] = [];
  showSections: boolean = false;
  sidebarCollapsed: boolean = false;
  isMobileScreen = false;
  Departments: any[] = [];
  Section: any[] = [];
  Request: any[] = [];
  search = '';
  itemURL: any = null;
  cols: any[] = [];
  id: any = null;
  lastUserId: number = 0;
  rows: any[] = [];
  paginationInfo = {
    TotalPages: 1,
    CurrentPage: 1,
    PageSize: 20,
    TotalRows: 0
  };
  tabHistory: string[] = [];
  isLoading: boolean = false;
  currentSortField: string = 'MessageID';
  currentSortDirection: number = 2;
  private lastFetchParams: string | null = null;

  // Default allowed file types

  constructor(
    private router: Router,
    private fb: FormBuilder,
    public translate: TranslateService,
    private ServiceService: ServiceService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
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
  notOnlyWhitespace(control: AbstractControl): { [key: string]: boolean } | null {
    if (control.value && control.value.trim().length === 0) {
      return { onlyWhitespace: true };
    }
    return null;
  }
  ngOnInit(): void {
    this.translations = this.loadEServicesTranslationsFromLocalStorage();


    this.checkScreenSize();


    this.ServiceService.getById(null).subscribe((res) => {
      if (res?.Lookup) {
        this.Departments = res.Lookup.Departments;
        this.Section = res.Lookup.Section;
        this.Request = res.Lookup.Request;

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
      ServiceDescAr: [null, [Validators.required, this.notOnlyWhitespace]],
      ServiceDescEn: [null, [Validators.required, this.notOnlyWhitespace]],
      ServiceTermsAr: [null, [Validators.required, this.notOnlyWhitespace]],
      ServiceTermsEn: [null, [Validators.required, this.notOnlyWhitespace]],
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
      ServiceID: [null],
    });




    const serviceID = this.route.snapshot.paramMap.get('id');
    if (serviceID) {
      this.loadDetails(+serviceID);
    }
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab && ['personal', 'serviceFields', 'userRoles', 'serviceStatuses', 'serviceProcesses'].includes(tab)) {
        this.previousTab = 'personal'; // Set a default previous tab
        this.activeTab.set(tab);
      }
    });
  }






  onCheckboxChange(checked: boolean, id: number) {
    const row = this.rows.find(r => r.ID === id);
    if (row) {
      row.Active = checked;
    }
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


  @HostListener('window:resize', [])
  onWindowResize() {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isMobileScreen = window.innerWidth < 1200;
    if (this.isMobileScreen) {
      this.sidebarCollapsed = true;
    } else {
      this.sidebarCollapsed = false;
    }
  }



  customSearchFn(term: string, item: any) {
    term = term.toLowerCase();
    return item.ServiceTitleAr.toLowerCase().includes(term) ||
      item.ServiceTitleEn.toLowerCase().includes(term);
  }







  ngAfterViewInit(): void {
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
        Department: isArabic ? item.DepartmentTitleAr : item.DepartmentTitleEn,
        Section: isArabic ? item.SectionTitleAr : item.SectionTitleEn,
        RequestType: isArabic ? item.RequestTitleAr : item.RequestTitleEn,
        CreationDate: formatDateDisplay(item.CreationDate),
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


  combineDateWithTime(time: string): string | null {
    if (!time) return null;

    const [hours, minutes] = time.split(':').map(Number);

    const baseDate = new Date(Date.UTC(2010, 0, 1, hours, minutes, 0));

    return baseDate.toISOString();
  }



  onAddSubmit() {
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
          invalidElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        const translationEntry = this.translations?.[firstInvalidControlName];
        const fieldMessage = translationEntry?.validation;

        Swal.fire({
          icon: 'warning',
          title: `${fieldMessage}`,
          confirmButtonText: this.translations?.confrim?.label,
        });
      }
      return;
    }

    const ServiceID = Number(this.route.snapshot.paramMap.get('id'));

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

      const payload: any = {
        ...formData,
        SuspendTimeFrom: formData.SuspendTimeFrom,
        SuspendTimeTo: formData.SuspendTimeTo,
        SuspendDateFrom: toISOorNull(formData.SuspendDateFrom),
        SuspendDateTo: toISOorNull(formData.SuspendDateTo),
        ServiceID: ServiceID,
        AllowablePeriodBefore: Number(formData.AllowablePeriodBefore),
        AllowablePeriodAfter: Number(formData.AllowablePeriodAfter),
        MinActivitiesCount: Number(formData.MinActivitiesCount),
        MaxActivitiesCount: Number(formData.MaxActivitiesCount),
        MaxEventPeriodInDays: Number(formData.MaxEventPeriodInDays),
        MaxEventPeriodInMonths: Number(formData.MaxEventPeriodInMonths),
        LicensePeriod: Number(formData.LicensePeriod),
        EventSubmissionDateInDays: Number(formData.EventSubmissionDateInDays),
        DeleteDraftAutoInDays: Number(formData.DeleteDraftAutoInDays),
        CRServiceCode: Number(formData.CRServiceCode),
        MaxExtendEventDate: Number(formData.MaxExtendEventDate),
      };

      try {
        await this.ServiceService.updateEServicesServices(payload).toPromise(); // if observable
        // or: await this.ServiceService.updateEServicesServices(payload); // if promise

        Swal.fire({
          icon: 'success',
          title: this.translations?.ModifiedSuccessfully?.label,
          confirmButtonText: this.translations?.confrim?.label,
        }).then(() => {
          this.router.navigate(['/services/servicemanagement']);
        });
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: this.translations?.TryAgainLater?.label,
          confirmButtonText: this.translations?.confrim?.label,
        });
      } finally {
        this.isLoading = false;
      }
    });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
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
  onRowClick(row: any) {
    row.expanded = !row.expanded;
  }

  changeTab(tab: string) {
    if (this.activeTab() !== tab) { // Avoid pushing duplicate tabs
      this.tabHistory.push(this.activeTab());
      this.activeTab.set(tab);
      console.log('Tab history:', this.tabHistory); // Debugging
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goBackToPreviousTab() {
    this.router.navigate(['/services/servicemanagement']);
  }
  formatTimeForDisplay(dateTimeString: string | null): string | null {
    if (!dateTimeString) return null;

    try {
      const date = new Date(dateTimeString);

      if (isNaN(date.getTime())) {
        console.warn(`Invalid date string: ${dateTimeString}`);
        return null;
      }

      const options: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: this.isArabic ? false : true,
        timeZone: 'UTC',
      };

      return date.toLocaleTimeString(this.isArabic ? 'ar-AE' : 'en-US', options);
    } catch (error) {
      console.error(`Error formatting time: ${error}`);
      return null;
    }
  }





  loadDetails(id: any) {
    this.ServiceService.getByServiceID(id).subscribe({
      next: (Service: any) => {
        this.AddserviceproceduresForm.patchValue({
          ServiceID: Service.items[0].ServiceID,
          ServiceTitleAr: Service.items[0].ServiceTitleAr,
          ServiceTitleEn: Service.items[0].ServiceTitleEn,
          DepartmentID: Service.items[0].DepartmentID,
          SectionID: Service.items[0].SectionID,
          RequestTypeID: Service.items[0].RequestTypeID,
          AppPrefixCode: Service.items[0].AppPrefixCode,
          LicensePrefixCode: Service.items[0].LicensePrefixCode,
          LicensePeriod: Service.items[0].LicensePeriod,
          ServiceDescAr: Service.items[0].ServiceDescAr,
          ServiceDescEn: Service.items[0].ServiceDescEn,
          ServiceTermsAr: Service.items[0].ServiceTermsAr,
          ServiceTermsEn: Service.items[0].ServiceTermsEn,
          Active: Service.items[0].Active,
          SuspendDateFrom: Service.items[0].SuspendDateFrom,
          SuspendDateTo: Service.items[0].SuspendDateTo,
          SSuspendTimeFrom: this.formatTimeForDisplay(Service.items[0].SuspendTimeFrom),
          SuspendTimeTo: this.formatTimeForDisplay(Service.items[0].SuspendTimeTo),
          AllowablePeriodBefore: Service.items[0].AllowablePeriodBefore,
          AllowablePeriodAfter: Service.items[0].AllowablePeriodAfter,
          MinActivitiesCount: Service.items[0].MinActivitiesCount,
          MaxActivitiesCount: Service.items[0].MaxActivitiesCount,
          MaxEventPeriodInDays: Service.items[0].MaxEventPeriodInDays,
          EventSubmissionDateInDays: Service.items[0].EventSubmissionDateInDays,
          MaxExtendEventDate: Service.items[0].MaxExtendEventDate,
          MaxFounders: Service.items[0].MaxFounders,
          DeleteDraftAutoInDays: Service.items[0].DeleteDraftAutoInDays,
          DeleteDraftActive: Service.items[0].DeleteDraftActive,
          HelpFileName: Service.items[0].HelpFileName,
          CRServiceCode: Service.items[0].CRServiceCode,
          AiHelpTextAr: Service.items[0].AiHelpTextAr,
          AiHelpTextEn: Service.items[0].AiHelpTextEn,
          VideoUrl: Service.items[0].VideoUrl,

        });

        // Force change detection to update the UI
        this.cdr.markForCheck();

        // if (!user.User.FkSectionId && this.Sections?.length) {
        //   this.AddserviceproceduresForm.controls['FkSectionId'].setValue(this.Sections[0].LookupID);
        // }
      },
      error: (err) => {

      }
    });
  }
}