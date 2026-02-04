import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ServiceFeesService {

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
}
