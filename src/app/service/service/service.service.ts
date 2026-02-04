import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment.prod';
@Injectable({
  providedIn: 'root'
})
export class ServiceService {
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
      MessageID: id
    };

    return this.http.post(`${this.apiUrl}/EServicesActionLogMessages/selectone`, body);
  }
  getByServiceID(id: number | null): Observable<any> {
    const body = {
      ServiceID: id
    };

    return this.http.post(`${this.apiUrl}/EServicesServices/selectone`, body);
  }
   getuser(ID: null): Observable<any> {
    return this.http.post(`${this.apiUrl}/EServicesLogin/getuser`, { ID });
  }
  getByRowId(id: number | null): Observable<any> {
    const body = {
      RowId: id
    };

    return this.http.post(`${this.apiUrl}/EServicesServiceStatuses/selectone`, body);
  }
 
  getByRolesRowId(id: number | null): Observable<any> {
    const body = {
      RowId: id
    };

    return this.http.post(`${this.apiUrl}/EServicesServiceRoles/selectone`, body);
  }
  getByProcessesRowId(id: number | null): Observable<any> {
    const body = {
      RowId: id
    };

    return this.http.post(`${this.apiUrl}/EServicesServiceProcesses/selectone`, body);
  }
  

  getPageWithSearch(
    setting: { pageNo: number; pageSize: number; sortField: string; sortDirection: number },
    filters: any
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/EServicesActionLogMessages/getpagewithsearch/${setting.pageNo}/${setting.pageSize}/${setting.sortField}/${setting.sortDirection}`,
      filters
    );
  }

  getPageWithSearchServices(
    setting: { pageNo: number; pageSize: number; sortField: string; sortDirection: number },
    filters: any
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/EServicesServices/getpagewithsearch/${setting.pageNo}/${setting.pageSize}/${setting.sortField}/${setting.sortDirection}`,
      filters
    );
  }
  getPageWithSearchStatuses(
    setting: { pageNo: number; pageSize: number; sortField: string; sortDirection: number },
    filters: any
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/EServicesServiceStatuses/getpagewithsearch/${setting.pageNo}/${setting.pageSize}/${setting.sortField}/${setting.sortDirection}`,
      filters
    );
  }

  getPageWithSearchRoles(
    setting: { pageNo: number; pageSize: number; sortField: string; sortDirection: number },
    filters: any
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/EServicesServiceRoles/getpagewithsearch/${setting.pageNo}/${setting.pageSize}/${setting.sortField}/${setting.sortDirection}`,
      filters
    );
  }
  getPageWithSearchProcesses(
    setting: { pageNo: number; pageSize: number; sortField: string; sortDirection: number },
    filters: any
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/EServicesServiceProcesses/getpagewithsearch/${setting.pageNo}/${setting.pageSize}/${setting.sortField}/${setting.sortDirection}`,
      filters
    );
  }

  getPageWithSearchFiled(
    setting: { pageNo: number; pageSize: number; sortField: string; sortDirection: number },
    filters: any
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/EServicesServiceFields/getpagewithsearch/${setting.pageNo}/${setting.pageSize}/${setting.sortField}/${setting.sortDirection}`,
      filters
    );
  }

  add(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/EServicesActionLogMessages/insert`, userData);
  }

  update(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/EServicesActionLogMessages/update`, userData);
  }
  addEServicesServices(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/EServicesServices/insert`, userData);
  }

  updateEServicesServices(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/EServicesServices/update`, userData);
  }
  addEServicesServiceStatuses(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/EServicesServiceStatuses/insert`, userData);
  }

  updateEServicesServiceStatuses(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/EServicesServiceStatuses/update`, userData);
  }
  deleteEServicesServiceStatuses(RowId: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/EServicesServiceStatuses/delete`, {
      RowId: RowId
    });
  }
  addEServicesServiceRoles(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/EServicesServiceRoles/insert`, userData);
  }

  updateEServicesServiceRoles(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/EServicesServiceRoles/update`, userData);
  }
  deleteEServicesServiceRoles(RowId: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/EServicesServiceRoles/delete`, {
      RowId: RowId
    });
  }
   addEServicesServiceProcesses(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/EServicesServiceProcesses/insert`, userData);
  }

  updateEServicesServiceProcesses(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/EServicesServiceProcesses/update`, userData);
  }
  deleteEServicesServiceProcesses(RowId: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/EServicesServiceProcesses/delete`, {
      RowId: RowId
    });
  }
  getEServicesLookupType(): Observable<any> {
    return this.http.get(`${this.apiUrl}/EServicesLookupType/selectall`);
  }

   addEServicesServiceFields(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/EServicesServiceFields/insert`, userData);
  }

  updateEServicesServiceFields(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/EServicesServiceFields/update`, userData);
  }

  getByServiceFieldID(ServiceFieldID: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/EServicesServiceFields/selectone`, {
      ServiceFieldID: ServiceFieldID
    });
  }

}
