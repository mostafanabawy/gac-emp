import { Component, computed, effect, ElementRef, input, output, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { AnyMxRecord } from 'dns';
import { catchError, firstValueFrom, forkJoin, Observable, of, tap } from 'rxjs';
import { AllApplicationsService } from 'src/app/service/all-applications.service';
import { EmployeeApplicationsService } from 'src/app/service/employee-applications.service';
import { EmployeeSelectModalService } from 'src/app/service/employee-select-modal.service';
import { FileActionsService } from 'src/app/service/file-actions.service';
import { LicensesService } from 'src/app/service/licenses.service';
import { LocalizationService } from 'src/app/service/localization.service';
import { MenuLinksService } from 'src/app/service/menu-links.service';
import { NewApplicationService } from 'src/app/service/new-application.service';
import { ServiceSelectService } from 'src/app/service/service-select.service';
import { WizardServiceService } from 'src/app/service/wizard-service.service';
import { reverseChevron, toggleAnimation } from 'src/app/shared/animations';
import { AppState } from 'src/types/auth.types';
import { Action, ActionGroup, FieldJson, LookupValue, NavigationTab, ServiceApiPayload } from 'src/types/newApplication.types';
import Swal, { SweetAlertOptions } from 'sweetalert2';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-distribution-table',
  templateUrl: './distribution-table.component.html',
  styleUrls: ['./distribution-table.component.css'],
  animations: [toggleAnimation, reverseChevron]
})
export class DistributionTableComponent {
  search = '';
  mainTabsData = input<any>();
  tabData = input<any>();
  empLookup = signal<any>([]);
  ServicesType = input.required();
  isLoading = false;
  clickedActionTitle = signal<any>(null);
  cols = [
    { field: 'expand', title: '', sort: false, visible: true, fixed: true, width: '60px' },
    { field: 'serial', title: '#', sort: false, isNumber: true, visible: true, fixed: true, width: '25px' },

    { field: 'ApplicationNumber', title: 'رقم الطلب', sort: true, visible: true, width: '150px', isNumber: true },
    { field: 'openRequest', title: 'فتح الطلب', sort: false, visible: true, fixed: true, width: '50px' },
    { field: 'CreationDate', title: 'تاريخ الإنشاء', sort: true, visible: true, width: '150px' },
    { field: 'FkStatusID_TitleAr', title: 'حالة الطلب', sort: true, visible: false, width: '150px', featured: true },
    { field: 'ServiceID', title: 'نوع الخدمة', sort: true, visible: true, width: '250px' },
    { field: 'FkProcessID_TitleAr', title: 'نوع الإجراء', sort: true, visible: true, width: '180px' },
    { field: 'users', title: 'الموظف', sort: false, visible: true, fixed: true, width: '200px' },
    { field: 'actionsEdit', title: 'الإجراءات', sort: false, visible: true, fixed: true, width: '200px' },
  ];
  /* { field: 'ApprovedLicense', title: 'رقم الرخصة' },
  { field: 'FkStatusID', title: 'حالة الطلب' },
  
  */
  translations = signal<any>('')
  rows = computed<any>(() => {
    return this.allApplicationsService.cardsData()
  });
  isWideScreen: boolean = false;
  originalRows: any = [];
  store!: AppState;
  activeTab = input<string>();
  tableLoader: boolean = false;
  navigationTabs = signal<any>([]);
  CurrentPage = signal<number>(1);
  requestConfidence = signal<any>({});
  allConfidences: any = [];
  TotalRows = signal<number>(0);
  PageSize = signal<number>(0);
  appsToEmpList!: FormGroup;
  evalRes = input<any>();
  cardActions = computed(() => {
    if (this.newApplicationService.processList() && this.newApplicationService.processList().length > 0 && this.allData().Actions && this.allData().Actions.length > 0) {
      this.allData().Actions.forEach((action: Action) => {
        let singleActionProcess = this.newApplicationService.processList().filter((item: any) => {
          return item.ActionID === action.ActionID && item.FKServiceID === this.allData().ServiceID
        });


        if (singleActionProcess.length > 1) {
          action.isDropdown = true;
        }

        if (this.evalRes().length > 0) {
          if (!!action.ShowConditionId) {
            action.visible = this.chackEval(this.allData().RequestID, action.ActionDetailsID);
          } else {
            action.visible = true
          }
        } else {
          action.visible = true
        }
      })
    }


    return this.groupActions(this.allData().Actions?.filter((item: any) => item.visible) || []) || [];
  })


  constructor(private router: Router, private route: ActivatedRoute, private employeeApplicationService: EmployeeApplicationsService,
    private localizationService: LocalizationService,
    public allApplicationsService: AllApplicationsService,
    private storeData: Store<AppState>,
    private fileService: FileActionsService,
    private wizardService: WizardServiceService,
    private newApplicationService: NewApplicationService,
    private selectServiceModal: ServiceSelectService,
    private menuLinksService: MenuLinksService,
    private fb: FormBuilder,
    private LicensesService: LicensesService,
    private employeeSelectModalService: EmployeeSelectModalService
  ) {
    this.isWideScreen = this.router.url.includes('allApplications');
    this.initStore();
    this.initForm();
    effect(() => {
      if (this.tabData()) {
        console.log(this.tabData());
        // Call the shared method
        this.loadCardsData({ PageSize: 10, PageNum: 1 });
      }
    }, { allowSignalWrites: true });
    effect(() => {
      if (this.allApplicationsService.tableLoader()) {
        this.tableLoader = true;
      } else {
        this.tableLoader = false;
      }
    }, { allowSignalWrites: true });
  }

  normalLookupsServiceID = signal<any>(null);
  lookupsData = signal<any>(null);
  ngOnInit() {

    this.translations.set(this.localizationService.getTranslations());
    this.isArabic = this.store?.index?.locale === 'ae';
    this.allApplicationsService.getServiceLookup().subscribe((res: any) => {
      this.normalLookupsServiceID.set(res)
    })
    this.LicensesService.getById(null).subscribe(data => {
      this.lookupsData.set(data);
    })
    this.allApplicationsService.getAllLookup().subscribe((res: any) => {
      this.allApplicationsService.lookupValues.set(res.items)
    })


    // Initialize columns after translations are loaded
    this.initializeColumns();

    // Add click listener to close dropdowns
    document.addEventListener('click', (event) => {
      this.toggleColumnsDropdown = false;
      this.toggleSortDropdown = false;
    });
    this.translations.set(this.localizationService.getTranslations());
    this.allApplicationsService.tableLoader.set(true);
    this.tableLoader = true

    // Call the shared method
    /* this.loadCardsData(); */

    this.allApplicationsService.EServicesLoginSelectall().subscribe((res: any) => {
      this.empLookup.set(res.items.filter((item: any) => item.FkRoleID === 840 && item.FkSectionId === 1729 && item.Activited === true) || []);
    });
    // Initialize columns after translations are loaded
    this.initializeColumns();

    // Add click listener to close dropdowns
    document.addEventListener('click', (event) => {
      this.toggleColumnsDropdown = false;
      this.toggleSortDropdown = false;
    });
  }
  initStore() {
    this.storeData
      .select(({ index, auth }) => ({ index, auth }))
      .subscribe((d) => {
        this.store = d;
        this.isArabic = this.store?.index?.locale === 'ae';
      });
  }
  initForm() {
    this.appsToEmpList = this.fb.group({
      users: [null],
    })
  }
  ngAfterViewInit(): void {
    // Check if the element reference is available before calling the method
    if (this.elementRef) {
      this.checkDirection(this.elementRef.nativeElement);
    }
  }

  private loadCardsData(pagingInfo?: any): void {
    // 1. Get the InboxType for the API call
    const inboxType = this.tabData()?.InboxType || this.employeeApplicationService.tab().InboxType;
    const servicesType = this.ServicesType();

    // 2. Set loading state and disable tabs
    this.allApplicationsService.tableLoader.set(true);
    this.tableLoader = true; // Assumes 'tableLoader' is a property on the component
    this.allApplicationsService.disableTabs.set(true);

    // 3. Call the API
    this.allApplicationsService.getCardsData(inboxType, servicesType, pagingInfo).subscribe({
      next: (res) => {
        console.log(res);
        // 4. Update the cards data Signal
        this.allApplicationsService.cardsData.set((res.Data || []).map((item: any, index: any) => {
          item.currentIndex = index + 1;
          return item;
        }));
        this.originalRows = res.Data || [];
        let pagingInfo = JSON.parse(res.PagingInfo);
        this.TotalRows.set(pagingInfo.TotalRows);
        this.PageSize.set(pagingInfo.PageSize);
        this.CurrentPage.set(pagingInfo.CurrentPage);
      },
      error: (err) => {
        console.error('Error loading cards data:', err);
        // Optional: Add error handling logic here
      },
      complete: () => {
        // 5. Reset loading state and enable tabs when the request is complete (success or error)
        this.allApplicationsService.tableLoader.set(false);
        this.tableLoader = false;
        this.allApplicationsService.disableTabs.set(false);
      }
    });
  }

