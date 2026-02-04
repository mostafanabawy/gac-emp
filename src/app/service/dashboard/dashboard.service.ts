import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /* ===========================
        MAIN DASHBOARD REPORT
  ============================ */
  getDashboardReport(filters?: any): Observable<any> {
    const payload: any = {
      ReportName: "Chart",
      ...filters // دمج الفلاتر إذا وجدت
    };
    return this.http.post(`${this.baseUrl}/api/Report/getRpt`, payload);
  }

  getReportLicenseSecondActivity(filters?: any): Observable<any> {
    const payload: any = {
      ReportName: "LicenseSecondActivity",
      PageSize: 1000000,
      PageNum: 1,
      ...filters // دمج الفلاتر إذا وجدت
    };
    return this.http.post(`${this.baseUrl}/api/Report/getRpt`, payload);
  }
  /* ===========================
              FEES
  ============================ */
  getFeesByDate(from: string, to: string) {
    return this.http.post(`${this.baseUrl}/api/Report/getRpt`, {
      ReportName: "Chart",
      FeesPaymentDateFrom: from,
      FeesPaymentDateTo: to
    });
  }

  /* ===========================
             LICENSES (4 FILTERS)
  ============================ */
  getLicensesByDate(
    creationFrom: string,
    creationTo: string,
    expireFrom: string,
    expireTo: string
  ) {
    return this.http.post(`${this.baseUrl}/api/Report/getRpt`, {
      ReportName: "Chart",
      LicenseCreationDateFrom: creationFrom,
      LicenseCreationDateTo: creationTo,
      LicenseExpirationDateFrom: expireFrom,
      LicenseExpirationDateTo: expireTo
    });
  }

  /* ===========================
             REQUESTS
  ============================ */
  getRequestsByDate(from: string, to: string) {
    return this.http.post(`${this.baseUrl}/api/Report/getRpt`, {
      ReportName: "Chart",
      CreationDateFrom: from,
      CreationDateTo: to
    });
  }

  /* ===========================
             MEMBERSHIPS
  ============================ */
  getMembershipsByDate(
    creationFrom: string | null,
    creationTo: string | null,
    expireFrom: string | null,
    expireTo: string | null
  ) {
    return this.http.post(`${this.baseUrl}/api/Report/getRpt`, {
      ReportName: "Chart",
      LicenseCreationDateFromMem: creationFrom,
      LicenseCreationDateToMem: creationTo,
      LicenseExpirationDateFromMem: expireFrom,
      LicenseExpirationDateToMem: expireTo
    });
  }

}
