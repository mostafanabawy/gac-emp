import { KeyValue } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-applications-stats-employee-manager',
  templateUrl: './applications-stats-employee-manager.component.html'
})
export class ApplicationsStatsEmployeeManagerComponent {
  dataToDisplay = input.required<{}>()
  getGradientClass(key: string): string {
    switch (key) {
      case 'عدد الرخص':
        return 'bg-gradient-to-r from-[#19A24A] to-[#30C465]';
      case 'الطلبات المقدمة':
        return 'bg-gradient-to-r from-[#54B6D3] to-[#9DE3F5]';
      case 'الطلبات المرفوضة':
        return 'bg-gradient-to-r from-[#FE6058] to-[#FA928D]';
      case 'طلبات منتظرة الرد':
        return 'bg-gradient-to-r from-[#FEBC2E] to-[#FFD988]';
      default:
        return 'bg-gray-200'; // fallback
    }
  }
  preserveOrder(a: KeyValue<string, any>, b: KeyValue<string, any>): number {
    return 0; // no sorting → preserve original insertion order
  }
}
