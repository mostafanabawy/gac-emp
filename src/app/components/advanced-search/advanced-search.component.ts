import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Store } from '@ngrx/store';
import { AllApplicationsService } from 'src/app/service/all-applications.service';
import { LocalizationService } from 'src/app/service/localization.service';
import { AppState } from 'src/types/auth.types';

@Component({
  selector: 'app-advanced-search',
  templateUrl: './advanced-search.component.html'
})
export class AdvancedSearchComponent {
  searchForm!: FormGroup;
  store!: AppState;
  mainTabsData = input<any>();
  pageSize = input.required<number>();
  translations = signal<any>(null);
  currentTabData = input<any>();
  paginationInfo = output<any>();
  ServicesType = input.required();
  searchPayload = output<any>();
  normalLookupsServiceID = input<any>();
  constructor(
    public allApplicationsService: AllApplicationsService,
    private fb: FormBuilder,
    private storeData: Store<AppState>,
    private localizationService: LocalizationService
  ) {
    this.initStore()
    this.initForm();
    this.translations.set(this.localizationService.getTranslations());
    effect(() => {
      if (this.normalLookupsServiceID()) {
        let res = this.normalLookupsServiceID();
        this.allServiceIDLookup.set(res.items)
      }
    }, { allowSignalWrites: true })
  }
  allServiceIDLookup = signal<any>([]);

  serviceIDLookup = computed(() => {
    let lookup = this.allServiceIDLookup().filter((item: any) => {
      return this.mainTabsData().Services.includes(item.ServiceID);
    })
    return lookup
  });
  FkProcessLookup = computed(() => {
    if (this.allApplicationsService.lookupValues()) {

      let lookup = this.allApplicationsService.lookupValues().filter((item: any) => {
        return item.LookupTypeID === 5 ||item.LookupID === -1
      }).sort((item1: any, item2: any) => item1.LookupID - item2.LookupID)
      return lookup
    } else {
      return null
    }
  });
  FkStatusLookup = computed(() => {
    if (this.allApplicationsService.lookupValues()) {

      let lookup = this.allApplicationsService.lookupValues().filter((item: any) => {
        return item.LookupTypeID === 4 || item.LookupID === -1
      }).sort((item1: any, item2: any) => item1.LookupID - item2.LookupID)
      console.log(lookup);
      return lookup
    } else {
      return null
    }
  });
  ngOnInit() {
    
  }
  initForm() {
    this.searchForm = this.fb.group({
      ApplicationNumber: [''],
      ApplicantQID: [''],
      ApplicantName: [''],
      ServiceID: [''],
      FkProcessID: [''],
      FkStatusID: [''],
    })
  }
  initStore() {
    this.storeData
      .select(({ index, auth }) => ({ index, auth }))
      .subscribe((d) => {
        this.store = d;
      });
  }
  submitForm() {
    this.allApplicationsService.tableLoader.set(true);
    this.allApplicationsService.disableTabs.set(true);
    console.log(this.searchForm.value)
    let filterPayload = Object.keys(this.searchForm.value)
      .flatMap(key => {
        let value = this.searchForm.value[key];
        // If the value is an array and not null/undefined
        if (Array.isArray(value) && value.length > 0) {
          if (value) {
            // Map each item of the array to the desired object structure
            return {
              "Key": key,
              "Operator": "in",
              "Value": value.join(','),
              "SecondValue": null
            };
          }
        } else { // If the value is not an array (and not null/undefined) 
          if (value) {
            // Create a single object for the non-array value
            return {
              "Key": key,
              "Operator": "like",
              "Value": value,
              "SecondValue": null
            };
          }
        }
        // Return an empty array for falsy values to be flattened out
        return [];
      }).filter((item: any) => (item.Value && item.Value?.length > 0));
    let payload: any = {
      "pagingRequest": {
        "PageSize": this.pageSize(),
        "PageNum": "1",
        "SortField": "CreationDate",
        "SortOrder": "DESC"
      },

      "filters": filterPayload,
      "InboxType": this.currentTabData().InboxType,
      "ServicesType": this.ServicesType(),
      "Table8Filters": []
    }
    this.searchPayload.emit(payload);
    /* if (this.searchForm.value.FkStatusID) {
      payload.Statuses = this.searchForm.value.FkStatusID.join(',')
    } */
    this.allApplicationsService.getCardsDataWithSearch(payload).subscribe((res) => {
      console.log(res);
      this.allApplicationsService.cardsData.set(res.Data || [])
      let pagingInfo = JSON.parse(res.PagingInfo);
      this.paginationInfo.emit(pagingInfo);
      this.allApplicationsService.tableLoader.set(false);
      this.allApplicationsService.disableTabs.set(false);
    })
  }
  resetData() {
    this.allApplicationsService.tableLoader.set(true);
    this.allApplicationsService.disableTabs.set(true);
    this.searchForm.reset();
    let payload = {
      "pagingRequest": {
        "PageSize": this.pageSize(),
        "PageNum": "1",
        "SortField": "CreationDate",
        "SortOrder": "DESC"
      },
      "filters": [],
      "Table8Filters": [],
      "InboxType": this.currentTabData().InboxType,
      "ServicesType": this.ServicesType()
    }
    this.searchPayload.emit(payload);
    this.allApplicationsService.getCardsDataWithSearch(payload).subscribe((res) => {
      console.log(res);
      this.allApplicationsService.cardsData.set(res.Data || [])
      let pagingInfo = JSON.parse(res.PagingInfo);
      this.paginationInfo.emit(pagingInfo);
      this.allApplicationsService.tableLoader.set(false);
      this.allApplicationsService.disableTabs.set(false);
    })
  }

  onToggleSearch = output<boolean>();
  onToggleAdvancedSearch = output<boolean>();
  onToggleGlobalSearch = output<boolean>();
  isSearchCollapsed = input<boolean>();
  isAdvancedSearchCollapsed = input<boolean>();
  isGlobalSearchCollapsed = input<boolean>();
  toggleSearchView(){
    this.onToggleSearch.emit(!this.isSearchCollapsed());
  }
  toggleAdvancedSearchView() {
    this.onToggleAdvancedSearch.emit(!this.isAdvancedSearchCollapsed());
  }
  toggleGlobalSearchView(){
    this.onToggleGlobalSearch.emit(!this.isGlobalSearchCollapsed());
  }

}
