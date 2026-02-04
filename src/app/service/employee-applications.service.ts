import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class EmployeeApplicationsService {
  tab = signal<any>('')

  setTab(tab: string) {
    this.tab.set(tab)
    console.log(this.tab());
  }
  getTab() {
    return this.tab()
  }
  constructor() { }
}
