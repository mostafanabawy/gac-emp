
import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ComponentsModule } from 'src/app/components/components.module';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { DataTableModule } from '@bhplugin/ng-datatable';
import { NgSelectModule } from '@ng-select/ng-select';
import { AuthService } from 'src/app/service/auth/auth.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { IconModule } from "src/app/shared/icon/icon.module";
import { ActivatedRoute } from '@angular/router';
import { LocalizationService } from 'src/app/service/localization.service';

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [ComponentsModule, TranslateModule, NgSelectModule, CommonModule, ReactiveFormsModule, DataTableModule, IconModule],

  templateUrl: './systemusersId.html',
  styleUrl: './systemusersId.css'
})
export class UserEditComponent {
  constructor(private router: Router, private fb: FormBuilder, public translate: TranslateService,
    private localizationService: LocalizationService,
    private auth: AuthService, private route: ActivatedRoute) { }
  addUserForm!: FormGroup;
  showTimeFields = true;
  sidebarCollapsed: boolean = false;
  isMobileScreen = false;
  translations: any = {};
  isArabic = this.translate.currentLang === 'ae';
  Sections: any[] = [];
  showSections: boolean = true;
  isSpecificTime: boolean = false;
  Roles: any[] = [];
  Title: any[] = [];
  Clubses: any[] = [];
  showClubs: boolean = true;
  Notifications: any[] = [];
  showNotifications: boolean = true;
  lastUserId: number = 0;
  originalUserData: any = {};
  itemURL: any = null;
  rows: any[] = [];
  paginationInfo = {
    TotalPages: 1,
    CurrentPage: 1,
    PageSize: 20,
    TotalRows: 0
  };

  activeTab = signal<string>('personal');
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

  changeTab(tab: string) {
    this.activeTab.set(tab);
  }
  ngOnInit(): void {
    this.translations = this.localizationService.getTranslationsByScreen('global','systemusers');



    this.auth.getuser(null).subscribe((res) => {
      this.Sections = res.Lookup.Section;
      this.Roles = res.Lookup.Role.filter((role: any) => role.LookupID !== 666666);
      this.Clubses = res.Lookup.Clubs;
      this.Notifications = res.Lookup.Notifications;
      this.Title = res.Lookup.Title;

    })
    const userId = this.route.snapshot.paramMap.get('id');
    if (userId) {
      this.loadUserDetails(+userId);
    }
    this.addUserForm = this.fb.group({
      ID: [''],
      Username: ['', Validators.required],
      AdName: [''],
      Name: ['', Validators.required],
      NameEn: ['', Validators.required],
      Password: [''],
      Phone: [''],
      Email: [''],
      FkTitleID: [null, Validators.required],
      FkSectionId: [null],
      FkRoleID: [null, Validators.required],
      FkClubID: [null],
      ReceiveNotifications: [null, Validators.required],
      NotificationMode: [null],
      ReceiveNotificationsAtspecificTime: [false],
      NotificationTimeStart: [''],
      NotificationTimeEnd: [''],
      Activited: [true],
    });


    const currentNotification = this.addUserForm.get('ReceiveNotifications')?.value;
    if (currentNotification) {
      this.onNotificationsChange({ LookupID: currentNotification });
    }
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
  }





