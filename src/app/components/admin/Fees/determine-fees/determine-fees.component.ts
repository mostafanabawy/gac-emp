import { Component, OnInit, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Renderer2, ViewChild, HostListener } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators, ValidationErrors, FormsModule } from '@angular/forms';
import { ComponentsModule } from "src/app/components/components.module";
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { DataTableModule } from '@bhplugin/ng-datatable';
import { NgSelectModule } from '@ng-select/ng-select';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { IconModule } from 'src/app/shared/icon/icon.module';
import { FlatpickrModule } from 'angularx-flatpickr';
import { basic, formatDateDisplay } from 'src/app/helpers/date-helper';
import { FeesService } from 'src/app/service/Fees/fees.service';
import { forkJoin, lastValueFrom } from 'rxjs';
import { FeesTableComponent } from '../../../fees-table/fees-table.component';


@Component({
  selector: 'app-determine-fees',
  standalone: true,
  imports: [ComponentsModule, FormsModule, TranslateModule, FlatpickrModule, NgSelectModule, CommonModule, ReactiveFormsModule, DataTableModule, IconModule, FeesTableComponent],
  templateUrl: './determine-fees.component.html',
  styleUrl: './determine-fees.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DetermineFeesComponent implements OnInit, AfterViewInit {
  @ViewChild('feesTable') feesTable!: FeesTableComponent;
  feesForm!: FormGroup;
  isEditMode = false;
  showAddModal = false;
  addFeesForm!: FormGroup;
  showTimeFields = false;
  translations: any = {};
  isArabic = this.translate.currentLang === 'ae';
  Sections: any[] = [];
  itemURL: any = null;
  showSections: boolean = false;
  Roles: any[] = [];
  Title: any[] = [];
  Clubses: any[] = [];
  Departments: any[] = [];
  Section: any[] = [];
  Request: any[] = [];
  Services: any[] = [];
  MembershipTypes: any[] = [];
  Clubs: any[] = [];
  ApplicantTypes: any[] = [];
  EventList: any[] = [];
  Sex: any[] = [];
  Process: any[] = [];
  showClubs: boolean = false;
  Notifications: any[] = [];
  showNotifications: boolean = false;
  cols: any[] = [];
  allColumns: any[] = [];
  defaultColumnsState: any[] = [];
  lastUserId: number = 0;
  isLoading: boolean = false;
  basic = basic;
  id: any;
  ShowClub = false;
  MembershipType = false;
  ApplicantType = false;
  LocalOrInternational = false;
  Category = false;
  paginationInfo = {
    TotalPages: 1,
    CurrentPage: 1,
    PageSize: 20,
    TotalRows: 0
  };
  expandedRow: any = null;
  expandedRowDetails: any[] = [];
  pageSizeOptions = [5, 10, 12, 20, 50, 100];
  rows: any[] = [];
  currentSortField: string = 'ID';
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
    private api: FeesService,
    private cdr: ChangeDetectorRef,
    private renderer: Renderer2
  ) {

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


  noMinusOneValidator(control: AbstractControl): ValidationErrors | null {
    return control.value === -1 || !control.value ? { required: true } : null;
  }

  get FKServiceID(): any {
    return this.addFeesForm.get('FKServiceID');
  }
  get FeesValue(): any {
    return this.addFeesForm.get('FeesValue');
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
  get FkCategoryID(): any {
    return this.addFeesForm.get('FkSexID')?.value;
  }
  get FkProcessID(): any {
    return this.addFeesForm.get('FkProcessID');
  }

  ngOnInit(): void {
    this.translations = this.loadEServicesTranslationsFromLocalStorage();
    const self = this;
    (window as any).editFeesFromOutside = (id: number) => {
      this.editFees(id);
    };

    (window as any).toggleRowExpand = (ID: any) => {
      this.toggleRowExpand(ID);
    };
    this.cols = [
      { field: 'expand', title: '', sort: false, visible: true, fixed: true, width: '50px' },
      { field: 'Serial', title: this.translations?.Serial?.label, sort: false, isNumber: true, visible: true, fixed: true, width: '80px' },
      { field: 'DepartmentTitleAr', title: this.translations?.Management?.label, sort: true, visible: true, width: '150px' },
      { field: 'SectionTitleAr', title: this.translations?.Section?.label, sort: true, visible: true, width: '150px' },
      { field: 'ReqTitleAr', title: this.translations?.Requesttype?.label, sort: true, visible: true, width: '150px' },
      { field: 'ServiceTitleAr', title: this.translations?.ServiceType?.label, sort: true, visible: true, width: '200px' },
      { field: 'FeesValue', title: this.translations?.FeesValue?.label, sort: true, visible: true, width: '120px', isNumber: true },
      { field: 'CreationDate', title: this.translations?.CreationDate?.label, sort: true, visible: true, width: '150px' },
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

    this.api.DetermineFeesGetData(null).subscribe({
      next: (res) => {

        this.Departments = res.lookupJson?.Departments || [];
        this.Section = res.lookupJson?.Section || [];
        this.Services = res.lookupJson?.Services || [];
        this.Process = res.lookupJson?.Process || [];
        this.Request = res.lookupJson?.Request || [];
        this.Clubs = res.lookupJson?.Clubs || [];
        this.MembershipTypes = res.lookupJson?.MembershipTypes || [];
        this.ApplicantTypes = res.lookupJson?.ApplicantTypes || [];
        this.Sex = res.lookupJson?.Sex || [];
        this.EventList = res.lookupJson?.EventList || [];

        this.cdr.markForCheck();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: this.translations?.Error?.label,
          text: this.translations?.TryAgainLater?.label,
        });
        this.cdr.markForCheck();
      }
    });

    this.feesForm = this.fb.group({
      DepartmentId: [null],
      SectionsID: [null],
      FKReqID: [null],
      FKServiceID: [null],
      FkMembershipTypeID: [null],
      FkClubID: [null],
      FkApplicantTypeID: [null],
      FkEventID: [null],
      FkSexID: [null],
      FkProcessID: [null],
      FeesValue: [null],
      Start_CreationDate: [null],
      End_CreationDate: [null]
    });

    this.addFeesForm = this.fb.group({
      FKServiceID: [null, [this.noMinusOneValidator]],
      FkMembershipTypeID: [null,],
      FkClubID: [null,],
      FkApplicantTypeID: [null,],
      FkEventID: [null,],
      FkSexID: [null,],
      FkProcessID: [null, [this.noMinusOneValidator]],
      FeesValue: [null, [Validators.required]],
      CreationDate: [new Date()],
      ID: [null],
      DepartmentId: [-1],
      SectionsID: [null],
      FKReqID: [null],


    });

    this.fetchData();
    this.onReset();

  }
  getSection(e: any) {
    this.feesForm.controls['DepartmentId'].setValue(e.DepartmentID);
  }
  getRequest(e: any) {
    this.feesForm.controls['DepartmentId'].setValue(e.DepartmentID);
    this.feesForm.controls['SectionsID'].setValue(e.SectionID);
  }
  getService(e: any) {

    this.feesForm.controls['DepartmentId'].setValue(e.DepartmentID);
    this.feesForm.controls['SectionsID'].setValue(e.SectionID);
    this.feesForm.controls['FKReqID'].setValue(e.RequestTypeID);
  }

  getAddClub(e: any) {
    this.MembershipType = true;

    const control = this.addFeesForm.get('FkMembershipTypeID');

    if (e) {
      control?.setValidators([Validators.required]);
    } else {
      control?.clearValidators();
      control?.setValue(null);
    }

    control?.updateValueAndValidity({ emitEvent: false });
  }


  getEvent(e: any) {
    this.LocalOrInternational = true;

    const control = this.addFeesForm.get('FkEventID');

    if (e) {
      control?.setValidators([Validators.required]);
    } else {
      control?.clearValidators();
      control?.setValue(null);
    }

    control?.updateValueAndValidity({ emitEvent: false });
  }


  getAddService(e: any) {
    this.addFeesForm.patchValue({
      DepartmentId: e.DepartmentID,
      SectionsID: e.SectionID,
      FKReqID: e.RequestTypeID
    });

    // Clubs
    if (e.ServiceID == 5015) {
      this.showClubs = true;
      this.addFeesForm.get('FkClubID')?.setValidators([this.noMinusOneValidator]);
    } else {
      this.showClubs = false;
      this.addFeesForm.get('FkClubID')?.clearValidators();
      this.addFeesForm.get('FkClubID')?.setValue(null);   // 🟢 امسح القيمة
    }
    this.addFeesForm.get('FkClubID')?.updateValueAndValidity({ emitEvent: false });

    // ApplicantType
    if (e.ServiceID == 5014) {
      this.ApplicantType = true;
      this.addFeesForm.get('FkApplicantTypeID')?.setValidators([this.noMinusOneValidator]);
    } else {
      this.ApplicantType = false;
      this.addFeesForm.get('FkApplicantTypeID')?.clearValidators();
      this.addFeesForm.get('FkApplicantTypeID')?.setValue(null);  // 🟢 امسح القيمة
    }
    this.addFeesForm.get('FkApplicantTypeID')?.updateValueAndValidity({ emitEvent: false });

    // Category
    if (e.ServiceID == 5006) {
      this.Category = true;
      this.addFeesForm.get('FkSexID')?.setValidators([this.noMinusOneValidator]);
    } else {
      this.Category = false;
      this.addFeesForm.get('FkSexID')?.clearValidators();
      this.addFeesForm.get('FkSexID')?.setValue(null);  // 🟢 امسح القيمة
    }
    this.addFeesForm.get('FkSexID')?.updateValueAndValidity({ emitEvent: false });
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

  fetchData(setting?: any, searchData?: any) {
    if (!setting) {
      setting = {
        pageNo: this.paginationInfo.CurrentPage,
        pageSize: this.paginationInfo.PageSize,
        sortField: this.currentSortField || 'ID',
        sortDirection: this.currentSortDirection || 2
      };
    }
    if (!searchData) {
      const formValues = this.feesForm.value;

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
      const filterMinusOne = (value: any) => (value === -1 ? null : value);


      searchData = {
        DepartmentId: filterMinusOne(formValues.DepartmentId),
        SectionsID: filterMinusOne(formValues.SectionsID),
        FKReqID: filterMinusOne(formValues.FKReqID),
        FKServiceID: filterMinusOne(formValues.FKServiceID),
        FkMembershipTypeID: filterMinusOne(formValues.FkMembershipTypeID),
        FkClubID: filterMinusOne(formValues.FkClubID),
        FkEventID: filterMinusOne(formValues.FkEventID),
        FkSexID: filterMinusOne(formValues.FkSexID),
        FkProcessID: filterMinusOne(formValues.FkProcessID),
        FeesValue: formValues.FeesValue,
        Start_CreationDate: toISOorNull(formValues.Start_CreationDate),
        End_CreationDate: toISOorNull(formValues.End_CreationDate)

      };
    }

    const currentParams = JSON.stringify({ setting, searchData });

    this.lastFetchParams = currentParams;

    this.isLoading = true;
    this.cdr.markForCheck();

    this.api.getDetermineFeesPageWithSearch(setting, searchData).subscribe({
      next: (res) => {
        const items = res?.result?.items || [];
        this.rows = this.mapRowsWithSerial(items);
        const pagingInfo = res?.result?.PagingInfo?.[0] || {};
        const totalRows = pagingInfo.TotalRows || items.length || 0;
        const pageSize = pagingInfo.PageSize || setting.pageSize || 5;
        const totalPages = Math.max(Math.ceil(totalRows / pageSize), 1);
        let currentPage = setting.pageNo || 1;
        if (currentPage > totalPages || currentPage < 1) {
          currentPage = 1;
          setting.pageNo = 1;
        }
        this.paginationInfo = {
          TotalRows: totalRows,
          PageSize: pageSize,
          CurrentPage: currentPage,
          TotalPages: totalPages
        };

        this.cdr.markForCheck();
        this.isLoading = false;

      },
      error: (err) => {
        this.rows = [];
        this.paginationInfo = {
          TotalRows: 0,
          PageSize: this.paginationInfo.PageSize || 5,
          CurrentPage: 1,
          TotalPages: 1
        };
        Swal.fire({
          icon: 'error',
          title: this.translations?.Error?.label,
          text: this.translations?.TryAgainLater?.label,
        });
      }
    });
  }

  onSubmit() {
    this.paginationInfo.CurrentPage = 1;
    this.fetchData();
  }


  onPageChange(event: any) {
    let newPage = 1;
    if (typeof event === 'number') {
      newPage = event;
    } else if (event?.page) {
      newPage = event.page;
    } else if (event?.currentPage) {
      newPage = event.currentPage;
    } else {
    }
    if (this.paginationInfo.CurrentPage !== newPage) {
      this.paginationInfo.CurrentPage = newPage;
      const setting = {
        pageNo: newPage,
        pageSize: this.paginationInfo.PageSize || 5,
        sortField: this.currentSortField || 'ID',
        sortDirection: this.currentSortDirection || 2
      };
      const formValues = this.feesForm.value;
      const filterMinusOne = (value: any) => (value === -1 ? null : value);
      const searchData = {
        DepartmentId: filterMinusOne(formValues.DepartmentId),
        SectionsID: filterMinusOne(formValues.SectionsID),
        FKReqID: filterMinusOne(formValues.FKReqID),
        FKServiceID: filterMinusOne(formValues.FKServiceID),
        FkMembershipTypeID: filterMinusOne(formValues.FkMembershipTypeID),
        FkClubID: filterMinusOne(formValues.FkClubID),
        FkEventID: filterMinusOne(formValues.FkEventID),
        FkSexID: filterMinusOne(formValues.FkSexID),
        FkProcessID: filterMinusOne(formValues.FkProcessID),
        FeesValue: formValues.FeesValue,
        Start_CreationDate: formValues.Start_CreationDate,
        End_CreationDate: formValues.End_CreationDate
      };


      this.fetchData(setting, searchData);
    } else {
      this.cdr.markForCheck();
    }
  }


  onServerChange(data: any) {
    switch (data.change_type) {
      case 'page':
        this.onPageChange(data.current_page)
        break;
      case 'pagesize':
        this.onPageSizeChange(data.pagesize)
        break;
      case 'sort':
        this.onSortChange({ field: data.sort_column, direction: data.sort_direction === 1 ? 'asc' : 'desc' })
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
        sortDirection: this.currentSortDirection || 2
      };
      const formValues = this.feesForm.value;
      const filterMinusOne = (value: any) => (value === -1 ? null : value);
      const searchData = {
        DepartmentId: filterMinusOne(formValues.DepartmentId),
        SectionsID: filterMinusOne(formValues.SectionsID),
        FKReqID: filterMinusOne(formValues.FKReqID),
        FKServiceID: filterMinusOne(formValues.FKServiceID),
        FkMembershipTypeID: filterMinusOne(formValues.FkMembershipTypeID),
        FkClubID: filterMinusOne(formValues.FkClubID),
        FkEventID: filterMinusOne(formValues.FkEventID),
        FkSexID: filterMinusOne(formValues.FkSexID),
        FkProcessID: filterMinusOne(formValues.FkProcessID),
        FeesValue: formValues.FeesValue || null,
        Start_CreationDate: formValues.Start_CreationDate || null,
        End_CreationDate: formValues.End_CreationDate || null
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

    const filterMinusOne = (value: any) => (value === -1 ? null : value);
    const formValues = this.feesForm.value;

    const searchData = {
      DepartmentId: filterMinusOne(formValues.DepartmentId),
      SectionsID: filterMinusOne(formValues.SectionsID),
      FKReqID: filterMinusOne(formValues.FKReqID),
      FKServiceID: filterMinusOne(formValues.FKServiceID),
      FkMembershipTypeID: filterMinusOne(formValues.FkMembershipTypeID),
      FkClubID: filterMinusOne(formValues.FkClubID),
      FkEventID: filterMinusOne(formValues.FkEventID),
      FkSexID: filterMinusOne(formValues.FkSexID),
      FkProcessID: filterMinusOne(formValues.FkProcessID),
      FeesValue: formValues.FeesValue || null,
      Start_CreationDate: formValues.Start_CreationDate || null,
      End_CreationDate: formValues.End_CreationDate || null
    };

    this.fetchData(setting, searchData);
    this.cdr.markForCheck();
  }





  customSearchFn(term: string, item: any) {
    term = term.toLowerCase();
    return item.TitleAr?.toLowerCase().includes(term) || item.TitleEn?.toLowerCase().includes(term);
  }

  onReset() {
    this.feesForm.reset({

      DepartmentId: -1,
      SectionsID: -1,
      FKReqID: -1,
      FKServiceID: -1,
      FkMembershipTypeID: -1,
      FkClubID: -1,
      FkApplicantTypeID: -1,
      FkEventID: -1,
      FkSexID: -1,
      FkProcessID: -1,
      FeesValue: '',
      Start_CreationDate: '',
      End_CreationDate: ''
    });



    this.paginationInfo.CurrentPage = 1;
    this.fetchData();
  }
  onResetAddForm() {
    this.addFeesForm.reset({

      DepartmentId: -1,
      SectionsID: -1,
      FKReqID: -1,
      FKServiceID: -1,
      FkMembershipTypeID: -1,
      FkClubID: -1,
      FkApplicantTypeID: -1,
      FkEventID: -1,
      FkSexID: -1,
      FkProcessID: -1,
      FeesValue: '',
      Start_CreationDate: '',
      End_CreationDate: ''
    });
    this.paginationInfo.CurrentPage = 1;
    this.fetchData();
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

    headerMap['ClubTitleAr'] = this.translations?.TitleAr_Club?.label || (isArabic ? 'النادي (عربي)' : 'Club (Ar)');
    headerMap['ClubTitleEn'] = this.translations?.TitleEn_Club?.label || (isArabic ? 'النادي (إنجليزي)' : 'Club (En)');
    headerMap['MembershipTypeTitleAr'] = this.translations?.MembershipTypeTitleAr?.label || (isArabic ? 'نوع العضوية (عربي)' : 'Membership Type (Ar)');
    headerMap['MembershipTypeTitleEn'] = this.translations?.MembershipTypeTitleEn?.label || (isArabic ? 'نوع العضوية (إنجليزي)' : 'Membership Type (En)');
    headerMap['ApplicantTypeTitleAr'] = this.translations?.ApplicantTypeTitleAr?.label || (isArabic ? 'نوع مقدم الطلب (عربي)' : 'Applicant Type (Ar)');
    headerMap['ApplicantTypeTitleEn'] = this.translations?.ApplicantTypeTitleEn?.label || (isArabic ? 'نوع مقدم الطلب (إنجليزي)' : 'Applicant Type (En)');
    headerMap['EventTitleAr'] = this.translations?.EventTitleAr?.label || (isArabic ? 'الفعالية (عربي)' : 'Event (Ar)');
    headerMap['EventTitleEn'] = this.translations?.EventTitleEn?.label || (isArabic ? 'الفعالية (إنجليزي)' : 'Event (En)');
    headerMap['SexTitleAr'] = this.translations?.Category?.label || (isArabic ? 'الفئة' : 'Category');
    headerMap['ProcessTitleAr'] = this.translations?.ProcessTitleAr?.label || (isArabic ? 'الإجراء' : 'Process');

    const data = this.rows.map((item: any) => {
      const row: any = {};
      Object.keys(headerMap).forEach(field => {
        let value = item[field];

        if (field === 'Active') {
          value = value
            ? (isArabic ? 'مفعل' : 'Active')
            : (isArabic ? 'غير مفعل' : 'Inactive');
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
    XLSX.utils.book_append_sheet(wb, ws, isArabic ? 'رسوم الخدمات' : 'Service Fees');

    // تطبيق RTL على الـ workbook
    if (isArabic) {
      if (!wb.Workbook) wb.Workbook = {};
      if (!wb.Workbook.Views) wb.Workbook.Views = [];
      wb.Workbook.Views[0] = { RTL: true };
    }

    const filename = isArabic ? 'تقرير_رسوم_الخدمات.xlsx' : 'Service_Fees_Report.xlsx';
    XLSX.writeFile(wb, filename);
  }


  private mapRowsWithSerial(data: any[]): any[] {
    const isArabic = this.translate.currentLang === 'ae';
    const pageIndex = this.paginationInfo.CurrentPage - 1;
    const pageSize = this.paginationInfo.PageSize || 20;
    this.lastUserId = Math.max(...data.map(item => item.ID || 0), 0);
    return data.map((item, index) => ({
      ...item,
      Serial: pageIndex * pageSize + index + 1,
      AllName: isArabic ? item.Name : item.NameEn,
      Title_Section: isArabic ? item.TitleAr_Section : item.TitleEn_Section,
      Title_Role: isArabic ? item.TitleAr_Role : item.TitleEn_Role,
      Title_Club: isArabic ? item.TitleAr_Club : item.TitleEn_Club,
      Title_Notification: isArabic ? item.TitleAr_Notification : item.TitleEn_Notification,
      CreationDate: formatDateDisplay(item.CreationDate),
      // إضافة Actions array فارغ لعرض زر التعديل الافتراضي
      Actions: []
    }));
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

  openAddUserModal() {
    this.onResetAddForm();
    this.showAddModal = true;
    this.cdr.markForCheck();
  }

  closeAddUserModal() {
    this.showAddModal = false;
    this.addFeesForm.reset();
    this.ShowClub = false;
    this.MembershipType = false;
    this.ApplicantType = false;
    this.LocalOrInternational = false;
    this.Category = false;
    this.isEditMode = false;
    this.cdr.markForCheck();
  }

  submitAddUser() {
    if (this.addFeesForm.invalid) {
      // Object.keys(this.addFeesForm.controls).forEach(key => {
      //   this.addFeesForm.get(key)?.markAsTouched();
      // });

      const firstInvalidControlName = Object.keys(this.addFeesForm.controls)
        .find(key => this.addFeesForm.get(key)?.invalid);

      if (firstInvalidControlName) {
        const invalidElement = document.querySelector(
          `[formcontrolname="${firstInvalidControlName}"]`
        ) as HTMLElement;
        if (invalidElement) {
          invalidElement.focus();
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

    const filterMinusOne = (value: any) => (value === -1 ? null : value);
    const formValues = this.addFeesForm.value;

    const userData = {
      ...formValues,
      ID: this.isEditMode ? this.id : this.lastUserId + 1,
      DepartmentId: filterMinusOne(formValues.DepartmentId),
      SectionsID: filterMinusOne(formValues.SectionsID),
      FkClubID: filterMinusOne(formValues.FkClubID),
      FKReqID: filterMinusOne(formValues.FKReqID),
      FkApplicantTypeID: filterMinusOne(formValues.FkApplicantTypeID),
      FKServiceID: filterMinusOne(formValues.FKServiceID),
      FeesValue: filterMinusOne(formValues.FeesValue),
      FkProcessID: filterMinusOne(formValues.FkProcessID),
      FkMembershipTypeID: filterMinusOne(formValues.FkMembershipTypeID),
      FkEventID: filterMinusOne(formValues.FkEventID),
      FkSexID: filterMinusOne(formValues.FkSexID),
      CreationDate: formValues.CreationDate ? new Date(formValues.CreationDate).toISOString() : new Date().toISOString(),
    };

    Swal.fire({
      title: this.translations?.AreYouSure?.label,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.translations?.confrim?.label,
      cancelButtonText: this.translations?.No?.label,
    }).then((result) => {
      if (result.isConfirmed) {
        const apiCall = this.isEditMode
          ? this.api.updateFees(userData)
          : this.api.addFees(userData);

        apiCall.subscribe({
          next: () => {
            this.showAddModal = false;
            this.addFeesForm.reset();
            this.paginationInfo.CurrentPage = 1;
            this.fetchData();
            Swal.fire({
              icon: 'success',
              confirmButtonText: this.translations?.confrim?.label,
              title: this.isEditMode
                ? this.translations?.ModifiedSuccessfully?.label
                : this.translations?.AddedSuccessfully?.label,
            });
            this.ShowClub = false;
            this.MembershipType = false;
            this.ApplicantType = false;
            this.LocalOrInternational = false;
            this.Category = false;
            this.cdr.markForCheck();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: this.isEditMode
                ? this.translations?.UpdateError?.label
                : this.translations?.AddError?.label,
              text: err?.error?.message || this.translations?.TryAgainLater?.label,
            });
            this.cdr.markForCheck();
          },
        });
      }
    });
  }







  editFees(id: number) {
    const Id = id;
    this.id = id
    this.isEditMode = true;
    this.isLoading = true;
    this.showAddModal = true;

    this.api.FeesById(Id).subscribe({
      next: (res) => {
        if (res && res.items && res.items.length > 0) {
          const attachmentData = res.items[0];
          this.id = attachmentData.ID;
          this.addFeesForm.patchValue({
            ID: attachmentData.ID,
            FKReqID: attachmentData.FKReqID,
            FKServiceID: attachmentData.FKServiceID,
            FkMembershipTypeID: attachmentData.FkMembershipTypeID,
            FkClubID: attachmentData.FkClubID,
            FeesValue: attachmentData.FeesValue,
            FkApplicantTypeID: attachmentData.FkApplicantTypeID,
            FkEventID: attachmentData.FkEventID,
            FkSexID: attachmentData.FkSexID,
            FkProcessID: attachmentData.FkProcessID,
            SectionsID: attachmentData.SectionsID,


          });
          this.getAddService({
            DepartmentID: attachmentData.DepartmentId,
            SectionID: attachmentData.SectionsID,
            RequestTypeID: attachmentData.FKReqID,
            ServiceID: attachmentData.FKServiceID
          });

          if (attachmentData.FkClubID) {
            this.getAddClub(attachmentData.FkClubID);
          }

          if (attachmentData.FkApplicantTypeID) {
            this.getEvent(attachmentData.FkApplicantTypeID);
          }
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
        this.showAddModal = false;
        this.cdr.markForCheck();
      },
    });
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
    console.log('Toggling row with ID:', ID);
    if (this.expandedRow?.ID === ID) {
      this.expandedRow = null;
      this.expandedRowDetails = [];
    } else {
      this.expandedRow = this.rows.find(row => row.ID === ID);
      this.expandedRowDetails = this.expandedRow ? this.getHiddenColumnsDetails(this.expandedRow) : [];
      console.log('Expanded row:', this.expandedRow);
    }
    this.cdr.markForCheck();
  }

  // Get hidden columns details for expanded row
  getHiddenColumnsDetails(row: any): any[] {
    const details: any[] = [];

    // إضافة التفاصيل الإضافية
    const additionalDetails = [
      { label: this.translations?.TitleAr_Club?.label, value: row.ClubTitleAr },
      { label: this.translations?.TitleEn_Club?.label, value: row.ClubTitleEn },
      { label: this.translations?.MembershipTypeTitleAr?.label, value: row.MembershipTypeTitleAr },
      { label: this.translations?.MembershipTypeTitleEn?.label, value: row.MembershipTypeTitleEn },
      { label: this.translations?.ApplicantTypeTitleAr?.label, value: row.ApplicantTypeTitleAr },
      { label: this.translations?.ApplicantTypeTitleEn?.label, value: row.ApplicantTypeTitleEn },
      { label: this.translations?.EventTitleAr?.label, value: row.EventTitleAr },
      { label: this.translations?.EventTitleEn?.label, value: row.EventTitleEn },
      { label: this.translations?.Category?.label, value: row.SexTitleAr },
      { label: this.translations?.ProcessTitleAr?.label, value: row.ProcessTitleAr }
    ];

    additionalDetails.forEach(detail => {
      if (detail.value) {
        details.push(detail);
      }
    });

    // إضافة الأعمدة المخفية
    this.cols.forEach(col => {
      if (col.fixed || col.field === 'expand' || col.field === 'Serial' || col.field === 'actions') {
        return;
      }

      if (col.visible === false) {
        let value = row[col.field];
        let label = col.title;
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
    this.editFees(event.row.ID);
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