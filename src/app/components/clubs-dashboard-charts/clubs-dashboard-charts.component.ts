import { Component, OnInit, ViewChild, ElementRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FlatpickrModule } from 'angularx-flatpickr';
import { NumFormatPipe } from 'src/app/pipes/number-format.pipe';
import { LicensesService } from 'src/app/service/licenses.service';
import { LocalizationService } from 'src/app/service/localization.service';
import { TranslateService } from '@ngx-translate/core';
import { basic } from 'src/app/helpers/date-helper';
import { Router } from '@angular/router';
import Chart from 'chart.js/auto';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-clubs-dashboard-charts',
  standalone: true,
  imports: [CommonModule, NumFormatPipe, FormsModule, FlatpickrModule],
  templateUrl: './clubs-dashboard-charts.component.html',
  styleUrls: ['./clubs-dashboard-charts.component.css']
})
export class ClubsDashboardChartsComponent implements OnInit {

  clubsData: any[] = [];
  clubsTotals: any = null;

  // ================== Filters ==================
  feesDateFrom: any;
  feesDateTo: any;
  reqDateFrom: any;
  reqDateTo: any;
  licCreationFrom: any;
  licCreationTo: any;
  
  // ================== Membership Filters ==================
  LicenseCreationDateFromMem: any;
  LicenseCreationDateToMem: any;
  LicenseExpirationDateFromMem: any;
  LicenseExpirationDateToMem: any;

  // ================== Charts ==================
  chartClubsFees: any;
  chartClubsMemberships: any;
  chartClubsRequests: any;

  @ViewChild('clubsFeesCanvas', { static: true }) clubsFeesCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('clubsMembershipsCanvas', { static: true }) clubsMembershipsCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('clubsRequestsCanvas', { static: true }) clubsRequestsCanvas!: ElementRef<HTMLCanvasElement>;

  // ================== Animated Numbers ==================
  animatedTotalClubs = 0;
  animatedTotalFees = 0;
  animatedTotalMemberships = 0;
  animatedTotalRequests = 0;

  // ================== Chart Type Toggle ==================
  clubsFeesChartType: 'bar' | 'pie' | 'doughnut' = 'doughnut';
  clubsMembershipsChartType: 'bar' | 'pie' | 'doughnut' = 'doughnut';
  clubsRequestsChartType: 'bar' | 'line' | 'doughnut' = 'bar';

  // ================== Localization ==================
  translations = signal<any>({});
  isArabic: boolean = false;
  basic: any = basic;

  constructor(
    private licensesService: LicensesService,
    private localizationService: LocalizationService,
    public translate: TranslateService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.isArabic = this.translate.currentLang === 'ae';
    this.translations.set(this.localizationService.getTranslations());
    this.loadClubsData();
  }

  loadClubsData(filters: any = {}) {
    const payload = {
      PageSize: 10000,
      PageNum: 1,
      SortField: 'ServiceID',
      ...filters
    };

    this.licensesService.searchGetTotalRPT(payload).subscribe({
      next: (res) => {
        this.clubsData = res.resultClubs || [];
        this.clubsTotals = res.TotalClubs?.[0] || null;

        // Calculate totals
        const totalClubs = this.clubsData.length;
        const totalFees = this.clubsData.reduce((sum, club) => sum + (club.TotalFeesPerClub || 0), 0);
        const totalLicenses = this.clubsData.reduce((sum, club) => sum + (club.ApprovedLicensePerClub || 0), 0);
        const totalRequests = this.clubsData.reduce((sum, club) => sum + (club.RequestsPerClub || 0), 0);

        // Animate numbers
        this.animateNumber(this.animatedTotalClubs, totalClubs, v => this.animatedTotalClubs = v);
        this.animateNumber(this.animatedTotalFees, totalFees, v => this.animatedTotalFees = v);
        this.animateNumber(this.animatedTotalMemberships, totalLicenses, v => this.animatedTotalMemberships = v);
        this.animateNumber(this.animatedTotalRequests, totalRequests, v => this.animatedTotalRequests = v);

        // Build charts
        this.buildClubsFeesChart();
        this.buildClubsMembershipsChart();
        this.buildClubsRequestsChart();

        // Force chart resize
        setTimeout(() => {
          if (this.chartClubsFees) this.chartClubsFees.resize();
          if (this.chartClubsMemberships) this.chartClubsMemberships.resize();
          if (this.chartClubsRequests) this.chartClubsRequests.resize();
        }, 100);
      },
      error: (err) => {
        console.error('Error loading clubs data:', err);
      }
    });
  }