  customSearchFn(term: string, item: any) {
    term = term.toLowerCase();
    return item.TitleAr.toLowerCase().includes(term) ||
      item.TitleEn.toLowerCase().includes(term);
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

    const el = document.querySelector('.bh-pagesize');
    if (el) {
      el.setAttribute('aria-label', this.translations?.TotalItems?.label || 'total items');
    }

    const el2 = document.querySelectorAll('.ng-input input');
    if (el2.length > 0) {
      el2.forEach((input: Element) => {
        if (!input.hasAttribute('aria-label')) {
          (input as HTMLInputElement).setAttribute('aria-label', this.translations?.SelectItem?.label || 'select item');
        }
      });
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

  submitUpdateUser() {
    if (this.addUserForm.valid) {
      const currentData = this.addUserForm.value;
      const userId: any = this.route.snapshot.paramMap.get('id');
      currentData.ID = +userId;

      const updatedFields: any = {};
      Object.keys(currentData).forEach((key) => {
        const value = currentData[key];
        if (value !== null && value !== '' && value !== -1) {
          updatedFields[key] = value;
        }
      });

      Swal.fire({
        title: this.translations?.AreYouSure?.label,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: this.translations?.Yes?.label,
        cancelButtonText: this.translations?.No?.label,
      }).then((result) => {
        if (result.isConfirmed) {
          this.auth.updateUser(updatedFields).subscribe({
            next: (res) => {
              this.originalUserData = { ...this.addUserForm.value };
              Swal.fire({
                icon: 'success',
                title: this.translations?.UpdateSuccess?.label,
                confirmButtonText: this.translations?.confrim?.label,
              });
              this.router.navigate(['/users/systemusers']);
            },
            error: (err) => {
              Swal.fire({
                icon: 'error',
                confirmButtonText: this.translations?.confrim?.label,
                title: this.translations?.AddError?.label,
                text: err?.error?.message || this.translations?.TryAgainLater?.label,
              });
            },
          });
        }
      });
    } else {
      const firstInvalidControlName = Object.keys(this.addUserForm.controls)
        .find(key => this.addUserForm.get(key)?.invalid);

      if (firstInvalidControlName) {
        const invalidElement = document.querySelector(
          `[formcontrolname="${firstInvalidControlName}"]`
        ) as HTMLElement;
        if (invalidElement) invalidElement.focus();
        const translationEntry = this.translations?.[firstInvalidControlName];
        const fieldMessage = translationEntry?.validation;
        Swal.fire({
          icon: 'warning',
          title: `${fieldMessage}`,
          confirmButtonText: this.translations?.confrim?.label,
        });
      }
    }
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
  loadUserDetails(id: any) {
    this.auth.getuser(id).subscribe({
      next: (user) => {
        this.addUserForm.patchValue({
          ID: user.User.ID,
          Username: user.User.Username,
          AdName: user.User.AdName,
          Name: user.User.Name,
          NameEn: user.User.NameEn,
          Password: '',
          Phone: user.User.Phone,
          Email: user.User.Email,
          FkTitleID: user.User.FkTitleID,
          FkSectionId: user.User.FkSectionId,
          FkRoleID: user.User.FkRoleID,
          FkClubID: user.User.FkClubID,
          ReceiveNotifications: user.User.ReceiveNotifications,
          NotificationMode: user.User.NotificationMode,
          ReceiveNotificationsAtspecificTime: user.User.ReceiveNotificationsAtspecificTime,
          NotificationTimeStart: user.User.NotificationTimeStart,
          NotificationTimeEnd: user.User.NotificationTimeEnd,
          Activited: user.User.Activited
        });
        if (!user.User.FkSectionId && this.Sections?.length) {
          this.addUserForm.controls['FkSectionId'].setValue(this.Sections[0].LookupID);
        }
        if (!user.User.FkRoleID && this.Roles?.length) {
          this.addUserForm.controls['FkRoleID'].setValue(this.Roles[0].LookupID);
        }
        if (!user.User.FkClubID && this.Clubses?.length) {
          this.addUserForm.controls['FkClubID'].setValue(this.Clubses[0].LookupID);
        }
        if (!user.User.ReceiveNotifications && this.Notifications?.length) {
          this.addUserForm.controls['ReceiveNotifications'].setValue(this.Notifications[0].LookupID);
        }
        if (!user.User.FkTitleID && this.Title?.length) {
          this.addUserForm.controls['FkTitleID'].setValue(this.Title[0].LookupID);
        }

        if (user.FkRoleID) {
          this.onRoleChange({ LookupID: user.FkRoleID });
        }

        if (user.FkSectionId) {
          this.onSectionChange({ LookupID: user.FkSectionId });
        }

        if (user.ReceiveNotifications) {
          this.onNotificationsChange({ LookupID: user.ReceiveNotifications });
        }
        this.originalUserData = { ...this.addUserForm.value };
      },
      error: (err) => {

      }
    });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }
  goBackToPreviousTab() {
    this.router.navigate(['/users/systemusers']);
  }
}


