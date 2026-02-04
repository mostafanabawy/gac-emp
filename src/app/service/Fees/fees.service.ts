import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment.prod';
@Injectable({
    providedIn: 'root'
})
export class FeesService {
    apiUrl = environment.apiUrl + environment.apiPrefix;
    constructor(private http: HttpClient) { }

    DetermineFeesGetData(id: number | null): Observable<any> {
        const body = {
            ID: id
        };
        return this.http.post(`${this.apiUrl}/EServicesDetermineFees/selectone`, body);
    }
    getDetermineFeesPageWithSearch(
        setting: { pageNo: number; pageSize: number; sortField: string; sortDirection: number },
        filters: any
    ): Observable<any> {
        return this.http.post(
            `${this.apiUrl}/EServicesDetermineFees/getpagewithsearch/${setting.pageNo}/${setting.pageSize}/${setting.sortField}/${setting.sortDirection}`,
            filters
        );
    }

    addFees(userData: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/EServicesDetermineFees/insert`, userData);
    }
    updateFees(userData: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/EServicesDetermineFees/update`, userData);
    }
 
    FeesById(id: number | null): Observable<any> {
        const body = {
            ID: id
        };

        return this.http.post(`${this.apiUrl}/EServicesDetermineFees/selectone`, body);
    }

}
