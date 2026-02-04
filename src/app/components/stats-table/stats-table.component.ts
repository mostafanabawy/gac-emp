import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stats-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-3">
      <!-- Totals Table -->
      <div *ngIf="isTotalsTable" class="space-y-2">
        <div *ngFor="let item of filteredData" 
             class="flex justify-between items-center p-3 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl border border-red-100 hover:border-red-200 transition-all duration-300">
          <span class="text-sm font-semibold text-gray-700">{{ item.label }}</span>
          <span class="text-lg font-bold text-red-700">{{ item.value | number }}</span>
        </div>
      </div>

      <!-- Services Table -->
      <div *ngIf="isServiceTable" class="space-y-4">
        <div *ngFor="let service of filteredData" 
             class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 hover:border-blue-200 transition-all duration-300">
          
          <!-- Service Header -->
          <div class="flex justify-between items-start mb-4">
            <div>
              <div class="text-xs font-bold text-blue-600 mb-1">#{{ service.serviceId }}</div>
              <div class="text-lg font-bold text-gray-900 leading-tight mb-2">{{ service.serviceName }}</div>
            </div>
            <div class="text-right">
              <div class="text-2xl font-bold text-blue-700">{{ service.totalFees | number }}</div>
              <div class="text-xs text-blue-600">{{ isArabic ? 'ر.ق' : 'QAR' }}</div>
            </div>
          </div>
          
          <!-- Main Stats -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div class="bg-white/60 p-3 rounded-xl text-center">
              <div class="text-lg font-bold text-gray-800">{{ service.licenses | number }}</div>
              <div class="text-xs text-gray-600">{{ isArabic ? 'التراخيص' : 'Licenses' }}</div>
            </div>
            <div class="bg-white/60 p-3 rounded-xl text-center">
              <div class="text-lg font-bold text-gray-800">{{ service.totalRequests | number }}</div>
              <div class="text-xs text-gray-600">{{ isArabic ? 'الطلبات' : 'Requests' }}</div>
            </div>
            <div class="bg-white/60 p-3 rounded-xl text-center">
              <div class="text-lg font-bold text-emerald-700">{{ service.electronicFees | number }}</div>
              <div class="text-xs text-gray-600">{{ isArabic ? 'إلكتروني' : 'Electronic' }}</div>
            </div>
            <div class="bg-white/60 p-3 rounded-xl text-center">
              <div class="text-lg font-bold text-orange-700">{{ service.manualFees | number }}</div>
              <div class="text-xs text-gray-600">{{ isArabic ? 'يدوي' : 'Manual' }}</div>
            </div>
          </div>

          <!-- Request Types Section -->
          <div class="mb-4" *ngIf="hasRequestTypes(service)">
            <h4 class="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <i class="fas fa-tasks text-blue-600"></i>
              {{ isArabic ? 'أنواع الإجراءات' : 'Request Types' }}
            </h4>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
              <div *ngIf="service.requestTypes.newRequests > 0" class="flex justify-between bg-green-50 p-2 rounded-lg border border-green-200">
                <span class="text-gray-700">{{ isArabic ? 'جديد' : 'New' }}:</span>
                <span class="font-semibold text-green-700">{{ service.requestTypes.newRequests | number }}</span>
              </div>
              <div *ngIf="service.requestTypes.renewRequests > 0" class="flex justify-between bg-blue-50 p-2 rounded-lg border border-blue-200">
                <span class="text-gray-700">{{ isArabic ? 'تجديد' : 'Renew' }}:</span>
                <span class="font-semibold text-blue-700">{{ service.requestTypes.renewRequests | number }}</span>
              </div>
              <div *ngIf="service.requestTypes.editRequests > 0" class="flex justify-between bg-yellow-50 p-2 rounded-lg border border-yellow-200">
                <span class="text-gray-700">{{ isArabic ? 'تعديل' : 'Edit' }}:</span>
                <span class="font-semibold text-yellow-700">{{ service.requestTypes.editRequests | number }}</span>
              </div>
              <div *ngIf="service.requestTypes.cancelRequests > 0" class="flex justify-between bg-red-50 p-2 rounded-lg border border-red-200">
                <span class="text-gray-700">{{ isArabic ? 'إلغاء' : 'Cancel' }}:</span>
                <span class="font-semibold text-red-700">{{ service.requestTypes.cancelRequests | number }}</span>
              </div>
              <div *ngIf="service.requestTypes.approvedRequests > 0" class="flex justify-between bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                <span class="text-gray-700">{{ isArabic ? 'موافق' : 'Approved' }}:</span>
                <span class="font-semibold text-emerald-700">{{ service.requestTypes.approvedRequests | number }}</span>
              </div>
              <div *ngIf="service.requestTypes.rejectedRequests > 0" class="flex justify-between bg-red-50 p-2 rounded-lg border border-red-200">
                <span class="text-gray-700">{{ isArabic ? 'مرفوض' : 'Rejected' }}:</span>
                <span class="font-semibold text-red-700">{{ service.requestTypes.rejectedRequests | number }}</span>
              </div>
              <div *ngIf="service.requestTypes.reissuingRequests > 0" class="flex justify-between bg-purple-50 p-2 rounded-lg border border-purple-200">
                <span class="text-gray-700">{{ isArabic ? 'إعادة إصدار' : 'Reissuing' }}:</span>
                <span class="font-semibold text-purple-700">{{ service.requestTypes.reissuingRequests | number }}</span>
              </div>
              <div *ngIf="service.requestTypes.validityLicRequests > 0" class="flex justify-between bg-indigo-50 p-2 rounded-lg border border-indigo-200">
                <span class="text-gray-700">{{ isArabic ? 'سريان ترخيص' : 'License Validity' }}:</span>
                <span class="font-semibold text-indigo-700">{{ service.requestTypes.validityLicRequests | number }}</span>
              </div>
              <div *ngIf="service.requestTypes.updateCommRequests > 0" class="flex justify-between bg-teal-50 p-2 rounded-lg border border-teal-200">
                <span class="text-gray-700">{{ isArabic ? 'تعديل اسم تجاري' : 'Update Commercial' }}:</span>
                <span class="font-semibold text-teal-700">{{ service.requestTypes.updateCommRequests | number }}</span>
              </div>
              <div *ngIf="service.requestTypes.clearanceRequests > 0" class="flex justify-between bg-orange-50 p-2 rounded-lg border border-orange-200">
                <span class="text-gray-700">{{ isArabic ? 'إخلاء طرف' : 'Clearance' }}:</span>
                <span class="font-semibold text-orange-700">{{ service.requestTypes.clearanceRequests | number }}</span>
              </div>
              <div *ngIf="service.requestTypes.withdrawalRequests > 0" class="flex justify-between bg-gray-50 p-2 rounded-lg border border-gray-200">
                <span class="text-gray-700">{{ isArabic ? 'سحب' : 'Withdrawal' }}:</span>
                <span class="font-semibold text-gray-700">{{ service.requestTypes.withdrawalRequests | number }}</span>
              </div>
              <div *ngIf="service.requestTypes.resignationRequests > 0" class="flex justify-between bg-pink-50 p-2 rounded-lg border border-pink-200">
                <span class="text-gray-700">{{ isArabic ? 'استقالة' : 'Resignation' }}:</span>
                <span class="font-semibold text-pink-700">{{ service.requestTypes.resignationRequests | number }}</span>
              </div>
            </div>
          </div>

          <!-- License Status Section -->
          <div class="mb-4" *ngIf="hasLicenseStatus(service)">
            <h4 class="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <i class="fas fa-certificate text-green-600"></i>
              {{ isArabic ? 'حالات التراخيص' : 'License Status' }}
            </h4>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
              <div *ngIf="service.licenseStatus.validLicenses > 0" class="flex justify-between bg-green-50 p-2 rounded-lg border border-green-200">
                <span class="text-gray-700">{{ isArabic ? 'سارية' : 'Valid' }}:</span>
                <span class="font-semibold text-green-700">{{ service.licenseStatus.validLicenses | number }}</span>
              </div>
              <div *ngIf="service.licenseStatus.expiredLicenses > 0" class="flex justify-between bg-red-50 p-2 rounded-lg border border-red-200">
                <span class="text-gray-700">{{ isArabic ? 'منتهية' : 'Expired' }}:</span>
                <span class="font-semibold text-red-700">{{ service.licenseStatus.expiredLicenses | number }}</span>
              </div>
              <div *ngIf="service.licenseStatus.withdrawnLicenses > 0" class="flex justify-between bg-orange-50 p-2 rounded-lg border border-orange-200">
                <span class="text-gray-700">{{ isArabic ? 'مسحوبة' : 'Withdrawn' }}:</span>
                <span class="font-semibold text-orange-700">{{ service.licenseStatus.withdrawnLicenses | number }}</span>
              </div>
              <div *ngIf="service.licenseStatus.canceledLicenses > 0" class="flex justify-between bg-gray-50 p-2 rounded-lg border border-gray-200">
                <span class="text-gray-700">{{ isArabic ? 'ملغية' : 'Canceled' }}:</span>
                <span class="font-semibold text-gray-700">{{ service.licenseStatus.canceledLicenses | number }}</span>
              </div>
              <div *ngIf="service.licenseStatus.clearanceLicenses > 0" class="flex justify-between bg-blue-50 p-2 rounded-lg border border-blue-200">
                <span class="text-gray-700">{{ isArabic ? 'مخلاة' : 'Cleared' }}:</span>
                <span class="font-semibold text-blue-700">{{ service.licenseStatus.clearanceLicenses | number }}</span>
              </div>
            </div>
          </div>

          <!-- Membership Status Section -->
          <div *ngIf="hasMembershipStatus(service)">
            <h4 class="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <i class="fas fa-users text-purple-600"></i>
              {{ isArabic ? 'حالات العضويات' : 'Membership Status' }}
            </h4>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
              <div *ngIf="service.membershipStatus.validMembership > 0" class="flex justify-between bg-green-50 p-2 rounded-lg border border-green-200">
                <span class="text-gray-700">{{ isArabic ? 'سارية' : 'Valid' }}:</span>
                <span class="font-semibold text-green-700">{{ service.membershipStatus.validMembership | number }}</span>
              </div>
              <div *ngIf="service.membershipStatus.finishedMembership > 0" class="flex justify-between bg-red-50 p-2 rounded-lg border border-red-200">
                <span class="text-gray-700">{{ isArabic ? 'منتهية' : 'Finished' }}:</span>
                <span class="font-semibold text-red-700">{{ service.membershipStatus.finishedMembership | number }}</span>
              </div>
              <div *ngIf="service.membershipStatus.suspendedMembership > 0" class="flex justify-between bg-yellow-50 p-2 rounded-lg border border-yellow-200">
                <span class="text-gray-700">{{ isArabic ? 'معلقة' : 'Suspended' }}:</span>
                <span class="font-semibold text-yellow-700">{{ service.membershipStatus.suspendedMembership | number }}</span>
              </div>
              <div *ngIf="service.membershipStatus.voidedMembership > 0" class="flex justify-between bg-gray-50 p-2 rounded-lg border border-gray-200">
                <span class="text-gray-700">{{ isArabic ? 'ساقطة' : 'Voided' }}:</span>
                <span class="font-semibold text-gray-700">{{ service.membershipStatus.voidedMembership | number }}</span>
              </div>
              <div *ngIf="service.membershipStatus.resignedMembership > 0" class="flex justify-between bg-pink-50 p-2 rounded-lg border border-pink-200">
                <span class="text-gray-700">{{ isArabic ? 'مستقيل' : 'Resigned' }}:</span>
                <span class="font-semibold text-pink-700">{{ service.membershipStatus.resignedMembership | number }}</span>
              </div>
              <div *ngIf="service.membershipStatus.withdrawedMembership > 0" class="flex justify-between bg-orange-50 p-2 rounded-lg border border-orange-200">
                <span class="text-gray-700">{{ isArabic ? 'مسحوبة' : 'Withdrawn' }}:</span>
                <span class="font-semibold text-orange-700">{{ service.membershipStatus.withdrawedMembership | number }}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Clubs Table -->
      <div *ngIf="isClubTable" class="space-y-2">
        <div *ngFor="let club of filteredData" 
             class="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100 hover:border-green-200 transition-all duration-300">
          <div>
            <div class="text-sm font-semibold text-gray-900">{{ club.clubName }}</div>
          </div>
          <div class="text-right">
            <div class="text-xs text-green-600 mb-1">{{ isArabic ? 'طلبات' : 'Requests' }}: {{ club.requests | number }}</div>
            <div class="text-xs text-green-600">{{ isArabic ? 'تراخيص' : 'Licenses' }}: {{ club.licenses | number }}</div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatsTableComponent {
  @Input() data: any[] = [];
  @Input() isArabic: boolean = false;
  @Input() hideZeroValues: boolean = false;
  @Input() isTotalsTable: boolean = false;
  @Input() isServiceTable: boolean = false;
  @Input() isClubTable: boolean = false;

  get filteredData() {
    if (!this.hideZeroValues) {
      return this.data;
    }

    if (this.isTotalsTable) {
      return this.data.filter(item => item.value > 0);
    }

    if (this.isServiceTable) {
      return this.data.filter(service => 
        service.totalFees > 0 || 
        service.licenses > 0 || 
        service.totalRequests > 0
      );
    }

    if (this.isClubTable) {
      return this.data.filter(club => 
        club.requests > 0 || 
        club.licenses > 0
      );
    }

    return this.data;
  }

  // Helper methods for checking if sections have data
  hasRequestTypes(service: any): boolean {
    if (!service.requestTypes) return false;
    return Object.values(service.requestTypes).some((value: any) => value > 0);
  }

  hasLicenseStatus(service: any): boolean {
    if (!service.licenseStatus) return false;
    return Object.values(service.licenseStatus).some((value: any) => value > 0);
  }

  hasMembershipStatus(service: any): boolean {
    if (!service.membershipStatus) return false;
    return Object.values(service.membershipStatus).some((value: any) => value > 0);
  }
}