  // ================== Chart Builders ==================
  buildClubsFeesChart() {
    if (this.chartClubsFees) this.chartClubsFees.destroy();

    const hasData = this.clubsData.length > 0 && this.clubsData.some(club => (club.TotalFeesPerClub || 0) > 0);

    const labels = hasData
      ? this.clubsData.map(club => this.isArabic ? club.ClubAr : club.ClubEn)
      : [this.isArabic ? 'لا توجد بيانات' : 'No Data'];

    const totalFeesData = hasData
      ? this.clubsData.map(club => club.TotalFeesPerClub || 0)
      : [0];

    const electronicFeesData = hasData
      ? this.clubsData.map(club => club.ElectronicFeesPerClub || 0)
      : [0];

    const manualFeesData = hasData
      ? this.clubsData.map(club => club.ManualFeesPerClub || 0)
      : [0];

    const canvas = this.clubsFeesCanvas.nativeElement;
    const context = canvas.getContext('2d');
    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    const chartConfig: any = {
      type: this.clubsFeesChartType,
      data: {
        labels,
        datasets: this.clubsFeesChartType === 'pie' || this.clubsFeesChartType === 'doughnut' ? [{
          label: this.isArabic ? 'إجمالي الرسوم' : 'Total Fees',
          data: totalFeesData,
          backgroundColor: [
            '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
            '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
          ],
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverBorderWidth: 4,
          hoverBorderColor: '#000000'
        }] : [
          {
            label: this.isArabic ? 'إجمالي الرسوم' : 'Total Fees',
            data: totalFeesData,
            backgroundColor: '#3B82F6',
            borderColor: '#2563EB',
            borderWidth: 1,
            hoverBackgroundColor: '#2563EB',
            hoverBorderColor: '#1D4ED8',
            hoverBorderWidth: 2
          },
          {
            label: this.isArabic ? 'الكترونى' : 'Electronic Fees',
            data: electronicFeesData,
            backgroundColor: '#10B981',
            borderColor: '#059669',
            borderWidth: 1,
            hoverBackgroundColor: '#059669',
            hoverBorderColor: '#047857',
            hoverBorderWidth: 2
          },
          {
            label: this.isArabic ? 'يدوى' : 'Manual Fees',
            data: manualFeesData,
            backgroundColor: '#F59E0B',
            borderColor: '#D97706',
            borderWidth: 1,
            hoverBackgroundColor: '#D97706',
            hoverBorderColor: '#B45309',
            hoverBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...(this.clubsFeesChartType === 'doughnut' && { cutout: '60%' }),
        interaction: {
          intersect: false,
          mode: 'index'
        },
        onHover: (event: any, elements: any) => {
          if (hasData) {
            const canvas = event.native.target;
            canvas.style.cursor = elements.length > 0 ? 'pointer' : 'default';
            
            // إضافة تأثير بصري عند التمرير فوق رسم الرسوم
            if (elements.length > 0) {
              canvas.style.filter = 'brightness(1.05)';
            } else {
              canvas.style.filter = 'brightness(1)';
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: this.isArabic ? 'توزيع الرسوم حسب النادي' : 'Fees Distribution by Club',
            font: { size: 16, weight: 'bold' },
            color: '#374151'
          },
          legend: {
            display: hasData,
            position: 'top'
          },
          tooltip: {
            enabled: hasData,
            callbacks: {
              label: (context: any) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y || context.parsed;
                return `${label}: ${this.formatNumber(value)} ${this.isArabic ? 'ريال قطري' : 'QAR'}`;
              }
            }
          }
        },
        onClick: (_: any, elements: any) => {
          if (hasData && elements.length > 0) {
            const index = elements[0].index;
            const clubData = this.clubsData[index];
            this.navigateToClubDetails(clubData, 'fees');
          }
        },
        scales: this.clubsFeesChartType === 'bar' ? {
          x: {
            grid: { display: false },
            ticks: { color: '#6B7280', font: { size: 11 }, maxRotation: 45 }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#F3F4F6' },
            ticks: {
              color: '#6B7280',
              font: { size: 11 },
              callback: (value: any) => this.formatNumber(Number(value))
            }
          }
        } : {}
      }
    };

    this.chartClubsFees = new Chart(canvas, chartConfig);
  }

  buildClubsMembershipsChart() {
    if (this.chartClubsMemberships) this.chartClubsMemberships.destroy();

    const hasData = this.clubsData.length > 0 && this.clubsData.some(club => (club.ApprovedLicensePerClub || 0) > 0);

    const labels = hasData
      ? this.clubsData.map(club => this.isArabic ? club.ClubAr : club.ClubEn)
      : [this.isArabic ? 'لا توجد بيانات' : 'No Data'];

    const licensesData = hasData
      ? this.clubsData.map(club => club.ApprovedLicensePerClub || 0)
      : [1];

    const validMembershipData = hasData
      ? this.clubsData.map(club => club.ValidMembershipPerClub || 0)
      : [0];

    const canvas = this.clubsMembershipsCanvas.nativeElement;
    const context = canvas.getContext('2d');
    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    // ألوان عنابية متدرجة
    const burgundyColors = hasData ? [
      '#8B1538', '#A91B47', '#C72156', '#E52765', '#FF2D74',
      '#8B1538', '#A91B47', '#C72156', '#E52765', '#FF2D74'
    ] : ['#e0e0e0'];

    const chartConfig: any = {
      type: this.clubsMembershipsChartType,
      data: {
        labels,
        datasets: this.clubsMembershipsChartType === 'pie' || this.clubsMembershipsChartType === 'doughnut' ? [{
          label: this.isArabic ? 'العضويات' : 'Memberships',
          data: licensesData,
          backgroundColor: burgundyColors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverBorderWidth: 4,
          hoverBorderColor: '#000000'
        }] : [
          {
            label: this.isArabic ? 'العضويات المعتمدة' : 'Approved Memberships',
            data: licensesData,
            backgroundColor: burgundyColors[0],
            borderColor: '#8B1538',
            borderWidth: 1,
            hoverBackgroundColor: '#A91B47',
            hoverBorderColor: '#6B1229',
            hoverBorderWidth: 2
          },
          {
            label: this.isArabic ? 'العضويات السارية' : 'Valid Memberships',
            data: validMembershipData,
            backgroundColor: burgundyColors[1],
            borderColor: '#A91B47',
            borderWidth: 1,
            hoverBackgroundColor: '#C72156',
            hoverBorderColor: '#8B1538',
            hoverBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...(this.clubsMembershipsChartType === 'doughnut' && { cutout: '60%' }),
        interaction: {
          intersect: false,
          mode: 'index'
        },
        onHover: (event: any, elements: any) => {
          if (hasData) {
            const canvas = event.native.target;
            canvas.style.cursor = elements.length > 0 ? 'pointer' : 'default';
            
            // إضافة تأثير بصري عند التمرير فوق رسم العضويات
            if (elements.length > 0) {
              canvas.style.filter = 'brightness(1.05) saturate(1.1)';
            } else {
              canvas.style.filter = 'brightness(1) saturate(1)';
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: this.isArabic ? 'توزيع العضويات حسب النادي' : 'Memberships by Club',
            font: { size: 16, weight: 'bold' },
            color: '#374151'
          },
          legend: {
            display: hasData,
            position: 'top'
          },
          tooltip: {
            enabled: hasData,
            callbacks: {
              label: (context: any) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y || context.parsed;
                return `${label}: ${this.formatNumber(value)}`;
              }
            }
          }
        },
        onClick: (_: any, elements: any) => {
          if (hasData && elements.length > 0) {
            const index = elements[0].index;
            const clubData = this.clubsData[index];
            this.navigateToClubDetails(clubData, 'memberships');
          }
        },
        scales: this.clubsMembershipsChartType === 'bar' ? {
          x: {
            grid: { display: false },
            ticks: { color: '#6B7280', font: { size: 11 }, maxRotation: 45 }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#F3F4F6' },
            ticks: {
              color: '#6B7280',
              font: { size: 11 },
              callback: (value: any) => this.formatNumber(Number(value))
            }
          }
        } : {}
      }
    };

    this.chartClubsMemberships = new Chart(canvas, chartConfig);
  }

  buildClubsRequestsChart() {
    if (this.chartClubsRequests) this.chartClubsRequests.destroy();

    const hasData = this.clubsData.length > 0 && this.clubsData.some(club => (club.RequestsPerClub || 0) > 0);

    const labels = hasData
      ? this.clubsData.map(club => this.isArabic ? club.ClubAr : club.ClubEn)
      : [this.isArabic ? 'لا توجد بيانات' : 'No Data'];

    const totalRequestsData = hasData
      ? this.clubsData.map(club => club.RequestsPerClub || 0)
      : [0];

    const onlineRequestsData = hasData
      ? this.clubsData.map(club => club.RequestsOnlinePerClub || 0)
      : [0];

    const empRequestsData = hasData
      ? this.clubsData.map(club => club.RequestsEmpPerClub || 0)
      : [0];

    const canvas = this.clubsRequestsCanvas.nativeElement;
    const context = canvas.getContext('2d');
    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    const chartConfig: any = {
      type: this.clubsRequestsChartType,
      data: {
        labels,
        datasets: this.clubsRequestsChartType === 'doughnut' ? [{
          label: this.isArabic ? 'إجمالي الطلبات' : 'Total Requests',
          data: totalRequestsData,
          backgroundColor: [
            '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6',
            '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
          ],
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverBorderWidth: 4,
          hoverBorderColor: '#000000'
        }] : [
          {
            label: this.isArabic ? 'إجمالي الطلبات' : 'Total Requests',
            data: totalRequestsData,
            backgroundColor: '#F59E0B',
            borderColor: '#D97706',
            borderWidth: 1,
            hoverBackgroundColor: '#D97706',
            hoverBorderColor: '#B45309',
            hoverBorderWidth: 2
          },
          {
            label: this.isArabic ? 'طلبات أونلاين' : 'Online Requests',
            data: onlineRequestsData,
            backgroundColor: '#10B981',
            borderColor: '#059669',
            borderWidth: 1,
            hoverBackgroundColor: '#059669',
            hoverBorderColor: '#047857',
            hoverBorderWidth: 2
          },
          {
            label: this.isArabic ? 'طلبات الموظفين' : 'Employee Requests',
            data: empRequestsData,
            backgroundColor: '#3B82F6',
            borderColor: '#2563EB',
            borderWidth: 1,
            hoverBackgroundColor: '#2563EB',
            hoverBorderColor: '#1D4ED8',
            hoverBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...(this.clubsRequestsChartType === 'doughnut' && { cutout: '60%' }),
        interaction: {
          intersect: false,
          mode: 'index'
        },
        onHover: (event: any, elements: any) => {
          if (hasData) {
            const canvas = event.native.target;
            canvas.style.cursor = elements.length > 0 ? 'pointer' : 'default';
            
            // إضافة تأثير بصري عند التمرير فوق رسم الطلبات
            if (elements.length > 0) {
              canvas.style.filter = 'brightness(1.05)';
            } else {
              canvas.style.filter = 'brightness(1)';
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: this.isArabic ? 'توزيع الطلبات حسب النادي' : 'Requests Distribution by Club',
            font: { size: 16, weight: 'bold' },
            color: '#374151'
          },
          legend: {
            display: hasData,
            position: 'top'
          },
          tooltip: {
            enabled: hasData,
            callbacks: {
              label: (context: any) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y || context.parsed;
                return `${label}: ${this.formatNumber(value)}`;
              }
            }
          }
        },
        onClick: (_: any, elements: any) => {
          if (hasData && elements.length > 0) {
            const index = elements[0].index;
            const clubData = this.clubsData[index];
            this.navigateToClubDetails(clubData, 'requests');
          }
        },
        scales: this.clubsRequestsChartType === 'bar' ? {
          x: {
            grid: { display: false },
            ticks: { color: '#6B7280', font: { size: 11 }, maxRotation: 45 }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#F3F4F6' },
            ticks: {
              color: '#6B7280',
              font: { size: 11 },
              callback: (value: any) => this.formatNumber(Number(value))
            }
          }
        } : this.clubsRequestsChartType === 'line' ? {
          x: {
            grid: { display: false },
            ticks: { color: '#6B7280', font: { size: 11 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#F3F4F6' },
            ticks: {
              color: '#6B7280',
              font: { size: 11 },
              callback: (value: any) => this.formatNumber(Number(value))
            }
          }
        } : {}
      }
    };

    this.chartClubsRequests = new Chart(canvas, chartConfig);
  }

  // ================== Chart Type Toggles ==================
  toggleClubsFeesChartType(type: 'bar' | 'pie' | 'doughnut') {
    this.clubsFeesChartType = type;
    this.buildClubsFeesChart();
  }

  toggleClubsMembershipsChartType(type: 'bar' | 'pie' | 'doughnut') {
    this.clubsMembershipsChartType = type;
    this.buildClubsMembershipsChart();
  }

  toggleClubsRequestsChartType(type: 'bar' | 'line' | 'doughnut') {
    this.clubsRequestsChartType = type;
    this.buildClubsRequestsChart();
  }

  // ================== Utility Methods ==================
  private formatNumber(value: number): string {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + (this.isArabic ? 'م' : 'M');
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + (this.isArabic ? 'ألف' : 'K');
    }
    return value.toLocaleString();
  }

  private animateNumber(start: number, end: number, setter: (value: number) => void) {
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

  private formatDate(date: any): string | null {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ================== Filter Methods ==================
  applyFilters() {
    const filters = {
      FeesPaymentDateFrom: this.formatDate(this.feesDateFrom),
      FeesPaymentDateTo: this.formatDate(this.feesDateTo),
      CreationDateFrom: this.formatDate(this.reqDateFrom),
      CreationDateTo: this.formatDate(this.reqDateTo),
      LicenseCreationDateFromMem: this.formatDate(this.LicenseCreationDateFromMem),
      LicenseCreationDateToMem: this.formatDate(this.LicenseCreationDateToMem),
      LicenseExpirationDateFromMem: this.formatDate(this.LicenseExpirationDateFromMem),
      LicenseExpirationDateToMem: this.formatDate(this.LicenseExpirationDateToMem)
    };
    this.loadClubsData(filters);
  }

  resetFilters() {
    this.feesDateFrom = this.feesDateTo = null;
    this.reqDateFrom = this.reqDateTo = null;
    this.licCreationFrom = this.licCreationTo = null;
    this.LicenseCreationDateFromMem = this.LicenseCreationDateToMem = null;
    this.LicenseExpirationDateFromMem = this.LicenseExpirationDateToMem = null;
    this.loadClubsData();
  }

  // ================== Navigation Methods ==================
  navigateToClubDetails(club: any, reportType: 'fees' | 'requests' | 'memberships') {
    let baseUrl = '';
    const queryParams: any = {};
    
    switch (reportType) {
      case 'fees':
        baseUrl = '/FeesDetails';
        queryParams.FkClubID = club.FkClubID;
        break;
      case 'requests':
        baseUrl = '/RequestDetails';
        queryParams.FkClubID = club.FkClubID;
        break;
      case 'memberships':
        baseUrl = '/LicenseDetails';
        queryParams.FkClubID = club.FkClubID;
        
        // إضافة تواريخ العضويات إذا كانت موجودة
        if (this.LicenseCreationDateFromMem) {
          queryParams.LicenseCreationDateFrom = this.formatDate(this.LicenseCreationDateFromMem);
        }
        if (this.LicenseCreationDateToMem) {
          queryParams.LicenseCreationDateTo = this.formatDate(this.LicenseCreationDateToMem);
        }
        if (this.LicenseExpirationDateFromMem) {
          queryParams.LicenseExpirationDateFrom = this.formatDate(this.LicenseExpirationDateFromMem);
        }
        if (this.LicenseExpirationDateToMem) {
          queryParams.LicenseExpirationDateTo = this.formatDate(this.LicenseExpirationDateToMem);
        }
        break;
    }

    this.openInNewTab(baseUrl, queryParams, {
      menuData: {
        TitleAr: reportType === 'fees' ? 'تفاصيل رسوم النادي' : 
                reportType === 'requests' ? 'تفاصيل طلبات النادي' : 'تفاصيل عضويات النادي',
        TitleEn: reportType === 'fees' ? 'Club Fees Details' : 
                reportType === 'requests' ? 'Club Requests Details' : 'Club Memberships Details',
        ItemURL: reportType === 'fees' ? 'FeesDetails' : 
                reportType === 'requests' ? 'RequestDetails' : 'LicenseDetails'
      }
    });
  }

  navigateToClubsFeesDetails() {
    const queryParams: any = {};
    if (this.feesDateFrom) queryParams.FeesPaymentDateFrom = this.formatDate(this.feesDateFrom);
    if (this.feesDateTo) queryParams.FeesPaymentDateTo = this.formatDate(this.feesDateTo);

    this.openInNewTab('FeesDetails', queryParams, {
      menuData: {
        TitleAr: 'تفاصيل رسوم الأندية',
        TitleEn: 'Clubs Fees Details',
        ItemURL: 'FeesDetails'
      }
    });
  }

  navigateToClubsMembershipsDetails() {
    const queryParams: any = {};
   
    if (this.LicenseCreationDateFromMem) queryParams.LicenseCreationDateFromMem = this.formatDate(this.LicenseCreationDateFromMem);
    if (this.LicenseCreationDateToMem) queryParams.LicenseCreationDateToMem = this.formatDate(this.LicenseCreationDateToMem);
    if (this.LicenseExpirationDateFromMem) queryParams.LicenseExpirationDateFromMem = this.formatDate(this.LicenseExpirationDateFromMem);
    if (this.LicenseExpirationDateToMem) queryParams.LicenseExpirationDateToMem = this.formatDate(this.LicenseExpirationDateToMem);

    this.openInNewTab('MembershipDetails', queryParams, {
      menuData: {
        TitleAr: 'تفاصيل تراخيص الأندية',
        TitleEn: 'Clubs Licenses Details',
        ItemURL: 'MembershipDetails'
      }
    });
  }

  navigateToClubsRequestsDetails() {
    const queryParams: any = {};
    if (this.reqDateFrom) queryParams.CreationDateFrom = this.formatDate(this.reqDateFrom);
    if (this.reqDateTo) queryParams.CreationDateTo = this.formatDate(this.reqDateTo);

    this.openInNewTab('RequestDetails', queryParams, {
      menuData: {
        TitleAr: 'تفاصيل طلبات الأندية',
        TitleEn: 'Clubs Requests Details',
        ItemURL: 'RequestDetails'
      }
    });
  }

  private openInNewTab(path: string, queryParams?: any, state?: any) {
    const urlTree = this.router.createUrlTree([path], { queryParams });
    const url = this.router.serializeUrl(urlTree);
    const newTab = window.open(url, '_blank');
    if (newTab && state) {
      newTab.history.replaceState(state, '', url);
    }
  }

  // ================== Excel Export Methods ==================
  exportToExcel(chartType: 'fees' | 'memberships' | 'requests' | 'all', chartTitle: string) {
    let data: any[] = [];
    let fileName = '';

    switch (chartType) {
      case 'fees':
        data = this.clubsData.map(club => ({
          [this.isArabic ? 'النادي' : 'Club']: this.isArabic ? club.ClubAr : club.ClubEn,
          [this.isArabic ? 'إجمالي الرسوم' : 'Total Fees']: club.TotalFeesPerClub || 0,
          [this.isArabic ? 'الرسوم الإلكترونية' : 'Electronic Fees']: club.ElectronicFeesPerClub || 0,
          [this.isArabic ? 'الرسوم اليدوية' : 'Manual Fees']: club.ManualFeesPerClub || 0
        }));
        fileName = this.isArabic ? 'رسوم_الأندية' : 'Clubs_Fees';
        break;

      case 'memberships':
        data = this.clubsData.map(club => ({
          [this.isArabic ? 'النادي' : 'Club']: this.isArabic ? club.ClubAr : club.ClubEn,
          [this.isArabic ? 'العضويات المعتمدة' : 'Approved Memberships']: club.ApprovedLicensePerClub || 0,
          [this.isArabic ? 'العضويات السارية' : 'Valid Memberships']: club.ValidMembershipPerClub || 0
        }));
        fileName = this.isArabic ? 'عضويات_الأندية' : 'Clubs_Memberships';
        break;

      case 'requests':
        data = this.clubsData.map(club => ({
          [this.isArabic ? 'النادي' : 'Club']: this.isArabic ? club.ClubAr : club.ClubEn,
          [this.isArabic ? 'إجمالي الطلبات' : 'Total Requests']: club.RequestsPerClub || 0,
          [this.isArabic ? 'طلبات أونلاين' : 'Online Requests']: club.RequestsOnlinePerClub || 0,
          [this.isArabic ? 'طلبات الموظفين' : 'Employee Requests']: club.RequestsEmpPerClub || 0
        }));
        fileName = this.isArabic ? 'طلبات_الأندية' : 'Clubs_Requests';
        break;

      case 'all':
        data = this.clubsData.map(club => ({
          [this.isArabic ? 'النادي' : 'Club']: this.isArabic ? club.ClubAr : club.ClubEn,
          // الرسوم
          [this.isArabic ? 'إجمالي الرسوم' : 'Total Fees']: club.TotalFeesPerClub || 0,
          [this.isArabic ? 'الرسوم الإلكترونية' : 'Electronic Fees']: club.ElectronicFeesPerClub || 0,
          [this.isArabic ? 'الرسوم اليدوية' : 'Manual Fees']: club.ManualFeesPerClub || 0,
          // العضويات
          [this.isArabic ? 'العضويات المعتمدة' : 'Approved Memberships']: club.ApprovedLicensePerClub || 0,
          [this.isArabic ? 'العضويات السارية' : 'Valid Memberships']: club.ValidMembershipPerClub || 0,
          // الطلبات
          [this.isArabic ? 'إجمالي الطلبات' : 'Total Requests']: club.RequestsPerClub || 0,
          [this.isArabic ? 'طلبات أونلاين' : 'Online Requests']: club.RequestsOnlinePerClub || 0,
          [this.isArabic ? 'طلبات الموظفين' : 'Employee Requests']: club.RequestsEmpPerClub || 0
        }));
        fileName = this.isArabic ? 'تقرير_الأندية_الشامل' : 'Complete_Clubs_Report';
        break;
    }

    if (data.length === 0) {
      alert(this.isArabic ? 'لا توجد بيانات للتصدير' : 'No data to export');
      return;
    }

    // إنشاء ورقة العمل
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // تحسين عرض الأعمدة
    const colWidths = Object.keys(data[0]).map(key => ({
      wch: Math.max(key.length, 15)
    }));
    worksheet['!cols'] = colWidths;

    // إنشاء المصنف
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, chartTitle);

    // إضافة التاريخ للاسم
    const today = new Date().toISOString().split('T')[0];
    const fullFileName = `${fileName}_${today}.xlsx`;

    // تصدير الملف
    XLSX.writeFile(workbook, fullFileName);
  }

  // ================== Print Methods ==================
  printChart(chartType: 'fees' | 'licenses' | 'requests' | 'memberships', chartTitle: string) {
    let canvas: HTMLCanvasElement;
    let statValue: number;
    let statLabel: string;

    switch (chartType) {
      case 'fees':
        canvas = this.clubsFeesCanvas.nativeElement;
        statValue = this.animatedTotalFees;
        statLabel = this.isArabic ? 'إجمالي رسوم الأندية' : 'Total Clubs Fees';
        break;
      case 'memberships':
        canvas = this.clubsMembershipsCanvas.nativeElement;
        statValue = this.animatedTotalMemberships;
        statLabel = this.isArabic ? 'إجمالي عضويات الأندية' : 'Total Clubs Memberships';
        break;
      case 'requests':
        canvas = this.clubsRequestsCanvas.nativeElement;
        statValue = this.animatedTotalRequests;
        statLabel = this.isArabic ? 'إجمالي طلبات الأندية' : 'Total Clubs Requests';
        break;
      default:
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const chartImage = canvas.toDataURL('image/png');
    const today = new Date().toLocaleDateString(this.isArabic ? 'ar-QA' : 'en-US');

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="${this.isArabic ? 'rtl' : 'ltr'}" lang="${this.isArabic ? 'ar' : 'en'}">
        <head>
          <meta charset="UTF-8">
          <title>${chartTitle}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              margin: 0; padding: 20px;
              font-family: ${this.isArabic ? '"Segoe UI", Tahoma, Arial, sans-serif' : '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'};
              text-align: center; direction: ${this.isArabic ? 'rtl' : 'ltr'};
              background: white; color: #333;
            }
            .header { margin-bottom: 30px; border-bottom: 2px solid #10b981; padding-bottom: 15px; }
            .main-title { font-size: 28px; font-weight: bold; color: #10b981; margin-bottom: 10px; }
            .print-date { color: #666; font-size: 14px; }
            .chart-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 70vh; }
            .stat-card {
              background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
              border: 2px solid #10b981; border-radius: 15px; padding: 30px; margin-bottom: 30px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); min-width: 300px;
            }
            .stat-value { font-size: 48px; font-weight: bold; color: #10b981; margin-bottom: 10px; }
            .stat-label { font-size: 18px; font-weight: 600; color: #555; }
            .chart-title { font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #333; }
            .chart-image { max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
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

    printWindow.document.write(htmlContent);
    printWindow.document.close();
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

    const feesImage = this.clubsFeesCanvas.nativeElement.toDataURL('image/png');
    const membershipsImage = this.clubsMembershipsCanvas.nativeElement.toDataURL('image/png');
    const requestsImage = this.clubsRequestsCanvas.nativeElement.toDataURL('image/png');

    const mainTitle = this.isArabic ? 'تقرير لوحة معلومات الأندية' : 'Clubs Dashboard Report';
    const today = new Date().toLocaleDateString(this.isArabic ? 'ar-QA' : 'en-US');

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="${this.isArabic ? 'rtl' : 'ltr'}" lang="${this.isArabic ? 'ar' : 'en'}">
        <head>
          <meta charset="UTF-8">
          <title>${mainTitle}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              margin: 0; padding: 20px;
              font-family: ${this.isArabic ? '"Segoe UI", Tahoma, Arial, sans-serif' : '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'};
              direction: ${this.isArabic ? 'rtl' : 'ltr'}; background: white; color: #333;
            }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #10b981; padding-bottom: 20px; }
            .main-title { font-size: 32px; font-weight: bold; color: #10b981; margin-bottom: 10px; }
            .print-date { color: #666; font-size: 14px; margin-top: 10px; }
            .stats-section { margin-bottom: 40px; page-break-inside: avoid; }
            .stats-title { font-size: 24px; font-weight: bold; color: #10b981; margin-bottom: 20px; text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 10px; }
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .stat-card { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #10b981; border-radius: 12px; padding: 25px; text-align: center; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .stat-value { font-size: 36px; font-weight: bold; color: #10b981; margin-bottom: 8px; }
            .stat-label { font-size: 16px; font-weight: 600; color: #555; }
            .chart-section { margin-bottom: 50px; page-break-inside: avoid; }
            .chart-title { font-size: 22px; font-weight: bold; margin-bottom: 20px; color: #10b981; text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
            .chart-image { width: 100%; max-width: 900px; height: auto; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: block; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="main-title">${mainTitle}</div>
            <div class="print-date">${this.isArabic ? 'تاريخ الطباعة: ' : 'Print Date: '}${today}</div>
          </div>
          
          <div class="stats-section">
            <div class="stats-title">${this.isArabic ? 'إحصائيات الأندية الرئيسية' : 'Key Clubs Statistics'}</div>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">${this.animatedTotalClubs.toLocaleString()}</div>
                <div class="stat-label">${this.isArabic ? 'إجمالي الأندية' : 'Total Clubs'}</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${this.animatedTotalFees.toLocaleString()}</div>
                <div class="stat-label">${this.isArabic ? 'إجمالي الرسوم' : 'Total Fees'}</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${this.animatedTotalMemberships.toLocaleString()}</div>
                <div class="stat-label">${this.isArabic ? 'إجمالي العضويات' : 'Total Memberships'}</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${this.animatedTotalRequests.toLocaleString()}</div>
                <div class="stat-label">${this.isArabic ? 'إجمالي الطلبات' : 'Total Requests'}</div>
              </div>
            </div>
          </div>
          
          <div class="chart-section">
            <div class="chart-title">${this.isArabic ? 'توزيع الرسوم حسب النادي' : 'Fees Distribution by Club'}</div>
            <img src="${feesImage}" alt="Clubs Fees Chart" class="chart-image" />
          </div>
          
          <div class="chart-section">
            <div class="chart-title">${this.isArabic ? 'توزيع العضويات حسب النادي' : 'Memberships by Club'}</div>
            <img src="${membershipsImage}" alt="Clubs Memberships Chart" class="chart-image" />
          </div>
          
          <div class="chart-section">
            <div class="chart-title">${this.isArabic ? 'توزيع الطلبات حسب النادي' : 'Requests Distribution by Club'}</div>
            <img src="${requestsImage}" alt="Clubs Requests Chart" class="chart-image" />
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 1000);
    };
  }
}
