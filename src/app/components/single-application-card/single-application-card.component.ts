import { Component, computed, effect, ElementRef, input, output, signal, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { forkJoin, of, switchMap, take, tap } from 'rxjs';
import { AllApplicationsService } from 'src/app/service/all-applications.service';
import { ApplicationDetailService } from 'src/app/service/application-detail.service';
import { FileActionsService } from 'src/app/service/file-actions.service';
import { LocalizationService } from 'src/app/service/localization.service';
import { MenuLinksService } from 'src/app/service/menu-links.service';
import { NewApplicationService } from 'src/app/service/new-application.service';
import { WizardServiceService } from 'src/app/service/wizard-service.service';
import { reverseChevron, toggleAnimation } from 'src/app/shared/animations';
import { AppState, indexState } from 'src/types/auth.types';
import { Action, ActionGroup, FieldJson, LookupValue, NavigationTab, ServiceApiPayload } from 'src/types/newApplication.types';
import Swal, { SweetAlertOptions } from 'sweetalert2';

let nextCardInstanceId = 0;
@Component({
  selector: 'app-single-application-card',
  templateUrl: './single-application-card.component.html',
  styleUrls: ['./single-application-card.component.css'],
  animations: [reverseChevron, toggleAnimation]
})
export class SingleApplicationCardComponent {
  allData = input<any>();
  noSort = () => 0;
  translations = signal<any>(null);
  evalRes = input<any>();
  navigationTabs = signal<any>([]);
  requestConfidence = signal<any>({});
  allConfidences: any = [];
  page = input<any>();
  singleApplicationCardData = input.required<{
    isStatus: string,
    date?: string,
    applicationType: string,
    'type'?: string,
    stats: any,
    actions: {
      names: string[],
      icons: string[]
    }
  }>()
  cardActions = computed(() => {
    if (this.newApplicationService.processList() && this.newApplicationService.processList().length > 0 && this.allData().Actions && this.allData().Actions.length > 0) {
      this.allData().Actions.forEach((action: Action) => {
        let singleActionProcess = this.newApplicationService.processList().filter((item: any) => {
          return item.ActionID === action.ActionID && item.FKServiceID === this.allData().FKServiceID
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
  isModalStartOpened = signal<boolean>(false)
  actionCompleted = output<any>();
  isModalCompletedOpened = signal<boolean>(false)
  cardBaseId!: string;
  store!: indexState;
  constructor(
    private applicationDetails: ApplicationDetailService,
    private allApplicationsService: AllApplicationsService,
    private newApplicationService: NewApplicationService,
    private router: Router,
    private storeData: Store<AppState>,
    private localizationService: LocalizationService,
    private fileService: FileActionsService,
    private wizardService: WizardServiceService,
    private menuLinksService: MenuLinksService
  ) {
    this.initStore();
    this.translations.set(this.localizationService.getTranslations());
    this.cardBaseId = `card-${nextCardInstanceId++}`;
    effect(() => {
      let data = this.singleApplicationCardData();
      this.statusClasses = this.getClassesByStatusId(this.allData().FkStatusID);
      this.borderClasses = this.getBorderClassesByStatusId(this.allData().FkStatusID);
    }, { allowSignalWrites: true })

  }
  ngOnInit() {
    this.statusClasses = this.getClassesByStatusId(this.allData().FkStatusID);
    this.borderClasses = this.getBorderClassesByStatusId(this.allData().FkStatusID);

  }
  ngAfterViewInit(): void {
    // Check if the element reference is available before calling the method
    if (this.elementRef) {
      this.checkDirection(this.elementRef.nativeElement);
    }
  }
  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }
  sendCardData() {
    this.applicationDetails.setApplicationDetail(this.applicationDetails.readyTestData())
    this.applicationDetails.cardData.set(this.singleApplicationCardData())
  }
  openFeesModal() {
    this.isModalStartOpened.set(true)
  }
  closeFeesModal(event: any) {
    this.isModalStartOpened.set(false)
    this.isModalCompletedOpened.set(true)
  }
  navigateToDetails() {
    let roleID = JSON.parse(sessionStorage.getItem('user')!).FkRoleID
    const payload: ServiceApiPayload = {
      FKServiceID: this.allData().ServiceID,
      FKProcessID: this.allData().FkProcessID,
      FKCurrentStatusID: this.allData().FkStatusID,
      FKRoleID: roleID
    };
    if (this.page() === 'complaints') {
      this.router.navigate(['/ComplaintsRequests/RequestData'], {
        state: {
          data: payload, RequestID: this.allData().RequestID,
          pageName: this.store.locale === 'en' ? this.allData().ServiceTitleEn : this.allData().ServiceTitleAr,
          itemURL: 'Inbox/RequestData',
          applicationNumber: this.allData().ApplicationNumber,
          newRequestData: null
        }
      });
    } else {
      this.router.navigate(['/Inbox/RequestData'], {
        state: {
          data: payload, RequestID: this.allData().RequestID,
          pageName: this.store.locale === 'en' ? this.allData().ServiceTitleEn : this.allData().ServiceTitleAr,
          itemURL: 'Inbox/RequestData',
          applicationNumber: this.allData().ApplicationNumber,
          newRequestData: null,
          mainTab: this.allApplicationsService.mainTab,
          branchTab: this.allApplicationsService.branchTab
        }
      });
    }
  }
  statusClasses: string = '';
  private getClassesByStatusId(statusId: number): string {
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
      case 2096:
      case 2097:
      case 2102:
      case 2103:
        return 'text-yellow-900 border-[#704d00] bg-[#FEBC2E19]';
      case 624:
      case 2099:
        return "text-blue-800 border-[#1E88E5] bg-[#1E88E519]";
      case 20:
      case 2878:
      case 2098:
        return 'text-[#4CAF50] border-[#4CAF50] bg-[#4CAF5019]';
      case 2105:
        return 'text-purple-700 border-[#9C27B0] bg-[#9C27B019]';
      case 111:
      case 675:
      case 2104:
      case 2106:
      case 2100:
      case 2101:
        return 'text-red-800 border-[#F44336] bg-[#F4433619]';
      case 0:
      case 2:
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
      case 2900:
      case 2901:
      case 2902:
        return 'text-[#000] border-[#000] bg-gray-100';
      default:
        return 'text-red-800 border-[#F44336] bg-[#F4433619]';
    }
    /* text-[#4CAF50] text-sm border-[#4CAF50] border bg-[#4CAF5019] */
  }
  borderClasses!: string;
  private getBorderClassesByStatusId(statusId: number): string {
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
      case 2096: // Added
      case 2097: // Added
      case 2102: // Added
      case 2103: // Added
        return 'border-[#FEBC2E]';

      case 624:  // Added (Blue group)
      case 2099: // Added
        return "border-[#1E88E5]";

      case 20:
      case 2878:
      case 2098: // Added
        return 'border-[#4CAF50]';

      case 2105: // Added (Purple group)
        return 'border-[#9C27B0]';

      case 111:
      case 675:
      case 2104: // Added
      case 2106: // Added
      case 2100: // Added
      case 2101: // Added
        return 'border-[#F44336]';

      case 0:
      case 2:
      case 1674:
      case 6:
        return 'border-[#707070]';

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
      case 2900: // Added
      case 2901: // Added
      case 2902: // Added
        return 'border-[#000]';

      default:
        return 'border-[#FE6058]';
    }
  }
  @ViewChild('element') elementRef!: ElementRef;
  private arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  isArabic: boolean = false;
  checkDirection(element: HTMLElement): void {
    const text = element.textContent || '';
    this.isArabic = this.arabicRegex.test(text);
  }

  showActivityLog() {
    this.allApplicationsService.initActivityLog({ ItemID: this.allData().RequestID }, this.allData().ApplicationNumber, this.store.locale === 'en' ? this.allData().FkStatusID_TitleEn : this.allData().FkStatusID_TitleAr, this.store.locale === 'en' ? this.allData().FkProcessID_TitleEn : this.allData().FkProcessID_TitleAr);
  }
  showRelatedRequests() {
    this.allApplicationsService.initRelatedRequests(this.allData().RequestID);
  }

  chackEval(requestID: string, actionDetailsID: number) {
    let evaluation = this.evalRes().find((item: any) => item.RequestID === requestID)
    if (!evaluation?.VisibleActions) {
      return false;
    }
    let action = evaluation.VisibleActions.find((item: any) => item.ActionDetailsID === actionDetailsID)
    return !!action;
  }

  handleAction(action: Action, value?: any, employee?: any) {

    if (action.ActionStyle === 2839) {
      if (action.ActionID === 1859) {
        this.allApplicationsService.initActivityLog({ ItemID: this.allData().RequestID },
          this.allData().ApplicationNumber,
          this.store.locale === 'en' ? this.allData().FkStatusID_TitleEn : this.allData().FkStatusID_TitleAr,
          this.store.locale === 'en' ? this.allData().FkProcessID_TitleEn : this.allData().FkProcessID_TitleAr
        );
        this.newApplicationService.currentCardData.set(this.allData());
      }
      if (action.ActionID === 1865) {
        this.allApplicationsService.initRelatedRequests(this.allData().RequestID);
        this.newApplicationService.currentCardData.set(this.allData());
      }
      if (action.ActionID === 1850) {
        this.newApplicationService.auditLog({ RequestID: this.allData().RequestID }).subscribe(res => {
          this.newApplicationService.auditData.set(res.result.items);
          this.newApplicationService.auditDataMap = this.newApplicationService.auditData().reduce((acc: any, historyItem: any) => {
            acc[historyItem.FieldName] = historyItem;
            return acc;
          }, {} as Record<string, any>);
          this.newApplicationService.currentCardData.set(this.allData());
          this.newApplicationService.isAuditData.set(true);
        })
      }
      return;
    }
    if (action.SpecialAction) {

      this.handleSpecialAction(action);
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
    ]).subscribe(([ui, dataToSend]) => {
      this.navigationTabs.set(ui.NavigationTabs);

      if (action.ClickConditionId) {
        this.evaluateAndExecuteAction(action, dataToSend, employee);
      } else if (action.BusinessRuleFun) {
        this.newApplicationService.getRequest(this.allData().RequestID).subscribe((res: any) => {
          this.businessConditionAndExecuteAction(action, res);
        })
      } else {
        // If no ClickCondition, execute the action immediately
        this.executeAction(action, dataToSend, ui.NavigationTabs, employee);
      }
    })
  }

  private businessConditionAndExecuteAction(action: Action, requestData: any) {
    const currentTabFields = this.extractFields(this.navigationTabs());
    this.wizardService.businessCondition(requestData, currentTabFields, action.BusinessRuleColmns, requestData.RequestID, action.BusinessRuleFun, this.allData().ServiceID).subscribe((res) => {
      if (res[0]?.CanContinue) {
        this.executeAction(action, requestData, this.navigationTabs());
      } else {
        Swal.fire({
          icon: 'error',
          title: this.store.locale === 'en' ? action.BusinessRuleMessageEN?.replace('[ApplicationNumber]', `<button class="text-primary underline cursor-pointer" id="appNum" dir="ltr">${res[0].ExtraMessage}</button>`) : action.BusinessRuleMessageAR?.replace('[ApplicationNumber]', `<button class="text-primary underline cursor-pointer" id="appNum" dir="ltr">${res[0].ExtraMessage}</button>`),
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
        pageName: this.store.locale === 'en' ? res.ServiceTitleEn : res.ServiceTitleAr,
        applicationNumber: res.ApplicationNumber,
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
  private evaluateAndExecuteAction(action: Action, dataToSend: any, employee?: any, row?: any): void {
    this.newApplicationService.evaluateClickConditionApi({
      RequestID: this.allData()?.RequestID || row.RequestID,
      ActionDetailsID: action.ActionDetailsID,
      ClickConditionId: action.ClickConditionId
    }).subscribe((res) => {
      if (res.IsTrue) {
        if (action.BusinessRuleFun) {
          this.newApplicationService.getRequest(this.allData().RequestID).subscribe((res: any) => {
            this.businessConditionAndExecuteAction(action, res);
          })
        } else {
          this.executeAction(action, dataToSend, this.navigationTabs(), employee);
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
  private executeAction(action: Action, dataToSend: any, navigationTabs: NavigationTab[] | null, employee?: any, row?: any): void {
    if (action.ActionID === 1877) {
      this.handleMoveEmployeeAction(action, dataToSend, navigationTabs, employee, row);
    } else {
      this.handleRegularAction(action, dataToSend, navigationTabs);
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
            let msg: any;
            if (fieldsNeeded) {
              msg = this.translations()?.allAppSuccess.label.replace('[ApplicationNumber]', res.ApplicationNumber);
            } else {
              if (action.SuperMsgEn?.includes('ApplicationNumber')) {
                msg = this.store.locale === 'en' ? (action.SuperMsgEn?.includes('ApplicationNumber') ? action.SuperMsgEn.substring(0, action.SuperMsgEn.lastIndexOf('ApplicationNumber')) + `<span dir="ltr">${res.ApplicationNumber}</span>` + action.SuperMsgEn.substring(action.SuperMsgEn.lastIndexOf('ApplicationNumber') + 'ApplicationNumber'.length) : action.SuperMsgEn) : (action.SuperMsgAr?.includes('ApplicationNumber') ? action.SuperMsgAr.substring(0, action.SuperMsgAr.lastIndexOf('ApplicationNumber')) + `<span dir="ltr">${res.ApplicationNumber}</span>` + action.SuperMsgAr.substring(action.SuperMsgAr.lastIndexOf('ApplicationNumber') + 'ApplicationNumber'.length) : action.SuperMsgAr);
              } else if (action.SuperMsgEn?.includes('ApprovedLicense')) {
                msg = this.store.locale === 'en' ? (action.SuperMsgEn?.includes('ApprovedLicense') ? action.SuperMsgEn.substring(0, action.SuperMsgEn.lastIndexOf('ApprovedLicense')) + `<span dir="ltr">${res.ApprovedLicense}</span>` + action.SuperMsgEn.substring(action.SuperMsgEn.lastIndexOf('ApprovedLicense') + 'ApprovedLicense'.length) : action.SuperMsgEn) : (action.SuperMsgAr?.includes('ApprovedLicense') ? action.SuperMsgAr.substring(0, action.SuperMsgAr.lastIndexOf('ApprovedLicense')) + `<span dir="ltr">${res.ApprovedLicense}</span>` + action.SuperMsgAr.substring(action.SuperMsgAr.lastIndexOf('ApprovedLicense') + 'ApprovedLicense'.length) : action.SuperMsgAr);
              } else {
                msg = this.store.locale === 'en' ? action.SuperMsgEn : action.SuperMsgAr
              }
            }
            this.actionCompleted.emit(true);
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
          let msg = this.translations()?.oneAppFailed.label.replace('[ApplicationNumber]', `<span dir="ltr">${this.allData().ApplicationNumber}</span>`);
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
  private handleSpecialAction(action: Action): void {
    switch (action.ActionStyle) {
      case 2840: // Action Style: Execute API call with optional confirmation
        this.confirmAndPatchData(action);
        break;
      case 2854: // Action Style: Open Dim Fields
        Swal.close();
        this.navigateToDetails();
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
    const locale = this.store.locale;

    switch (action.ActionID) {
      case 1859: // Activity Log
        this.allApplicationsService.initActivityLog(
          { ItemID: requestData.RequestID },
          requestData.ApplicationNumber,
          locale === 'en' ? requestData.FkStatusID_TitleEn : requestData.FkStatusID_TitleAr,
          locale === 'en' ? requestData.FkProcessID_TitleEn : requestData.FkProcessID_TitleAr
        );
        this.newApplicationService.currentCardData.set(this.allData());
        break;
      case 1865: // Related Requests
        this.allApplicationsService.initRelatedRequests(requestData.RequestID);
        this.newApplicationService.currentCardData.set(this.allData());
        break;
      case 1850: // Audit Data
        this.newApplicationService.isAuditData.set(true);
        this.newApplicationService.currentCardData.set(this.allData());
        break;
    }
  }

  /**
 * Determines whether to show a confirmation dialog before calling `patchDataForNewApplication`.
 * Used primarily for ActionStyle 2840.
 * * @param action The Action object.
 */
  private confirmAndPatchData(action: Action, row?: any): void {
    const patchPayload = {
      RequestID: this.allData()?.RequestID || row.RequestID,
      ActionDBName: action.ActionDBName!,
      FKProcessID: this.newApplicationService.defaultProcess() || null
    };

    if (action.HasConfirmMsg) {
      Swal.close();
      Swal.fire({
        title: this.translations()?.swalConfirmAppMsgTitle.label,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: this.translations()?.normalConfirmMsgBtn.label,
        cancelButtonText: this.translations()?.normalNoMsgBtn.label,
      }).then((result) => {
        if (result.value) {
          return this.patchDataForNewApplication(patchPayload, action);
        }
      });
    } else {
      this.patchDataForNewApplication(patchPayload, action);
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
  private handleMoveEmployeeAction(action: Action, dataToSend: any, navigationTabs: NavigationTab[] | null, employee: any, row?: any): void {
    const currentTabFields = this.extractFields(navigationTabs);
    const fieldsNeeded = currentTabFields.find(field => field.InternalFieldName === 'FkMoveEmployeeID');

    const payload = {
      "FkMoveEmployeeID": fieldsNeeded?.LookupValues?.find(lookup => lookup.LookupID === employee!.ID)?.LookupID || null
    };

    if (action.HasConfirmMsg) {
      this.confirmAndServiceDataAction(payload, action, dataToSend, currentTabFields);
    } else {
      this.wizardService.serviceDataActionApi(payload, action, dataToSend, currentTabFields, this.allData()?.RequestID || row.RequestID).subscribe((res: any) => {
        if (res.RequestID) {
          let msg = this.translations()?.allAppSuccess.label.replace('[ApplicationNumber]', res.ApplicationNumber);
          Swal.close();
          Swal.fire({
            icon: 'success',
            title: msg,
            showConfirmButton: true,
            confirmButtonText: this.translations()?.validationMsgBtn.label
          })
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

  }

  /**
 * Formats the success message string, replacing placeholders like 'ApplicationNumber' or 'ApprovedLicense' 
 * with the actual values from the response, supporting both English and Arabic (dir="ltr" span).
 * * @param res The API response containing dynamic values (ApplicationNumber/ApprovedLicense).
 * @param action The Action object containing the SuperMsgEn/SuperMsgAr templates.
 * @returns The formatted success message string.
 */
  private formatSuccessMessage(res: any, action: Action): any {
    const locale = this.store.locale;
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
    const locale = this.store.locale;

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
      // Fallback for unstructured errors12
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
      title: this.store.locale === 'en' ? res.ActionMessageEn : res.ActionMessageAr,
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

  servicesData = output<any>();
  btnRelatedServices = signal<any>([]);
  setDefaultProcess(processID: any, action: Action, item: LookupValue) {
    this.defaultProcess = processID
    let processData = this.newApplicationService.processList().find((item: any) => item.FKProcessID === processID && item.FKServiceID === this.allData().ServiceID)
    if (processData && processData.HasServiceID) {
      this.newApplicationService.getActivityServices(this.allData().RequestID).subscribe((servicesData: any) => {
        this.btnRelatedServices.set(servicesData.services)
        this.newApplicationService.defaultProcess.set(processID)
        this.servicesData.emit({
          services: servicesData.services,
          title: this.store.locale === 'en' ? item?.TitleEn : item?.TitleAr
        })

        this.handleAction(action, true)
      })
    } else {
      this.newApplicationService.defaultProcess.set(processID)
      this.handleAction(action)
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
  }, action: Action) {
    this.wizardService.getSpActionRequest(payload).subscribe((res: any) => {
      console.log(res);
      this.newApplicationService.newRequestData.set(res)
      this.newApplicationService.CPResultResponse.set(null)
      this.newApplicationService.CRResultResponse.set(null)
      this.newApplicationService.requestData.set(null);
      if (this.newApplicationService.newRequestData().Attachments) {
        this.transformAttachmentData(this.newApplicationService.newRequestData());
      }
      this.transformUpdateData(this.newApplicationService.newRequestData());

      let role = JSON.parse(sessionStorage.getItem('user')!).FkRoleID

      let routingPayload: ServiceApiPayload = {
        FKCurrentStatusID: res.FkStatusID,
        FKProcessID: this.defaultProcess || res.FkProcessID,
        FKRoleID: role,
        FKServiceID: res.ServiceID,
      }
      Swal.close();
      this.router.navigate(['/Services/NewRequest/spAction'],
        {
          state: {
            data: routingPayload,
            itemURL: `Services/NewRequest?ServiceID=${res.ServiceID}`,
            pageName: this.store.locale === 'en' ? this.allData().ServiceTitleEn : this.allData().ServiceTitleAr,
            applicationNumber: res.ApplicationNumber,
            newRequestData: res,
            ActionDBName: payload.ActionDBName
          },
          queryParams: { ServiceID: res.ServiceID }

        }
      )

    })
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

  openMenus: { [key: string]: boolean } = {};
  toggleMenu(key: string) {
    this.openMenus = { [key]: !this.openMenus[key] };
  }
  filteredProcessList(action: Action) {
    let filteredProcessList = this.newApplicationService.processList().filter(
      (item: any) => item.ActionID === action.ActionID && item.FKServiceID === this.allData().ServiceID
    ).map((item: any) => item.FKProcessID);

    let val = this.allApplicationsService.lookupValues().filter((lookup: any) => filteredProcessList.includes(lookup.LookupID))
    return this.allApplicationsService.lookupValues().filter((lookup: any) => filteredProcessList.includes(lookup.LookupID))
  }

  groupedActions: Record<number, ActionGroup> = {};
  groupActions(actions: Action[]) {
    const groupedMap = new Map<number, ActionGroup>();
    const topLevelItems: (Action | ActionGroup)[] = [];

    // 1. Group EVERYTHING by groupID12
    actions.forEach(action => {
      if (action.groupID !== null && action.groupID !== undefined) {
        const groupKey = action.groupID;
        if (!groupedMap.has(groupKey)) {
          groupedMap.set(groupKey, {
            isDropdown: true,
            groupID: groupKey,
            groupTitleAR: action.groupTitleAR!,
            groupTitleEN: action.groupTitleEN!,
            ActionSortOrder: action.ActionSortOrder,
            actions: []
          });
        }
        groupedMap.get(groupKey)!.actions.push(action);
      } else {
        // It's a single action for now
        topLevelItems.push({ ...action });
      }
    });

    // 2. Add the created groups to our topLevelItems list
    groupedMap.forEach(group => {
      // Flatten groups that only have 1 item
      if (group.actions.length === 1) {
        const singleAction = group.actions[0];
        singleAction.groupID = null; // Remove grouping metadata
        topLevelItems.push(singleAction);
      } else {
        // Sort internal actions and add the group
        group.actions.sort((a, b) => a.ActionSortOrder - b.ActionSortOrder);
        topLevelItems.push(group);
      }
    });

    // 3. Sort the combined list so we know what's "first"
    topLevelItems.sort((a, b) => a.ActionSortOrder - b.ActionSortOrder);

    // 4. Apply the "More" logic (Max 4 slots)
    if (topLevelItems.length <= 4) {
      return topLevelItems;
    }

    // If more than 4, take the first 3 and put the rest in "More"
    const finalDisplay = topLevelItems.slice(0, 3);
    const remainingItems = topLevelItems.slice(3);

    const moreGroup: ActionGroup | any = {
      isDropdown: true,
      groupID: 534565, // Your "More" ID
      groupTitleAR: 'المزيد',
      groupTitleEN: 'More',
      isMore: true,
      ActionSortOrder: 9999,
      actions: []
    };

    // Extract all individual actions from the remaining groups/buttons
    remainingItems.forEach(item => {
      if ('actions' in item) {
        // If the item is already a group, add its children to "More"
        moreGroup.actions.push(...item.actions);
      } else {
        // If it's a single action, add it directly
        moreGroup.actions.push(item);
      }
    });

    finalDisplay.push(moreGroup);
    return finalDisplay;
  }
  getStatName(key: any) {
    return `${this.translations()[key].label}`
  }
  openAnalysisModel = output<any>();
  openRequestAnalysis() {
    this.showCustomLoader();
    let role = JSON.parse(sessionStorage.getItem('user')!).FkRoleID
    this.fileService.readRequestAnalysis({
      FKServiceID: this.allData().ServiceID,
      FKProcessID: this.allData().FkProcessID,
      FKCurrentStatusID: this.allData().FkStatusID,
      FKRoleID: role,
      RequestID: this.allData().RequestID
    }).subscribe((res: any) => {
      Swal.close();
      this.fileService.fileAnalysisData.set({ ...this.fileService.fileAnalysisData(), 'request': res })
      this.openAnalysisModel.emit(true)
    })
  }
}
