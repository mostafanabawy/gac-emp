import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment.prod';
@Injectable({
  providedIn: 'root'
})
export class AttachmentsService {
  apiUrl = environment.apiUrl + environment.apiPrefix;
  constructor(private http: HttpClient) { }

  getAllDynamicAttachments(): Observable<any> {
    return this.http.get(`${this.apiUrl}/EServicesAttachment_Dynamic/selectall`);
  }
  getAttachmentById(id: number | null): Observable<any> {
    const body = {
      ID: null
    };

    return this.http.post(`${this.apiUrl}/EServicesAssignAttachment_To_Request/selectone`, body);
  }

  getDynamicAttachmentsPageWithSearch(
    setting: { pageNo: number; pageSize: number; sortField: string; sortDirection: number },
    filters: any
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/EServicesAttachment_Dynamic/getpagewithsearch/${setting.pageNo}/${setting.pageSize}/${setting.sortField}/${setting.sortDirection}`,
      filters
    );
  }

  getAssignAttachmentsPageWithSearch(
    setting: { pageNo: number; pageSize: number; sortField: string; sortDirection: number },
    filters: any
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/EServicesAssignAttachment_To_Request/getpagewithsearch/${setting.pageNo}/${setting.pageSize}/${setting.sortField}/${setting.sortDirection}`,
      filters
    );
  }

  assignAttachmentsToRequest(body: {
    FKServiceID: number;
    FKProcessID: number;
    Common_AssignAttachment_To_RequestList: {
      FkAttachmetID: number;
      IsRequired: number;
    }[];
  }): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/EServicesAssignAttachment_To_Request/assign`,
      body
    );
  }

  addAttachment(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/EServicesAttachment_Dynamic/insert`, userData);
  }
  editAttachment(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/EServicesAttachment_Dynamic/update`, userData);
  }
  updateAttachment(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/EServicesAssignAttachment_To_Request/update`, userData);
  }
  AttachmentById(id: number | null): Observable<any> {
    const body = {
      ID: id
    };
    return this.http.post(`${this.apiUrl}/EServicesAttachment_Dynamic/selectone`, body);
  }






}
