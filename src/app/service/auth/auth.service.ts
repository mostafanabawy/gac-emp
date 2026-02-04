import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment.prod';
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  apiUrl = environment.apiUrl + environment.apiPrefix;
  apiUrl2 = environment.apiUrl;
  constructor(private http: HttpClient) { }

  login(credentials: { Username: string, Password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/EServicesLogin/login`, credentials);
  }
  getuser(ID: null): Observable<any> {
    return this.http.post(`${this.apiUrl}/EServicesLogin/getuser`, { ID });
  }
  getpagewithsearch(
    setting: { pageNo: number; pageSize: number; sortField: string; sortDirection: number },
    filters: any
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/EServicesLogin/getpagewithsearch/${setting.pageNo}/${setting.pageSize}/${setting.sortField}/${setting.sortDirection}`,
      filters
    );
  }

  selectAll() {
    return this.http.get(`${this.apiUrl}/EServicesLogin/selectall`);
  }


  logout() {
    sessionStorage.removeItem('token');
  }

  isLoggedIn(): boolean {
    return !!sessionStorage.getItem('token');
  }
  EServicesLocalization(): Observable<any> {
    return this.http.get(`${this.apiUrl}/EServicesLocalization/selectall`);
  }
  getTranslations(): any {
    const stored = localStorage.getItem('EServicesTranslations');
    if (!stored) return null;
    const items = JSON.parse(stored);
    const lang = localStorage.getItem('lang') || 'en';
    return items.reduce((acc: any, item: any) => {
      acc[item.KeyName] = {
        label: lang === 'ae' ? item.Translatear : item.Translateen,
        validation: lang === 'ae' ? item.ValidationMessagear : item.ValidationMessageen,
        required: item.FieldRequired
      };
      return acc;
    }, {});
  }

  addUser(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/EServicesLogin/insert`, userData);
  }
  updateUser(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/EServicesLogin/update`, userData);
  }
  menuResponse = signal<any>([]);

 GetMenu() {
    return this.http.post(`${this.apiUrl2}GetMenu`, {})
  }

}
