import { Component, effect, input, output, signal, ViewChild, AfterViewInit } from '@angular/core';
import { LocalizationService } from '../service/localization.service';
import { AppState, indexState } from 'src/types/auth.types';
import { Store } from '@ngrx/store';
import { NewApplicationService } from '../service/new-application.service';
import { environment } from 'src/environments/environment';
import * as XLSX from 'xlsx';
import { basic, formatDateDisplay } from '../helpers/date-helper';

@Component({
  selector: 'app-edited-data-modal',
  templateUrl: './edited-data-modal.component.html',
  styleUrls: ['./edited-data-modal.component.css']
})
export class EditedDataModalComponent implements AfterViewInit {
  @ViewChild('modal40') modal40: any;
  @ViewChild('modalHeader') modalHeader: any;
  ApplicationNumber = signal<any>('');
  FkProcessID = signal<any>('');

  fieldCols: any[] = [
    { field: 'serialNumber', title: '#' },
    { field: 'ChangeUserName', title: 'اسم المستخدم' },
    { field: 'FKStatusOld', title: 'حالة الطلب السابقة' },
    { field: 'FKStatusNew', title: 'حالة الطلب الحالية' },
    { field: 'FieldName', title: 'اسم الفيلد' },
    { field: 'FieldValueWas', title: 'قيمة الفيلد السابقة' },
    { field: 'FieldValueIs', title: 'قيمة الفيلد الحالية' },
    { field: 'DateModified', title: 'تاريخ التعديل' }

  ];
  fieldRows = signal<any>([])
  attachmentCols: any[] = [
    { field: 'serialNumber', title: '#' },
    { field: 'ChangeUserName', title: 'اسم المستخدم' },
    { field: 'FKStatusOld', title: 'حالة الطلب السابقة' },
    { field: 'FKStatusNew', title: 'حالة الطلب الحالية' },
    { field: 'FieldName', title: 'اسم الفيلد' },
    { field: 'FieldValueWas', title: 'قيمة الفيلد السابقة' },
    { field: 'FieldValueIs', title: 'قيمة الفيلد الحالية' },
    { field: 'DateModified', title: 'تاريخ التعديل' },
    { field: 'Notes', title: 'ملاحظات' },
    { field: 'RowId', title: 'معرف الصف' }
  ];
  attachmentRows = signal<any>([])
  tablesCols: any[] = [
    { field: 'serialNumber', title: '#' },
    { field: 'ChangeUserName', title: 'اسم المستخدم' },
    { field: 'FKStatusOld', title: 'حالة الطلب السابقة' },
    { field: 'FKStatusNew', title: 'حالة الطلب الحالية' },
    { field: 'FieldName', title: 'اسم الفيلد' },
    { field: 'FieldValueWas', title: 'قيمة الفيلد السابقة' },
    { field: 'FieldValueIs', title: 'قيمة الفيلد الحالية' },
    { field: 'DateModified', title: 'تاريخ التعديل' },
    { field: 'Notes', title: 'ملاحظات' },
    { field: 'RowId', title: 'معرف الصف' }
  ];
  tablesRows = signal<any>([])
  store!: indexState;
  closed = output<string>();
  isOpened = input.required<boolean>();
  baseUrl = environment.apiUrl
  popupRendered = signal(false);
  private focusableEls: HTMLElement[] = [];
  private firstButton: HTMLButtonElement | null = null;
  isModalReady: boolean = false;
  private boundHandleTab = this.handleTab.bind(this);
  translations = signal<any>({});
  isShowTaskMenu = false;
  selectedTab: any = 'fields';

  // Search functionality - separate for each tab
  fieldsSearchTerm = signal<string>('');
  fieldsDateFrom = signal<string>('');
  fieldsDateTo = signal<string>('');

  attachmentsSearchTerm = signal<string>('');
  attachmentsDateFrom = signal<string>('');
  attachmentsDateTo = signal<string>('');

  tablesSearchTerm = signal<string>('');
  tablesDateFrom = signal<string>('');
  tablesDateTo = signal<string>('');

  // Separate filtered data for each tab
  filteredFieldRows = signal<any>([]);
  filteredAttachmentRows = signal<any>([]);
  filteredTablesRows = signal<any>([]);

