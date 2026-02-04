import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { environment } from 'src/environments/environment';
import { GetMenuApiResponse } from 'src/types/menu.types';

@Injectable({
  providedIn: 'root'
})
export class MenuLinksService {
  baseUrl = environment.apiUrl;
  constructor(
    private http: HttpClient
  ) { }
  menuResponse = signal<any>([]);
  GetMenu() {
    return this.http.post<GetMenuApiResponse>(`${this.baseUrl}/GetMenu`, {})
  }
}
