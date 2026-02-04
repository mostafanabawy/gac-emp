import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { NewApplicationService } from './new-application.service';
@Injectable({
  providedIn: 'root'
})
export class FileActionsService {
  baseUrl = environment.apiUrl;
  fileLoader = signal<any>({});
  constructor(private http: HttpClient,
    private newApplicationService: NewApplicationService
  ) { }
  uploadFile(files: File, modelName: string, AIHelpAr?: string): Observable<any> {
    if (files) {
      const formData: FormData = new FormData();
      console.log(files);
      formData.append('file', files, files?.name);
      return this.http.post(`${this.baseUrl}/api/Files/UploadFile/${modelName}/${encodeURIComponent(AIHelpAr || 'وثيقة غير محددة')}`, formData)

    } else {
      return of(null);
    }

  }
  readFile(fileid: any): Observable<any> {
    /* const params = new HttpParams()
      .set('fileid', fileid); */
    return this.http.get(`${this.baseUrl}/api/Files/read/${fileid}`)
  }

  fileAnalysisData = signal<any>({});
  readFileAnalysis(fileID: any): Observable<any> {

    return this.http.get(`${this.baseUrl}/api/Files/readfileanalytics/${fileID}`)
  }

  readRequestAnalysis(payload: any) {
    return this.http.post(`${this.baseUrl}/api/analyzerequest`, payload)
  }
}