  // Search state
  isSearching = signal<boolean>(false);

  // Flatpickr configuration
  dateFromConfig: any = {};
  dateToConfig: any = {};

  // Get current tab search values
  getCurrentSearchTerm(): string {
    switch (this.selectedTab) {
      case 'fields': return this.fieldsSearchTerm();
      case 'attachments': return this.attachmentsSearchTerm();
      case 'tables': return this.tablesSearchTerm();
      default: return '';
    }
  }

  getCurrentDateFrom(): string {
    switch (this.selectedTab) {
      case 'fields': return this.fieldsDateFrom();
      case 'attachments': return this.attachmentsDateFrom();
      case 'tables': return this.tablesDateFrom();
      default: return '';
    }
  }

  getCurrentDateTo(): string {
    switch (this.selectedTab) {
      case 'fields': return this.fieldsDateTo();
      case 'attachments': return this.attachmentsDateTo();
      case 'tables': return this.tablesDateTo();
      default: return '';
    }
  }

  // Set current tab search values
  setCurrentSearchTerm(value: string) {
    switch (this.selectedTab) {
      case 'fields': this.fieldsSearchTerm.set(value); break;
      case 'attachments': this.attachmentsSearchTerm.set(value); break;
      case 'tables': this.tablesSearchTerm.set(value); break;
    }
  }

  setCurrentDateFrom(value: string) {
    switch (this.selectedTab) {
      case 'fields': this.fieldsDateFrom.set(value); break;
      case 'attachments': this.attachmentsDateFrom.set(value); break;
      case 'tables': this.tablesDateFrom.set(value); break;
    }
  }

