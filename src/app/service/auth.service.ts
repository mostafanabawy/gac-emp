import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  baseUrl = environment.apiUrl;
  constructor(
    private http: HttpClient
  ) { }

  login(payload: { "Username": string, "Password": string }): Observable<any> {
    console.log(payload);
    return this.http.post(`${this.baseUrl}/api/EServicesLogin/login`, payload).pipe(
      map(res => res)
    );
  }

  loginApplicant(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/EServicesLogin/ApplicantSimulator`,
      payload
    ).pipe(
      map(res => res)
    )
  }

  getUser(): Observable<any> {
    const headers = new HttpHeaders()
      .set('x-sr-token', sessionStorage.getItem('token') || '');

    return this.http.post(`${this.baseUrl}/api/EServicesLogin/getuser`, { "ID": 5042 }, { headers })
  }

  ssoInfo() {
    return this.http.get(`${this.baseUrl}/api/ssologin/ssoinfo`);
  }/* https://msy.vcld.ws/api/ssologin?ssotoken=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6*/

  ssoLogin(token: any) {
    /* const encoded = encodeURIComponent(token); */

    return this.http.get(`${this.baseUrl}/api/ssologin?ssotoken=${token}`);
  }

}