  openMenus: { [key: string]: boolean } = {};
  toggleMenu(key: string) {
    this.openMenus = { [key]: !this.openMenus[key] };
  }

  preserveTabValue() {
    this.employeeApplicationService.setTab(this.tabData());
  }
  onRowClicked(rowData: any) {
    let roleID = JSON.parse(sessionStorage.getItem('user')!).FkRoleID
    const payload: ServiceApiPayload = {
      FKServiceID: rowData.ServiceID,
      FKProcessID: rowData.FkProcessID,
      FKCurrentStatusID: rowData.FkStatusID,
      FKRoleID: roleID
    };
    this.router.navigate(['/Inbox/RequestData'], {
      state: { data: payload, RequestID: rowData.RequestID, newRequestData: null }
    });
  }
  private arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  isArabic: boolean = false;
  @ViewChild('element') elementRef!: ElementRef;
  checkDirection(element: HTMLElement) {
    const text = element.textContent || '';
    this.isArabic = this.arabicRegex.test(text);
    console.log('Is Arabic:', this.isArabic);
    console.log('Text Content:', text);
    return this.arabicRegex.test(text);
  }


  rowsSelected = signal<any[]>([]);
  onRowSelectChange(row: any) {
    console.log(row)
    this.rowsSelected.set(row);
  }

  addSelectedEmp(value: any, $event: any) {
    let itemToSend = this.allApplicationsService.cardsData().find((item: any) => item.RequestID === value.RequestID);
    let action = itemToSend.Actions.find((item: any) => item.ActionID === 1877);
    this.handleAction(action, value, $event);
  }

  allData = signal<any>(null);

  async handleAction(action: Action, value: any, employee?: any, HasServiceID?: boolean) {
    if (Array.isArray(value)) {
      Swal.fire({
        title: this.translations()?.swalConfirmAppMsgTitle.label,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: this.translations()?.normalConfirmMsgBtn.label,
        cancelButtonText: this.translations()?.normalNoMsgBtn.label,
      }).then((result) => {
        if (result.isConfirmed) {
          let allobservables$: Observable<any>[] = [];
          this.rowsSelected().forEach((row: any) => {
            let correctAction = row.Actions.find((item: any) => item.ActionID === 1877)
            if (correctAction.ActionStyle === 2839) {
              if (correctAction.ActionID === 1859) {
                this.allApplicationsService.initActivityLog({ ItemID: row.RequestID },
                  row.ApplicationNumber,
                  this.store.index.locale === 'en' ? row.FkStatusID_TitleEn : row.FkStatusID_TitleAr,
                  this.store.index.locale === 'en' ? row.FkProcessID_TitleEn : row.FkProcessID_TitleAr
                );
              }
              if (correctAction.ActionID === 1865) {
                this.allApplicationsService.initRelatedRequests(row.RequestID);
              }
              if (correctAction.ActionID === 1850) {
                this.newApplicationService.auditLog({ RequestID: row.RequestID }).subscribe(res => {
                  this.newApplicationService.auditData.set(res.result.items);
                  this.newApplicationService.auditDataMap = this.newApplicationService.auditData().reduce((acc: any, historyItem: any) => {
                    acc[historyItem.FieldName] = historyItem;
                    return acc;
                  }, {} as Record<string, any>);
                  this.newApplicationService.isAuditData.set(true);
                })
              }
              return;
            }
            this.showCustomLoader();


            let role = JSON.parse(sessionStorage.getItem('user')!).FkRoleID
            let distributions$ = forkJoin([
              this.newApplicationService.getUI({
                FKServiceID: row.ServiceID,
                FKProcessID: row.FkProcessID,
                FKCurrentStatusID: row.FkStatusID,
                FKRoleID: role,
                RequestID: row.RequestID
              }),
              /* this.newApplicationService.getRequest(row.RequestID),12 */
              this.newApplicationService.GetServiceFieldsByActions({
                "ActionDetailsIDs": row.Actions.map((action: Action) => correctAction.ActionDetailsID),
              },
                row.RequestID
              )
            ]).pipe(
              tap(([ui, dataToSend]) => {
                this.navigationTabs.set(ui.NavigationTabs);

                if (correctAction.ClickConditionId) {
                  this.evaluateAndExecuteAction(action, dataToSend, employee, row);
                } else {
                  // If no ClickCondition, execute the action immediately
                  this.executeAction(action, dataToSend, ui.NavigationTabs, employee, row);
                }
              }),
              // Optionally handle errors per-request, otherwise, the final forkJoin will fail
              catchError(error => {
                console.error(`Error processing row ${row.RequestID}:`, error);
                // Decide how to handle a failure on a single row: 
                // To ignore the error and allow others to proceed: return of(null);
                // To stop the entire batch: throwError(() => error);
                return of(null); // Allows the batch to continue
              })
            )
            allobservables$.push(distributions$);

          })
          forkJoin(allobservables$).pipe(
            catchError(error => {
              // This catch handles critical failures in the overall batch
              console.error('Final batch processing failed:', error);
              Swal.close();
              Swal.fire({
                icon: 'error',
                title: 'fail'
              })
              // TODO: Display an error toast or message to the user
              return of(null); // Complete the stream gracefully
            })
          ).subscribe(() => {
            console.log('All bulk actions completed (or handled with errors).');
            // TODO: Display a success toast or message to the user
          });
        }
      })
    } else {
      this.allData.set(value);
      if (action.ActionStyle === 2839) {
        if (action.ActionID === 1859) {
          this.allApplicationsService.initActivityLog({ ItemID: this.allData().RequestID },
            this.allData().ApplicationNumber,
            this.store.index.locale === 'en' ? this.allData().FkStatusID_TitleEn : this.allData().FkStatusID_TitleAr,
            this.store.index.locale === 'en' ? this.allData().FkProcessID_TitleEn : this.allData().FkProcessID_TitleAr
          );
        }
        if (action.ActionID === 1865) {
          this.allApplicationsService.initRelatedRequests(this.allData().RequestID);
        }
        if (action.ActionID === 1850) {
          this.newApplicationService.auditLog({ RequestID: this.allData().RequestID }).subscribe(res => {
            this.newApplicationService.auditData.set(res.result.items);
            this.newApplicationService.auditDataMap = this.newApplicationService.auditData().reduce((acc: any, historyItem: any) => {
              acc[historyItem.FieldName] = historyItem;
              return acc;
            }, {} as Record<string, any>);
            this.newApplicationService.isAuditData.set(true);
          })
        }
        return;
      }
      if (action.SpecialAction) {
        if (action.ClickConditionId) {
          this.evaluateAndExecuteAction(action, undefined, undefined, undefined, HasServiceID);
        } else if (action.BusinessRuleFun) {
          this.newApplicationService.getRequest(this.allData().RequestID).subscribe((res: any) => {
            this.businessConditionAndExecuteAction(action, res, HasServiceID);
          })
        } else {
          let newService: number | null = null;
          if (HasServiceID) {
            try {
              // 1. Use await with firstValueFrom to wait for the result
              // The take(1) is NOT needed here because firstValueFrom automatically 
              // subscribes and resolves with the first value, then completes the subscription.
              Swal.close()
              const serviceId = await firstValueFrom(this.selectServiceModal.open());

              if (serviceId && serviceId > 0) {
                this.showCustomLoader();
                newService = serviceId;
                console.log(`New service ID selected: ${newService}`);
              } else {
                console.log('Modal was cancelled or returned an invalid ID.');
                return;
              }

            } catch (error) {
              // firstValueFrom throws an error if the Observable completes without emitting a value.
              // However, in your case, it will emit null on cancel, so this catch is less likely to trigger 
              // unless the modal service has an error in its observable chain.
              console.error('An error occurred while awaiting the modal result:', error);
            }
          }
          // If no ClickCondition, execute the action immediately
          this.executeAction(action, undefined, undefined, undefined, undefined, newService);
        }
        return;
      }
      this.showCustomLoader();
      let role = JSON.parse(sessionStorage.getItem('user')!).FkRoleID
      forkJoin([
        this.newApplicationService.getUI({
          FKServiceID: this.allData().ServiceID,
          FKProcessID: this.allData().FkProcessID,
          FKCurrentStatusID: this.allData().FkStatusID,
          FKRoleID: role,
          RequestID: this.allData().RequestID
        }),
        /* this.newApplicationService.getRequest(this.allData().RequestID), */
        this.newApplicationService.GetServiceFieldsByActions({
          "ActionDetailsIDs": this.allData().Actions.map((action: Action) => action.ActionDetailsID),
        },
          this.allData().RequestID
        )
      ]).subscribe(async ([ui, dataToSend]) => {
        this.navigationTabs.set(ui.NavigationTabs);

        if (action.ClickConditionId) {
          this.evaluateAndExecuteAction(action, dataToSend, undefined, undefined, HasServiceID);
        } else if (action.BusinessRuleFun) {
          this.newApplicationService.getRequest(this.allData().RequestID).subscribe((res: any) => {
            this.businessConditionAndExecuteAction(action, res, HasServiceID);
          })
        } else {
          let newService: number | null = null;
          if (HasServiceID) {
            try {
              // 1. Use await with firstValueFrom to wait for the result
              // The take(1) is NOT needed here because firstValueFrom automatically 
              // subscribes and resolves with the first value, then completes the subscription.
              Swal.close()
              const serviceId = await firstValueFrom(this.selectServiceModal.open());

              if (serviceId && serviceId > 0) {
                this.showCustomLoader();
                newService = serviceId;
                console.log(`New service ID selected: ${newService}`);
              } else {
                console.log('Modal was cancelled or returned an invalid ID.');
                return;
              }

            } catch (error) {
              // firstValueFrom throws an error if the Observable completes without emitting a value.
              // However, in your case, it will emit null on cancel, so this catch is less likely to trigger 
              // unless the modal service has an error in its observable chain.
              console.error('An error occurred while awaiting the modal result:', error);
            }
          }
          // If no ClickCondition, execute the action immediately
          this.executeAction(action, dataToSend, ui.NavigationTabs, employee, undefined, newService);
        }
      })
    }
  }

