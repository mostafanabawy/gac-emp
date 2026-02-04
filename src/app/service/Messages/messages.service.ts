import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment.prod';
@Injectable({
  providedIn: 'root'
})
export class MessagesService {
  apiUrl = environment.apiUrl + environment.apiPrefix;
  constructor(private http: HttpClient) { }

  selectAll() {
    return this.http.get(`${this.apiUrl}/EServicesLogin/selectall`);
  }
  getById(id: number | null): Observable<any> {
    const body = {
      ID: null
    };

    return this.http.post(`${this.apiUrl}/EServicesAssignAttachment_To_Request/selectone`, body);
  }
  getByMessageID(id: number | null): Observable<any> {
    const body = {
      MessageId: id
    };

    return this.http.post(`${this.apiUrl}/EServicesServiceNotificationMessage/selectone`, body);
  }
  getPageWithSearch(
    setting: { pageNo: number; pageSize: number; sortField: string; sortDirection: number },
    filters: any
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/EServicesServiceNotificationMessage/getpagewithsearch/${setting.pageNo}/${setting.pageSize}/${setting.sortField}/${setting.sortDirection}`,
      filters
    );
  }





  add(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/EServicesServiceNotificationMessage/insert`, userData);
  }

  update(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/EServicesServiceNotificationMessage/update`, userData);
  }





}
