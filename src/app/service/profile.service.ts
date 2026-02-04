import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  baseUrl = environment.apiUrl;
  notifications = signal<any>([]);
  constructor(
    private http: HttpClient
  ) { }

  getNotifications() {
    return this.http.get(`${this.baseUrl}/api/Notifications`);
  }
}