  private businessConditionAndExecuteAction(action: Action, requestData: any, HasServiceID?: boolean | null) {
    const currentTabFields = this.extractFields(this.navigationTabs());
    this.wizardService.businessCondition(requestData, currentTabFields, action.BusinessRuleColmns, requestData.RequestID, action.BusinessRuleFun, this.allData().ServiceID).subscribe(async (res) => {
      if (res[0]?.CanContinue) {
        let newService: number | null = null;
        if (HasServiceID) {
          try {
            // 1. Use await with firstValueFrom to wait for the result
            // The take(1) is NOT needed here because firstValueFrom automatically 
            // subscribes and resolves with the first value, then completes the subscription.
            Swal.close()
            const serviceId = await firstValueFrom(this.selectServiceModal.open());
            if (serviceId && serviceId > 0) {
              this.showCustomLoader();
              newService = serviceId;
              console.log(`New service ID selected: ${newService}`);
            } else {
              console.log('Modal was cancelled or returned an invalid ID.');
              return;
            }

          } catch (error) {
            // firstValueFrom throws an error if the Observable completes without emitting a value.
            // However, in your case, it will emit null on cancel, so this catch is less likely to trigger 
            // unless the modal service has an error in its observable chain.
            console.error('An error occurred while awaiting the modal result:', error);
          }
        }
        this.executeAction(action, requestData, this.navigationTabs(), undefined, undefined, newService);
      } else {
        let baseMessage: any;
        let businessRuleFun = action.BusinessRuleFun!;
        let isEn = this.store.index.locale === 'en';
        let ErrorMessageEn = action.BusinessRuleMessageEN!
        let ErrorMessageAR = action.BusinessRuleMessageAR!
        baseMessage = isEn
          ? ErrorMessageEn
          : ErrorMessageAR

        let buttonHtml: HTMLElement | string = '';
        let title = baseMessage;
        // If extra message exists → replace the placeholder
        if (res[0].ExtraMessage && res[0]) {
          buttonHtml = `<button class="text-primary underline cursor-pointer font-bold text-xl" id="appNum" dir="ltr">${res[0].ExtraMessage}</button>`;

          title = baseMessage?.replace('[ApplicationNumber]', '');
        }
        Swal.fire({
          icon: 'error',
          title: title,
          html: buttonHtml,
          showConfirmButton: true,
          confirmButtonText: this.translations()?.swalConfirmationBtn.label,
          didOpen: () => {
            document.getElementById('appNum')?.addEventListener('click', () => {
              this.handleSpanClick(res[0].RequestID);
            });
          }
        })
        return;
      }
    })
  }

  handleSpanClick(requestID: any) {
    let roleID = JSON.parse(sessionStorage.getItem('user')!).FkRoleID
    this.newApplicationService.getRequest(requestID).subscribe((res: any) => {

      const payload: ServiceApiPayload = {
        FKServiceID: res.ServiceID,
        FKProcessID: res.FkProcessID,
        FKCurrentStatusID: res.FkStatusID,
        FKRoleID: roleID
      };
      // 1. Assemble the data you want to pass
      const navigationState = {
        data: payload,
        RequestID: res.RequestID,
        pageName: this.store.index.locale === 'en' ? res.ServiceTitleEn : res.ServiceTitleAr,
        itemURL: 'Inbox/RequestData'
      };

      // 2. Define a unique key for the data. Using a dynamic value like RequestID is best.
      const uniqueID = res.RequestID; // Assuming RequestID is unique and available
      const storageKey = `requestData`;

      // 3. Save the JSON string to sessionStorage
      sessionStorage.setItem(storageKey, JSON.stringify(navigationState));

      // 4. Generate the URL path *with the key as a query parameter*
      const urlTree = this.router.createUrlTree(['/Inbox/RequestData'], {
        queryParams: { stateKey: storageKey } // <-- This adds the key to the URL
      });

      const url = this.router.serializeUrl(urlTree);

      // 5. Open the URL in a new tab
      window.open(url, '_blank');
      setTimeout(() => {
        sessionStorage.removeItem(storageKey);
      }, 1000)
    })
  }

  /**
 * Evaluates the action's pre-click condition via an API call.
 * If the condition is true, the action is executed; otherwise, an error message is shown.
 * * @param action The Action object.
 * @param dataToSend Data payload (e.g., current form data).
 */
  private evaluateAndExecuteAction(action: Action, dataToSend: any, employee?: any, row?: any, HasServiceID?: boolean): void {
    this.newApplicationService.evaluateClickConditionApi({
      RequestID: this.allData()?.RequestID || row.RequestID,
      ActionDetailsID: action.ActionDetailsID,
      ClickConditionId: action.ClickConditionId
    }).subscribe(async (res) => {
      if (res.IsTrue) {
        if (action.BusinessRuleFun) {
          this.newApplicationService.getRequest(this.allData().RequestID).subscribe((res: any) => {
            this.businessConditionAndExecuteAction(action, res, HasServiceID);
          })
        } else {
          let newService: number | null = null;
          if (HasServiceID) {
            try {
              // 1. Use await with firstValueFrom to wait for the result
              // The take(1) is NOT needed here because firstValueFrom automatically 
              // subscribes and resolves with the first value, then completes the subscription.
              Swal.close()
              const serviceId = await firstValueFrom(this.selectServiceModal.open());

              if (serviceId && serviceId > 0) {
                this.showCustomLoader();
                newService = serviceId;
                console.log(`New service ID selected: ${newService}`);
              } else {
                console.log('Modal was cancelled or returned an invalid ID.');
                return;
              }

            } catch (error) {
              // firstValueFrom throws an error if the Observable completes without emitting a value.
              // However, in your case, it will emit null on cancel, so this catch is less likely to trigger 
              // unless the modal service has an error in its observable chain.
              console.error('An error occurred while awaiting the modal result:', error);
            }
          }
          this.executeAction(action, dataToSend, this.navigationTabs(), employee, undefined, newService);
        }
      } else {
        this.showConditionError(res);
      }
    });
  }

  // ---------------------------------------------------------------------------------------------------

  /**
 * Executes the business logic associated with the action based on its type (SpecialAction or ActionID 1877).
 * * @param action The Action object.
 * @param dataToSend Data payload (e.g., current form data).
 * @param navigationTabs The currently loaded navigation tabs structure.
 */
  private executeAction(action: Action, dataToSend: any, navigationTabs?: NavigationTab[] | null, employee?: any, row?: any,
    newService?: number | null
  ): void {
    if (action.SpecialAction) {
      this.handleSpecialAction(action, newService);
    } else if (action.ActionID === 1877) {
      this.handleMoveEmployeeAction(action, dataToSend, navigationTabs!, employee, row);
    } else {
      this.handleRegularAction(action, dataToSend, navigationTabs!);
    }
  }
  handleRegularAction(action: Action, dataToSend: any, navigationTabs: NavigationTab[] | null) {
    const currentTabFields = this.extractFields(navigationTabs);
    const fieldsNeeded = currentTabFields.find(field => field.InternalFieldName === 'FkMoveEmployeeID');

    const payload = {};

    if (action.HasConfirmMsg) {
      this.confirmAndServiceDataAction(payload, action, dataToSend, currentTabFields);
    } else {
      this.wizardService.serviceDataActionApi(payload, action, dataToSend, currentTabFields, this.allData()?.RequestID).subscribe({
        next: (res: any) => {
          if (res.RequestID) {
            let msg = this.translations()?.allAppSuccess.label.replace('[ApplicationNumber]', res.ApplicationNumber);
            this.loadCardsData();
            Swal.close();
            Swal.fire({
              icon: 'success',
              title: msg,
              showConfirmButton: true,
              confirmButtonText: this.translations()?.validationMsgBtn.label
            })
          } else if (!res.redirectUrl) {
            let msg = this.allData().ApprovedLicense ? this.translations()?.oneLicenseFail.label
              .replace('[ApprovedLicense]', `<span dir="ltr">${this.allData().ApprovedLicense}</span>`)
              : this.translations()?.oneAppFailed.label
                .replace('[ApplicationNumber]', `<span dir="ltr">${this.allData().ApplicationNumber}</span>`);
            Swal.close();
            Swal.fire({
              icon: 'error',
              title: msg,
              showConfirmButton: true,
              confirmButtonText: this.translations()?.validationMsgBtn.label
            })
          } else {
            Swal.close();
          }
        },
        error: (error: any) => {
          let msg = this.allData().ApprovedLicense ? this.translations()?.oneLicenseFail.label
            .replace('[ApprovedLicense]', `<span dir="ltr">${this.allData().ApprovedLicense}</span>`)
            : this.translations()?.oneAppFailed.label
              .replace('[ApplicationNumber]', `<span dir="ltr">${this.allData().ApplicationNumber}</span>`);
          Swal.close();
          Swal.fire({
            icon: 'error',
            title: msg,
            showConfirmButton: true,
            confirmButtonText: this.translations()?.validationMsgBtn.label
          })
        }
      }); // Original only subscribes
    }
  }
  // ---------------------------------------------------------------------------------------------------

