import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { AppState } from 'src/types/auth.types';
import { AuthState } from '../store/auth/auth.reducer';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
@Injectable({
  providedIn: 'root'
})
export class AllApplicationsService {
  baseUrl = environment.apiUrl;
  store!: AuthState;
  constructor(
    private http: HttpClient,
    private storeData: Store<AppState>,
    private router: Router
  ) {
    this.initStore();
  }
  tabsData = signal<any>('');
  cardsData = signal<any>([]);
  appActivity = signal<any>({});
  isLogData = signal<boolean>(false);
  isRelatedRequestsData = signal<boolean>(false);
  disableTabs = signal<boolean>(false);
  branchTab = '';
  mainTab = '';
  initStore() {
    this.storeData
      .select('auth')
      .subscribe((d) => {
        this.store = d;
      });
  }
  getTabs() {
    return this.http.get(`${this.baseUrl}/api/EServicesInboxTabsFilter/selectall`)
  }

  getCardsData(tabName: any, ServicesType: any, pagingInfo?: { PageSize: number, PageNum: number } | any) {
    let payload = {
      "pagingRequest": {
        "PageSize": pagingInfo?.PageSize || "200",
        "PageNum": pagingInfo?.PageNum || "1",
        "SortField": pagingInfo?.SortField || "CreationDate",
        "SortOrder": (pagingInfo?.SortDirection && pagingInfo?.SortDirection === 1 ? "ASC" : "DESC" )
      },
      "filters": [],
      "Table8Filters": [],
      "InboxType": tabName,
      "ServicesType": ServicesType
    }
    return this.http.post<any>(`${this.baseUrl}/api/userinboxSearch`, payload)
  }
  tableLoader = signal<boolean>(false);
  getCardsDataWithSearch(payload: any) {

    return this.http.post<any>(`${this.baseUrl}/api/userinboxSearch`, payload)
  }

  lookupValues = signal<any>([]);
  getAllLookup() {
    return this.http.get<any>(`${this.baseUrl}/api/EServicesLookup/selectall`)
  }

  getServiceLookup() {

    return this.http.get<any>(`${this.baseUrl}/api/EServicesServices/selectall`)
  }

  EServicesLoginSelectall() {
    return this.http.get<any>(`${this.baseUrl}/api/EServicesLogin/selectall`)
  }


  EServicesLog(payload: any) {
    return this.http.post<any>(`${this.baseUrl}/api/EServicesLog/getpagewithsearch/1/10000/Date/2`,
      payload
    )
  }


  applicationNumber = signal<string>('');
  FkStatusID = signal<string>('');
  ProcessID = signal<string>('');
  modalLoader = signal<boolean>(false);

  initActivityLog(payload: any, applicationNumber: string, FkStatusID: string, ProcessID: string) {
    this.modalLoader.set(true);
    this.EServicesLog(payload).subscribe((res: any) => {
      this.applicationNumber.set(applicationNumber);
      this.FkStatusID.set(FkStatusID);
      this.ProcessID.set(ProcessID);
      this.appActivity.set(res.result.items);
      this.isLogData.set(true);
      this.modalLoader.set(false);
    })
  }
  closeActivityLog() {
    this.isLogData.set(false);

  }

  EServiceRelatedRequests(requestID: string) {
    return this.http.post<any>(`${this.baseUrl}/api/getRelatedRequests`, {
      RequestID: requestID
    })
  }
  relatedRequestsData = signal<any>([]);
  initRelatedRequests(requestID: string) {
    this.EServiceRelatedRequests(requestID).subscribe({
      next: (res: any) => {
        console.log(res);
        this.relatedRequestsData.set(res || null);
        this.isRelatedRequestsData.set(true);
      },
      error: (err) => {
        console.log(err);
        this.relatedRequestsData.set(null);
        this.isRelatedRequestsData.set(true);
      }
    })
  }
  closeRelatedModal() {
    this.isRelatedRequestsData.set(false);
  }
  cardActionsData = signal<any>([]);
  cardLookupValues = signal<any>([]);
  getLookup(payload: any) {
    return this.http.post<any>(`${this.baseUrl}/api/EServicesLookup/getpagewithsearch/1/1000/TypeID/1`, payload)
  }

  EvaluateActionConditionBulk(payload: any) {
    return this.http.post<any>(`${this.baseUrl}/EvaluateActionConditionBulk`, payload)
  }
  saveTabs() {
    if (this.router.url.toLowerCase().includes('inbox')) {
      const newState = { ...history.state };
      newState.branchTab = this.branchTab;
      newState.mainTab = this.mainTab;
      history.replaceState(newState, document.title, window.location.href);
    }
  }

}
