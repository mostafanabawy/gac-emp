import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class LicensesService {

    baseUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    getById(id: number | null): Observable<any> {
        const body = {
            ID: null
        };

        return this.http.post(`${this.baseUrl}/api/EServicesAssignAttachment_To_Request/selectone`, body);
    }

    search(criteria: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/api/Report/getRpt`, criteria);
    }
    searchGetServiceAttachmentsRPT(criteria: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/api/GetServiceAttachmentsRPT`, criteria);
    }
    searchGetDutyFreeRPT(criteria: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/api/GetDutyFreeRPT`, criteria);
    }
    searchGetUnpaidFeesRPT(criteria: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/api/GetUnpaidFeesRPT`, criteria);
    }
    searchGetLateRPT(criteria: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/api/GetLateRPT`, criteria);
    }
    searchGetTotalRPT(criteria: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/api/GetTotalRPT`, criteria);
    }
}
