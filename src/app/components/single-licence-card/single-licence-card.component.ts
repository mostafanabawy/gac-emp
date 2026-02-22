import { Component, computed, effect, ElementRef, HostListener, input, output, QueryList, signal, ViewChild, ViewChildren } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { firstValueFrom, forkJoin } from 'rxjs';
import { AllApplicationsService } from 'src/app/service/all-applications.service';
import { FileActionsService } from 'src/app/service/file-actions.service';
import { LocalizationService } from 'src/app/service/localization.service';
import { MenuLinksService } from 'src/app/service/menu-links.service';
import { NewApplicationService } from 'src/app/service/new-application.service';
import { ServiceSelectService } from 'src/app/service/service-select.service';
import { WizardServiceService } from 'src/app/service/wizard-service.service';
import { reverseChevron, toggleAnimation } from 'src/app/shared/animations';
import { AppState, indexState } from 'src/types/auth.types';
import { Action, ActionGroup, FieldJson, LookupValue, NavigationTab, ServiceApiPayload } from 'src/types/newApplication.types';
import Swal, { SweetAlertOptions } from 'sweetalert2';

@Component({
  selector: 'app-single-licence-card',
  templateUrl: './single-licence-card.component.html',
  styleUrls: ['./single-licence-card.component.css'],
  animations: [toggleAnimation, reverseChevron]
})
export class SingleLicenceCardComponent {
  @ViewChildren('menu0, menu1, menu2, menu3') menus!: QueryList<ElementRef>;
  @ViewChildren('btn0, btn1, btn2, btn3') buttons!: QueryList<ElementRef>;
  noSort = () => 0;
  store!: indexState;
  allData = input<any>();
  evalRes = input<any>();
  navigationTabs = signal<any>([]);
  requestConfidence = signal<any>({});
  ratingAction = signal<Action | null>(null)
  page = input<any>();
  translations = signal<any>(null);
  allConfidences: any = [];
  actionCompleted = output<any>();
  servicesData = output<any>();
  activeIndex: number | null = null;
  btnRelatedServices = signal<any>([]);
  clickedActionTitle = signal<string>('');
  serviceSelectModalFlag = signal<any>('')
  singleLicenseCardData = input.required<{
    applicationType: string,
    stats: any,
    actions?: any
  }>()
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
            action.visible = this.checkEval(this.allData().RequestID, action.ActionDetailsID);
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
  constructor(
    private router: Router,
    private storeData: Store<AppState>,
    public allApplicationsService: AllApplicationsService,
    private newApplicationService: NewApplicationService,
    private localizationService: LocalizationService,
    private fileService: FileActionsService,
    private wizardService: WizardServiceService,
    private selectServiceModal: ServiceSelectService,
    private menuLinksService: MenuLinksService
  ) {
    this.initStore()
    this.translations.set(this.localizationService.getTranslations())
    effect(() => {
      if (this.allData()) {
        let action = this.allData().Actions?.find((item: any) => item.ActionID === 1984 || item.ActionID === 1985);
        if (action) {
          this.ratingAction.set(action);
        }
      }

    }, { allowSignalWrites: true })
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

  toggleDropdown(index: number): void {
    this.activeIndex = this.activeIndex === index ? null : index;
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
          data: payload, RequestID: this.allData().RequestID, pageName: this.store.locale === 'en' ? this.allData().ServiceTitleEn : this.allData().ServiceTitleAr,
          itemURL: 'Inbox/RequestData',
          newRequestData: null
        }
      });
    } else {
      this.router.navigate(['/Inbox/RequestData'], {
        state: {
          data: payload, RequestID: this.allData().RequestID, pageName: this.store.locale === 'en' ? this.allData().ServiceTitleEn : this.allData().ServiceTitleAr,
          itemURL: 'Inbox/RequestData',
          newRequestData: null,
          mainTab: this.allApplicationsService.mainTab,
          branchTab: this.allApplicationsService.branchTab
        }
      });
    }
  }

  private arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  isArabic: boolean = false;
  @ViewChild('element') elementRef!: ElementRef;
  checkDirection(element: HTMLElement): void {
    const text = element.textContent || '';
    this.isArabic = this.arabicRegex.test(text);
    console.log('Is Arabic:', this.isArabic);
    console.log('Text Content:', text);
  }
  showActivityLog() {

    this.allApplicationsService.initActivityLog({ ItemID: this.allData().RequestID }, this.allData().ApplicationNumber,
      this.store.locale === 'en' ? this.allData().FkStatusID_TitleEn : this.allData().FkStatusID_TitleAr,
      this.store.locale === 'en' ? this.allData().FkProcessID_TitleEn : this.allData().FkProcessID_TitleAr
    );
  }

  showRelatedRequests() {
    this.allApplicationsService.initRelatedRequests(this.allData().RequestID);
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

    // 1. Group EVERYTHING by groupID
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
  checkEval(requestID: string, actionDetailsID: number) {
    let evaluation = this.evalRes().find((item: any) => item.RequestID === requestID)
    if (!evaluation?.VisibleActions) {
      return false;
    }
    let action = evaluation.VisibleActions.find((item: any) => item.ActionDetailsID === actionDetailsID)
    return !!action;
  }

  async handleAction(action: Action, HasServiceID?: boolean) {

    if (action.ActionStyle === 2839) {
      this.newApplicationService.currentCardData.set(this.allData());
      if (action.ActionID === 1859) {
        this.allApplicationsService.initActivityLog({ ItemID: this.allData().RequestID },
          this.allData().ApplicationNumber,
          this.store.locale === 'en' ? this.allData().FkStatusID_TitleEn : this.allData().FkStatusID_TitleAr,
          this.store.locale === 'en' ? this.allData().FkProcessID_TitleEn : this.allData().FkProcessID_TitleAr
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
            // 1. Use await with firstValueFrom to wait for the result12
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
        this.executeAction(action, dataToSend, ui.NavigationTabs, undefined, undefined, newService);
      }
    })

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
        let isEn = this.store.locale === 'en';
        let ErrorMessageEn = action.BusinessRuleMessageEN!
        let ErrorMessageAR = action.BusinessRuleMessageAR!
        baseMessage = isEn
          ? ErrorMessageEn
          : ErrorMessageAR

        let buttonHtml: HTMLElement | string = '';
        let title = baseMessage;
        // If extra message exists → replace the placeholder 12
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
        pageName: this.store.locale === 'en' ? res.ServiceTitleEn : res.ServiceTitleAr,
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
  private evaluateAndExecuteAction(action: Action, dataToSend: any, employee?: any, row?: any, HasServiceID?: boolean | null): void {
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
  private executeAction(action: Action, dataToSend?: any, navigationTabs?: NavigationTab[] | null, employee?: any, row?: any,
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
        this.confirmAndPatchData(action, undefined, newService);
        break;
      case 2854: // Action Style: Open Dim 
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
      ActivityServiceID: newService!,
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
  private handleMoveEmployeeAction(action: Action, dataToSend: any, navigationTabs: NavigationTab[] | null, employee: any, row?: any): void {
    const currentTabFields = this.extractFields(navigationTabs);
    const fieldsNeeded = currentTabFields.find(field => field.InternalFieldName === 'FkMoveEmployeeID');

    const payload = {
      "FkMoveEmployeeID": fieldsNeeded?.LookupValues?.find(lookup => lookup.LookupID === employee!.ID)?.LookupID || null
    };

    if (action.HasConfirmMsg) {
      this.confirmAndServiceDataAction(payload, action, dataToSend, currentTabFields);
    } else {
      this.wizardService.serviceDataActionApi(payload, action, dataToSend, currentTabFields, this.allData()?.RequestID || row.RequestID).subscribe({
        next: (res: any) => {
          if (res.RequestID) {
            let msg = this.translations()?.allAppSuccess.label.replace('[ApplicationNumber]', res.ApplicationNumber);
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

    this.actionCompleted.emit(true);
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
    "FKProcessID"?: number,
    "ActivityServiceID": number | null
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



      let title: any;
      if (payload.ActivityServiceID) {
        title = this.store.locale === 'en' ?
          this.newApplicationService.processList().find((x: any) => x.FKServiceID === payload.ActivityServiceID && x.FKServiceID === this.allData().ServiceID)?.TitleEn
          : this.newApplicationService.processList().find((x: any) => x.FKServiceID === payload.ActivityServiceID && x.FKServiceID === this.allData().ServiceID)?.TitleAr
      }


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
            pageName: title || this.store.locale === 'en' ? this.allData().ServiceTitleEn : this.allData().ServiceTitleAr,
            newRequestData: this.newApplicationService.newRequestData(),
            defaultProcess: this.defaultProcess || res.FkProcessID,
            ActionDBName: payload.ActionDBName
          },
          queryParams: { ServiceID: newService || res.ServiceID }

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
      // Since we're using custom HTML for the content, it's best to use `html` and skip `title`. 12

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

  scrollActiveAnchorIntoView(activeElement: HTMLElement | null): void {
    if (!activeElement) {
      return;
    }

    // The anchor tag has an href attribute of '#{tab.tabID}' (i.e., '#sectionId')
    // We can select the anchor tag directly.
    // It's inside an <li> element. We can also select the <li> or the <a>.
    // Let's select the <a> tag as it's the direct target.

    // Find the anchor link element by its href attribute

    if (activeElement) {
      activeElement.scrollIntoView({
        // Adjust behavior for a smooth scroll if desired12
        behavior: 'smooth',
        // Align to the 'nearest' edge (top or bottom) so it scrolls only if necessary
        block: 'nearest'
      });
    }
  }

  chooseColorForStatus(key: string): string {
    if (key === 'Status') {
      switch (this.allData().FkStatusID) {
        case 10:
          return "text-green-700"
        case 630:
          return "text-red-700"
        case 624:
          return "text-blue-800"
        case 623:
          return "text-orange-700"
        case 1899:
          // Uses red-900/950 for a dark "Blood Red" or "Wine" look
          return 'text-red-950';
        default:
          return "text-red-800"
      }
    } else {
      return '';
    }
  }
  getNgClass(key: any): any {
    const baseClass = { 'direction-rtl': this.isArabic, 'direction-ltr': !this.isArabic };
    const dynamicClass = this.chooseColorForStatus(key) ? { [this.chooseColorForStatus(key)]: true } : {};
    return { ...baseClass, ...dynamicClass };
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
