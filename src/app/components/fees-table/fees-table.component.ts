import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy, OnInit, input, OnChanges, SimpleChanges, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from 'src/shared.module';
import { AnyARecord } from 'node:dns';

@Component({
  selector: 'app-fees-table',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, SharedModule],
  templateUrl: './fees-table.component.html',
  styleUrls: ['./fees-table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeesTableComponent implements OnInit, OnDestroy, OnChanges {
  @Input() rows: any[] = [];
  @Input() cols: any[] = [];
  @Input() isLoading: boolean = false;
  @Input() isArabic: boolean = false;
  @Input() translations: any = {};
  @Input() paginationInfo: any = {
    TotalPages: 1,
    CurrentPage: 1,
    PageSize: 10,
    TotalRows: 0
  };
  @Input() currentSortField: string = '';
  @Input() currentSortDirection: number = 2;
  @Input() expandedRow: any = null;
  @Input() expandedRowDetails: any[] = [];
  @Input() sortableColumns: any[] = [];
  @Input() selectedSortColumn: any = null;
  @Input() showPaymentLegend: boolean = false; // Show payment methods legend by default
  @Input() showStatusLegend: boolean = false; // Show status legend (for licenses)
  @Input() showSubmissionLegend: boolean = false; // Show submission methods legend (for requests)
  @Input() showDurationLegend: boolean = false; // Show duration legend (for request duration)
  @Input() showEscalationLegend: boolean = false; // Show escalation type legend (for escalation)
  @Input() showDutyFreeLegend: boolean = false;
  @Input() showLateRoleLegend: boolean = false; // Show late role legend (for late requests)
  @Input() dutyFreeTypes: any[] = []; // Duty free types lookup data
  @Input() lateRoles: any[] = []; // Late role types lookup data
  @Input() rowIdentifierField: string = 'ApplicationNumber'; // Field to use as unique row identifier
  @Input() hideExpandIconWhenLicenseEmpty: boolean = false; // Hide expand icon when license number is empty
  @Input() featuredFields: string[] = []; // Fields to highlight with special styling (e.g., ['LateRoleAr', 'LateRoleEn', 'LateDaysCount'])
  @Input() viewMode: string = 'table'; // View mode: 'table' or 'cards'
  @Input() hidePagination: boolean = false; // Hide pagination controls

  @Output() onSort = new EventEmitter<{ field: string }>();
  @Output() onPageChange = new EventEmitter<number>();
  @Output() onPageSizeChange = new EventEmitter<any>();
  @Output() onActionClick = new EventEmitter<any>();
  @Output() onRowExpand = new EventEmitter<any>();
  @Output() onAttachmentClick = new EventEmitter<any>();

  empLookup = input<any>();

  // Track open action menus
  openActionMenus: { [key: string]: boolean } = {};

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnChanges(changes: SimpleChanges) {
    // Force change detection when cols input changes
    if (changes['cols']) {
      console.log('Cols changed in fees-table:', changes['cols'].currentValue);
      this.cdr.detectChanges();
    }

    // Debug log for rows changes
    if (changes['rows']) {
      console.log('Rows changed in fees-table:', changes['rows'].currentValue);
      if (changes['rows'].currentValue && changes['rows'].currentValue.length > 0) {
        console.log('First row Actions:', changes['rows'].currentValue[0].Actions);
      }
    }
  }

  ngOnInit() {
    // Add click listener to close dropdowns
    document.addEventListener('click', (event) => {
      this.openActionMenus = {};
    });
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

  get visibleColumnsCount(): number {
    let count = this.cols.filter(col => col.visible === true).length;
    if (!this.shouldShowExpandColumn) {
      count--;
    }
    return count;
  }

  get shouldShowExpandColumn(): boolean {
    return this.rows.some(row => this.shouldShowExpandIcon(row));
  }

  get hasHiddenColumns(): boolean {
    const isMobile = window.innerWidth <= 768;
    return this.cols.some(col => {
      if (col.fixed || col.field === 'expand' || col.field === 'serial' || col.field === 'checkbox') return false;
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

  getCellValue(row: any, col: any): string {
    if (col.field === 'checkbox' || col.field === 'expand' || col.field.includes('DutyFree') || col.field === 'serial' || col.field === 'Serial' || col.field === 'actions' || col.field === 'actionsEdit' || col.field === 'Actions' || col.field === 'openRequest' || col.field === 'attachmentDetails' || col.field === 'ai') {
      return '';
    }

    // Handle different field mappings
    let value = row[col.field];

    // Handle localized fields
    if (col.field === 'ServiceTitleAr' || col.field === 'ServiceTitleEn') {
      value = this.isArabic ? row.ServiceTitleAr : row.ServiceTitleEn;
    } else if (col.field === 'FkProcessID_TitleAr' || col.field === 'FkProcessID_TitleEn') {
      value = this.isArabic ? row.FkProcessID_TitleAr : row.FkProcessID_TitleEn;
    } else if (col.field === 'FkStatusID_TitleAr' || col.field === 'FkStatusID_TitleEn') {
      value = this.isArabic ? row.FkStatusID_TitleAr : row.FkStatusID_TitleEn;
    }

    // Handle date formatting
    if (col.field === 'CreationDate' && value) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getDate())) {
          value = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-4)}`;
        }
      } catch (e) {
      }
    }

    // Handle number formatting
    if (value && col.isNumber) {
      value = String(value);
    }

    return value || '-';
  }

  handleSort(field: string) {
    this.onSort.emit({ field });
  }

  handlePageChange(page: number) {
    this.onPageChange.emit(page);
  }

  handlePageSizeChange(event: any) {
    this.onPageSizeChange.emit(event);
  }

  selectedEmp: any = null;
  handleActionClick(action: any, row: any, isEmp: boolean = false) {
    this.onActionClick.emit({ action, row, isEmp });
    this.selectedEmp = null;
  }

  handleAttachmentClick(row: any) {
    this.onAttachmentClick.emit(row);
  }

  toggleActionMenu(identifier: string) {
    this.openActionMenus = { [identifier]: !this.openActionMenus[identifier] };
  }

  toggleRowExpand(row: any) {
    const identifier = row[this.rowIdentifierField];
    this.onRowExpand.emit(identifier);
  }

  isRowExpanded(row: any): boolean {
    if (!this.expandedRow) return false;
    const rowId = String(row[this.rowIdentifierField]);
    const expandedId = String(this.expandedRow[this.rowIdentifierField]);
    return rowId === expandedId;
  }

  // Get expanded details for a specific row
  getRowExpandedDetails(row: any): any[] {
    if (!this.isRowExpanded(row)) return [];
    return this.expandedRowDetails;
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

  // Get payment method badge class based on PaymentWay LookupID
  getPaymentBadgeClass(row: any): string {
    const paymentId = row.PaymentWay;

    if (!paymentId || paymentId === -1) return 'bg-gray-100 text-gray-700 border border-gray-200';

    // Based on LookupID with gradient backgrounds
    switch (paymentId) {
      case 2820: // إلكتروني / Electronic
        return 'bg-gradient-to-br from-green-50 to-green-100 text-green-800 border-2 border-green-300';

      case 2821: // يدوي / Manual
        return 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-800 border-2 border-blue-300';

      case 2857: // إلكتروني أوتوماتيك / Electronic automatic
        return 'bg-gradient-to-br from-purple-50 to-purple-100 text-purple-800 border-2 border-purple-300';

      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  }

  // Get submission method badge class based on SubmissionWay LookupID (for requests)
  getSubmissionBadgeClass(row: any): string {
    const submissionWay = row.SubmissionWay;

    if (!submissionWay) return 'inline-flex px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-700';

    // Based on submission method LookupID with different colors
    switch (submissionWay) {
      case 2896: // اونلاين - Online
        return 'inline-flex px-2 py-1 rounded text-xs font-semibold bg-gradient-to-br from-green-50 to-green-100 text-green-700 border-2 border-green-300';

      case 2897: // موظف - Employee
        return 'inline-flex px-2 py-1 rounded text-xs font-semibold bg-gradient-to-br from-blue-50 to-blue-100 text-blue-800 border-2 border-blue-300';

      default:
        return 'inline-flex px-2 py-1 rounded text-xs font-semibold bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 border-2 border-gray-300';
    }
  }

  // Get status badge class based on FkStatusID
  getStatusBadgeClass(row: any): string {
    const statusId = row.FkStatusID;

    if (!statusId) return 'inline-flex px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-700';

    // Based on status ID with colors matching the provided statuses (Licenses & Memberships)
    switch (statusId) {
      // License Statuses
      case 10: // رخصة سارية - Valid License
        return 'inline-flex px-2 py-1 rounded text-xs font-semibold bg-gradient-to-br from-green-50 to-green-100 text-green-700 border-2 border-green-300';
      case 623: // رخصة مسحوبة - License withdrawn
        return 'inline-flex px-2 py-1 rounded text-xs font-semibold bg-gradient-to-br from-orange-50 to-orange-100 text-orange-700 border-2 border-orange-300';
      case 624: // رخصة منتهية - License Expired
        return 'inline-flex px-2 py-1 rounded text-xs font-semibold bg-gradient-to-br from-blue-50 to-blue-100 text-blue-800 border-2 border-blue-300';
      case 630: // رخصة ملغية - Canceled License
        return 'inline-flex px-2 py-1 rounded text-xs font-semibold bg-gradient-to-br from-red-50 to-red-100 text-red-800 border-2 border-red-300';
      case 1899: // تم الاخلاء
        return 'inline-flex px-2 py-1 rounded text-xs font-semibold bg-red-900 text-red-100 border-2 border-red-800';

      // Membership Statuses
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

  // Get duration badge class based on LicTotalDays (for request duration)
  getDurationBadgeClass(row: any): string {
    const days = row.LicTotalDays;

    if (!days || days === null || days === undefined) {
      return 'bg-gray-100 text-gray-700';
    }

    const numDays = parseInt(days);

    if (numDays >= 1 && numDays <= 5) {
      // سريع - أخضر
      return 'bg-gradient-to-br from-green-50 to-green-100 text-green-700 border-l-4 border-green-400';
    } else if (numDays > 5 && numDays <= 10) {
      // متوسط - أصفر
      return 'bg-gradient-to-br from-yellow-50 to-yellow-100 text-yellow-700 border-l-4 border-yellow-400';
    } else if (numDays > 10) {
      // بطيء - أحمر
      return 'bg-gradient-to-br from-red-50 to-red-100 text-red-700 border-l-4 border-red-400';
    } else {
      return 'bg-gray-100 text-gray-700';
    }
  }

  // Check if a column should have duration styling
  shouldApplyDurationStyling(col: any): boolean {
    return this.showDurationLegend && col.field === 'LicTotalDays';
  }

  // Get escalation status badge class based on EscalationStatusID
  getEscalationStatusBadgeClass(row: any): string {
    const escalationStatusId = row.EscalationStatusID;

    if (!escalationStatusId || escalationStatusId === -1) {
      return 'bg-gray-100 text-gray-700';
    }

    // Based on escalation status ID with different colors (2 states only)
    switch (escalationStatusId) {
      case 2882: //  - أحمر
        return 'bg-gradient-to-br from-red-50 to-red-100 text-red-700 border-l-4 border-red-400';

      case 2883: // طلب مصعد من قبل - أصفر
        return 'bg-gradient-to-br from-yellow-50 to-yellow-100 text-yellow-700 border-l-4 border-yellow-400';

      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  // Check if a column should have escalation status styling
  shouldApplyEscalationStyling(col: any): boolean {
    return this.showEscalationLegend && (col.field.includes('EscalationStatus') || col.field === 'EscalationStatusID');
  }

  // Get duty free badge class based on DutyFree LookupID
  getDutyFreeBadgeClass(row: any): string {
    const dutyFreeId = row.DutyFree;

    if (!dutyFreeId || dutyFreeId === -1) {
      return 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 border-2 border-gray-300';
    }

    // Based on DutyFreeTypes LookupID
    switch (dutyFreeId) {
      case 2041: // Duty Free (معفى) - Green
        return 'bg-gradient-to-br from-green-50 to-green-100 text-green-800 border-2 border-green-300';

      case 2040: // Not Duty Free (غير معفى) - Red
        return 'bg-gradient-to-br from-red-50 to-red-100 text-red-800 border-2 border-red-300';

      default:
        return 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-800 border-2 border-blue-300';
    }
  }

  // Get duty free text
  getDutyFreeText(row: any): string {
    const dutyFreeId = row.DutyFree;

    const dutyFreeType = this.dutyFreeTypes.find(type => type.LookupID === dutyFreeId);
    return dutyFreeType ? (this.isArabic ? dutyFreeType.TitleAr : dutyFreeType.TitleEn) : (this.isArabic ? 'غير محدد' : 'N/A');
  }

  // Check if a column should have duty-free styling
  shouldApplyDutyFreeStyling(col: any): boolean {
    return this.showDutyFreeLegend && (col.field.includes('DutyFree') || col.field === 'DutyFree');
  }

  // Check if a field is featured (should be highlighted)
  isFeaturedField(field: string): boolean {
    return this.featuredFields.includes(field);
  }

  // Get badge class for LateDaysCount
  getLateDaysBadgeClass(row: any): string {
    const days = row.LateDaysCount;
    if (!days) return 'bg-gray-100 text-gray-700';

    if (days > 30) {
      return 'bg-gradient-to-br from-red-50 to-red-100 text-red-700 border-2 border-red-300';
    } else if (days > 15) {
      return 'bg-gradient-to-br from-yellow-50 to-yellow-100 text-yellow-700 border-2 border-yellow-300';
    } else {
      return 'bg-gradient-to-br from-green-50 to-green-100 text-green-700 border-2 border-green-300';
    }
  }

  // Get badge class for LateRole based on LookupID
  getLateRoleBadgeClass(lookupId: number): string {
    switch (lookupId) {
      case 840: // Employee (موظف) - Blue
        return 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-900 border-2 border-blue-300';
      case 842: // Department Head (رئيس قسم) - Purple
        return 'bg-gradient-to-br from-purple-50 to-purple-100 text-purple-900 border-2 border-purple-300';
      case 843: // Manager (مدير) - Orange
        return 'bg-gradient-to-br from-orange-50 to-orange-100 text-orange-900 border-2 border-orange-300';
      case 844: // Technical Expert (الخبير الفنى) - Green
        return 'bg-gradient-to-br from-green-50 to-green-100 text-green-900 border-2 border-green-300';
      default:
        return 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 border-2 border-gray-300';
    }
  }

  // Get LateRole LookupID from row data
  getLateRoleLookupId(row: any): number {
    // Try to find the LookupID from the row data
    if (row.LateRoleID) return row.LateRoleID;

    // If we have the role name, find it in lateRoles array
    const roleName = this.isArabic ? row.LateRoleAr : row.LateRoleEn;
    const role = this.lateRoles.find(r =>
      (this.isArabic ? r.TitleAr : r.TitleEn) === roleName
    );
    return role?.LookupID || -1;
  }

  // Check if expand icon should be shown for this row
  shouldShowExpandIcon(row: any): boolean {
    const isMobile = window.innerWidth <= 768;

    // Check if there's any hidden column that has a value for this row
    const hasDetails = this.cols.some(col => {
      // Don't count columns that are ALWAYS visible/fixed as "hidden details"
      if (col.fixed || col.field === 'expand' || col.field === 'serial' || col.field === 'checkbox' || col.field === 'Actions' || col.field === 'actionsEdit') return false;

      const isHidden = isMobile
        ? (col.visible === false || this.shouldHideOnMobile(col.field))
        : (col.visible === false);

      if (isHidden) {
        const val = row[col.field];
        return val !== undefined && val !== null && val !== '' && val !== '-';
      }
      return false;
    });

    if (!hasDetails) return false;

    // Fix: If there are details to show, we should show the expand icon 
    // regardless of the license being empty, otherwise hidden columns are inaccessible.
    return true;
  }

  ngOnDestroy() {
  }


  @Output() onSelectionChange = new EventEmitter<any[]>();
  selectedRowIds = new Set<any>();

  // 2. Logic to check if all rows on current page are selected
  isAllSelected(): boolean {
    if (!this.rows || this.rows.length === 0) return false;
    return this.rows.every(row => this.selectedRowIds.has(row[this.rowIdentifierField]));
  }

  toggleSelectAll(event: any) {
    const isChecked = event.target.checked;

    // Optimization: Clear and rebuild the set to ensure a fresh reference
    if (isChecked) {
      this.rows.forEach(row => this.selectedRowIds.add(row[this.rowIdentifierField]));
    } else {
      // Only delete rows currently in the view to respect "Current Page" logic
      this.rows.forEach(row => this.selectedRowIds.delete(row[this.rowIdentifierField]));
    }

    this.emitSelection();
  }

  toggleRowSelection(row: any) {
    const id = row[this.rowIdentifierField];
    if (this.selectedRowIds.has(id)) {
      this.selectedRowIds.delete(id);
    } else {
      this.selectedRowIds.add(id);
    }
    this.emitSelection();
  }

  private emitSelection() {
    // 1. Convert Set to Array of row objects to emit
    const selectedRows = this.rows.filter(row =>
      this.selectedRowIds.has(row[this.rowIdentifierField])
    );
    this.onSelectionChange.emit(selectedRows);

    // 2. CRITICAL: Replace the Set reference so OnPush views detect the change
    this.selectedRowIds = new Set(this.selectedRowIds);

    // 3. Force Angular to run change detection for this component and its children
    this.cdr.markForCheck();
  }

  // Helper for template
  isRowSelected(row: any): boolean {
    return this.selectedRowIds.has(row[this.rowIdentifierField]);
  }

  // Get Activited badge class (for user status)12
  getActivitedBadgeClass(row: any): string {
    const isActive = row.ActivitedOriginal !== undefined ? row.ActivitedOriginal : row.Activited;

    if (isActive) {
      return 'bg-gradient-to-br from-green-50 to-green-100 text-green-800 border-2 border-green-300';
    } else {
      return 'bg-gradient-to-br from-red-50 to-red-100 text-red-800 border-2 border-red-300';
    }
  }
  onAnalysis = output();
  emitAnalysis(row: any) {
    this.onAnalysis.emit(row);
  }

  isActionMenu(row: any): boolean {
    return row.Actions?.some((action: any) => action.visible === true);
  }
}
