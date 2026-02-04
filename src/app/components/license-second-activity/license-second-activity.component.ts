import { Component, OnInit, OnDestroy, ViewChild, ElementRef, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';
import { FormsModule, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NumFormatPipe } from 'src/app/pipes/number-format.pipe';
import { DashboardService } from 'src/app/service/dashboard/dashboard.service';
import { LocalizationService } from 'src/app/service/localization.service';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { ComponentsModule } from "../components.module";
import { FlatpickrModule } from 'angularx-flatpickr';
import { basic } from 'src/app/helpers/date-helper';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-license-second-activity',

  standalone: true,
  imports: [CommonModule, NumFormatPipe, FormsModule, ReactiveFormsModule, FlatpickrModule, ComponentsModule],
  templateUrl: './license-second-activity.component.html',
  styleUrl: './license-second-activity.component.css'
})
export class LicenseSecondActivityComponent implements OnInit, OnDestroy {

  dashboardData: any;
  secondaryActivities: any[] = [];
  filteredActivities: any[] = [];
  searchTerm: string = '';

  // ================== Page Info ==================
  pageName!: string;
  itemURL: any;

  // ================== Chart ==================
  chart: any;

  @ViewChild('chartCanvas', { static: true }) chartCanvas!: ElementRef<HTMLCanvasElement>;

  // ================== Animated Numbers ==================
  animatedTotal = 0;

  // ================== Localization ==================
  translations = signal<any>({});
  isPageLoading = true;
  isArabic: boolean = false;
  private langChangeSubscription?: Subscription;

  // ================== Date Filters ==================
  filterForm!: FormGroup;
  basic: any = basic;




  constructor(
    private dashboardService: DashboardService,
    private localizationService: LocalizationService,
    public translate: TranslateService,
    private router: Router,
    private fb: FormBuilder
  ) { }

  ngOnInit(): void {
    this.isArabic = this.translate.currentLang === 'ae';
    this.translations.set(this.localizationService.getTranslations());

    // Initialize page info for breadcrumb with fallback
    this.itemURL = history.state.menuData?.ItemURL || 'LicenseSecondActivity';
    this.pageName = history.state.menuData?.TitleAr || history.state.menuData?.TitleEn ||
      (this.isArabic ? 'الأنشطة الفرعية للرخص' : 'License Secondary Activities');

    // Initialize filter form
    this.initializeFilterForm();

    // Subscribe to language changes
    this.langChangeSubscription = this.translate.onLangChange.subscribe(() => {
      this.isArabic = this.translate.currentLang === 'ae';
      this.translations.set(this.localizationService.getTranslations());
      this.pageName = this.isArabic ? 'الأنشطة الفرعية للرخص' : 'License Secondary Activities';
      this.buildChart(); // Rebuild chart with new language
    });

    this.loadSecondaryActivities();
  }

  initializeFilterForm() {
    this.filterForm = this.fb.group({
      LicenseCreationDateFrom: [null],
      LicenseCreationDateTo: [null],
      LicenseExpirationDateFrom: [null],
      LicenseExpirationDateTo: [null]
    });
  }

