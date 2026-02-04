import { ChangeDetectorRef, Component, ElementRef, NgZone, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Store } from '@ngrx/store';
import { FlatpickrDefaultsInterface } from 'angularx-flatpickr';
import { toggleAnimation } from 'src/app/shared/animations';

@Component({
  selector: 'app-employee-reports',
  templateUrl: './employee-reports.component.html',
  animations: [toggleAnimation]
})
export class EmployeeReportsComponent {
  columnChart: any;
  columnChart1: any;
  chartOptions: any;
  store: any;
  basic: FlatpickrDefaultsInterface;
  selectGroup!: FormGroup;
  donutChart: any;
  isLoading = true;
  constructor(
    private storeData: Store<any>,
    private fb: FormBuilder,
    private cdRef: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    this.initStore();

    this.basic = {
      dateFormat: 'Y-m-d',
      // position: this.store.rtlClass === 'rtl' ? 'auto right' : 'auto left',
      monthSelectorType: 'dropdown',
    };
    this.initForm();
  }
  initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        const hasChangeTheme = this.store?.theme !== d?.theme;
        const hasChangeLayout = this.store?.layout !== d?.layout;
        const hasChangeMenu = this.store?.menu !== d?.menu;
        const hasChangeSidebar = this.store?.sidebar !== d?.sidebar;

        this.store = d;

        if (hasChangeTheme || hasChangeLayout || hasChangeMenu || hasChangeSidebar) {
          if (this.isLoading || hasChangeTheme) {
            this.initCharts(); //init charts
          } else {
            setTimeout(() => {
              this.ngZone.run(() => { // <--- Wrap the call in ngZone.run()
                this.initCharts();
              });
            }, 300);
          }
        }
      });

  }
  initForm() {
    this.selectGroup = this.fb.group({
      applicationType: ['option1'],
      date1: ['2022-07-05'],
      date2: ['2022-07-05'],
    });
  }

  initCharts() {
    const isRtl = this.store.rtlClass === 'rtl' ? true : false;
    this.columnChart = {
      series: [
        {
          name: 'الرسوم',
          data: [4500, 3900, 4100, 4000, 3900, 3500, 5800, 8000, 5800, 4300, 3100],
        },
      ],
      chart: {
        height: 500,
        type: 'bar',
        zoom: {
          enabled: false,
        },
        toolbar: {
          show: false,
        },
      },
      colors: ['#9F946D'],
      dataLabels: {
        enabled: true,
        formatter: function (val: number) {
          return val + ' ريال';
        },
        style: {
          fontSize: '14px',
          colors: ['#000'],

        },
        offsetY: -30,
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent'],
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          endingShape: 'rounded',
          dataLabels: {
            position: 'top', // 👈 shows label above bar
          }
        },
      },
      grid: {
        borderColor: '#e0e6ed',
      },
      xaxis: {
        categories: [
          'طلب تصريح فعالية رياضية',
          'طلب ترخيص نشاط إنشاء وتسجيل الهيئات الرياضية',
          'طلب ترخيص نشاط الأكاديميات الرياضية التجارية',
          'طلب ترخيص نشاط مراكز تأهيل الكوادر الرياضية',
          'طلب ترخيص نشاط مراكز تأهيل الكوادر الرياضية',
          'طلب ترخيص نشاط تجهيزات تنظيم الفعاليات الرياضية',
          'طلب ترخيص نشاط إدارة المنشآت والمرافق الرياضية',
          'طلب ترخيص نشاط المراكز الرياضية التجارية',
          'طلب ترخيص نشاط المراكز الرياضية التجارية',
          'طلب ترخيص نشاط مراكز التنمية البدنية والحركة الذهنية',
          'طلب ترخيص نشاط الاستشارات الرياضية',
        ],
        labels: {
          style: {
            fontSize: '12px',
            whiteSpace: 'normal'
          },
          maxHeight: 200,
        },
        axisBorder: {
          color: '#e0e6ed',
        },
      },
      yaxis: {
        opposite: isRtl ? true : false,
        max: 9000,
        labels: {
          offsetX: isRtl ? -10 : 0,
        },
      },
      tooltip: {
        theme: 'light',
        y: {
          formatter: function (val: any) {
            return val + ' ريال';
          },
        },
      },
    };

    this.columnChart1 = {
      series: [
        {
          name: 'Net Profit',
          data: [44, 55, 57, 56, 61, 58, 63, 60, 66],
        },
        {
          name: 'Revenue',
          data: [76, 85, 101, 98, 87, 105, 91, 114, 94],
        },
      ],
      chart: {
        height: 300,
        type: 'bar',
        zoom: {
          enabled: false,
        },
        toolbar: {
          show: false,
        },
      },
      colors: ['#805dca', '#e7515a'],
      dataLabels: {
        enabled: false,
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent'],
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          endingShape: 'rounded',
        },
      },
      grid: {
        borderColor: '#e0e6ed',
      },
      xaxis: {
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
        axisBorder: {
          color: '#e0e6ed',
        },
      },
      yaxis: {
        opposite: isRtl ? true : false,
        labels: {
          offsetX: isRtl ? -10 : 0,
        },
      },
      tooltip: {
        theme: 'light',
        y: {
          formatter: function (val: any) {
            return val;
          },
        },
      },
    };

    this.donutChart = {
      series: [44, 55, 13],
      chart: {
        height: 300,
        type: 'donut',
        zoom: {
          enabled: false,
        },
        toolbar: {
          show: false,
        },
      },
      stroke: {
        show: false,
      },
      labels: ['Team A', 'Team B', 'Team C'],
      colors: ['#4361ee', '#805dca', '#e2a03f'],
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              width: 200,
            },
          },
        },
      ],
      legend: {
        position: 'bottom',
      },
    };

    this.chartOptions = {
      series: [
        {
          data: [10, 12, 8, 14, 18, 11, 15]
        }
      ],
      chart: {
        type: 'line',
        height: 60,
        sparkline: {
          enabled: true
        }
      },
      stroke: {
        width: 2,
        curve: 'smooth',
        colors: ['#e7515a'] // or green: '#00ab55'
      },
      tooltip: {
        enabled: false
      }
    };


  }
  submitForm() {
    console.log(this.selectGroup.value);
  }
}