  setCurrentDateTo(value: string) {
    switch (this.selectedTab) {
      case 'fields': this.fieldsDateTo.set(value); break;
      case 'attachments': this.attachmentsDateTo.set(value); break;
      case 'tables': this.tablesDateTo.set(value); break;
    }
  }
  constructor(
    private localizationService: LocalizationService,
    public newApplicationService: NewApplicationService,
    private storeData: Store<AppState>
  ) {
    this.initStore();

    // Initialize Flatpickr configurations
    this.initializeFlatpickrConfig();

    effect(() => {
      if (this.isOpened()) {
        this.modal40?.open();
      } else {
        this.modal40?.close();
      }
    }, { allowSignalWrites: true });

    effect(() => {
      if (this.newApplicationService.currentCardData()) {
        this.ApplicationNumber.set(this.newApplicationService.currentCardData().ApplicationNumber);
        this.FkProcessID.set(this.store.locale === 'en' ? this.newApplicationService.currentCardData().FkProcessID_TitleEn : this.newApplicationService.currentCardData().FkProcessID_TitleAr);
      }
    }, { allowSignalWrites: true })

    effect(() => {
      if (this.newApplicationService.auditData()) {
        const mappedData = this.newApplicationService.auditData().map((item: any, index: number) => {
          item.currentIndex = index + 1;
          return item
        });

        // Separate data by type and add sequential serial numbers
        const fieldData = mappedData.filter((item: any) => item.IsAttachment === false && item.IsTableArray === false)
          .map((item: any, index: number) => ({ ...item, serialNumber: index + 1 }));

        const attachmentData = mappedData.filter((item: any) => item.IsAttachment === true)
          .map((item: any, index: number) => ({ ...item, serialNumber: index + 1 }));

        const tablesData = mappedData.filter((item: any) => item.IsTableArray === true)
          .map((item: any, index: number) => ({ ...item, serialNumber: index + 1 }));

        this.fieldRows.set(fieldData);
        this.attachmentRows.set(attachmentData);
        this.tablesRows.set(tablesData);

        // Initialize filtered data with all data initially
        this.filteredFieldRows.set(fieldData);
        this.filteredAttachmentRows.set(attachmentData);
        this.filteredTablesRows.set(tablesData);
      } else {
        this.fieldRows.set([]);
        this.attachmentRows.set([]);
        this.tablesRows.set([]);
        this.filteredFieldRows.set([]);
        this.filteredAttachmentRows.set([]);
        this.filteredTablesRows.set([]);
      }
    }, { allowSignalWrites: true });
  }
  ngOnInit() {
    this.translations.set(this.localizationService.getTranslations());
  }
  ngAfterViewInit() {
    if (this.isOpened()) {
      this.onModalOpened();
      this.getFocusableElements(this.modal40).then((els) => {
        this.focusableEls = els;
      })
      this.isModalReady = true;
    }
    setTimeout(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (dialog) {
        dialog.setAttribute('aria-label', 'edited Data popup');
      }
    }, 100);
  }

  private initializeFlatpickrConfig() {
    const baseConfig = {
      ...basic,
      position: this.store.rtlClass === 'rtl' ? 'auto right' : 'auto left',
      allowInput: true,
      clickOpens: true,
    };

    this.dateFromConfig = {
      ...baseConfig,
      onChange: (selectedDates: Date[]) => {
        if (selectedDates.length > 0) {
          const date = selectedDates[0];
          this.setCurrentDateFrom(formatDateDisplay(date));
        } else {
          this.setCurrentDateFrom('');
        }
      }
    };

    this.dateToConfig = {
      ...baseConfig,
      onChange: (selectedDates: Date[]) => {
        if (selectedDates.length > 0) {
          const date = selectedDates[0];
          this.setCurrentDateTo(formatDateDisplay(date));
        } else {
          this.setCurrentDateTo('');
        }
      }
    };
  }

  initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }
  onModalOpened() {
    setTimeout(() => {
      this.firstButton = document.querySelector('.modal-top button') as HTMLButtonElement | null;
      this.firstButton?.addEventListener('click', () => this.onUserClose('no'));
      this.firstButton?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          this.onUserClose('no');
        }
      });
      this.firstButton?.focus();
    });

    // Add keydown listener
    document.addEventListener('keydown', this.boundHandleTab);
  }
  getFocusableElements(container: HTMLElement): Promise<HTMLElement[]> {
    return new Promise<HTMLElement[]>((resolve) => {
      setTimeout(() => {
        resolve(
          Array.from(
            document.querySelectorAll<HTMLElement>(
              '#editedDataModel button'
            )
          )
        );
      });
    });
  }
  onUserClose(answer: string) {
    console.log(answer);
    this.closed.emit(answer);
    document.removeEventListener('keydown', this.boundHandleTab);
    this.firstButton?.removeEventListener('click', () => this.onUserClose('no'));
    this.firstButton?.removeEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.onUserClose('no');
      }
    });
    this.focusableEls = [];
  }


  handleTab(event: KeyboardEvent) {
    if (!this.isOpened() || !this.focusableEls.length) return this.onUserClose('no');

    const firstEl = this.focusableEls[0];
    const lastEl = this.focusableEls[this.focusableEls.length - 1];

    if (event.key === 'Tab') {
      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstEl) {
          lastEl.focus();
          event.preventDefault();
        } else if (!this.focusableEls.includes(document.activeElement as HTMLElement)) {
          lastEl.focus();
          event.preventDefault();
        }
      } else {
        // Tab
        if (document.activeElement === lastEl) {
          firstEl.focus();
          event.preventDefault();
        } else if (!this.focusableEls.includes(document.activeElement as HTMLElement)) {
          firstEl.focus();
          event.preventDefault();
        }
      }
    }
  }

  tabChange(type: any = null) {
    this.selectedTab = type;
    // No automatic search application when changing tabs
    // Each tab maintains its own search state
  }
  openFile(docID: string) {
    if (!docID) {
      return;
    }

    const imageUrl = `${this.baseUrl}/api/Files/read/${docID}`;

    // Use window.open() to open the image URL in a new tab.
    window.open(imageUrl, '_blank');

  }

  // Search functionality
  onSearch(event: any) {
    this.setCurrentSearchTerm(event.target.value);
  }

  // Manual search function - only for active tab
  performSearch() {
    this.isSearching.set(true);

    const term = this.getCurrentSearchTerm().toLowerCase();
    const fromDateStr = this.getCurrentDateFrom();
    const toDateStr = this.getCurrentDateTo();

    // Parse dates from display format (dd/mm/yyyy)
    let fromDate: Date | null = null;
    let toDate: Date | null = null;

    if (fromDateStr && fromDateStr.trim()) {
      const parts = fromDateStr.split('/');
      if (parts.length === 3 && !isNaN(parseInt(parts[0])) && !isNaN(parseInt(parts[1])) && !isNaN(parseInt(parts[2]))) {
        fromDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        // Check if date is valid
        if (isNaN(fromDate.getTime())) {
          fromDate = null;
        }
      }
    }

    if (toDateStr && toDateStr.trim()) {
      const parts = toDateStr.split('/');
      if (parts.length === 3 && !isNaN(parseInt(parts[0])) && !isNaN(parseInt(parts[1])) && !isNaN(parseInt(parts[2]))) {
        toDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        // Check if date is valid
        if (isNaN(toDate.getTime())) {
          toDate = null;
        } else {
          // Set end of day for toDate to include the entire day
          toDate.setHours(23, 59, 59, 999);
        }
      }
    }

    // Filter only the active tab data and reassign serial numbers
    switch (this.selectedTab) {
      case 'fields':
        const filteredFields = this.fieldRows().filter((item: any) => {
          // Text search
          const matchesText = !term || Object.values(item).some((value: any) =>
            value && value.toString().toLowerCase().includes(term)
          );

          // Date range search
          const itemDate = new Date(item.DateModified);
          const matchesDateRange = this.isDateInRange(itemDate, fromDate, toDate);

          return matchesText && matchesDateRange;
        }).map((item: any, index: number) => ({ ...item, serialNumber: index + 1 }));

        this.filteredFieldRows.set(filteredFields);
        break;

      case 'attachments':
        const filteredAttachments = this.attachmentRows().filter((item: any) => {
          // Text search
          const matchesText = !term || Object.values(item).some((value: any) =>
            value && value.toString().toLowerCase().includes(term)
          );

          // Date range search
          const itemDate = new Date(item.DateModified);
          const matchesDateRange = this.isDateInRange(itemDate, fromDate, toDate);

          return matchesText && matchesDateRange;
        }).map((item: any, index: number) => ({ ...item, serialNumber: index + 1 }));

        this.filteredAttachmentRows.set(filteredAttachments);
        break;

      case 'tables':
        const filteredTables = this.tablesRows().filter((item: any) => {
          // Text search
          const matchesText = !term || Object.values(item).some((value: any) =>
            value && value.toString().toLowerCase().includes(term)
          );

          // Date range search
          const itemDate = new Date(item.DateModified);
          const matchesDateRange = this.isDateInRange(itemDate, fromDate, toDate);

          return matchesText && matchesDateRange;
        }).map((item: any, index: number) => ({ ...item, serialNumber: index + 1 }));

        this.filteredTablesRows.set(filteredTables);
        break;
    }

    this.isSearching.set(false);
  }

  clearSearch() {
    this.setCurrentSearchTerm('');
  }

  clearDateFilters() {
    this.setCurrentDateFrom('');
    this.setCurrentDateTo('');
    // Apply search to current tab (which will show all data since dates are cleared)
    this.performSearch();
  }

  clearAllFilters() {
    this.setCurrentSearchTerm('');
    this.setCurrentDateFrom('');
    this.setCurrentDateTo('');
    // Reset current tab to show all data
    this.resetFilters();
  }

  // Reset filters to show all data for active tab only
  resetFilters() {
    switch (this.selectedTab) {
      case 'fields':
        const fieldsWithSerial = this.fieldRows().map((item: any, index: number) => ({ ...item, serialNumber: index + 1 }));
        this.filteredFieldRows.set(fieldsWithSerial);
        break;
      case 'attachments':
        const attachmentsWithSerial = this.attachmentRows().map((item: any, index: number) => ({ ...item, serialNumber: index + 1 }));
        this.filteredAttachmentRows.set(attachmentsWithSerial);
        break;
      case 'tables':
        const tablesWithSerial = this.tablesRows().map((item: any, index: number) => ({ ...item, serialNumber: index + 1 }));
        this.filteredTablesRows.set(tablesWithSerial);
        break;
      default:
        // Reset all if no specific tab
        const allFieldsWithSerial = this.fieldRows().map((item: any, index: number) => ({ ...item, serialNumber: index + 1 }));
        const allAttachmentsWithSerial = this.attachmentRows().map((item: any, index: number) => ({ ...item, serialNumber: index + 1 }));
        const allTablesWithSerial = this.tablesRows().map((item: any, index: number) => ({ ...item, serialNumber: index + 1 }));

        this.filteredFieldRows.set(allFieldsWithSerial);
        this.filteredAttachmentRows.set(allAttachmentsWithSerial);
        this.filteredTablesRows.set(allTablesWithSerial);
    }
  }

  // Helper method to check if date is in range
  private isDateInRange(itemDate: Date, fromDate: Date | null, toDate: Date | null): boolean {
    if (!fromDate && !toDate) return true;

    if (fromDate && toDate) {
      return itemDate >= fromDate && itemDate <= toDate;
    } else if (fromDate) {
      return itemDate >= fromDate;
    } else if (toDate) {
      return itemDate <= toDate;
    }

    return true;
  }

  // Get active filters count
  getActiveFiltersCount(): number {
    let count = 0;
    if (this.getCurrentSearchTerm()) count++;
    if (this.getCurrentDateFrom()) count++;
    if (this.getCurrentDateTo()) count++;
    return count;
  }

  // Get current tab results count
  getCurrentTabResultsCount(): number {
    switch (this.selectedTab) {
      case 'fields':
        return this.filteredFieldRows().length;
      case 'attachments':
        return this.filteredAttachmentRows().length;
      case 'tables':
        return this.filteredTablesRows().length;
      default:
        return 0;
    }
  }

  // Get quick date presets
  setDatePreset(preset: string) {
    const today = new Date();
    let fromDate: Date;
    let toDate: Date = today;

    switch (preset) {
      case 'today':
        fromDate = today;
        toDate = today;
        break;
      case 'yesterday':
        fromDate = new Date(today);
        fromDate.setDate(fromDate.getDate() - 1);
        toDate = new Date(today);
        toDate.setDate(toDate.getDate() - 1);
        break;
      case 'last7days':
        fromDate = new Date(today);
        fromDate.setDate(fromDate.getDate() - 7);
        toDate = today;
        break;
      case 'last30days':
        fromDate = new Date(today);
        fromDate.setDate(fromDate.getDate() - 30);
        toDate = today;
        break;
      case 'thisMonth':
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
        toDate = today;
        break;
      default:
        return;
    }

    // Update signals with formatted dates for current tab
    this.setCurrentDateFrom(formatDateDisplay(fromDate));
    this.setCurrentDateTo(formatDateDisplay(toDate));

    // Automatically perform search after setting dates
    setTimeout(() => this.performSearch(), 100);
  }

  // Excel export functionality
  exportToExcel() {
    let dataToExport: any[] = [];
    let fileName = '';
    let currentData: any[] = [];

    switch (this.selectedTab) {
      case 'fields':
        currentData = this.filteredFieldRows();
        dataToExport = currentData.map((item: any, index: number) => ({
          '#': index + 1,
          'اسم المستخدم': item.ChangeUserName,
          'حالة الطلب السابقة': this.store.locale === 'en' ? item.StatusOld_En : item.StatusOld_Ar,
          'حالة الطلب الحالية': this.store.locale === 'en' ? item.StatusNew_En : item.StatusNew_Ar,
          'اسم الفيلد': this.store.locale === 'en' ? item.FieldTitleEn : item.FieldTitleAr,
          'قيمة الفيلد السابقة': this.store.locale === 'en' ? (item.FieldTextValueENWas || item.FieldValueWas) : (item.FieldTextValueWas || item.FieldValueWas),
          'قيمة الفيلد الحالية': this.store.locale === 'en' ? (item.FieldTextValueEN || item.FieldValueIs) : (item.FieldTextValue || item.FieldValueIs),
          'تاريخ التعديل': new Date(item.DateModified).toLocaleDateString('ar-EG') + ' - ' + new Date(item.DateModified).toLocaleTimeString('ar-EG', { hour12: false })
        }));
        fileName = 'تقرير_الحقول_المعدلة';
        break;
      case 'attachments':
        currentData = this.filteredAttachmentRows();
        dataToExport = currentData.map((item: any, index: number) => ({
          '#': index + 1,
          'اسم المستخدم': item.ChangeUserName,
          'حالة الطلب السابقة': this.store.locale === 'en' ? item.StatusOld_En : item.StatusOld_Ar,
          'حالة الطلب الحالية': this.store.locale === 'en' ? item.StatusNew_En : item.StatusNew_Ar,
          'اسم الفيلد': this.store.locale === 'en' ? item.FieldTitleEn : item.FieldTitleAr,
          'قيمة الفيلد السابقة': item.FieldName !== 'AttachmentDocID' ? (this.store.locale === 'en' ? (item.FieldTextValueENWas || item.FieldValueWas) : (item.FieldTextValueWas || item.FieldValueWas)) : 'مرفق',
          'قيمة الفيلد الحالية': item.FieldName !== 'AttachmentDocID' ? (this.store.locale === 'en' ? (item.FieldTextValueEN || item.FieldValueIs) : (item.FieldTextValue || item.FieldValueIs)) : 'مرفق',
          'تاريخ التعديل': new Date(item.DateModified).toLocaleDateString('ar-EG') + ' - ' + new Date(item.DateModified).toLocaleTimeString('ar-EG', { hour12: false }),
          'ملاحظات': item.Notes || '',
          'معرف الصف': item.RowId || ''
        }));
        fileName = 'تقرير_المرفقات_المعدلة';
        break;
      case 'tables':
        currentData = this.filteredTablesRows();
        dataToExport = currentData.map((item: any, index: number) => ({
          '#': index + 1,
          'اسم المستخدم': item.ChangeUserName,
          'حالة الطلب السابقة': this.store.locale === 'en' ? item.StatusOld_En : item.StatusOld_Ar,
          'حالة الطلب الحالية': this.store.locale === 'en' ? item.StatusNew_En : item.StatusNew_Ar,
          'اسم الفيلد': this.store.locale === 'en' ? (item.FieldTitleEn || item.TableFieldTitleEn) : (item.FieldTitleAr || item.TableFieldTitleAr),
          'قيمة الفيلد السابقة': item.FieldName !== 'ComReg_DocId' ? (this.store.locale === 'en' ? (item.FieldTextValueENWas || item.FieldValueWas) : (item.FieldTextValueWas || item.FieldValueWas)) : 'مستند',
          'قيمة الفيلد الحالية': item.FieldName !== 'ComReg_DocId' ? (this.store.locale === 'en' ? (item.FieldTextValueEN || item.FieldValueIs) : (item.FieldTextValue || item.FieldValueIs)) : 'مستند',
          'تاريخ التعديل': new Date(item.DateModified).toLocaleDateString('ar-EG') + ' - ' + new Date(item.DateModified).toLocaleTimeString('ar-EG', { hour12: false }),
          'ملاحظات': item.Notes || '',
          'معرف الصف': item.RowId || ''
        }));
        fileName = 'تقرير_الجداول_المعدلة';
        break;
    }

    if (dataToExport.length === 0) {
      // Show a more user-friendly message
      return;
    }

    try {
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();

      // Set column widths for better readability
      const colWidths = Object.keys(dataToExport[0]).map((key) => {
        const maxLength = Math.max(
          key.length,
          ...dataToExport.map(row => String(row[key] || '').length)
        );
        return { wch: Math.min(Math.max(maxLength, 10), 50) };
      });
      worksheet['!cols'] = colWidths;

      // Add header styling12
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!worksheet[cellAddress]) continue;
        worksheet[cellAddress].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "4F46E5" } },
          alignment: { horizontal: "center" }
        };
      }

      const sheetName = this.selectedTab === 'fields' ? 'الحقول' :
        this.selectedTab === 'attachments' ? 'المرفقات' : 'الجداول';

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      const currentDate = new Date().toLocaleDateString('ar-EG').replace(/\//g, '-');
      const applicationNumber = this.newApplicationService.requestData()?.ApplicationNumber || this.ApplicationNumber();
      const fullFileName = `${fileName}_${applicationNumber}_${currentDate}.xlsx`;

      XLSX.writeFile(workbook, fullFileName);


    } catch (error) {
      console.error('Error exporting to Excel:', error);
    }
  }



  // Helper method for no data message
  getNoDataMessage(): string {
    const hasFilters = this.getCurrentSearchTerm() || this.getCurrentDateFrom() || this.getCurrentDateTo();

    if (hasFilters) {
      let message = 'لا توجد نتائج تطابق ';
      const filters = [];

      if (this.getCurrentSearchTerm()) {
        filters.push(`البحث "${this.getCurrentSearchTerm()}"`);
      }

      const fromDateStr = this.getCurrentDateFrom();
      const toDateStr = this.getCurrentDateTo();

      // Only add date filter if dates are valid
      if (fromDateStr && toDateStr && fromDateStr.trim() && toDateStr.trim()) {
        // Validate dates before displaying
        const fromParts = fromDateStr.split('/');
        const toParts = toDateStr.split('/');

        if (fromParts.length === 3 && toParts.length === 3 &&
          !isNaN(parseInt(fromParts[0])) && !isNaN(parseInt(fromParts[1])) && !isNaN(parseInt(fromParts[2])) &&
          !isNaN(parseInt(toParts[0])) && !isNaN(parseInt(toParts[1])) && !isNaN(parseInt(toParts[2]))) {
          filters.push(`الفترة من ${fromDateStr} إلى ${toDateStr}`);
        }
      } else if (fromDateStr && fromDateStr.trim()) {
        const fromParts = fromDateStr.split('/');
        if (fromParts.length === 3 && !isNaN(parseInt(fromParts[0])) && !isNaN(parseInt(fromParts[1])) && !isNaN(parseInt(fromParts[2]))) {
          filters.push(`التاريخ من ${fromDateStr}`);
        }
      } else if (toDateStr && toDateStr.trim()) {
        const toParts = toDateStr.split('/');
        if (toParts.length === 3 && !isNaN(parseInt(toParts[0])) && !isNaN(parseInt(toParts[1])) && !isNaN(parseInt(toParts[2]))) {
          filters.push(`التاريخ حتى ${toDateStr}`);
        }
      }

      if (filters.length > 0) {
        message += filters.join(' و ');
        return message;
      }
    }

    return this.translations()?.noDataContent?.label || 'لا توجد بيانات';
  }

  // Format date for display in Arabic
  private formatDateForDisplay(dateString: string): string {
    if (!dateString) return '';
    return formatDateDisplay(dateString);
  }

  // Get summary of current filters
  getFilterSummary(): string {
    const filters = [];
    if (this.getCurrentSearchTerm()) {
      filters.push(`نص: "${this.getCurrentSearchTerm()}"`);
    }

    const fromDateStr = this.getCurrentDateFrom();
    const toDateStr = this.getCurrentDateTo();

    if (fromDateStr && toDateStr && fromDateStr.trim() && toDateStr.trim()) {
      // Validate dates before displaying
      const fromParts = fromDateStr.split('/');
      const toParts = toDateStr.split('/');

      if (fromParts.length === 3 && toParts.length === 3 &&
        !isNaN(parseInt(fromParts[0])) && !isNaN(parseInt(fromParts[1])) && !isNaN(parseInt(fromParts[2])) &&
        !isNaN(parseInt(toParts[0])) && !isNaN(parseInt(toParts[1])) && !isNaN(parseInt(toParts[2]))) {
        filters.push(`تاريخ: ${fromDateStr} - ${toDateStr}`);
      }
    } else if (fromDateStr && fromDateStr.trim()) {
      const fromParts = fromDateStr.split('/');
      if (fromParts.length === 3 && !isNaN(parseInt(fromParts[0])) && !isNaN(parseInt(fromParts[1])) && !isNaN(parseInt(fromParts[2]))) {
        filters.push(`من: ${fromDateStr}`);
      }
    } else if (toDateStr && toDateStr.trim()) {
      const toParts = toDateStr.split('/');
      if (toParts.length === 3 && !isNaN(parseInt(toParts[0])) && !isNaN(parseInt(toParts[1])) && !isNaN(parseInt(toParts[2]))) {
        filters.push(`حتى: ${toDateStr}`);
      }
    }

    return filters.join(' | ');
  }

}