  loadSecondaryActivities() {
    this.isPageLoading = true;
    const formValue = this.filterForm.value;

    const requestBody = {
      "ReportName": "LicenseSecondActivity",
      "LicenseCreationDateFrom": this.formatDate(formValue.LicenseCreationDateFrom),
      "LicenseCreationDateTo": this.formatDate(formValue.LicenseCreationDateTo),
      "LicenseExpirationDateFrom": this.formatDate(formValue.LicenseExpirationDateFrom),
      "LicenseExpirationDateTo": this.formatDate(formValue.LicenseExpirationDateTo),
      "PageSize": 1000000,
      "PageNum": 1
    };

    this.dashboardService.getReportLicenseSecondActivity(requestBody).subscribe(data => {
      this.secondaryActivities = data.resultData || [];

      // Add unique ID if not present
      this.secondaryActivities = this.secondaryActivities.map((activity, index) => {
        return {
          ...activity,
          FkSecondaryActivityID: activity.FkSecondaryActivityID || activity.SecondaryID || activity.ID || (index + 1)
        };
      });

      this.filteredActivities = [...this.secondaryActivities];

      // Calculate total count
      const totalCount = this.secondaryActivities.reduce((sum, activity) => sum + activity.SecondaryCount, 0);
      this.animateNumber(this.animatedTotal, totalCount, v => this.animatedTotal = v);

      this.buildChart();

      // Give time for animations and rendering
      setTimeout(() => {
        this.isPageLoading = false;
      }, 600);
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

  // ================== Chart Builder ==================
  buildChart() {
    if (this.chart) this.chart.destroy();

    const hasData = this.filteredActivities.length > 0;

    const labels = hasData
      ? (this.isArabic ? this.filteredActivities.map(x => x.SecondaryAr)
        : this.filteredActivities.map(x => x.SecondaryEn))
      : [this.isArabic ? 'لا توجد بيانات' : 'No Data'];

    const values = hasData
      ? this.filteredActivities.map(x => x.SecondaryCount)
      : [0];

    const canvas = this.chartCanvas.nativeElement;
    canvas.height = 400;

    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: this.isArabic ? 'عدد الأنشطة الفرعية' : 'Secondary Activities Count',
          data: values,
          backgroundColor: hasData ? '#8a173e' : '#e0e0e0',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: hasData ? '#6b1329' : '#ccc'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onHover: (_, elements) => {
          if (hasData) {
            canvas.style.cursor = elements.length > 0 ? 'pointer' : 'default';
          }
        },
        onClick: (_, elements) => {
          if (hasData && elements.length > 0) {
            const index = elements[0].index;
            const activity = this.filteredActivities[index];
            this.navigateToLicenseReport(activity);
          }
        },
        plugins: {
          tooltip: {
            enabled: hasData,
            callbacks: {
              label: (context) => {
                const activity = this.filteredActivities[context.dataIndex];
                return [
                  `${this.isArabic ? 'العربية' : 'Arabic'}: ${activity.SecondaryAr}`,
                  `${this.isArabic ? 'الإنجليزية' : 'English'}: ${activity.SecondaryEn}`,
                  `${this.isArabic ? 'العدد' : 'Count'}: ${activity.SecondaryCount}`
                ];
              }
            }
          },
          legend: {
            display: hasData
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              display: hasData,
              stepSize: 1
            },
            title: {
              display: hasData,
              text: this.isArabic ? 'العدد' : 'Count'
            }
          },
          x: {
            ticks: {
              display: hasData,
              maxRotation: 45,
              minRotation: 0
            },
            title: {
              display: hasData,
              text: this.isArabic ? 'الأنشطة الفرعية' : 'Secondary Activities'
            }
          }
        }
      }
    });
  }

  // ================== Filter Methods ==================
  applyFilter() {
    if (!this.searchTerm.trim()) {
      this.filteredActivities = [...this.secondaryActivities];
    } else {
      const searchLower = this.searchTerm.toLowerCase().trim();
      this.filteredActivities = this.secondaryActivities.filter(activity =>
        activity.SecondaryAr.toLowerCase().includes(searchLower) ||
        activity.SecondaryEn.toLowerCase().includes(searchLower)
      );
    }

    // Update animated total
    const totalCount = this.filteredActivities.reduce((sum, activity) => sum + activity.SecondaryCount, 0);
    this.animateNumber(this.animatedTotal, totalCount, v => this.animatedTotal = v);

    this.buildChart();
  }

  clearFilter() {
    this.searchTerm = '';
    this.applyFilter();
  }

  // ================== Date Filter Methods ==================
  applyDateFilters() {
    this.loadSecondaryActivities();
  }

  resetDateFilters() {
    this.filterForm.reset({
      LicenseCreationDateFrom: null,
      LicenseCreationDateTo: null,
      LicenseExpirationDateFrom: null,
      LicenseExpirationDateTo: null
    });
    this.loadSecondaryActivities();
  }

  // ================== Animated Numbers ==================
  animateNumber(start: number, end: number, setter: (value: number) => void) {
    const duration = 1500;
    const startTime = performance.now();
    const easeOutExpo = (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setter(Math.floor(easeOutExpo(progress) * (end - start) + start));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
    if (this.langChangeSubscription) {
      this.langChangeSubscription.unsubscribe();
    }
  }

  // Navigate to license report with LicenseSecondActivity
  navigateToLicenseReport(activity: any) {
    // Use the FkSecondaryActivityID instead of text
    const formValue = this.filterForm.value;

    const activityId = activity.FkSecondaryActivityID || activity.SecondaryID || activity.ID;
    const activityName = this.isArabic ? activity.SecondaryAr : activity.SecondaryEn;

    const queryParams: any = {
      FkSecondaryActivityID: activityId,
      ActivityName: activityName
    };

    // Add date filters if they exist
    if (formValue.LicenseCreationDateFrom) {
      queryParams.LicenseCreationDateFrom = this.formatDate(formValue.LicenseCreationDateFrom);
    }
    if (formValue.LicenseCreationDateTo) {
      queryParams.LicenseCreationDateTo = this.formatDate(formValue.LicenseCreationDateTo);
    }
    if (formValue.LicenseExpirationDateFrom) {
      queryParams.LicenseExpirationDateFrom = this.formatDate(formValue.LicenseExpirationDateFrom);
    }
    if (formValue.LicenseExpirationDateTo) {
      queryParams.LicenseExpirationDateTo = this.formatDate(formValue.LicenseExpirationDateTo);
    }

    this.openInNewTab(
      'LicenseDetails',
      queryParams,
      {
        menuData: {
          TitleAr: 'تفاصيل الرخص',
          TitleEn: 'Licenses Details',
          ItemURL: 'LicensesDetails'
        }
      }
    );
  }

  // ================== Print Methods ==================
  printChart() {
    const canvas = this.chartCanvas.nativeElement;
    const chartTitle = this.isArabic ? 'الأنشطة الفرعية للرخص' : 'License Secondary Activities';

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Get the chart image as base64
    const chartImage = canvas.toDataURL('image/png');

    // Create HTML content for printing
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${chartTitle}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              text-align: center;
              direction: ${this.isArabic ? 'rtl' : 'ltr'};
            }
            .chart-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 80vh;
            }
            .chart-title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 20px;
              color: #333;
            }
            .chart-image {
              max-width: 100%;
              height: auto;
              border: 1px solid #ddd;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .summary-info {
              margin-bottom: 20px;
              padding: 15px;
              background-color: #f8f9fa;
              border-radius: 8px;
              border: 1px solid #e9ecef;
            }
            .total-count {
              font-size: 18px;
              font-weight: bold;
              color: #6f42c1;
            }
            @media print {
              body { margin: 0; }
              .chart-container { min-height: auto; }
            }
          </style>
        </head>
        <body>
          <div class="chart-container">
            <div class="chart-title">${chartTitle}</div>
            <div class="summary-info">
              <div class="total-count">
                ${this.isArabic ? 'إجمالي الأنشطة الفرعية' : 'Total Secondary Activities'}: ${this.animatedTotal}
              </div>
            </div>
            <img src="${chartImage}" alt="${chartTitle}" class="chart-image" />
          </div>
        </body>
      </html>
    `;

    // Write content and print
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for image to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  }

  openInNewTab(path: string, queryParams?: any, state?: any) {
    const urlTree = this.router.createUrlTree([path], {
      queryParams
    });

    const url = this.router.serializeUrl(urlTree);

    const newTab = window.open(url, '_blank');

    if (newTab && state) {
      newTab.history.replaceState(state, '', url);
    }
  }

  // ================== Excel Export ==================
  exportToExcel() {
    if (this.filteredActivities.length === 0) return;

    const excelData = this.filteredActivities.map(activity => {
      if (this.isArabic) {
        return {
          'النشاط الفرعي': activity.SecondaryAr,
          'العدد': activity.SecondaryCount
        };
      } else {
        return {
          'Secondary Activity': activity.SecondaryEn,
          'Count': activity.SecondaryCount
        };
      }
    });

    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set RTL layout for Arabic
    if (this.isArabic) {
      ws['!views'] = [{ RTL: true }];
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, this.isArabic ? 'الأنشطة الفرعية' : 'Secondary Activities');

    // تطبيق RTL على الـ workbook
    if (this.isArabic) {
      if (!wb.Workbook) wb.Workbook = {};
      if (!wb.Workbook.Views) wb.Workbook.Views = [];
      wb.Workbook.Views[0] = { RTL: true };
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = this.isArabic
      ? `تقرير_الأنشطة_الفرعية_${dateStr}.xlsx`
      : `Secondary_Activities_Report_${dateStr}.xlsx`;

    XLSX.writeFile(wb, filename);
  }
}