  /**
 * Handles actions marked as SpecialAction based on their ActionStyle.
 * Dispatches the action to the appropriate handler (patch data, open panel, etc.).
 * * @param action The Action object with SpecialAction set to true.
 */
  private handleSpecialAction(action: Action, newService?: number | null): void {
    switch (action.ActionStyle) {
      case 2840: // Action Style: Execute API call with optional confirmation
        this.confirmAndPatchData(action, newService);
        break;
      case 2854: // Action Style: Open Dim Fields
        Swal.close();
        this.onRowClicked(this.allData());
        this.newApplicationService.openDimFields.set(true);
        break;
      case 2839: // Action Style: Side panel/UI actions
        this.handleSidePanelAction(action);
        break;
    }
  }

  /**
 * Handles special actions that typically involve opening side panels or modals, 
 * such as Activity Log (1859), Related Requests (1865), or Audit Data (1850).
 * * @param action The Action object with ActionStyle 2839.
 */
  private handleSidePanelAction(action: Action): void {
    const requestData = this.newApplicationService.requestData();
    const locale = this.store.index.locale;

    switch (action.ActionID) {
      case 1859: // Activity Log
        this.allApplicationsService.initActivityLog(
          { ItemID: requestData.RequestID },
          requestData.ApplicationNumber,
          locale === 'en' ? requestData.FkStatusID_TitleEn : requestData.FkStatusID_TitleAr,
          locale === 'en' ? requestData.FkProcessID_TitleEn : requestData.FkProcessID_TitleAr
        );
        break;
      case 1865: // Related Requests
        this.allApplicationsService.initRelatedRequests(requestData.RequestID);
        break;
      case 1850: // Audit Data
        this.newApplicationService.isAuditData.set(true);
        break;
    }
  }

  /**
 * Determines whether to show a confirmation dialog before calling `patchDataForNewApplication`.
 * Used primarily for ActionStyle 2840.
 * * @param action The Action object.
 */
  private confirmAndPatchData(action: Action, row?: any, newService?: number | null): void {
    const patchPayload = {
      RequestID: this.allData()?.RequestID || row.RequestID,
      ActionDBName: action.ActionDBName!,
      FKProcessID: this.newApplicationService.defaultProcess() || null
    };

    if (action.HasConfirmMsg && this.rowsSelected().length === 0) {
      Swal.close();
      Swal.fire({
        title: this.translations()?.swalConfirmAppMsgTitle.label,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: this.translations()?.normalConfirmMsgBtn.label,
        cancelButtonText: this.translations()?.normalNoMsgBtn.label,
      }).then((result) => {
        if (result.value) {
          return this.patchDataForNewApplication(patchPayload, action, newService || null);
        }
      });
    } else {
      this.patchDataForNewApplication(patchPayload, action, newService || null);
    }
  }

  /**
 * Handles the specific logic for Action ID 1877 (e.g., moving an employee).
 * Extracts necessary employee lookup values from current fields and then proceeds to confirm/execute the action.
 * * @param action The Action object (ID 1877).
 * @param dataToSend Data payload.
 * @param navigationTabs The current navigation tabs structure.
 * @param employee The employee to be moved.
 */
  private async handleMoveEmployeeAction(action: Action, dataToSend: any, navigationTabs: NavigationTab[] | null, employee: any, row?: any): Promise<void> {
    const currentTabFields = this.extractFields(navigationTabs);
    this.clickedActionTitle.set(this.store.index.locale === 'en' ? action.TitleEN : action.TitleAR)
    const fieldsNeeded = currentTabFields.find(field => field.InternalFieldName === 'FkMoveEmployeeID');
    let payload: any;
    if (employee) {
      payload = {
        "FkMoveEmployeeID": fieldsNeeded?.LookupValues?.find(lookup => lookup.LookupID === employee!.ID)?.LookupID || null
      };
    } else {
      Swal.close();
      const employee = await firstValueFrom(this.employeeSelectModalService.open());
      if (employee) {
        payload = {
          "FkMoveEmployeeID": fieldsNeeded?.LookupValues?.find(lookup => lookup.LookupID === employee)?.LookupID || null
        };
        this.showCustomLoader();
      } else {
        return;
      }
    }

    if (action.HasConfirmMsg && this.rowsSelected().length === 0) {
      this.confirmAndServiceDataAction(payload, action, dataToSend, currentTabFields);
    } else {
      this.wizardService.serviceDataActionApi(payload, action, dataToSend, currentTabFields, this.allData()?.RequestID || row.RequestID).subscribe((res: any) => {
        if (res.RequestID) {
          this.fulfilledCounter++;
          this.checkIfAllDone();
        } else {
          let msg = this.translations()?.oneAppFailed.label.replace('[ApplicationNumber]', res.ApplicationNumber);
          Swal.close();
          Swal.fire({
            icon: 'error',
            title: msg,
            showConfirmButton: true,
            confirmButtonText: this.translations()?.validationMsgBtn.label
          })
        }
      }); // Original only subscribes
    }
  }
  fulfilledCounter: number = 0;
  checkIfAllDone() {
    if (this.fulfilledCounter === this.rowsSelected().length) {
      this.fulfilledCounter = 0;
      let msg = this.translations()?.allAppSuccess.label.replace('[ApplicationNumber]', this.rowsSelected().map((row: any) => row.ApplicationNumber).join('<br>'));
      Swal.close();
      Swal.fire({
        icon: 'success',
        title: msg,
        showConfirmButton: true,
        confirmButtonText: this.translations()?.validationMsgBtn.label
      })
    }
    this.loadCardsData();
  }

  /**
  * Helper function to flatten the fields from all sections and tabs into a single array.
  * * @param tabs The array of NavigationTab objects.
  * @returns An array of FieldJson objects.
  */
  private extractFields(tabs: NavigationTab[] | null): FieldJson[] {
    const fields: FieldJson[] = [];
    tabs?.forEach((tab: NavigationTab) => {
      tab.TabSections.forEach(section => {
        fields.push(...section.FieldsJson);
      });
    });
    return fields;
  }

  /**
 * Shows a confirmation dialog and, if confirmed, executes the main `serviceDataActionApi`.
 * Handles the success and error subscriptions for this critical API call.
 * * @param payload The API payload.
 * @param action The Action object.
 * @param dataToSend Data payload.
 * @param currentTabFields Fields associated with the current tab.
 */
  private confirmAndServiceDataAction(payload: any, action: Action, dataToSend: any, currentTabFields: FieldJson[], row?: any): void {
    Swal.close();
    Swal.fire({
      title: this.translations()?.swalConfirmAppMsgTitle.label,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.translations()?.normalConfirmMsgBtn.label,
      cancelButtonText: this.translations()?.normalNoMsgBtn.label,
    }).then((result) => {
      if (result.value) {
        this.wizardService.serviceDataActionApi(
          payload,
          action,
          dataToSend,
          currentTabFields,
          this.allData()?.RequestID || row.RequestID
        ).subscribe({
          next: (res: any) => this.handleSuccess(res, action),
          error: (error) => this.handleError(error),
        });
      }
    });
  }

