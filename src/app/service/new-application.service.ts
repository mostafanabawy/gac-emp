import { HttpClient, HttpHeaders } from '@angular/common/http';
import { computed, effect, Injectable, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { AppState } from 'src/types/auth.types';
import { AuthState } from '../store/auth/auth.reducer';
import { filter, Observable } from 'rxjs';
import { FieldJson, GetServiceFieldsByActionsApiResponse, ResponseBody, ServiceApiPayload } from 'src/types/newApplication.types';
import { environment } from 'src/environments/environment';
import { NavigationEnd, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class NewApplicationService {

  baseUrl = environment.apiUrl;
  store!: AppState;
  apiBody = signal<any>({})
  uiResponseAllFields = signal<FieldJson[] | null>(null);
  uiResponse = signal<ResponseBody | null>(null);
  currentCardData = signal<any>(null);
  isPrinter = false;
  constructor(
    private http: HttpClient,
    private storeData: Store<AppState>,
    private router: Router
  ) {
    this.initStore();
    // 1. Initial check (optional, but good practice if the service is created after app load)
    this.checkUrlAndUpdateSignal(this.router.url);

    // 2. Subscribe to router events for future navigation
    this.router.events.pipe(
      // Only process successful navigation events
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.checkUrlAndUpdateSignal(event.url);
    });

    effect(() => {
      this.technicalApprovalFilesClicked.set(this.technicalApprovalFiles())
    }, { allowSignalWrites: true })
  }

  private checkUrlAndUpdateSignal(url: string): void {
    const shouldKeepNewRequest = url.includes('NewRequest');
    const shouldKeepRequestID = url.includes('RequestData') || url.includes('NewRequest');

    if (!shouldKeepNewRequest) {
      // Set the signal to null if 'newRequest' is NOT in the URL
      this.newRequestData.set(null);
      this.CPResultResponse.set(null);
      this.defaultProcess.set(null);
      this.CRResultResponse.set(null);
    }
    if (!shouldKeepRequestID) {
      this.rowIndex.set(null);
      this.requestData.set(null);
      this.openDimFields.set(false);
    }

    this.activityFees.set(null);
    this.uiResponseAllFields.set(null);

  }
  initStore() {
    this.storeData
      .select(({ index, auth }) => ({ index, auth }))
      .subscribe((d) => {
        this.store = d;
      });
  }

  serviceApiPayload = signal<any>('');
  requestData = signal<any>('');
  newRequestData = signal<any>('');
  defaultProcess = signal<any>('');
  processList = signal<any>('');
  reTriggerTable = signal<boolean>(false);
  openDimFields = signal<boolean>(false);
  private selectedLookups = new Map<string, any>();
  private selectedLookupsSignal = signal<Map<string, any>>(this.selectedLookups);

  // Expose a computed signal for the technical approval files
  technicalApprovalFiles = computed(() => {
    const allLookups = this.selectedLookupsSignal();
    const files: any[] = [];
    allLookups.forEach(value => {
      // Handle multi-select (array)
      if (Array.isArray(value)) {
        value.forEach(item => {
          if (item?.TechnicalApprovalFile) {
            files.push(item);
          }
        });
      } else { // Handle single-select (object)
        if (value?.TechnicalApprovalFile) {
          files.push(value);
        }
      }
    });
    // Remove duplicates by LookupID
    const uniqueFiles = new Map<number, any>();
    files.forEach(file => uniqueFiles.set(file.LookupID, file));
    return Array.from(uniqueFiles.values());
  });

  technicalApprovalFilesClicked = signal<any>([]);

  // Method to update the map
  updateSelectedLookup(fieldName: string, value: any): void {
    this.selectedLookups.set(fieldName, value);
    this.selectedLookupsSignal.set(new Map(this.selectedLookups)); // Trigger signal update
  }
  getUI(payload: ServiceApiPayload): Observable<ResponseBody> {
    /*   const headers = new HttpHeaders()
        .set('x-sr-token', this.store.token!); */
    let { FKServiceID, FKProcessID, FKCurrentStatusID, FKRoleID, RequestID, SpActionName } = payload || {};
    return this.http.post<ResponseBody>(`${this.baseUrl}/GetUI`, {
      "FKServiceID": FKServiceID,
      "FKProcessID": FKProcessID,
      "FKCurrentStatusID": FKCurrentStatusID,
      "FKRoleID": FKRoleID,
      "RequestID": RequestID || null,
      "SpActionName": SpActionName || null,
      "Lang": this.store.index.locale === 'en'? 'en': 'ar'
    });
  }


  getUIEdit({ FKServiceID, FKProcessID, FKCurrentStatusID, FKRoleID }: any): Observable<ResponseBody> {

    return this.getUI({ FKServiceID, FKProcessID, FKCurrentStatusID, FKRoleID })
  }
  GetServiceFieldsByActions(ActionDetailsIDs: any, requestID?: string): Observable<GetServiceFieldsByActionsApiResponse> {
    /*  const headers = new HttpHeaders()
       .set('x-sr-token', this.store.token!); */

    return this.http.post<GetServiceFieldsByActionsApiResponse>(`${this.baseUrl}/GetServiceFieldsByActions`,
      { ActionDetailsIDs: ActionDetailsIDs.ActionDetailsIDs, RequestID: requestID || null });

  }

  getUserGuide(payload: any){
    return this.http.post(`${this.baseUrl}/api/EServicesServices/selectone`, payload || {
      ServiceID: 7003
    })
  }

  evaluateClickConditionApi(payload: any): Observable<any> {

    return this.http.post<any>(`${this.baseUrl}/EvaluateClickCondition`, payload)
  }
  getRequest(RequestID: string) {
    return this.http.post<any>(`${this.baseUrl}/api/getrequest`,
      {
        RequestID
      }
    )
  }
  hasDataFromAiPriority = signal<number | undefined>(undefined);
  ServiceFieldsByActionsApiResponse = signal<any>({});
  actionDetailsIDs = signal<any>('');
  CRResultResponse = signal<any>('');
  CPResultResponse = signal<any>('');
  rowsFromApi = signal<any>([]);
  rowIndex = signal<number | null>(null)
  tableName = signal<string>('');
  activityFees = signal<any>('');
  popupCPResultResponse = signal<any>('');
  popupCRResultResponse = signal<any>('');
  overWriteGDX = false;
  getCR(url: string) {
    return this.http.get(`${url}`)
  }
  getCP(url: string) {
    return this.http.get(`${url}`)
  }

  /* getFees(payload: any, url: string) {
    return this.http.post(`${url}`, payload)
    } */
  getFees(payload: any, url: string) {
    let newPayload = {
      FunctionName: null,
      FKServiceID: null,
      FKProcessID: null,
      TotalSecondaryActivties: null,
      RenewYears: 0,
      Penality: 0,
      FkStatusId: null,
      FkSexId: null,
      RequestID: null,
      TotalNewSecondaryActivties: 0,
      FkApplicantTypeID: 0,
      FkEventID: 0,
      FkClubID: 0,
      FkMembershipTypeID: 0
    }
    newPayload = {
      ...newPayload,
      ...payload
    }
    return this.http.post(`${this.baseUrl}/api/FeeCalculator/calculate`, newPayload)
  }

  getSourceKey(path: string): string {
    const match = path.match(/([^.]+)\[\]/); // find segment with []
    return match ? match[1] : 'default';
  }

  // Normalize whatever getNestedValue returns into a simple array of values
  private normalizeValues(values: any): any[] {
    if (values == null) return [];
    if (Array.isArray(values)) return values;
    return [values];
  }

  // --- Explicit: append into a *sourceKey* (no path parsing here) ---
  appendColumnValuesToSource(sourceKey: string, columnKey: string, values: any[]) {
    const normalized = this.normalizeValues(values);

    this.rowsFromApi.update(existing => {
      const currentRows = existing[sourceKey] ?? [];
      const rowCount = Math.max(currentRows.length, normalized.length);

      const updatedRows = Array.from({ length: rowCount }, (_, i) => {
        const existingRow = currentRows[i] ?? {};
        if (i < normalized.length) {

          return {
            ...existingRow,
            [columnKey]: normalized[i]
          };
        }
        return {
          ...existingRow
        };
      });

      return {
        ...existing,
        [sourceKey]: updatedRows
      };
    });
  }

  // --- Convenience: derive sourceKey from a full path, then call the explicit function ---
  appendColumnValuesFromPath(path: string, columnKey: string, values: any[]) {
    const sourceKey = this.getSourceKey(path);
    this.appendColumnValuesToSource(sourceKey, columnKey, values);
  }

  auditData = signal<any>([]);
  auditDataMap: any = {};
  isAuditData = signal<boolean>(false);
  auditLog(payload: any) {
    return this.http.post<any>(`${this.baseUrl}/api/EServicesServicesData_AuditLog/getpagewithsearch/1/10000/DateModified/2`, payload)
  }
  initAuditModel(payload: any) {
    this.auditLog(payload).subscribe(res => {
      this.auditData.set(res.result.items);
      this.auditDataMap = this.auditData().reduce((acc: any, historyItem: any) => {
        acc[historyItem.FieldName] = historyItem;
        return acc;
      }, {} as Record<string, any>);
    })
  }

  closeAuditModal() {
    this.isAuditData.set(false);
  }



  getFeesNameForService(serviceID: number) {
    return this.http.post<any>(`${this.baseUrl}/api/EServicesServices/getpagewithsearch/1/10/ServiceID/1`,
      {
        ServiceID: serviceID
      }
    )
  }

  updateFees(payload: any) {
    return this.http.post<any>(`${this.baseUrl}/api/ServicesData/updatefee`, payload)
  }

  queryrequest(requestID: string, applicationNumber: string) {
    return this.http.get<any>(`${this.baseUrl}/api/queryrequest/${requestID}/${applicationNumber}`)
  }

  getActivityServices(requestID: string) {
    return this.http.get<any>(`${this.baseUrl}/api/EServicesServices/GetActivityServices/${requestID}`)
  }

}
