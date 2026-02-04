import { Component, OnInit, ViewChild, ElementRef, signal } from '@angular/core';
import Chart from 'chart.js/auto';
import * as XLSX from 'xlsx';
import { FormsModule } from '@angular/forms';
import { FlatpickrModule } from 'angularx-flatpickr';
import { NumFormatPipe } from 'src/app/pipes/number-format.pipe';
import { DashboardService } from 'src/app/service/dashboard/dashboard.service';
import { LocalizationService } from 'src/app/service/localization.service';
import { TranslateService } from '@ngx-translate/core';
import { basic } from 'src/app/helpers/date-helper';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NumFormatPipe, FormsModule, FlatpickrModule, CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  dashboardData: any;

  // ================== Filters ==================
  feesDateFrom: any;
  feesDateTo: any;

  reqDateFrom: any;
  reqDateTo: any;

  licCreationFrom: any;
  licCreationTo: any;
  licExpireFrom: any;
  licExpireTo: any;

  LicenseCreationDateFromMem: any;
  LicenseCreationDateToMem: any;
  LicenseExpirationDateFromMem: any;
  LicenseExpirationDateToMem: any;

  // ================== Charts ==================
  chartFees: any;
  chartLicenses: any;
  chartRequests: any;
  chartMemberships: any;

  hasFeesData = false;
  hasLicensesData = false;
  hasRequestsData = false;
  hasMembershipsData = false;

  @ViewChild('barFeesCanvas', { static: false }) barFeesCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('donutLicensesCanvas', { static: false }) donutLicensesCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barRequestsCanvas', { static: false }) barRequestsCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('donutMembershipsCanvas', { static: false }) donutMembershipsCanvas!: ElementRef<HTMLCanvasElement>;

  // ================== Animated Numbers ==================
  animatedFees = 0;
  animatedLicenses = 0;
  animatedRequests = 0;
  animatedPending = 0;
  animatedMemberships = 0;


  // ================== Chart Data Tracking ==================
  private chartDataCounts = {
    fees: 0,
    licenses: 0,
    requests: 0,
    memberships: 0
  };

  // ================== Chart Type Toggle ==================
  licensesChartType: 'pie' | 'doughnut' | 'bar' = 'doughnut';
  feesChartType: 'bar' | 'doughnut' | 'pie' = 'bar';
  requestsChartType: 'bar' | 'doughnut' | 'pie' = 'bar';
  membershipsChartType: 'pie' | 'doughnut' | 'bar' = 'doughnut';
  activeClass =
    'text-white rounded-xl p-6 text-center shadow-lg cursor-pointer hover:shadow-2xl hover:scale-105 transition-all duration-300';

  disabledClass =
    'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-600 rounded-xl p-6 text-center shadow-lg cursor-not-allowed opacity-60';

  // ================== Localization ==================
  translations = signal<any>({});
  isPageLoading = true;
  isArabic: boolean = false;

  // ================== Flatpickr ==================
  basic: any = basic


  constructor(
    private dashboardService: DashboardService,
    private localizationService: LocalizationService,
    public translate: TranslateService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.isArabic = this.translate.currentLang === 'ae';
    this.translations.set(this.localizationService.getTranslations());
    this.loadDashboard();
  }

  loadDashboard(filters: any = {}) {
    this.isPageLoading = true;
    this.dashboardService.getDashboardReport(filters).subscribe(data => {
      this.dashboardData = data;

      // Safely get totals with fallback to 0
      const totalFees = Number(data.Fees?.[0]?.TotalFees) || 0;
      const totalLicenses = Number(data.Licenses?.[0]?.TotalLicenses) || 0;
      const totalRequests = Number(data.Requests?.[0]?.TotalRequests) || 0;
      const totalPending = Number(data.Pending?.[0]?.TotalPending) || 0;

      const totalMemberships = data.Memberships?.[0]?.TotalClubLicenses || 0;

      // Ensure values are not NaN before animating
      const safeFees = isNaN(totalFees) ? 0 : totalFees;
      const safeLicenses = isNaN(totalLicenses) ? 0 : totalLicenses;
      const safeRequests = isNaN(totalRequests) ? 0 : totalRequests;

      this.animateNumber(this.animatedFees, safeFees, v => this.animatedFees = v);
      this.animateNumber(this.animatedLicenses, safeLicenses, v => this.animatedLicenses = v);
      this.animateNumber(this.animatedRequests, safeRequests, v => this.animatedRequests = v);
      this.animateNumber(this.animatedPending, totalPending, v => this.animatedPending = v);
      this.animateNumber(this.animatedMemberships, totalMemberships, v => this.animatedMemberships = v);

      // Only set dates from API if no filters were applied (initial load)
      const hasFilters = Object.keys(filters).length > 0 && Object.values(filters).some(v => v !== null);

      if (!hasFilters && data.Dates?.[0]) {
        // Initial load - use default dates from API
        this.feesDateFrom = data.Dates[0].FeesPaymentDateFrom
        this.feesDateTo = data.Dates[0].FeesPaymentDateTo
        this.reqDateFrom = data.Dates[0].CreationDateFrom
        this.reqDateTo = data.Dates[0].CreationDateTo
        this.licCreationFrom = data.Dates[0].LicenseCreationDateFrom
        this.licCreationTo = data.Dates[0].LicenseCreationDateTo
        this.licExpireFrom = data.Dates[0].LicenseExpirationDateFrom
        this.licExpireTo = data.Dates[0].LicenseExpirationDateTo
        this.LicenseCreationDateFromMem = data.Dates[0].LicenseCreationDateFromMem
        this.LicenseCreationDateToMem = data.Dates[0].LicenseCreationDateToMem
        this.LicenseExpirationDateFromMem = data.Dates[0].LicenseExpirationDateFromMem
        this.LicenseExpirationDateToMem = data.Dates[0].LicenseExpirationDateToMem
      }
      // If filters were applied, keep the user's selected dates (don't override)

      this.checkDataAvailability();

      // Give angular time to render *ngIf elements
      setTimeout(() => {
        if (this.hasFeesData) this.buildFeesChart();
        if (this.hasLicensesData) this.buildLicensesChart();
        if (this.hasRequestsData) this.buildRequestsChart();
        if (this.hasMembershipsData) this.buildMembershipsChart();
        this.isPageLoading = false;
      }, 500);
    });
  }

  // Perform checks before trying to render charts
  checkDataAvailability() {
    const feesData = this.dashboardData?.Fees || [];
    this.hasFeesData = feesData.length > 0 && feesData.some((x: any) => Number(x.FeesPerService) > 0);
    this.chartDataCounts.fees = feesData.length;

    const licensesData = this.dashboardData?.Licenses || [];
    this.hasLicensesData = licensesData.length > 0 && licensesData.some((x: any) => Number(x.LicensesPerService) > 0);
    this.chartDataCounts.licenses = licensesData.length;

    const requestsData = this.dashboardData?.Requests || [];
    this.hasRequestsData = requestsData.length > 0 && requestsData.some((x: any) => Number(x.RequestsPerService) > 0);
    this.chartDataCounts.requests = requestsData.length;

    const membershipsData = this.dashboardData?.Memberships || [];
    this.hasMembershipsData = membershipsData.length > 0 && membershipsData.some((x: any) => Number(x.LicensesPerClub) > 0);
    this.chartDataCounts.memberships = membershipsData.length;
  }

  // ================== Chart Builders ==================
  buildFeesChart() {
    if (!this.barFeesCanvas?.nativeElement) return;

    const feesData = this.dashboardData?.Fees || [];
    // تدمير الرسمة السابقة إن وجدت
    if (this.chartFees) {
      this.chartFees.destroy();
    }

    const labels = this.isArabic
      ? feesData.map((x: any) => x.ServiceTitleAr)
      : feesData.map((x: any) => x.ServiceTitleEn);

    const values = feesData.map((x: any) => Math.max(0, Number(x.FeesPerService) || 0));

    const canvas = this.barFeesCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ضبط حجم الـ canvas بشكل مناسب
    canvas.width = canvas.parentElement?.clientWidth || 800;
    canvas.height = 400;

    // ألوان عنابية متدرجة ومتناسقة للرسوم
    const colors = [
      '#8A173E', '#A91E4A', '#C72156', '#E52765', '#FF2D74',
      '#8B1538', '#A91B47', '#C72156', '#E52765', '#FF2D74'
    ];

    // تحديد إعدادات Legend بشكل صحيح
    const legendPosition = this.feesChartType === 'bar' ? 'top' : 'right';

    this.chartFees = new Chart(canvas, {
      type: this.feesChartType,
      data: {
        labels,
        datasets: [{
          label: this.isArabic ? 'الرسوم' : 'Fees',
          data: values,
          backgroundColor: this.feesChartType === 'bar'
            ? colors.slice(0, values.length)  // ألوان متنوعة للأعمدة
            : colors.slice(0, values.length),
          borderWidth: this.feesChartType === 'bar' ? 0 : 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event: any, elements: any) => {
          if (elements && elements.length > 0) {
            const index = elements[0].index;
            const item = feesData[index];
            if (item && item.ServiceID) {
              this.navigateToFeesWithService(item.ServiceID);
            }
          }
        },
        layout: {
          padding: {
            top: 20,
            right: 20,
            bottom: 20,
            left: 20
          }
        },
        plugins: {
          legend: {
            display: true,
            position: legendPosition,
            labels: {
              color: '#333',
              font: {
                size: 12,
                family: this.isArabic ? "'Segoe UI', Tahoma, Arial" : "'Segoe UI', Tahoma, Geneva"
              },
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#8A173E',
            borderWidth: 1,
            cornerRadius: 6
          }
        },
        ...(this.feesChartType === 'doughnut' && {
          cutout: '60%',
          plugins: {
            ...this.chartFees?.options?.plugins,
            legend: {
              display: true,
              position: 'right',
              labels: {
                color: '#333',
                font: {
                  size: 12
                },
                padding: 15
              }
            }
          }
        }),
        ...(this.feesChartType === 'pie' && {
          plugins: {
            ...this.chartFees?.options?.plugins,
            legend: {
              display: true,
              position: 'right',
              labels: {
                color: '#333',
                font: {
                  size: 12
                },
                padding: 15
              }
            }
          }
        }),
        scales: this.feesChartType === 'bar' ? {
          x: {
            beginAtZero: true,
            grid: {
              display: false
            },
            ticks: {
              color: '#666',
              font: {
                size: 11
              }
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              color: '#666',
              font: {
                size: 11
              }
            }
          }
        } : undefined
      }
    });
  }

  buildLicensesChart() {
    if (!this.donutLicensesCanvas?.nativeElement) return;

    const licensesData = this.dashboardData?.Licenses || [];

    if (this.chartLicenses) {
      this.chartLicenses.destroy();
    }

    const labels = this.isArabic
      ? licensesData.map((x: any) => x.ServiceTitleAr)
      : licensesData.map((x: any) => x.ServiceTitleEn);

    const values = licensesData.map((x: any) => Math.max(0, Number(x.LicensesPerService) || 0));

    const canvas = this.donutLicensesCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ضبط حجم الـ canvas
    canvas.width = canvas.parentElement?.clientWidth || 800;
    canvas.height = 400;

    // ألوان بنفسجية متدرجة ومتناسقة للتراخيص
    const colors = [
      '#4B1D6B', '#6B2FA3', '#8B5CF6', '#A78BFA', '#C4B5FD',
      '#5B21B6', '#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD'
    ];

    const legendPosition = this.licensesChartType === 'bar' ? 'top' : (this.licensesChartType === 'pie' ? 'right' : 'top');

    this.chartLicenses = new Chart(canvas, {
      type: this.licensesChartType === 'bar' ? 'bar' : this.licensesChartType,
      data: {
        labels,
        datasets: [{
          label: this.isArabic ? 'الرخص' : 'Licenses',
          data: values,
          backgroundColor: this.licensesChartType === 'bar' ? colors.slice(0, values.length) : colors.slice(0, values.length),
          borderWidth: this.licensesChartType === 'bar' ? 0 : 2,
          borderColor: '#ffffff',
          hoverOffset: this.licensesChartType === 'bar' ? 0 : 15
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event: any, elements: any) => {
          if (elements && elements.length > 0) {
            const index = elements[0].index;
            const item = licensesData[index];
            if (item && item.ServiceID) {
              this.navigateToLicensesWithService(item.ServiceID);
            }
          }
        },
        layout: {
          padding: {
            top: 20,
            right: this.licensesChartType === 'pie' ? 150 : 20,
            bottom: 20,
            left: 20
          }
        },
        plugins: {
          legend: {
            display: true,
            position: legendPosition,
            labels: {
              color: '#333',
              font: {
                size: 12,
                family: this.isArabic ? "'Segoe UI', Tahoma, Arial" : "'Segoe UI', Tahoma, Geneva"
              },
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle',
              generateLabels: (chart) => {
                const data = chart.data;
                if (data.labels && data.datasets && data.datasets[0].data) {
                  return data.labels.map((label, i) => {
                    const value = data.datasets[0].data[i];
                    const backgroundColor = data.datasets[0].backgroundColor;
                    const borderColor = data.datasets[0].borderColor;
                    // For bar chart, backgroundColor might be a string (single color)
                    const fillStyle = Array.isArray(backgroundColor) ? backgroundColor[i] : backgroundColor;
                    const strokeStyle = Array.isArray(borderColor) ? borderColor[i] : borderColor;

                    // تحويل lineWidth إلى رقم ثابت
                    const lineWidthValue = typeof data.datasets[0].borderWidth === 'number'
                      ? data.datasets[0].borderWidth
                      : 1;

                    return {
                      text: `${label}: ${typeof value === 'number' ? value.toLocaleString() : value}`,
                      fillStyle: fillStyle,
                      strokeStyle: strokeStyle,
                      lineWidth: lineWidthValue, // رقم ثابت فقط
                      hidden: !chart.getDataVisibility(i),
                      index: i,
                      pointStyle: 'circle'
                    };
                  });
                }
                return [];
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                let label = context.label || '';
                if (label) {
                  label += ': ';
                }
                label += context?.raw?.toLocaleString();
                return label;
              }
            }
          },
          ...(this.licensesChartType === 'doughnut' && {
            cutout: '60%'
          })
        },
        scales: this.licensesChartType === 'bar' ? {
          x: {
            beginAtZero: true,
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' }
          }
        } : undefined
      }
    });
  }
  buildRequestsChart() {
    if (!this.barRequestsCanvas?.nativeElement) return;
    const requestsData = this.dashboardData?.Requests || [];
    // Data check already done in checkDataAvailability

    // تدمير الرسمة السابقة

    // تدمير الرسمة السابقة
    if (this.chartRequests) {
      this.chartRequests.destroy();
      this.chartRequests = null;
    }

    this.chartDataCounts.requests = requestsData.length;

    const labels = this.isArabic
      ? requestsData.map((x: any) => x.ServiceTitleAr)
      : requestsData.map((x: any) => x.ServiceTitleEn);

    const values = requestsData.map((x: any) =>
      Math.max(0, Number(x.RequestsPerService) || 0)
    );

    const canvas = this.barRequestsCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ضبط حجم الـ canvas بناءً على العنصر الأب
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight || 400;
    }

    // ألوان خضراء مزرقة متدرجة ومتناسقة للطلبات
    const colors = [
      '#0F766E', '#14B8A6', '#2DD4BF', '#5EEAD4', '#99F6E4',
      '#0D9488', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0'
    ];

    // إعدادات الـ legend حسب نوع الرسمة
    const legendPosition = this.requestsChartType === 'bar' ? 'top' : 'right';
    const legendLabels = {
      color: '#333',
      font: {
        size: 12,
        family: this.isArabic ? "'Segoe UI', Tahoma, Arial" : "'Segoe UI', Tahoma, Geneva"
      },
      padding: 15,
      usePointStyle: true
    };

    this.chartRequests = new Chart(canvas, {
      type: this.requestsChartType,
      data: {
        labels,
        datasets: [{
          label: this.isArabic ? 'عدد الطلبات' : 'Requests',
          data: values,
          backgroundColor: this.requestsChartType === 'bar'
            ? colors.slice(0, values.length)  // ألوان متنوعة للأعمدة
            : colors.slice(0, values.length),
          borderWidth: this.requestsChartType === 'bar' ? 0 : 2,
          borderColor: '#ffffff',
          hoverOffset: this.requestsChartType === 'bar' ? 0 : 15
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event: any, elements: any) => {
          if (elements && elements.length > 0) {
            const index = elements[0].index;
            const item = requestsData[index];
            if (item && item.ServiceID) {
              this.navigateToRequestsWithService(item.ServiceID);
            }
          }
        },
        layout: {
          padding: {
            top: 20,
            right: this.requestsChartType === 'pie' ? 150 : 20,
            bottom: 20,
            left: 20
          }
        },
        plugins: {
          legend: {
            display: true,
            position: legendPosition,
            labels: {
              color: '#333',
              font: {
                size: 12,
                family: this.isArabic ? "'Segoe UI', Tahoma, Arial" : "'Segoe UI', Tahoma, Geneva"
              },
              padding: 15,
              usePointStyle: true,
              // عرض القيم في الـ legend
              generateLabels: (chart: any) => {
                const data = chart.data;
                if (data.labels && data.datasets) {
                  return data.labels.map((label: any, i: any) => ({
                    text: `${label}: ${data.datasets[0].data[i]}`,
                    fillStyle: data.datasets[0].backgroundColor[i],
                    strokeStyle: data.datasets[0].borderColor,
                    lineWidth: data.datasets[0].borderWidth,
                    hidden: false,
                    index: i
                  }));
                }
                return [];
              }
            },
          },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            titleColor: '#fff',
            bodyColor: '#fff',
            callbacks: {
              label: (context) => {
                let label = context.label || '';
                if (label) {
                  label += ': ';
                }
                label += context?.raw?.toLocaleString();
                return label;
              }
            }
          }
        },
        ...(this.requestsChartType === 'doughnut' && {
          cutout: '60%'
        }),
        ...(this.requestsChartType === 'bar' && {
          indexAxis: 'y',
          scales: {
            x: {
              beginAtZero: true,
              grid: {
                display: false
              },
              ticks: {
                color: '#666',
                font: {
                  size: 11
                }
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              },
              ticks: {
                color: '#666',
                font: {
                  size: 11
                }
              }
            }
          }
        })
      }
    });

    // تحديث الرسمة لتطبيق التغييرات
    setTimeout(() => {
      if (this.chartRequests) {
        this.chartRequests.update('none');
      }
    }, 100);
  }
  // Helper method to adjust color brightness
  private adjustColorBrightness(color: string, amount: number): string {
    const usePound = color[0] === '#';
    const col = usePound ? color.slice(1) : color;
    const num = parseInt(col, 16);
    let r = (num >> 16) + amount;
    let g = (num >> 8 & 0x00FF) + amount;
    let b = (num & 0x0000FF) + amount;
    r = r > 255 ? 255 : r < 0 ? 0 : r;
    g = g > 255 ? 255 : g < 0 ? 0 : g;
    b = b > 255 ? 255 : b < 0 ? 0 : b;
    return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
  }

  buildMembershipsChart() {
    if (!this.donutMembershipsCanvas?.nativeElement) return;

    const membershipsData = this.dashboardData?.Memberships || [];
    // Data check already done in checkDataAvailability

    if (this.chartMemberships) {
      this.chartMemberships.destroy();
    }

    const labels = this.isArabic
      ? membershipsData.map((x: any) => x.ClubAr)
      : membershipsData.map((x: any) => x.ClubEn);

    const values = membershipsData.map((x: any) => Math.max(0, Number(x.LicensesPerClub) || 0));

    const canvas = this.donutMembershipsCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

    canvas.width = canvas.parentElement?.clientWidth || 800;
    canvas.height = 400;

    // ألوان عنابية متدرجة ومتناسقة للعضويات
    const colors = [
      '#8A173E', '#A91E4A', '#C72156', '#E52765', '#FF2D74',
      '#8B1538', '#A91B47', '#C72156', '#E52765', '#FF2D74'
    ];

    const legendPosition = this.membershipsChartType === 'bar' ? 'top' : (this.membershipsChartType === 'pie' ? 'right' : 'top');

    this.chartMemberships = new Chart(canvas, {
      type: this.membershipsChartType === 'bar' ? 'bar' : this.membershipsChartType,
      data: {
        labels,
        datasets: [{
          label: this.isArabic ? 'العضويات' : 'Memberships',
          data: values,
          backgroundColor: this.membershipsChartType === 'bar' ? colors.slice(0, values.length) : colors.slice(0, values.length),
          borderWidth: this.membershipsChartType === 'bar' ? 0 : 2,
          borderColor: '#ffffff',
          hoverOffset: this.membershipsChartType === 'bar' ? 0 : 15
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event: any, elements: any) => {
          if (elements && elements.length > 0) {
            const index = elements[0].index;
            const item = membershipsData[index];
            if (item && item.FkClubID) {
              this.navigateToMembershipsWithClub(item.FkClubID);
            }
          }
        },
        layout: {
          padding: {
            top: 20,
            right: this.membershipsChartType === 'pie' ? 150 : 20,
            bottom: 20,
            left: 20
          }
        },
        plugins: {
          legend: {
            display: true,
            position: legendPosition,
            labels: {
              color: '#333',
              font: {
                size: 12,
                family: this.isArabic ? "'Segoe UI', Tahoma, Arial" : "'Segoe UI', Tahoma, Geneva"
              },
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                let label = context.label || '';
                if (label) {
                  label += ': ';
                }
                label += context?.raw?.toLocaleString();
                return label;
              }
            }
          },
          ...(this.membershipsChartType === 'doughnut' && {
            cutout: '60%'
          })
        },
        scales: this.membershipsChartType === 'bar' ? {
          x: {
            beginAtZero: true,
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' }
          }
        } : undefined
      }
    });
  }

  toggleMembershipsChartType(type: 'pie' | 'doughnut' | 'bar') {
    try {
      this.membershipsChartType = type;
      this.buildMembershipsChart();
    } catch (error) {
      console.error('Error toggling chart type:', error);
      this.membershipsChartType = type;
      this.buildMembershipsChart();
    }
  }

  // Method to toggle licenses chart type
  toggleLicensesChartType(type: 'pie' | 'doughnut' | 'bar') {
    try {
      this.licensesChartType = type;
      // Add a small delay to ensure proper cleanup
      this.buildLicensesChart();
    } catch (error) {
      console.error('Error toggling chart type:', error);
      // Fallback to rebuild chart
      this.licensesChartType = type;
      this.buildLicensesChart();
    }
  }

  // Export individual chart data to Excel
  exportChartData(type: 'fees' | 'licenses' | 'reports' | 'memberships') {
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    let data: any[] = [];
    let sheetName = '';

    const today = new Date().toISOString().split('T')[0];
    let fileName = '';

    switch (type) {
      case 'fees':
        data = (this.dashboardData?.Fees || []).map((item: any) => ({
          'Service (Ar)': item.ServiceTitleAr,
          'Service (En)': item.ServiceTitleEn,
          'Fees': item.FeesPerService
        }));
        sheetName = 'Fees';
        fileName = `Fees_Report_${today}.xlsx`;
        break;
      case 'licenses':
        data = (this.dashboardData?.Licenses || []).map((item: any) => ({
          'Service (Ar)': item.ServiceTitleAr,
          'Service (En)': item.ServiceTitleEn,
          'Licenses Count': item.LicensesPerService
        }));
        sheetName = 'Licenses';
        fileName = `Licenses_Report_${today}.xlsx`;
        break;
      case 'reports': // Requests
        data = (this.dashboardData?.Requests || []).map((item: any) => ({
          'Service (Ar)': item.ServiceTitleAr,
          'Service (En)': item.ServiceTitleEn,
          'Requests Count': item.RequestsPerService
        }));
        sheetName = 'Requests';
        fileName = `Requests_Report_${today}.xlsx`;
        break;
      case 'memberships':
        data = (this.dashboardData?.Memberships || []).map((item: any) => ({
          'Club (Ar)': item.ClubAr,
          'Club (En)': item.ClubEn,
          'Licenses Count': item.LicensesPerClub
        }));
        sheetName = 'Memberships';
        fileName = `Memberships_Report_${today}.xlsx`;
        break;
    }

    if (data.length === 0) {
      // Maybe show a swal alert or toast? For now just log
      console.warn('No data to export');
      return;
    }

    const sheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, sheet, sheetName);
    XLSX.writeFile(wb, fileName);
  }

  // Method to toggle fees chart type
  toggleFeesChartType(type: 'bar' | 'doughnut' | 'pie') {
    try {
      this.feesChartType = type;
      this.buildFeesChart();
    } catch (error) {
      console.error('Error toggling fees chart type:', error);
      this.feesChartType = type;
      this.buildFeesChart();
    }
  }

  // Method to toggle requests chart type
  toggleRequestsChartType(type: 'bar' | 'doughnut' | 'pie') {
    try {
      this.requestsChartType = type;
      this.buildRequestsChart();
    } catch (error) {
      console.error('Error toggling requests chart type:', error);
      this.requestsChartType = type;
      this.buildRequestsChart();
    }
  }





  // Navigate to ClubsDashboard page
  navigateToClubsDashboard() {
    this.openInNewTab(
      'ClubsDashboard',
      {},
      {
        menuData: {
          TitleAr: 'لوحة معلومات الأندية',
          TitleEn: 'Clubs Dashboard',
          ItemURL: 'ClubsDashboard'
        }
      }
    );
  }
  navigateToInbox() {
    this.openInNewTab(
      'RequestDetails',
      { RequestCategory: [2912] },
      {
        menuData: {
          TitleAr: 'تفاصيل الطلبات',
          TitleEn: 'Requests Details',
          ItemURL: 'RequestsDetails'
        }
      }
    );
  }



  // ================== Reload Methods ==================
  reloadFeesChart() {
    this.dashboardService.getFeesByDate(this.feesDateFrom, this.feesDateTo)
      .subscribe((data: any) => {
        this.dashboardData.Fees = data.Fees;
        // Force re-render after data update
        setTimeout(() => this.buildFeesChart(), 0);
      });
  }

  reloadRequestsChart() {
    this.dashboardService.getRequestsByDate(this.reqDateFrom, this.reqDateTo)
      .subscribe((data: any) => {
        this.dashboardData.Requests = data.Requests;
        // Force re-render after data update
        setTimeout(() => this.buildRequestsChart(), 0);
      });
  }

  reloadLicensesChart() {
    this.dashboardService.getLicensesByDate(this.licCreationFrom, this.licCreationTo, this.licExpireFrom, this.licExpireTo)
      .subscribe((data: any) => {
        this.dashboardData.Licenses = data.Licenses;
        // Force re-render after data update
        setTimeout(() => this.buildLicensesChart(), 0);
      });
  }

  reloadMembershipsChart() {
    this.dashboardService.getMembershipsByDate(this.LicenseCreationDateFromMem, this.LicenseCreationDateToMem, this.LicenseExpirationDateFromMem, this.LicenseExpirationDateToMem)
      .subscribe((data: any) => {
        this.dashboardData.Memberships = data.Memberships;
        setTimeout(() => this.buildMembershipsChart(), 0);
      });
  }

  // ================== Animated Numbers ==================
  animateNumber(start: number, end: number, setter: (value: number) => void) {
    // Ensure start and end are valid numbers
    const safeStart = isNaN(start) ? 0 : start;
    const safeEnd = isNaN(end) ? 0 : end;

    const duration = 1500;
    const startTime = performance.now();
    const easeOutExpo = (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentValue = Math.floor(easeOutExpo(progress) * (safeEnd - safeStart) + safeStart);

      // Ensure the final value is not NaN
      setter(isNaN(currentValue) ? 0 : currentValue);

      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  resetFilters() {
    this.feesDateFrom = this.feesDateTo = null;
    this.licCreationFrom = this.licCreationTo = this.licExpireFrom = this.licExpireTo = null;
    this.reqDateFrom = this.reqDateTo = null;
    this.LicenseCreationDateFromMem = this.LicenseCreationDateToMem = this.LicenseExpirationDateFromMem = this.LicenseExpirationDateToMem = null;
    this.loadDashboard();
  }

  // Navigate to service fees page with date filters
  navigateToFeesDetails() {
    const queryParams: any = {};

    if (this.feesDateFrom) {
      queryParams.FeesPaymentDateFrom = this.formatDate(this.feesDateFrom);
    }
    if (this.feesDateTo) {
      queryParams.FeesPaymentDateTo = this.formatDate(this.feesDateTo);
    }

    console.log('Navigating with query params:', queryParams);

    this.openInNewTab(
      'FeesDetails',
      queryParams,
      {
        menuData: {
          TitleAr: 'تفاصيل الرسوم',
          TitleEn: 'Fees Details',
          ItemURL: 'FeesDetails'
        }
      }
    );
  }

  // Navigate to service fees page with service filter
  navigateToFeesWithService(serviceId: number) {
    const queryParams: any = {
      ServiceID: serviceId
    };

    // Add date filters if they exist
    if (this.feesDateFrom) {
      queryParams.FeesPaymentDateFrom = this.formatDate(this.feesDateFrom);
    }
    if (this.feesDateTo) {
      queryParams.FeesPaymentDateTo = this.formatDate(this.feesDateTo);
    }

    console.log('Navigating with service and query params:', queryParams);

    this.openInNewTab(
      'FeesDetails',
      queryParams,
      {
        menuData: {
          TitleAr: 'تفاصيل الرسوم',
          TitleEn: 'Fees Details',
          ItemURL: 'FeesDetails'
        }
      }
    );
  }

  // Navigate to licenses page with service filter
  navigateToLicensesWithService(serviceId: number) {
    const queryParams: any = {
      ServiceID: serviceId
    };

    // Add date filters if they exist
    if (this.licCreationFrom) {
      queryParams.LicenseCreationDateFrom = this.formatDate(this.licCreationFrom);
    }
    if (this.licCreationTo) {
      queryParams.LicenseCreationDateTo = this.formatDate(this.licCreationTo);
    }
    if (this.licExpireFrom) {
      queryParams.LicenseExpirationDateFrom = this.formatDate(this.licExpireFrom);
    }
    if (this.licExpireTo) {
      queryParams.LicenseExpirationDateTo = this.formatDate(this.licExpireTo);
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

  // Navigate to requests page with service filter
  navigateToRequestsWithService(serviceId: number) {
    const queryParams: any = {
      ServiceID: serviceId
    };

    // Add date filters if they exist
    if (this.reqDateFrom) {
      queryParams.RequestDateFrom = this.formatDate(this.reqDateFrom);
    }
    if (this.reqDateTo) {
      queryParams.RequestDateTo = this.formatDate(this.reqDateTo);
    }

    this.openInNewTab(
      'RequestDetails',
      queryParams,
      {
        menuData: {
          TitleAr: 'تفاصيل الطلبات',
          TitleEn: 'Requests Details',
          ItemURL: 'RequestsDetails'
        }
      }
    );


  }

  // Navigate to licenses page with date filters
  navigateToLicensesDetails() {
    const queryParams: any = {};

    if (this.licCreationFrom) {
      queryParams.LicenseCreationDateFrom = this.formatDate(this.licCreationFrom);
    }
    if (this.licCreationTo) {
      queryParams.LicenseCreationDateTo = this.formatDate(this.licCreationTo);
    }
    if (this.licExpireFrom) {
      queryParams.LicenseExpirationDateFrom = this.formatDate(this.licExpireFrom);
    }
    if (this.licExpireTo) {
      queryParams.LicenseExpirationDateTo = this.formatDate(this.licExpireTo);
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

  // Navigate to licenses page with club filter (for memberships chart)
  navigateToMembershipsWithClub(clubId: number) {
    const queryParams: any = {
      FkClubID: clubId
    };

    // إضافة التواريخ إذا كانت موجودة (للـ charts فقط)
    if (this.LicenseCreationDateFromMem) {
      queryParams.LicenseCreationDateFromMem = this.formatDate(this.LicenseCreationDateFromMem);
    }
    if (this.LicenseCreationDateToMem) {
      queryParams.LicenseCreationDateToMem = this.formatDate(this.LicenseCreationDateToMem);
    }
    if (this.LicenseExpirationDateFromMem) {
      queryParams.LicenseExpirationDateFromMem = this.formatDate(this.LicenseExpirationDateFromMem);
    }
    if (this.LicenseExpirationDateToMem) {
      queryParams.LicenseExpirationDateToMem = this.formatDate(this.LicenseExpirationDateToMem);
    }

    this.openInNewTab(
      'MembershipDetails',
      queryParams,
      {
        menuData: {
          TitleAr: 'تفاصيل عضويات النادي',
          TitleEn: 'Club Memberships Details',
          ItemURL: 'MembershipDetails'
        }
      }
    );
  }

  // Navigate to requests page with date filters
  navigateToRequestsDetails() {
    const queryParams: any = {};

    if (this.reqDateFrom) {
      queryParams.CreationDateFrom = this.formatDate(this.reqDateFrom);
    }
    if (this.reqDateTo) {
      queryParams.CreationDateTo = this.formatDate(this.reqDateTo);
    }

    this.openInNewTab(
      'RequestDetails',
      queryParams,
      {
        menuData: {
          TitleAr: 'تفاصيل الطلبات',
          TitleEn: 'Requests Details',
          ItemURL: 'RequestsDetails'
        }
      }
    );
  }

  // Format date to YYYY-MM-DD
  private formatDate(date: any): string | null {
    if (!date) return null;

    try {
      let dateObj: Date;

      if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else {
        return null;
      }

      if (isNaN(dateObj.getTime())) {
        return null;
      }

      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    } catch (error) {
      return null;
    }
  }

  applyFilters() {
    const filters = {
      FeesPaymentDateFrom: this.formatDate(this.feesDateFrom),
      FeesPaymentDateTo: this.formatDate(this.feesDateTo),
      LicenseCreationDateFrom: this.formatDate(this.licCreationFrom),
      LicenseCreationDateTo: this.formatDate(this.licCreationTo),
      LicenseExpirationDateFrom: this.formatDate(this.licExpireFrom),
      LicenseExpirationDateTo: this.formatDate(this.licExpireTo),
      LicenseCreationDateFromMem: this.formatDate(this.LicenseCreationDateFromMem),
      LicenseCreationDateToMem: this.formatDate(this.LicenseCreationDateToMem),
      LicenseExpirationDateFromMem: this.formatDate(this.LicenseExpirationDateFromMem),
      LicenseExpirationDateToMem: this.formatDate(this.LicenseExpirationDateToMem),
      CreationDateFrom: this.formatDate(this.reqDateFrom),
      CreationDateTo: this.formatDate(this.reqDateTo)
    };
    this.loadDashboard(filters);
  }

  // Get responsive chart container class based on data count
  // Get responsive chart container class based on data count
  getChartContainerClass(chartType: 'fees' | 'licenses' | 'requests' | 'memberships'): string {
    const count = this.chartDataCounts[chartType] || 0;
    const isSingleItem = count <= 1;

    const baseClass = 'flex justify-center items-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-2xl shadow-inner border border-indigo-100 p-8 relative overflow-hidden transition-all duration-300';

    // If single item, make it smaller (centered, max-width, shorter height)
    if (isSingleItem) {
      return `w-full max-w-2xl h-[400px] mx-auto ${baseClass}`;
    }

    // Default full size
    return `w-full h-[550px] ${baseClass}`;
  }

  getLicensesChartWidth(): string {
    return '100%';
  }

  getRequestsChartClass(): string {
    return this.getChartContainerClass('requests');
  }

  getFeesChartClass(): string {
    return this.getChartContainerClass('fees');
  }
  // ================== Print Methods ==================
  printChart(chartType: 'fees' | 'licenses' | 'requests' | 'memberships', chartTitle: string) {
    let canvas: HTMLCanvasElement;
    let statValue: number;
    let statLabel: string;

    switch (chartType) {
      case 'fees':
        canvas = this.barFeesCanvas.nativeElement;
        statValue = this.animatedFees;
        statLabel = this.isArabic ? 'إجمالي الرسوم' : 'Total Fees';
        break;
      case 'licenses':
        canvas = this.donutLicensesCanvas.nativeElement;
        statValue = this.animatedLicenses;
        statLabel = this.isArabic ? 'إجمالي التراخيص' : 'Total Licenses';
        break;
      case 'requests':
        canvas = this.barRequestsCanvas.nativeElement;
        statValue = this.animatedRequests;
        statLabel = this.isArabic ? 'إجمالي الطلبات' : 'Total Requests';
        break;
      case 'memberships':
        canvas = this.donutMembershipsCanvas.nativeElement;
        statValue = this.animatedMemberships;
        statLabel = this.isArabic ? 'إجمالي العضويات' : 'Total Memberships';
        break;
      default:
        return;
    }

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Get the chart image as base64
    const chartImage = canvas.toDataURL('image/png');
    const today = new Date().toLocaleDateString(this.isArabic ? 'ar-QA' : 'en-US');

    // Create HTML content for printing
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="${this.isArabic ? 'rtl' : 'ltr'}" lang="${this.isArabic ? 'ar' : 'en'}">
        <head>
          <meta charset="UTF-8">
          <title>${chartTitle}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 20px;
              font-family: ${this.isArabic ? '"Segoe UI", Tahoma, Arial, sans-serif' : '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'};
              text-align: center;
              direction: ${this.isArabic ? 'rtl' : 'ltr'};
              background: white;
              color: #333;
            }
            .header {
              margin-bottom: 30px;
              border-bottom: 2px solid #8a173e;
              padding-bottom: 15px;
            }
            .main-title {
              font-size: 28px;
              font-weight: bold;
              color: #8a173e;
              margin-bottom: 10px;
            }
            .print-date {
              color: #666;
              font-size: 14px;
            }
            .chart-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 70vh;
            }
            .stat-card {
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
              border: 2px solid #8a173e;
              border-radius: 15px;
              padding: 30px;
              margin-bottom: 30px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
              min-width: 300px;
            }
            .stat-value {
              font-size: 48px;
              font-weight: bold;
              color: #8a173e;
              margin-bottom: 10px;
            }
            .stat-label {
              font-size: 18px;
              font-weight: 600;
              color: #555;
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
            @media print {
              body { 
                margin: 0; 
                padding: 15px;
              }
              .chart-container { 
                min-height: auto; 
              }
              .main-title { 
                font-size: 24px; 
              }
              .stat-value { 
                font-size: 36px; 
              }
              .stat-label { 
                font-size: 16px; 
              }
              .chart-title { 
                font-size: 20px; 
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="main-title">${chartTitle}</div>
            <div class="print-date">${this.isArabic ? 'تاريخ الطباعة: ' : 'Print Date: '}${today}</div>
          </div>
          
          <div class="chart-container">
            <div class="stat-card">
              <div class="stat-value">${statValue.toLocaleString()}</div>
              <div class="stat-label">${statLabel}</div>
            </div>
            
            <div class="chart-title">${chartTitle}</div>
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

  printAllCharts() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Get all chart images
    const feesImage = this.barFeesCanvas.nativeElement.toDataURL('image/png');
    const licensesImage = this.donutLicensesCanvas.nativeElement.toDataURL('image/png');
    const requestsImage = this.barRequestsCanvas.nativeElement.toDataURL('image/png');
    const membershipsImage = this.donutMembershipsCanvas?.nativeElement ? this.donutMembershipsCanvas.nativeElement.toDataURL('image/png') : null;

    const feesTitle = this.isArabic ? 'الرسوم حسب الخدمات' : 'Fees by Services';
    const licensesTitle = this.isArabic ? 'الرخص حسب الخدمات' : 'Licenses by Services';
    const requestsTitle = this.isArabic ? 'الطلبات حسب الخدمات' : 'Requests by Services';
    const membershipsTitle = this.isArabic ? 'العضويات حسب الأندية' : 'Memberships by Clubs';
    const mainTitle = this.isArabic ? 'تقرير لوحة المعلومات' : 'Dashboard Report';
    const today = new Date().toLocaleDateString(this.isArabic ? 'ar-QA' : 'en-US');

    // Create HTML content for printing all charts with statistics
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="${this.isArabic ? 'rtl' : 'ltr'}" lang="${this.isArabic ? 'ar' : 'en'}">
        <head>
          <meta charset="UTF-8">
          <title>${mainTitle}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 20px;
              font-family: ${this.isArabic ? '"Segoe UI", Tahoma, Arial, sans-serif' : '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'};
              direction: ${this.isArabic ? 'rtl' : 'ltr'};
              background: white;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 3px solid #8a173e;
              padding-bottom: 20px;
            }
            .main-title {
              font-size: 32px;
              font-weight: bold;
              color: #8a173e;
              margin-bottom: 10px;
            }
            .print-date {
              color: #666;
              font-size: 14px;
              margin-top: 10px;
            }
            
            /* Statistics Cards */
            .stats-section {
              margin-bottom: 40px;
              page-break-inside: avoid;
            }
            .stats-title {
              font-size: 24px;
              font-weight: bold;
              color: #8a173e;
              margin-bottom: 20px;
              text-align: center;
              border-bottom: 2px solid #8a173e;
              padding-bottom: 10px;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 20px;
              margin-bottom: 30px;
            }
            .stat-card {
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
              border: 2px solid #dee2e6;
              border-radius: 12px;
              padding: 25px;
              text-align: center;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .stat-card.fees {
              border-color: #4e73df;
              background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
            }
            .stat-card.licenses {
              border-color: #9c27b0;
              background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
            }
            .stat-card.requests {
              border-color: #009688;
              background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%);
            }
            .stat-value {
              font-size: 36px;
              font-weight: bold;
              margin-bottom: 8px;
            }
            .stat-card.fees .stat-value { color: #1976d2; }
            .stat-card.licenses .stat-value { color: #7b1fa2; }
            .stat-card.requests .stat-value { color: #00695c; }
            .stat-card.memberships .stat-value { color: #0f2a44; }
            .stat-card.memberships {
              border-color: #0f2a44;
              background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
            }
            
            .stat-label {
              font-size: 16px;
              font-weight: 600;
              color: #555;
            }
            
            /* Charts */
            .chart-section {
              margin-bottom: 50px;
              page-break-inside: avoid;
            }
            .chart-title {
              font-size: 22px;
              font-weight: bold;
              margin-bottom: 20px;
              color: #8a173e;
              text-align: center;
              border-bottom: 1px solid #ddd;
              padding-bottom: 10px;
            }
            .chart-image {
              width: 100%;
              max-width: 900px;
              height: auto;
              border: 1px solid #ddd;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              display: block;
              margin: 0 auto;
            }
            
            /* Print specific styles */
            @media print {
              body { 
                margin: 0; 
                padding: 15px; 
                font-size: 12px;
              }
              .header { margin-bottom: 30px; }
              .main-title { font-size: 28px; }
              .stats-title { font-size: 20px; }
              .stat-value { font-size: 28px; }
              .stat-label { font-size: 14px; }
              .chart-title { font-size: 18px; }
              .chart-section { 
                page-break-after: auto; 
                margin-bottom: 40px;
              }
              .stats-section { 
                page-break-after: auto; 
                margin-bottom: 30px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="main-title">${mainTitle}</div>
            <div class="print-date">${this.isArabic ? 'تاريخ الطباعة: ' : 'Print Date: '}${today}</div>
          </div>
          
          <!-- Statistics Section -->
          <div class="stats-section">
            <div class="stats-title">${this.isArabic ? 'الإحصائيات الرئيسية' : 'Key Statistics'}</div>
            <div class="stats-grid">
              <div class="stat-card fees">
                <div class="stat-value">${this.animatedFees.toLocaleString()}</div>
                <div class="stat-label">${this.isArabic ? 'إجمالي الرسوم' : 'Total Fees'}</div>
              </div>
              <div class="stat-card licenses">
                <div class="stat-value">${this.animatedLicenses.toLocaleString()}</div>
                <div class="stat-label">${this.isArabic ? 'إجمالي التراخيص' : 'Total Licenses'}</div>
              </div>
              <div class="stat-card requests">
                <div class="stat-value">${this.animatedRequests.toLocaleString()}</div>
                <div class="stat-label">${this.isArabic ? 'إجمالي الطلبات' : 'Total Requests'}</div>
              </div>
              <div class="stat-card memberships">
                <div class="stat-value">${this.animatedMemberships.toLocaleString()}</div>
                <div class="stat-label">${this.isArabic ? 'إجمالي العضويات' : 'Total Memberships'}</div>
              </div>
            </div>
          </div>
          
          <!-- Charts Section -->
          <div class="chart-section">
            <div class="chart-title">${feesTitle}</div>
            <img src="${feesImage}" alt="${feesTitle}" class="chart-image" />
          </div>
          
          <div class="chart-section">
            <div class="chart-title">${licensesTitle}</div>
            <img src="${licensesImage}" alt="${licensesTitle}" class="chart-image" />
          </div>
          
          <div class="chart-section">
            <div class="chart-title">${requestsTitle}</div>
            <img src="${requestsImage}" alt="${requestsTitle}" class="chart-image" />
          </div>

          ${membershipsImage ? `
          <div class="chart-section">
            <div class="chart-title">${membershipsTitle}</div>
            <img src="${membershipsImage}" alt="${membershipsTitle}" class="chart-image" />
          </div>` : ''}
        </body>
      </html>
    `;

    // Write content and print
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for images to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 1000);
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
  navigateToMembershipsDetails() {
    // الذهاب لصفحة العضويات كاملة بدون فلتر
    this.openInNewTab(
      'MembershipDetails',
      {},
      {
        menuData: {
          TitleAr: 'تفاصيل العضويات',
          TitleEn: 'Memberships Details',
          ItemURL: 'MembershipDetails'
        }
      }
    );
  }

  // Navigate to rejected requests
  navigateToRejectedRequests() {
    const queryParams: any = {
      RequestCategory: [2911]
    };
    
    // إضافة تواريخ الطلبات إذا كانت موجودة
    if (this.reqDateFrom) {
      queryParams.CreationDateFrom = this.formatDate(this.reqDateFrom);
    }
    if (this.reqDateTo) {
      queryParams.CreationDateTo = this.formatDate(this.reqDateTo);
    }
    
    this.openInNewTab(
      'RequestDetails',
      queryParams,
      {
        menuData: {
          TitleAr: 'تفاصيل الطلبات المرفوضة',
          TitleEn: 'Rejected Requests Details',
          ItemURL: 'RequestDetails'
        }
      }
    );
  }
  // Navigate to TotalRPT page in new tab
  navigateToTotalRPT() {

    this.openInNewTab(
      'TotalRPT',

    );
  }

  // Export advanced report with all data
  exportAdvancedReport() {
    const wb: XLSX.WorkBook = XLSX.utils.book_new();

    // 1. Fees Sheet
    const feesData = (this.dashboardData?.Fees || []).map((item: any) => {
      if (this.isArabic) {
        return {
          'الخدمة': item.ServiceTitleAr,
          'الرسوم': item.FeesPerService
        };
      } else {
        return {
          'Service': item.ServiceTitleEn,
          'Fees': item.FeesPerService
        };
      }
    });
    const feesSheet = XLSX.utils.json_to_sheet(feesData);
    if (this.isArabic) {
      feesSheet['!views'] = [{ RTL: true }];
    }
    XLSX.utils.book_append_sheet(wb, feesSheet, this.isArabic ? 'الرسوم' : 'Fees');

    // 2. Licenses Sheet
    const licensesData = (this.dashboardData?.Licenses || []).map((item: any) => {
      if (this.isArabic) {
        return {
          'الخدمة': item.ServiceTitleAr,
          'عدد التراخيص': item.LicensesPerService
        };
      } else {
        return {
          'Service': item.ServiceTitleEn,
          'Licenses Count': item.LicensesPerService
        };
      }
    });
    const licensesSheet = XLSX.utils.json_to_sheet(licensesData);
    if (this.isArabic) {
      licensesSheet['!views'] = [{ RTL: true }];
    }
    XLSX.utils.book_append_sheet(wb, licensesSheet, this.isArabic ? 'التراخيص' : 'Licenses');

    // 3. Memberships Sheet
    const membershipsData = (this.dashboardData?.Memberships || []).map((item: any) => {
      if (this.isArabic) {
        return {
          'النادي': item.ClubAr,
          'عدد التراخيص': item.LicensesPerClub
        };
      } else {
        return {
          'Club': item.ClubEn,
          'Licenses Count': item.LicensesPerClub
        };
      }
    });
    const membershipsSheet = XLSX.utils.json_to_sheet(membershipsData);
    if (this.isArabic) {
      membershipsSheet['!views'] = [{ RTL: true }];
    }
    XLSX.utils.book_append_sheet(wb, membershipsSheet, this.isArabic ? 'العضويات' : 'Memberships');

    // 4. Requests Sheet
    const requestsData = (this.dashboardData?.Requests || []).map((item: any) => {
      if (this.isArabic) {
        return {
          'الخدمة': item.ServiceTitleAr,
          'عدد الطلبات': item.RequestsPerService
        };
      } else {
        return {
          'Service': item.ServiceTitleEn,
          'Requests Count': item.RequestsPerService
        };
      }
    });
    const requestsSheet = XLSX.utils.json_to_sheet(requestsData);
    if (this.isArabic) {
      requestsSheet['!views'] = [{ RTL: true }];
    }
    XLSX.utils.book_append_sheet(wb, requestsSheet, this.isArabic ? 'الطلبات' : 'Requests');

    // تطبيق RTL على הـ workbook
    if (this.isArabic) {
      if (!wb.Workbook) wb.Workbook = {};
      if (!wb.Workbook.Views) wb.Workbook.Views = [];
      wb.Workbook.Views[0] = { RTL: true };
    }

    // Generate Excel File
    const today = new Date().toISOString().split('T')[0];
    const filename = this.isArabic
      ? `تقرير_لوحة_التحكم_${today}.xlsx`
      : `Dashboard_Report_${today}.xlsx`;

    XLSX.writeFile(wb, filename);

    console.log(this.isArabic ? 'تم تصدير التقرير بنجاح' : 'Report exported successfully');
  }

}