  /**
 * Processes a successful response from a service action API call.
 * It clears temporary data, formats the success message, handles navigation, and refreshes the card data.
 * * @param res The successful API response data.
 * @param action The Action object.
 */
  private handleSuccess(res: any, action: Action): void {
    if (!res) return;

    Swal.close();

    if (this.newApplicationService.newRequestData()) {
      this.newApplicationService.newRequestData.set(null);
      this.newApplicationService.defaultProcess.set('');
    }

    const msg = this.formatSuccessMessage(res, action);

    // Navigation
    // Note: The original navigation logic is duplicated and uses complex logic 
    // to find the 'TitleEn'. This part is kept as-is but could be simplified 
    // with a helper if used elsewhere.
    const inboxState = {
      fromPage: this.menuLinksService.menuResponse().find((item: any) =>
        item.ItemURL === 'Inbox'
      )?.Services.split(',').includes(`${this.allData().FKServiceID}`)?.TitleEn
    };
    this.router.navigate(['/Inbox'], { state: inboxState });

    Swal.close();
    Swal.fire({
      icon: "success",
      title: msg,
      confirmButtonText: this.translations()?.swalConfirmationBtn.label,
      padding: '10px 20px',
    });

    this.loadCardsData();
  }

  /**
 * Formats the success message string, replacing placeholders like 'ApplicationNumber' or 'ApprovedLicense' 
 * with the actual values from the response, supporting both English and Arabic (dir="ltr" span).
 * * @param res The API response containing dynamic values (ApplicationNumber/ApprovedLicense).
 * @param action The Action object containing the SuperMsgEn/SuperMsgAr templates.
 * @returns The formatted success message string.
 */
  private formatSuccessMessage(res: any, action: Action): any {
    const locale = this.store.index.locale;
    let msg = locale === 'en' ? action.SuperMsgEn : action.SuperMsgAr;
    const targetKey = locale === 'en' ? 'SuperMsgEn' : 'SuperMsgAr';

    if (msg?.includes('ApplicationNumber') && res.ApplicationNumber) {
      const key = 'ApplicationNumber';
      msg = msg.substring(0, msg.lastIndexOf(key)) +
        `<span dir="ltr">${res.ApplicationNumber}</span>` +
        msg.substring(msg.lastIndexOf(key) + key.length);
    } else if (msg?.includes('ApprovedLicense') && res.ApprovedLicense) {
      const key = 'ApprovedLicense';
      msg = msg.substring(0, msg.lastIndexOf(key)) +
        `<span dir="ltr">${res.ApprovedLicense}</span>` +
        msg.substring(msg.lastIndexOf(key) + key.length);
    }

    return msg;
  }

  /**
 * Handles errors returned from the service action API call.
 * It attempts to extract a specific "Error ID" from the response details for a more informative message.
 * Navigates the user back to the Inbox after showing the error.
 * * @param error The API error object.
 */
  private handleError(error: any): void {
    Swal.close();
    const locale = this.store.index.locale;

    if (error.error?.result === 'ERROR' && error.error.result.details) {
      let match = error.error.result.details.match(/Error ID:\s*([a-fA-F0-9]+)/);

      if (match) {
        let errorID = match[0].replace('Error ID: ', this.translations()?.submitErrMsgKeyLabel.label);
        let errorMessage = this.translations()?.submitErrMsg.label.replace('[err]', '<br>' + errorID);

        Swal.close();
        Swal.fire({
          icon: "error",
          title: errorMessage,
          confirmButtonText: this.translations()?.swalConfirmationBtn.label,
        });
      } else {
        // Fallback for structured error without 'Error ID' match
        this.showGenericError();
      }
    } else {
      // Fallback for unstructured errors
      this.showGenericError();
    }
    this.router.navigate(['/Inbox']);
  }

  /**
 * Displays an error message when the click condition evaluation fails (res.IsTrue is false).
 * The message content is locale-dependent (ActionMessageEn/Ar).
 * * @param res The response from the `evaluateClickConditionApi`.
 */
  private showConditionError(res: any): void {
    Swal.close();
    Swal.fire({
      icon: 'error',
      title: this.store.index.locale === 'en' ? res.ActionMessageEn : res.ActionMessageAr,
      showConfirmButton: true,
      confirmButtonText: this.translations()?.swalConfirmationBtn.label
    });
  }

  /**
 * Displays a generic, fallback error message when the specific error structure cannot be parsed.
 */
  private showGenericError(): void {
    const genericErrorMsg = this.translations()?.submitErrMsg.label.replace('[err] <br>', '');
    Swal.close();
    Swal.fire({
      icon: "error",
      title: genericErrorMsg,
      confirmButtonText: this.translations()?.swalConfirmationBtn.label,
    });
  }

  defaultProcess: any;
  btnRelatedServices = signal<any>([]);
  servicesData = output<any>();
  setDefaultProcess(processID: any, action: Action, item: LookupValue) {
    this.defaultProcess = processID
    let processData = this.newApplicationService.processList().find((item: any) => item.FKProcessID === processID && item.FKServiceID === this.allData().ServiceID)
    if (processData && processData.HasServiceID) {
      this.newApplicationService.getActivityServices(this.allData().RequestID).subscribe((servicesData: any) => {
        this.btnRelatedServices.set(servicesData.services)
        this.newApplicationService.defaultProcess.set(processID)
        this.servicesData.emit({
          services: servicesData.services,
          title: this.store.index.locale === 'en' ? item?.TitleEn : item?.TitleAr
        })

        this.handleAction(action, undefined, undefined, true)
      })
    } else {
      this.newApplicationService.defaultProcess.set(processID)
      this.handleAction(action, undefined, undefined)
    }
  }

