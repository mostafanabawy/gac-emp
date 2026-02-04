import { Component, OnInit, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, HostListener, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ComponentsModule } from '../../components.module';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { DataTableModule } from '@bhplugin/ng-datatable';
import { NgSelectModule } from '@ng-select/ng-select';
import { AuthService } from 'src/app/service/auth/auth.service';
import { LocalizationService } from 'src/app/service/localization.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { IconModule } from 'src/app/shared/icon/icon.module';
import { FeesTableComponent } from '../../fees-table/fees-table.component';

@Component({
  selector: 'app-login-user',
  standalone: true,
  imports: [ComponentsModule, FormsModule, TranslateModule, NgSelectModule, CommonModule, ReactiveFormsModule, DataTableModule, IconModule, FeesTableComponent],
  templateUrl: './login-user.component.html',
  styleUrl: './login-user.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class LoginUserComponent implements OnInit, AfterViewInit {
  @ViewChild('feesTable') feesTable!: FeesTableComponent;

  usersForm!: FormGroup;
  showAddUserModal = false;
  addUserForm!: FormGroup;
  showTimeFields = false;
  translations: any = {};
  isArabic = this.translate.currentLang === 'ae';
  Sections: any[] = [];
  showSections: boolean = false;
  Roles: any[] = [];
  Title: any[] = [];
  Clubses: any[] = [];
  showClubs: boolean = false;
  Notifications: any[] = [];
  showNotifications: boolean = false;
  cols: any[] = [];
  allColumns: any[] = [];
  defaultColumnsState: any[] = [];
  lastUserId: number = 0;
  isLoading: boolean = false;
  isSpecificTime = false;
  paginationInfo = {
    TotalPages: 1,
    CurrentPage: 1,
    PageSize: 20,
    TotalRows: 0
  };
  pageSizeOptions = [5, 10, 12, 20, 50, 100];
  rows: any[] = [];
  currentSortField: string = 'ID';
  currentSortDirection: number = 2;
  private lastFetchParams: string | null = null;
  expandedRow: any = null;
  expandedRowDetails: any[] = [];
  itemURL: any = '/users/systemusers';
  viewMode: 'table' | 'cards' = 'table';
  sortableColumns: any[] = [];
  selectedSortColumn: any = null;
  toggleColumnsDropdown = false;
  toggleSortDropdown = false;
  constructor(
    private router: Router,
    private fb: FormBuilder,
    public translate: TranslateService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
    private localizationService: LocalizationService
  ) { }

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
  get username(): any {
    return this.addUserForm.get('Username');
  }
  get password(): any {
    return this.addUserForm.get('Password');
  }
  get nameAR(): any {
    return this.addUserForm.get('Name');
  }
  get nameEn(): any {
    return this.addUserForm.get('NameEn');
  }
  get phone(): any {
    return this.addUserForm.get('Phone');
  }
  get email(): any {
    return this.addUserForm.get('Email');
  }

  get role(): any {
    return this.addUserForm.get('FkRoleID');
  }
  get notificationTime() {
    return this.addUserForm.get('NotificationTime');
  }

  get title(): any {
    return this.addUserForm.get('FkTitleID');
  }

  get receiveNotifications(): any {
    return this.addUserForm.get('ReceiveNotifications');
  }

  ngOnInit(): void {
    this.translations = this.localizationService.getTranslationsByScreen('global', 'systemusers');
    // this.translations = this.loadEServicesTranslationsFromLocalStorage();

    const self = this;
    (window as any).editUserFromOutside = (id: number) => {
      this.editUser(id);
    };
    (window as any).toggleRowExpand = (id: any) => {
      this.toggleRowExpand(id);
    };
    this.cols = [
      { field: 'expand', title: '', sort: false, visible: true, fixed: true, width: '50px' },
      { field: 'Serial', title: this.translations?.Serial?.label, sort: false, isNumber: true, visible: true, fixed: true, width: '80px' },
      { field: 'Username', title: this.translations?.Username?.label, sort: true, visible: true, width: '150px' },
      { field: 'AllName', title: this.translations?.Name?.label, sort: true, visible: true, width: '200px' },
      { field: 'Phone', title: this.translations?.Phone?.label, sort: true, visible: true, width: '150px', isNumber: true },
      { field: 'Email', title: this.translations?.Email?.label, sort: true, visible: true, width: '200px' },
      { field: 'Title_Role', title: this.translations?.Role?.label, sort: true, visible: true, width: '150px' },
      { field: 'Title_Section', title: this.translations?.Section?.label, sort: true, visible: false, width: '150px' },
      { field: 'Title_Club', title: this.translations?.Club?.label, sort: true, visible: false, width: '150px' },
      { field: 'Title_Notification', title: this.translations?.Notifications?.label, sort: true, visible: false, width: '150px' },
      { field: 'ActivitedText', title: this.translations?.Status?.label, sort: true, visible: true, width: '150px' },
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

    this.auth.getuser(null).subscribe({
      next: (res) => {
        this.Sections = res.Lookup?.Section || [];

        this.Roles = (res.Lookup?.Role || []).filter((role: any) => role.LookupID !== 666666);
        this.Clubses = res.Lookup?.Clubs || [];
        this.Notifications = res.Lookup?.Notifications || [];
        this.Title = res.Lookup?.Title || [];
        this.usersForm.controls['FkSectionId'].setValue(this.Sections[0].LookupID);
        this.usersForm.controls['FkRoleID'].setValue(this.Roles[0].LookupID);
        this.usersForm.controls['FkClubID'].setValue(this.Clubses[0].LookupID);
        this.usersForm.controls['ReceiveNotifications'].setValue(this.Notifications[0].LookupID);

        this.addUserForm.controls['FkSectionId'].setValue(this.Sections[0].LookupID);
        this.addUserForm.controls['FkRoleID'].setValue(this.Roles[0].LookupID);
        this.addUserForm.controls['FkClubID'].setValue(this.Clubses[0].LookupID);
        this.addUserForm.controls['ReceiveNotifications'].setValue(this.Notifications[0].LookupID);
        this.addUserForm.controls['FkTitleID'].setValue(this.Title[0].LookupID);

        this.cdr.markForCheck();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: this.translations?.Error?.label,
          confirmButtonText: this.translations?.confrim?.label,
          text: this.translations?.TryAgainLater?.label,
        });
        this.cdr.markForCheck();
      }
    });



    this.addUserForm = this.fb.group({
      ID: [''],
      Username: ['', Validators.required],
      Password: ['', Validators.required],
      Name: ['', Validators.required],
      NameEn: ['', Validators.required],
      FkTitleID: [null, [Validators.required, this.notMinusOneValidator]],
      FkRoleID: [null, [Validators.required, this.notMinusOneValidator]],
      NotificationMode: [null],
      AdName: [''],
      Phone: [''],
      Email: [''],
      FkSectionId: [null],
      FkClubID: [null],
      ReceiveNotifications: [null, [Validators.required, this.notMinusOneValidator]],
      ReceiveNotificationsAtspecificTime: [false],
      NotificationTimeStart: [''],
      NotificationTimeEnd: [''],
      Activited: [true],
    });
    this.addUserForm.get('ReceiveNotificationsAtspecificTime')?.valueChanges.subscribe(value => {
      const startControl = this.addUserForm.get('NotificationTimeStart');
      const endControl = this.addUserForm.get('NotificationTimeEnd');

      if (value === true) {
        startControl?.setValidators([Validators.required]);
        endControl?.setValidators([Validators.required]);
      } else {
        startControl?.clearValidators();
        endControl?.clearValidators();
      }

      startControl?.updateValueAndValidity();
      endControl?.updateValueAndValidity();
    });
    this.usersForm = this.fb.group({
      Name: [null],
      Username: [null],
      Phone: [null],
      Email: [null],
      FkSectionId: [null],
      FkRoleID: [null],
      FkClubID: [null],
      Activited: [null],
      ReceiveNotifications: [null]
    });
    this.fetchData();
    const currentNotification = this.addUserForm.get('ReceiveNotifications')?.value;
    if (currentNotification) {
      this.onNotificationsChange({ LookupID: currentNotification });
    }
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
      const formValues = this.usersForm.value;

      const filterMinusOne = (value: any) => (value === -1 ? null : value);

      searchData = {
        Name: formValues.Name || null,
        Username: formValues.Username || null,
        Phone: formValues.Phone || null,
        Email: formValues.Email || null,
        FkSectionId: filterMinusOne(formValues.FkSectionId),
        FkRoleID: filterMinusOne(formValues.FkRoleID),
        FkClubID: filterMinusOne(formValues.FkClubID),
        Activited: filterMinusOne(formValues.Activited),
        ReceiveNotifications: filterMinusOne(formValues.ReceiveNotifications)
      };
    }


    const currentParams = JSON.stringify({ setting, searchData });
    if (currentParams === this.lastFetchParams) {
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }
    this.lastFetchParams = currentParams;

    this.isLoading = true;
    this.cdr.markForCheck();

    this.auth.getpagewithsearch(setting, searchData).subscribe({
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
          confirmButtonText: this.translations?.confrim?.label,

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
      const formValues = this.usersForm.value;
      const filterMinusOne = (value: any) => (value === -1 ? null : value);
      const searchData = {
        Name: formValues.Name || null,
        Username: formValues.Username || null,
        Phone: formValues.Phone || null,
        Email: formValues.Email || null,
        FkSectionId: filterMinusOne(formValues.FkSectionId),
        FkRoleID: filterMinusOne(formValues.FkRoleID),
        FkClubID: filterMinusOne(formValues.FkClubID),
        Activited: filterMinusOne(formValues.Activited),
        ReceiveNotifications: filterMinusOne(formValues.ReceiveNotifications)
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
      const formValues = this.usersForm.value;
      const filterMinusOne = (value: any) => (value === -1 ? null : value);
      const searchData = {
        Name: formValues.Name || null,
        Username: formValues.Username || null,
        Phone: formValues.Phone || null,
        Email: formValues.Email || null,
        FkSectionId: filterMinusOne(formValues.FkSectionId),
        FkRoleID: filterMinusOne(formValues.FkRoleID),
        FkClubID: filterMinusOne(formValues.FkClubID),
        Activited: filterMinusOne(formValues.Activited),
        ReceiveNotifications: filterMinusOne(formValues.ReceiveNotifications)
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
    const formValues = this.usersForm.value;

    const searchData = {
      Name: formValues.Name || null,
      Username: formValues.Username || null,
      Phone: formValues.Phone || null,
      Email: formValues.Email || null,
      FkSectionId: filterMinusOne(formValues.FkSectionId),
      FkRoleID: filterMinusOne(formValues.FkRoleID),
      FkClubID: filterMinusOne(formValues.FkClubID),
      Activited: filterMinusOne(formValues.Activited),
      ReceiveNotifications: filterMinusOne(formValues.ReceiveNotifications)
    };

    this.fetchData(setting, searchData);
    this.cdr.markForCheck();
  }





  customSearchFn(term: string, item: any) {
    term = term.toLowerCase();
    return item.TitleAr?.toLowerCase().includes(term) || item.TitleEn?.toLowerCase().includes(term);
  }

  onReset() {
    this.usersForm.reset({
      Name: '',
      Username: '',
      Phone: '',
      Email: '',
      FkSectionId: -1,
      FkRoleID: -1,
      FkClubID: -1,
      Activited: null,
      ReceiveNotifications: -1
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

    headerMap['TitleAr_Section'] = this.translations?.TitleAr_Section?.label || (isArabic ? 'القسم' : 'Section');
    headerMap['TitleAr_Role'] = this.translations?.TitleAr_Role?.label || (isArabic ? 'الدور' : 'Role');
    headerMap['TitleAr_Club'] = this.translations?.TitleAr_Club?.label || (isArabic ? 'النادي' : 'Club');
    headerMap['TitleAr_Notification'] = this.translations?.TitleAr_Notification?.label || (isArabic ? 'طريقة التنبيه' : 'Notification Mode');

    const data = this.rows.map((item: any) => {
      const row: any = {};
      Object.keys(headerMap).forEach(field => {
        let value = item[field];

        if (field === 'Activited') {
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
    XLSX.utils.book_append_sheet(wb, ws, isArabic ? 'مستخدمي النظام' : 'System Users');

    // تطبيق RTL على הـ workbook
    if (isArabic) {
      if (!wb.Workbook) wb.Workbook = {};
      if (!wb.Workbook.Views) wb.Workbook.Views = [];
      wb.Workbook.Views[0] = { RTL: true };
    }

    const filename = isArabic ? 'تقرير_مستخدمي_النظام.xlsx' : 'System_Users_Report.xlsx';
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
      // تحويل Activited إلى نص للعرض في الجدول
      ActivitedText: item.Activited
        ? (isArabic ? 'مفعل' : 'Active')
        : (isArabic ? 'غير مفعل' : 'Inactive'),
      // الاحتفاظ بالقيمة الأصلية للاستخدام في الكروت
      ActivitedOriginal: item.Activited,
      // إضافة Actions array فارغ لعرض زر التعديل الافتراضي
      Actions: []
    }));
  }

  openAddUserModal() {
    this.showAddUserModal = true;
    this.cdr.markForCheck();
  }

  closeAddUserModal() {
    this.showAddUserModal = false;
    this.addUserForm.reset({
      Name: '',
      Username: '',
      Phone: '',
      Email: '',
      FkTitleID: -1,
      FkRoleID: -1,
      FkClubID: -1,
      Activited: true,
      ReceiveNotifications: -1
    });
    this.cdr.markForCheck();
  }

  submitAddUser() {
    if (this.addUserForm.invalid) {
      const firstInvalidControlName = Object.keys(this.addUserForm.controls)
        .find(key => this.addUserForm.get(key)?.invalid);

      if (firstInvalidControlName) {
        const control = this.addUserForm.get(firstInvalidControlName);
        control?.markAsTouched();

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
    const formValues = this.addUserForm.value;

    const userData = {
      ...formValues,
      ID: this.lastUserId + 1,
      FkRoleID: filterMinusOne(formValues.FkRoleID),
      FkSectionId: filterMinusOne(formValues.FkSectionId),
      FkClubID: filterMinusOne(formValues.FkClubID),
      ReceiveNotifications: filterMinusOne(formValues.ReceiveNotifications),
      Activited: filterMinusOne(formValues.Activited),
      FkTitleID: filterMinusOne(formValues.FkTitleID),
    };

    Swal.fire({
      title: this.translations?.AreYouSure?.label,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.translations?.Yes?.label,
      cancelButtonText: this.translations?.No?.label,
    }).then((result) => {
      if (result.isConfirmed) {
        this.auth.addUser(userData).subscribe({
          next: () => {
            this.showAddUserModal = false;
            this.addUserForm.reset();
            this.paginationInfo.CurrentPage = 1;
            this.lastFetchParams = null;
            Swal.fire({
              icon: 'success',
              title: this.translations?.UserAddedSuccessfully?.label,
              confirmButtonText: this.translations?.confrim?.label,
            });
            this.fetchData();
            this.cdr.markForCheck();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: this.translations?.AddError?.label,
              text: err?.error?.message || this.translations?.TryAgainLater?.label,
            });
            this.cdr.markForCheck();
          }
        });
      }
    });
  }

  notMinusOneValidator(control: AbstractControl) {
    return control.value === -1 ? { invalidOption: true } : null;
  }


  onTimeTypeChange() {
    const controlValue = this.addUserForm.get('ReceiveNotificationsAtspecificTime')?.value;
    this.showTimeFields = (controlValue === true);
  }


  onNotificationModeChange() {
    const mode = this.addUserForm.get('NotificationMode')?.value;
    if (mode !== 'custom') {
      this.addUserForm.patchValue({ FromTime: '', ToTime: '' });
    }
  }
  onRoleChange(e: any) {
    if (e.LookupID === 840 || e.LookupID === 842 || e.LookupID === 843 || e.LookupID === 844
      || e.LookupID === 1989 || e.LookupID === 1990 || e.LookupID === 1991 || e.LookupID === 1992
    ) {
      this.showSections = true
    }
    else {
      this.showSections = false
    }
  }
  onSectionChange(e: any) {
    if (e.LookupID === 1492) {
      this.showClubs = true
    }
  }
  onNotificationsChange(e: any) {
    const phoneControl = this.addUserForm.get('Phone');
    const emailControl = this.addUserForm.get('Email');

    phoneControl?.clearValidators();
    emailControl?.clearValidators();

    if (e?.LookupID === 1830) {
      emailControl?.setValidators([Validators.required, Validators.email]);
      this.showNotifications = true;
    } else if (e?.LookupID === 1829) {
      phoneControl?.setValidators([Validators.required, Validators.pattern(/^\d{8}$/)]);
      this.showNotifications = true;
    } else if (e?.LookupID === 1828) {
      emailControl?.setValidators([Validators.required, Validators.email]);
      phoneControl?.setValidators([Validators.required, Validators.pattern(/^\d{8}$/)]);
      this.showNotifications = true;
    } else {
      this.showNotifications = false;
    }

    phoneControl?.updateValueAndValidity();
    emailControl?.updateValueAndValidity();
  }
  editUser(id: number) {
    this.router.navigate(['/users/systemusers', id]);
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
  toggleRowExpand(id: any) {
    console.log('Toggling row with id:', id);
    if (this.expandedRow?.ID === id) {
      this.expandedRow = null;
      this.expandedRowDetails = [];
    } else {
      this.expandedRow = this.rows.find(row => row.ID === id);
      this.expandedRowDetails = this.expandedRow ? this.getHiddenColumnsDetails(this.expandedRow) : [];
      console.log('Expanded row:', this.expandedRow);
    }
    this.cdr.markForCheck();
  }

  // Get hidden columns details for expanded row
  getHiddenColumnsDetails(row: any): any[] {
    const details: any[] = [];

    this.cols.forEach(col => {
      // تجاهل الأعمدة الثابتة
      if (col.fixed || col.field === 'expand' || col.field === 'Serial' || col.field === 'Actions') {
        return;
      }

      // إضافة الأعمدة المخفية فقط
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
    this.editUser(event.row.ID);
  }

  // Get status badge class
  getStatusBadgeClass(row: any): string {
    const isActive = row.ActivitedOriginal !== undefined ? row.ActivitedOriginal : row.Activited;
    return isActive
      ? 'bg-gradient-to-br from-green-50 to-green-100 text-green-800 border-2 border-green-300'
      : 'bg-gradient-to-br from-red-50 to-red-100 text-red-800 border-2 border-red-300';
  }

  // Get status text
  getStatusText(row: any): string {
    const isActive = row.ActivitedOriginal !== undefined ? row.ActivitedOriginal : row.Activited;
    return isActive
      ? (this.isArabic ? 'مفعل' : 'Active')
      : (this.isArabic ? 'غير مفعل' : 'Inactive');
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

    // Force array reference change
    this.cols = [...this.cols];

    // تحديث التفاصيل الموسعة
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

      // Force array reference change
      this.cols = [...this.cols];

      // تحديث التفاصيل الموسعة
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