  transformUpdateData(formData: any) {

    const currentTabFields: FieldJson[] = [];

    this.navigationTabs()!.forEach((tab: NavigationTab) => {
      tab.TabSections.forEach(section => {
        currentTabFields.push(...section.FieldsJson);
      });
    })
    for (const field of currentTabFields) {
      if (field.FieldType === 4 || field.FieldType === 19) {
        if (formData.ServiceTables) {
          let newData = formData.ServiceTables.filter((fieldData: any) => fieldData.SourceTableID == field.TableServiceFields!.find((arrItem) => arrItem.IsSystemField === false)!.SourceTableID).reduce((acc: any, fieldData: any) => [...acc, fieldData[field.TableServiceFields!.find((arrItem) => arrItem.IsSystemField === false)!.InternalFieldName]], []);
          formData[field.InternalFieldName] = newData;
        }
      }
      if (field.FieldType === 3) {
        let newData = formData[field.InternalFieldName];
        formData[field.InternalFieldName] = newData ? new Date(Date.parse(newData)).toLocaleDateString('en-GB') : '';
      }
      if (field.FieldType === 23) {
        let dateValue = formData[field.InternalFieldName];
        if (dateValue) {
          let dateParts = dateValue.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}/);
          if (dateParts) {
            let date = new Date(Date.parse(dateParts[0]));
            formData[field.InternalFieldName] = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-4)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
          }
        }
      }
      if (field.FieldType === 10 && field.HasModel && formData[field.InternalFieldName]) {
        this.fileService.readFileAnalysis(formData[field.InternalFieldName]).subscribe((res: any) => {
          this.fileService.fileAnalysisData.set({ ...this.fileService.fileAnalysisData(), [field.InternalFieldName]: res })
          this.allConfidences = [...this.allConfidences, +res.Confidence];
          this.calculateConfidenceForRequest(this.allConfidences)
        });
      }
    }
  }
  attachmentData = signal<any>('');
  transformAttachmentData(formData: any) {
    this.allConfidences = [...this.allConfidences, ...(formData.Attachments.filter((attachment: any) => !!attachment.Confidence).map((attachment: any) => attachment.Confidence))];
    let attachmentTypeKeys = Array.from(new Set(formData.Attachments.map((rData: any) => rData.FkAttachmentTypeID)))
    let data: any[] = attachmentTypeKeys.map((key: any) => {
      let newFile = formData.Attachments.reduce((acc: any, currentRData: any) => {
        return currentRData.FkAttachmentTypeID == key ? [...acc, currentRData] : [...acc];
      }, []);
      let newItem = { FkAttachmentTypeID: key, files: newFile }
      return newItem;
    }); // Use flat() to flatten the array of arrays
    this.attachmentData.set(data);
    if (this.newApplicationService.requestData()) {
      this.newApplicationService.requestData.update((data) => {
        data.Attachments = this.attachmentData();
        return data;
      });
    } else {
      this.newApplicationService.newRequestData.update((data) => {
        data.Attachments = this.attachmentData();
        return data;
      });
    }
  }

  calculateConfidenceForRequest(confidences: number[]): any {
    if (!confidences || confidences.length === 0) {
      return;
    }

    const average = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;



    this.requestConfidence.set({ average: parseFloat(average.toFixed(2)) });
    return this.requestConfidence();
  }

  patchDataForNewApplication(payload: {
    "RequestID": string,
    "ActionDBName": string,
    "FKProcessID"?: number;
  }, action: Action, newService?: number | null) {
    this.wizardService.getSpActionRequest(payload).subscribe((res: any) => {
      console.log(res);
      this.newApplicationService.newRequestData.set(res)
      if (this.newApplicationService.defaultProcess()) {
        this.newApplicationService.newRequestData.update((data: any) => {
          if (!data) return { FkProcessID: this.newApplicationService.defaultProcess() };  // initialize if empty
          return { ...data, FkProcessID: this.newApplicationService.defaultProcess() };
        })
      }
      this.newApplicationService.CPResultResponse.set(null)
      this.newApplicationService.CRResultResponse.set(null)
      this.newApplicationService.requestData.set(null);

      let role = JSON.parse(sessionStorage.getItem('user')!).FkRoleID

      let routingPayload: ServiceApiPayload = {
        FKCurrentStatusID: res.FkStatusID,
        FKProcessID: this.defaultProcess || res.FkProcessID,
        FKRoleID: role,
        FKServiceID: newService || res.ServiceID,
      }
      Swal.close();
      this.router.navigate(['/Services/NewRequest/spAction'],
        {
          state: {
            data: routingPayload,
            itemURL: `Services/NewRequest?ServiceID=${res.ServiceID}`,
            pageName: this.store.index.locale === 'en' ? this.allData().ServiceTitleEn : this.allData().ServiceTitleAr,
            newRequestData: this.newApplicationService.newRequestData(),
            ActionDBName: payload.ActionDBName
          },
          queryParams: { ServiceID: newService || res.ServiceID }

        }
      )

    })
  }

  handleAllApps() {

    this.handleAction(this.rowsSelected()[0].Actions.find((item: any) => item.ActionID === 1877), this.rowsSelected(), this.appsToEmpList.value.users);


  }
  showCustomLoader(): void {
    const customLoaderHtml = `
      <div class="col-span-full flex justify-center">
        <span
          class="animate-spin border-4 border-black border-l-transparent rounded-full w-12 h-12 inline-block align-middle m-auto">
        </span>
      </div>
      <h2 style="margin-top: 10px; font-size: 1.5em; color: #333;">
      ${this.translations()?.submitLoader.label}
      </h2>
    `;

    const options: SweetAlertOptions = {
      // Note: Use 'titleText' for simple text or 'title' for HTML title if needed. 
      // Since we're using custom HTML for the content, it's best to use `html` and skip `title`.

      // We omit 'title' and 'icon' to have more control over the modal's top area
      // icon: undefined,
      // title: undefined,

      html: customLoaderHtml, // Inject your custom spinner and title here

      // Configuration to make it a proper loader
      showConfirmButton: false,
      showCancelButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,

      // You can also add a custom class for styling the whole modal
      // customClass: {
      //   popup: 'my-custom-loader-popup'
      // }
    };

    Swal.fire(options);
  }

  onServerChange(event: any) {
    if (event.change_type === "page") {
      this.allApplicationsService.tableLoader.set(true);
      this.tableLoader = true;
      this.allApplicationsService.disableTabs.set(true);
      this.loadCardsData({ PageSize: event.pagesize, PageNum: event.current_page });
    } else if (event.change_type === "pagesize") {
      this.allApplicationsService.tableLoader.set(true);
      this.tableLoader = true;
      this.allApplicationsService.disableTabs.set(true);
      this.loadCardsData({ PageSize: event.pagesize, PageNum: event.current_page });
    }
  }

  groupedActions: Record<number, ActionGroup> = {};
  groupActions(actions: Action[]) {
    const groupedMap = new Map<number, ActionGroup>();
    const ungroupedActions: Action[] = [];

    // 1. First Pass: Grouping actions
    for (const action of actions) {
      // Check if it has grouping metadata
      if (action.groupID !== null) {
        const groupKey = action.groupID!;

        if (!groupedMap.has(groupKey)) {
          // Create the new group object. We assign the ActionSortOrder of the first item
          // to the group object, which is used to sort the main button.
          const newGroup: ActionGroup = {
            isDropdown: true,
            groupID: action.groupID!,
            groupTitleAR: action.groupTitleAR!,
            groupTitleEN: action.groupTitleEN!,
            ActionSortOrder: action.ActionSortOrder,
            actions: []
          };
          groupedMap.set(groupKey, newGroup);
        }

        // Add the action to the correct group
        groupedMap.get(groupKey)!.actions.push(action);
      } else {
        // Actions without a groupID go directly to the ungrouped list
        ungroupedActions.push(action);
      }
    }

    // 2. Second Pass: Check for single-item groups and ungroup them (flattening)
    const finalActionGroups: ActionGroup[] = [];

    Array.from(groupedMap.values()).forEach(group => {
      if (group.actions.length === 1) {
        // Condition met: Only one item in the group, flatten it into a single action button.
        const singleAction = group.actions[0];

        // REQUIRED: Remove grouping properties to ensure it renders as a single button
        singleAction.groupID = null;
        singleAction.groupTitleAR = null;
        singleAction.groupTitleEN = null;

        // Push the now-ungrouped action back into the ungrouped list
        ungroupedActions.push(singleAction);

        // This group object is discarded
      } else {
        // Normal group (2+ items), keep it as a dropdown

        // Sort the internal actions within this group
        group.actions.sort((a, b) => a.ActionSortOrder - b.ActionSortOrder);
        finalActionGroups.push(group);
      }
    });

    // 3. Combine and sort the final display list
    const finalDisplay: any[] = [...ungroupedActions, ...finalActionGroups];

    // Sort the combined list by the ActionSortOrder property
    finalDisplay.sort((a, b) => a.ActionSortOrder - b.ActionSortOrder);

    return finalDisplay;
  }
  chackEval(requestID: string, actionDetailsID: number) {
    let evaluation = this.evalRes().find((item: any) => item.RequestID === requestID)
    if (!evaluation?.VisibleActions) {
      return false;
    }
    let action = evaluation.VisibleActions.find((item: any) => item.ActionDetailsID === actionDetailsID)
    return !!action;
  }

  exportToExcel() {
    const data = this.rows().map((row: any, index: number) => {
      if (this.isArabic) {
        return {
          '#': index + 1,
          'رقم الطلب': row.ApplicationNumber || '',
          'رقم الرخصة': row.ApprovedLicense || '',
          'التاريخ': row.CreationDate || '',
          'نوع الخدمة': row.ServiceTitleAr || '',
          'نوع الإجراء': row.FkProcessID_TitleAr || '',
          'حالة الطلب': row.FkStatusID_TitleAr || ''
        };
      } else {
        return {
          '#': index + 1,
          'Application Number': row.ApplicationNumber || '',
          'License Number': row.ApprovedLicense || '',
          'Date': row.CreationDate || '',
          'Service Type': row.ServiceTitleEn || '',
          'Procedure Type': row.FkProcessID_TitleEn || '',
          'Status': row.FkStatusID_TitleEn || ''
        };
      }
    });

    const ws = XLSX.utils.json_to_sheet(data);

    // تطبيق RTL على الـ worksheet
    if (this.isArabic) {
      ws['!views'] = [{ RTL: true }];
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, this.isArabic ? 'الطلبات' : 'Applications');

    // تطبيق RTL على الـ workbook
    if (this.isArabic) {
      if (!wb.Workbook) wb.Workbook = {};
      if (!wb.Workbook.Views) wb.Workbook.Views = [];
      wb.Workbook.Views[0] = { RTL: true };
    }

    const filename = this.isArabic ? 'تقرير_الطلبات.xlsx' : 'Applications_Report.xlsx';
    XLSX.writeFile(wb, filename);
  }
  resetForm() {
    this.searchForm.reset();
    this.searchCriteria = [];
    this.loadCardsData({ PageSize: this.PageSize(), PageNum: 1 });
  }

  searchApplications() {
    const formValue = this.searchForm.value;
    this.searchCriteria = [];

    // Build search criteria for display
    Object.keys(formValue).forEach(key => {
      if (formValue[key]) {
        const column = this.allColumns.find(col => col.field === key);
        if (column) {
          this.searchCriteria.push({
            key: key,
            label: column.title,
            value: formValue[key]
          });
        }
      }
    });

    // Perform actual search
    this.loadCardsData({ PageSize: this.PageSize(), PageNum: 1, ...formValue });
    this.isSearchCollapsed = true;
  }

  removeCriteria(key: string) {
    this.searchForm.patchValue({ [key]: '' });
    this.searchCriteria = this.searchCriteria.filter(criteria => criteria.key !== key);
    this.searchApplications();
  }

  globalSearch() {
    if (!this.globalSearchTerm || this.globalSearchTerm.trim() === '') {
      // لو فاضي، نرجع النتائج الأصلية
      this.allApplicationsService.cardsData.set([...this.originalRows]);
      return;
    }

    // تطبيق الفلتر على الصفوف الأصلية
    const term = this.globalSearchTerm.toLowerCase().trim();

    // البحث في كل الحقول
    this.allApplicationsService.cardsData.set(
      this.originalRows.filter((row: any) => {
        return Object.keys(row).some(key => {
          const value = row[key];
          if (value === null || value === undefined) return false;

          // Convert value to string
          let searchValue = String(value).toLowerCase();

          // If it's a date field, try multiple formats
          if (key.includes('Date') || key.includes('date')) {
            try {
              const dateObj = new Date(value);
              if (!isNaN(dateObj.getTime())) {
                // Format date in multiple ways for better search
                const formats = [
                  // YYYY-MM-DD
                  dateObj.toISOString().split('T')[0],
                  // DD/MM/YYYY
                  `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`,
                  // MM/DD/YYYY
                  `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}/${dateObj.getFullYear()}`,
                  // DD-MM-YYYY
                  `${String(dateObj.getDate()).padStart(2, '0')}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${dateObj.getFullYear()}`,
                  // Year only
                  String(dateObj.getFullYear()),
                  // Month name (Arabic and English)
                  dateObj.toLocaleDateString('ar-EG', { month: 'long' }),
                  dateObj.toLocaleDateString('en-US', { month: 'long' }),
                  // Day
                  String(dateObj.getDate()),
                  // Month number
                  String(dateObj.getMonth() + 1)
                ];

                // Check if search term matches any date format
                return formats.some(format => format.toLowerCase().includes(term));
              }
            } catch (e) {
              // If date parsing fails, fall back to string search
            }
          }

          // Regular string search
          return searchValue.includes(term);
        });
      }))

  }

  resetGlobalSearch() {
    this.globalSearchTerm = '';
    this.loadCardsData({ PageSize: this.PageSize(), PageNum: 1 });
  }

  toggleViewMode(mode: 'table' | 'cards') {
    this.viewMode = mode;
  }

  openDropdown(type: 'sort' | 'columns') {
    if (type === 'sort') {
      this.toggleSortDropdown = !this.toggleSortDropdown;
      this.toggleColumnsDropdown = false;
    } else {
      this.toggleColumnsDropdown = !this.toggleColumnsDropdown;
      this.toggleSortDropdown = false;
    }
  }
  applySorting() {
    if (this.currentSortField) {
      this.loadCardsData({
        PageSize: this.PageSize(),
        PageNum: this.CurrentPage(),
        SortField: this.currentSortField,
        SortDirection: this.currentSortDirection
      });
    }
    this.toggleSortDropdown = false;
  }

  resetSort() {
    this.selectedSortColumn = null;
    this.currentSortField = '';
    this.currentSortDirection = 2;
    this.toggleSortDropdown = false;
    this.loadCardsData({ PageSize: this.PageSize(), PageNum: this.CurrentPage() });
  }

  onSortColumnChange(column: any) {
    this.selectedSortColumn = column;
    this.currentSortField = column?.field || '';
    this.applySorting();
  }

  onSortChange(event: any) {
    this.currentSortField = event.field;
    this.currentSortDirection = this.currentSortDirection === 1 ? 2 : 1;
    this.applySorting();
  }

  toggleRowExpand(identifier: any) {
    if (this.expandedRow && this.expandedRow.ApplicationNumber === identifier) {
      this.expandedRow = null;
      this.expandedRowDetails = [];
    } else {
      const row = this.rows().find((r: any) => r.ApplicationNumber === identifier);
      if (row) {
        this.expandedRow = row;
        this.buildExpandedRowDetails(row);
      }
    }
  }

  buildExpandedRowDetails(row: any) {
    const isMobile = window.innerWidth <= 768;

    // Get all hidden columns (non-fixed and visible = false, or hidden on mobile)
    const hiddenColumns = this.allColumns.filter(col => {
      const colInCols = this.cols.find(c => c.field === col.field);
      if (!colInCols || colInCols.fixed) return false;

      if (isMobile) {
        return col.visible === false || this.shouldHideOnMobile(col.field);
      } else {
        return col.visible === false;
      }
    });

    this.expandedRowDetails = hiddenColumns.map(col => {
      let value = '';

      // Handle different field mappings
      switch (col.field) {
        case 'ApprovedLicense':
          value = row.ApprovedLicense;
          break;
        case 'CreationDate':
          value = row.CreationDate;
          try {
            if (value) {
              const date = new Date(value);
              value = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-4)}`;
            }
          } catch (e) {
            // Keep original value if date parsing fails
          }
          break;
        case 'ServiceTitleAr':
        case 'ServiceTitleEn':
          value = this.isArabic ? row.ServiceTitleAr : row.ServiceTitleEn;
          break;
        case 'FkProcessID_TitleAr':
        case 'FkProcessID_TitleEn':
          value = this.isArabic ? row.FkProcessID_TitleAr : row.FkProcessID_TitleEn;
          break;
        case 'FkStatusID_TitleAr':
        case 'FkStatusID_TitleEn':
          value = this.isArabic ? row.FkStatusID_TitleAr : row.FkStatusID_TitleEn;
          break;
        default:
          value = row[col.field];
          break;
      }

      return {
        label: col.title,
        value: value || '-'
      };
    }).filter(detail => detail.value && detail.value !== '-'); // Only show fields that have values
  }

  // Add Math property for template usage
  Math = Math;
  searchForm!: FormGroup;
  isAdvancedSearch = false;
  isSearchCollapsed = false;
  globalSearchTerm = '';
  searchCriteria: any[] = [];
  allColumns: any[] = [];
  defaultColumnsState: any[] = []; // حفظ الحالة الافتراضية للأعمدة
  sortableColumns: any[] = [];
  selectedSortColumn: any = null;
  viewMode: 'table' | 'cards' = 'table';
  currentSortField: string = '';
  currentSortDirection: number = 2;
  toggleColumnsDropdown = false;
  toggleSortDropdown = false;
  expandedRow: any = null;
  expandedRowDetails: any[] = [];


  get areAllColumnsVisible(): boolean {
    return this.allColumns.every(col => {
      const colInCols = this.cols.find(c => c.field === col.field);
      return !colInCols || colInCols.fixed || col.visible;
    });
  }

  get areAllColumnsHidden(): boolean {
    return this.allColumns.every(col => {
      const colInCols = this.cols.find(c => c.field === col.field);
      return !colInCols || colInCols.fixed || !col.visible;
    });
  }

  get hasHiddenColumns(): boolean {
    const isMobile = window.innerWidth <= 768;
    return this.cols.some(col => {
      if (col.fixed) return false;
      if (isMobile) {
        return col.visible === false || this.shouldHideOnMobile(col.field);
      } else {
        return col.visible === false;
      }
    });
  }

  shouldHideOnMobile(field: string): boolean {
    // في الموبايل نعرض فقط الحقول الأساسية
    const showFields = ['expand', 'serial', 'openRequest', 'ApplicationNumber', 'ServiceTitleAr', 'ServiceTitleEn', 'FkStatusID_TitleAr', 'FkStatusID_TitleEn'];
    return !showFields.includes(field);
  }

  onActionClick(event: any) {
    const { action, row } = event;

    if (event.isEmp) {
      this.addSelectedEmp(row, action)
      return;
    }
    if (action) {
      // Handle specific action
      this.handleAction(action, row);
    } else {
      // If no action provided, just navigate to details (default behavior)
      this.onRowClicked(row);
    }
  }


  onPageChange(page: number) {
    this.loadCardsData({ PageSize: this.PageSize(), PageNum: page });
  }

  onPageSizeChange(event: any) {
    const pageSize = typeof event === 'object' ? event.target.value : event;
    this.loadCardsData({ PageSize: parseInt(pageSize), PageNum: 1 });
  }

  getPageNumbers(): number[] {
    const totalPages = Math.ceil(this.TotalRows() / this.PageSize());
    const currentPage = this.CurrentPage();
    const pages: number[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push(-1); // ellipsis
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push(-1); // ellipsis
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push(-1); // ellipsis
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push(-1); // ellipsis
        pages.push(totalPages);
      }
    }

    return pages;

  }
  paginationInfoText = computed(() => {
    const currentPage = this.CurrentPage() || 1;
    const pageSize = this.PageSize() || 10;
    const totalRows = this.TotalRows() || 0;
    const start = totalRows > 0 ? (currentPage - 1) * pageSize + 1 : 0;
    const end = Math.min(currentPage * pageSize, totalRows);

    return this.store?.index?.locale === 'ae'
      ? `عرض ${start} إلى ${end} من ${totalRows} نتيجة`
      : `Showing ${start} to ${end} of ${totalRows} results`;
  });

  initializeColumns() {
    const t = this.translations();

    this.cols = [
      { field: 'checkbox', title: '', sort: false, visible: true, fixed: true, width: '50px' },
      { field: 'expand', title: t?.tableMoreDetailsHeader?.label || '', sort: false, visible: true, fixed: true, width: '50px' },
      { field: 'serial', title: '#', sort: false, isNumber: true, visible: true, fixed: true, width: '25px' },
      { field: 'openRequest', title: this.isArabic ? 'فتح الطلب' : 'Open Request', sort: false, visible: true, fixed: true, width: '50px' },
      { field: 'ApplicationNumber', title: t?.requestNumber?.label || 'رقم الطلب', sort: true, visible: true, width: '150px', isNumber: true },
      { field: 'CreationDate', title: t?.CreationDate?.label || 'تاريخ الإنشاء', sort: true, visible: true, width: '150px' },
      { field: this.isArabic ? 'ServiceTitleAr' : 'ServiceTitleEn', title: t?.ServiceType?.label || 'نوع الخدمة', sort: true, visible: true, width: '250px' },
      { field: this.isArabic ? 'FkProcessID_TitleAr' : 'FkProcessID_TitleEn', title: t?.ProcessID?.label || 'نوع الإجراء', sort: true, visible: true, width: '180px' },
      { field: this.isArabic ? 'FkStatusID_TitleAr' : 'FkStatusID_TitleEn', title: t?.Status?.label || 'حالة الطلب', sort: true, visible: true, width: '150px', featured: true },
      /* { field: 'CompanyName', title: t?.CompanyNameTitleInput?.label || 'اسم الشركة', sort: true, visible: false, width: '150px', featured: true },
      { field: 'CompanyNameEn', title: t?.CompanyNameEnTitleInput?.label || 'اسم الشركة بالانجليزية', sort: true, visible: false, width: '150px', featured: true }, */
      { field: 'CommercialName', title: t?.CommercialNameTitleInput?.label || 'اسم التجاري', sort: true, visible: false, width: '150px', featured: true },
      { field: 'ApplicantName', title: t?.ApplicantNameTitleInput?.label || 'اسم المتقدم', sort: true, visible: false, width: '150px', featured: true },
      { field: 'ApplicantQID', title: t?.ApplicantQIDTitleInput?.label || 'رقم التسجيل', sort: true, visible: false, width: '150px', featured: true },
      { field: 'OwnerName', title: t?.OwnerNameTitleInput?.label || 'اسم المالك', sort: true, visible: false, width: '150px', featured: true },
      { field: 'ManagerQID', title: t?.managerQID?.label || 'رقم التسجيل', sort: true, visible: false, width: '150px', featured: true },
      /* { field: this.isArabic ? 'FkClubID_TitleAr' : 'FkClubID_TitleEn', title: t?.FkClubID?.label || 'اسم النادي', sort: true, visible: false, width: '150px', featured: true }, */
      { field: 'ApprovedLicense', title: t?.licenseNumber?.label || 'رقم الرخصة', sort: true, visible: false, width: '180px', isNumber: true },
      { field: 'users', title: t?.employeeTableLabel?.label || 'الموظف', sort: false, visible: true, fixed: true, width: '200px' },
      { field: 'ai', title: t?.aiAnalysisTitle.label, sort: false, visible: true, fixed: true, width: '60px' },
      { field: 'actionsEdit', title: t?.tableActionsKey?.label || 'الإجراءات', sort: false, visible: true, fixed: true, width: '200px' },
      // الأعمدة المخفية
    ];

    this.allColumns = this.cols
      .filter(col => col.field !== 'expand' && col.field !== 'serial' && col.field !== 'actionsEdit' && col.field !== 'openRequest')
      .map(col => ({ ...col }));

    // حفظ الحالة الافتراضية للأعمدة
    this.defaultColumnsState = this.cols.map(col => ({
      field: col.field,
      visible: col.visible
    }));

    this.sortableColumns = this.cols
      .filter(col => col.sort && col.field !== 'expand' && col.field !== 'serial')
      .map(col => ({
        field: col.field,
        title: col.title,
        isArabic: col.field.includes('Ar')
      }));

    this.selectedSortColumn = this.sortableColumns.find(col => col.field === 'ApplicationNumber') || this.sortableColumns[0];
    if (this.selectedSortColumn) {
      this.currentSortField = this.selectedSortColumn.field;
      this.currentSortDirection = 2; // Descending
    }
  }

  resetColumns() {
    this.defaultColumnsState.forEach(defaultCol => {
      const colInAll = this.allColumns.find(c => c.field === defaultCol.field);
      const colInCols = this.cols.find(c => c.field === defaultCol.field);

      if (colInAll) {
        colInAll.visible = defaultCol.visible;
      }
      if (colInCols) {
        colInCols.visible = defaultCol.visible;
      }
    });

    // Force array reference change to trigger change detection
    this.cols = [...this.cols];

    this.toggleColumnsDropdown = false;

    // لو التفاصيل مفتوحة، نحدثها
    if (this.expandedRow) {
      this.buildExpandedRowDetails(this.expandedRow);
    }
  }

  selectAllColumns() {
    this.allColumns.forEach(col => {
      const colInCols = this.cols.find(c => c.field === col.field);
      if (colInCols && !colInCols.fixed) {
        col.visible = true;
        colInCols.visible = true;
      }
    });

    // Force array reference change to trigger change detection
    this.cols = [...this.cols];

    // لو التفاصيل مفتوحة، نحدثها
    if (this.expandedRow) {
      this.buildExpandedRowDetails(this.expandedRow);
    }
  }

  hideAllColumns() {
    this.allColumns.forEach(col => {
      const colInCols = this.cols.find(c => c.field === col.field);
      if (colInCols && !colInCols.fixed) {
        col.visible = false;
        colInCols.visible = false;
      }
    });

    // Force array reference change to trigger change detection
    this.cols = [...this.cols];

    // لو التفاصيل مفتوحة، نحدثها
    if (this.expandedRow) {
      this.buildExpandedRowDetails(this.expandedRow);
    }
  }

  toggleColumn(field: string) {
    const colInAll = this.allColumns.find(c => c.field === field);
    const colInCols = this.cols.find(c => c.field === field);

    if (colInAll && colInCols && !colInCols.fixed) {
      colInAll.visible = !colInAll.visible;
      colInCols.visible = colInAll.visible;

      // Force array reference change to trigger change detection
      this.cols = [...this.cols];

      // لو التفاصيل مفتوحة، نحدثها
      if (this.expandedRow) {
        this.buildExpandedRowDetails(this.expandedRow);
      }
    }
  }

  getNonFixedColumns() {
    return this.allColumns.filter(col => !col.fixed);
  }

  trackByField(index: number, col: any): string {
    return col.field;
  }

  setSortDirection(direction: number) {
    this.currentSortDirection = direction;
    this.applySorting();
  }

  getClassesByStatusId(statusId: number): string {
    switch (statusId) {
      case 5:
      case 625:
      case 627:
      case 629:
      case 1670:
      case 1671:
      case 1672:
      case 1673:
      case 18:
      case 9:
      case 1827:
      case 1:
      case 7:
      case 19:
      case 2877:
      case 2879:
      case 2880:
      case 2881:
        return 'text-yellow-900 border-[#704d00] bg-[#FEBC2E19]';
      case 20:
      case 2878:
        return 'text-[#4CAF50] border-[#4CAF50] bg-[#4CAF5019]';
      case 111:
      case 675:
        return 'text-red-800 border-[#F44336] bg-[#F4433619]';
      case 0:
      case 1674:
      case 6:
        return 'text-gray-700 border-[#707070] bg-[#70707024]';
      case 1977:
      case 1978:
      case 2776:
      case 2779:
      case 2780:
      case 2781:
      case 2782:
      case 2783:
      case 2784:
      case 2785:
      case 2786:
      case 2787:
      case 2788:
      case 2789:
      case 2790:
      case 2791:
      case 622:
        return 'text-[#000] border-[#000] bg-gray-100';
      default:
        return 'text-red-800 border-[#F44336] bg-[#F4433619]';
    }
    /* text-[#4CAF50] text-sm border-[#4CAF50] border bg-[#4CAF5019] */
  }

  setPaginationInfo(pagingInfo: any) {
    this.PageSize.set(pagingInfo.PageSize);
    this.TotalRows.set(pagingInfo.TotalRows);
    this.CurrentPage.set(pagingInfo.CurrentPage);
  }


  /* new search */
  isGlobalSearch = false;

  toggleAdvancedSearch() {
    this.isAdvancedSearch = !this.isAdvancedSearch;
    this.isSearchCollapsed = this.isAdvancedSearch ? true : false;
    this.isGlobalSearch = false;
  }

  toggleSearchView() {
    this.isSearchCollapsed = !this.isSearchCollapsed;
    this.isAdvancedSearch = false;
    this.isGlobalSearch = this.isSearchCollapsed ? true : false;
  }
  toggleGlobalSearch() {
    this.isGlobalSearch = !this.isGlobalSearch;
    this.isSearchCollapsed = this.isGlobalSearch ? true : false;
    this.isAdvancedSearch = false;
  }

  openAnalysisModel = output<any>();
  openRequestAnalysis(row: any) {
    this.showCustomLoader();
    let role = JSON.parse(sessionStorage.getItem('user')!).FkRoleID
    this.fileService.readRequestAnalysis({
      FKServiceID: row.ServiceID,
      FKProcessID: row.FkProcessID,
      FKCurrentStatusID: row.FkStatusID,
      FKRoleID: role,
      RequestID: row.RequestID
    }).subscribe((res: any) => {
      Swal.close();
      this.fileService.fileAnalysisData.set({ ...this.fileService.fileAnalysisData(), 'request': res })
      this.openAnalysisModel.emit(true)
    })
  }
}
