import { ChangeDetectorRef, Component, computed, effect, ElementRef, HostListener, inject, Injector, QueryList, runInInjectionContext, signal, ViewChild, ViewChildren, } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, ActivatedRouteSnapshot, DetachedRouteHandle, Params, Router, RouteReuseStrategy } from '@angular/router';
import { Store } from '@ngrx/store';
import { QuillEditorComponent } from 'ngx-quill';
import { combineLatest, debounceTime, distinctUntilChanged, filter, firstValueFrom, map, of, pairwise, skip, startWith, Subject, Subscription, switchMap, take, takeUntil, tap } from 'rxjs';
import { AllApplicationsService } from 'src/app/service/all-applications.service';
import { AuthService } from 'src/app/service/auth.service';
import { ConfirmModalService } from 'src/app/service/confirm-modal.service';
import { FileActionsService } from 'src/app/service/file-actions.service';
import { LoaderService } from 'src/app/service/loader.service';
import { LocalizationService } from 'src/app/service/localization.service';
import { MenuLinksService } from 'src/app/service/menu-links.service';
import { NewApplicationService } from 'src/app/service/new-application.service';
import { ServiceSelectService } from 'src/app/service/service-select.service';
import { WizardServiceService } from 'src/app/service/wizard-service.service';
import { reverseChevron, slideDownUp, toggleAnimation } from 'src/app/shared/animations';
import { CustomValidators } from 'src/app/validators/custom-validators';
import { AppState } from 'src/types/auth.types';
import { Action, ActionDetail, ActionGroup, FieldJson, GetServiceFieldsByActionsApiResponse, LookupValue, NavigationTab, ResponseBody, ServiceApiPayload, TableServiceField, TabSection } from 'src/types/newApplication.types';
import Swal, { SweetAlertOptions } from 'sweetalert2';


interface ApplicationTab {
    id: number;
    title: string;
    content: string;
    icon: string;
    tabSections: any;
    isActive: boolean;
    isCompleted: boolean;
    isAccessible: boolean;
    tabID?: number;
    aiTabOrder: number;
}
interface UploadedFile {
    name: string;
    size: number;
    type: string;
    uploadDate: Date;
    progress: number;
    status: 'uploading' | 'completed' | 'error';
    rawFile: File; // <--- NEW: Store the actual File object here
}

@Component({
    selector: 'app-application',
    templateUrl: './application.component.html',
    animations: [toggleAnimation, reverseChevron, slideDownUp],

})
export class ApplicationComponent {

    store!: AppState;

    sidebarCollapsed: boolean = false;
    isMobileScreen = false;
    businessError: any;
    actionBusinessError: any;
    /* aiPopupAnswer = signal<string>('');
    aiPopupFirstInitFlag = signal(true); */
    reviewAndRemarksModalOpen = signal<boolean>(false);
    @ViewChild('modal1') modal1!: any;
    navigationTabs = signal<NavigationTab[] | null>([]);
    actions: Action[] = [];
    currentTabIndex = signal<number>(1);
    wizardForm!: FormGroup | null;
    btnRelatedServices = signal<any>([]);
    private _activeSection: string | null = null;
    currentStorageKey: any;
    firstCalculate = true;
    isPaymentMsg: any;
    applicationNumber: any;
    clickedActionTitle = signal<any>(null);
    isPaymentPending: any;
    set activeSection(id: string | null) {
        // Only trigger the scroll logic if the section has actually changed
        if (this._activeSection !== id) {
            this._activeSection = id;

            // 2. Call the function to scroll the anchor into view
            this.scrollActiveAnchorIntoView(id);
        }
    }
    get activeSection(): string | null {
        return this._activeSection;
    }
    pageName!: string;
    applicationTabs!: ApplicationTab[];
    tabsRendered = false;
    cpSignal$!: any;
    @ViewChild(QuillEditorComponent) editorComponent!: QuillEditorComponent;
    currentTabIsValid: any = {
        cr: true,
        cp: true
    };
    allConfidences: any = [];
    content2 = ``
    private getUIResponse = signal<ResponseBody | null>(null);
    // Store the dynamic rules loaded from the API, keyed by ServiceFieldID
    private dynamicValidationRules: { [serviceFieldId: number]: ActionDetail } = {}; // Changed type to ActionDetail
    private ServiceFieldsByActionsApiResponse!: GetServiceFieldsByActionsApiResponse;
    translations = signal<any>(null);
    editApp = signal<any>('');
    apiBody: ServiceApiPayload | any = {
        FKServiceID: null,
        FKProcessID: null,
        FKCurrentStatusID: null,
        FKRoleID: null,
        RequestID: null,
        SpActionName: null
    };
    requestID!: string;
    isPopup: boolean = false;
    apiLoading: boolean = false;
    isSection: any = {};
    private hasPatchedCR = false;
    private hasPatchedCP = false;
    private confirmModalSubscription?: Subscription;
    // Use `inject` to get the injector
    private injector = inject(Injector);
    breadCrumb: any;
    itemURL: any;
    GDXStarterFlag: boolean = false;
    calcApiLoading = false;
    businesssp_GetSecondaryActivity_ByArea: FieldJson[] | null = null;
    businessGetRequestDataFor_5014: FieldJson[] | null = null;
    businessGetRequestDataFor_7002: FieldJson[] | null = null;
    sectionFieldCount = signal<any>({});
    feeAPIName = signal<any>('');
    requestConfidence = signal<any>({});
    displayActions = signal<any>([]);


    /* this.aiPopupAnswer() === 'yes' ? a!.AITabOrder - b!.AITabOrder : */
    currentPhase = computed<any>(() => {
        return this.phaseIDs().find(phase => phase.LookupID === this.currentPhaseIndex())
    })
    currentPhaseIndex = signal(0);
    currentTab = computed<NavigationTab | null>(() => {
        if (this.phaseIDs() && this.phaseIDs()!.length > 0) {
            return this.phasesWithTabs()[this.currentPhaseIndex()][this.currentTabIndex() - 1];
        }
        if (this.visibleNavigationTabs()) {
            console.log(this.visibleNavigationTabs())
            return this.visibleNavigationTabs()!.sort((a, b) => {
                return a.TabOrder - b.TabOrder;
            })![this.currentTabIndex() - 1];
        } else {
            return null;
        }
    })


    currentTabSections = computed<TabSection[]>(() => {

        return this.currentTab ? this.currentTab()!.TabSections.filter((section) => {
            const counter = this.sectionFieldCount()[section.FKNavigationTabID];
            return counter ? counter[section.SectionID].hidden < counter[section.SectionID].total : true;
        }).sort((a, b) => a.SectionOrder - b.SectionOrder) : [];

    })
    private static instanceCounter = 0;
    constructor(
        public fb: FormBuilder,
        private router: Router,
        private route: ActivatedRoute,
        private storeData: Store<AppState>,
        private loaderService: LoaderService,
        public newApplicationService: NewApplicationService,
        private wizardService: WizardServiceService,
        private localizationService: LocalizationService,
        private cdr: ChangeDetectorRef,
        private confirmModalService: ConfirmModalService,
        private selectServiceModal: ServiceSelectService,
        public menuLinksService: MenuLinksService,
        public allApplicationService: AllApplicationsService,
        private fileService: FileActionsService

    ) {
        // Track previous values
        let prevApi1: any = null;
        let prevApi2: any = null;

        /* effect(() => {
            if (!this.GDXStarterFlag) {
                return;
            }

            const currentApi1 = this.newApplicationService.CPResultResponse();
            const currentApi2 = this.newApplicationService.CRResultResponse();

            const api1Changed = currentApi1 !== prevApi1;
            const api2Changed = currentApi2 !== prevApi2;

            if (api2Changed || (api1Changed && api2Changed) && this.getUIResponse()) {
                const allFields: FieldJson[] = [];
                this.visibleNavigationTabs()!.forEach((tab) => {
                    tab.TabSections.forEach((section) => {
                        allFields.push(...section.FieldsJson.filter((field) => field.FieldType === 8));
                    });
                });
                allFields.forEach((field) => {
                    let formArray = this.wizardForm!.get(field.InternalFieldName) as FormArray;
                    if (formArray) {
                        formArray.controls.splice(0, formArray.controls.length - 1);
                    }
                })
                this.newApplicationService.rowsFromApi.set([]);
            }



            prevApi1 = currentApi1;
            prevApi2 = currentApi2;

        }, { allowSignalWrites: true });

        effect(() => {
            if (!this.GDXStarterFlag) {
                return;
            }
            if (this.getUIResponse()) {
                const allFields: FieldJson[] = [];
                this.visibleNavigationTabs()!.forEach((tab) => {
                    tab.TabSections.forEach((section) => {
                        allFields.push(...section.FieldsJson);
                    });
                })
                if (!this.newApplicationService.CPResultResponse()) {
                    allFields.filter((field) => field.FieldAddress.includes('GDX.CP')).forEach((field) => {
                        let control = this.wizardForm!.get(field.InternalFieldName)
                        if (field.FieldType === 6 || field.FieldType === 19 || field.FieldType === 4 || field.FieldType === 5) {
                            control?.patchValue(field.LookupValues![0].LookupID);
                        } else if (field.FieldType === 8) {
                            const controlFormArray = control as FormArray;
                            const groups = controlFormArray.controls;
                            for (let i = 0; i < groups.length - 1; i++) {
                                controlFormArray.removeAt(i);
                            }
                        } else {
                            control?.patchValue('');
                        }
                    })
                }
            }
        }, { allowSignalWrites: true })
        effect(() => {
            if (!this.GDXStarterFlag) {
                return;
            }
            if (this.getUIResponse()) {
                const allFields: FieldJson[] = [];
                this.visibleNavigationTabs()!.forEach((tab) => {
                    tab.TabSections.forEach((section) => {
                        allFields.push(...section.FieldsJson);
                    });
                })
                if (!this.newApplicationService.CRResultResponse()) {
                    allFields.filter((field) => field.FieldAddress.includes('GDX.CR')).forEach((field) => {
                        let control = this.wizardForm!.get(field.InternalFieldName)
                        if (field.FieldType === 6 || field.FieldType === 19 || field.FieldType === 4 || field.FieldType === 5) {
                            control?.patchValue(field.LookupValues![0].LookupID);
                        } else if (field.FieldType === 8) {
                            const controlFormArray = control as FormArray;
                            const groups = controlFormArray.controls;
                            for (let i = 0; i < groups.length - 1; i++) {
                                controlFormArray.removeAt(i);
                            }
                        } else {
                            control?.patchValue('');
                        }
                    })
                }
            }
        }, { allowSignalWrites: true }) */

        /*    if (!this.editApp() || this.apiBody.FKCurrentStatusID === 2 || this.apiBody.FKCurrentStatusID === 0) {
               effect(() => {
                   let answer = this.aiPopupAnswer();
                   if (answer === 'yes' && this.tabsRendered) {
                       this.navigationTabs.set([...this.navigationTabs()!].sort((a, b) => a.AITabOrder - b.AITabOrder));
                       this.currentTabIndex.set(1);
                       this.visibleTabs.set(this.visibleTabs()!.sort((a, b) => a.aiTabOrder - b.aiTabOrder));
                       this.visibleTabs.update(tabs => {
                           if (tabs && tabs.length > 0) {
                               tabs![0].isActive = true;
                               tabs![0].isAccessible = true;
                           }
                           return tabs;
                       })
                       this.cdr.markForCheck()
                       this.tabsRendered = false;
                   } else if (answer === 'no' && this.tabsRendered) {
                       this.navigationTabs!.update((tabs) => {
                           return tabs!.sort((a, b) => a.TabOrder - b.TabOrder)
                       });
                       this.currentTabIndex.set(1);
                       this.visibleTabs.set(this.visibleTabs()!.sort((a, b) => a.id - b.id));
                       this.visibleTabs.update(tabs => {
                           if (tabs && tabs.length > 0) {
                               tabs![0].isActive = true;
                               tabs![0].isAccessible = true;
                           }
                           return tabs;
                       })
                       this.tabsRendered = false;
                   }
               }, { allowSignalWrites: true });
   
           } */




        this.initStore();
        this.translations.set(this.localizationService.getTranslations());

        effect(() => {
            if ((!this.editApp() || this.apiBody.FKCurrentStatusID === 0 || this.apiBody.FKCurrentStatusID === 2 ||
                !this.apiBody.FKCurrentStatusID) && this.getUIResponse()) {
                const allFields: FieldJson[] = [];
                this.visibleNavigationTabs()!.forEach((tab) => {
                    tab.TabSections.forEach((section) => {
                        allFields.push(...section.FieldsJson);
                    });
                });

                allFields.forEach((field) => {
                    if ((field.FieldType === 8) && field.ApiFieldAddress) {
                        field.TableServiceFields!.forEach((tableField) => {
                            if (tableField.FieldAddress && (tableField.FieldAddress.includes('GDX.CR') || tableField.FieldAddress.includes('GDX.CP'))) {
                                this.setupEffect(tableField);
                            }
                        })
                    } else {
                        if (field.FieldAddress.includes('GDX.CR') || field.FieldAddress.includes('GDX.CP')) {
                            this.setupEffect(field);
                        }
                    }
                    /* if (field.FieldAddress.includes('GDX.CP')) {
                        this.setupEffect('GDX.CP.', () => this.newApplicationService.CPResultResponse(), 'hasPatchedCP', field);
                    } */
                });
            }
        }, { allowSignalWrites: true });

        effect(() => {
            if (this.getUIResponse() && (!!this.editApp() || !this.apiBody.FKCurrentStatusID)) {
                const allFields: FieldJson[] = [];
                this.visibleNavigationTabs()!.forEach((tab) => {
                    tab.TabSections.forEach((section) => {
                        allFields.push(...section.FieldsJson);
                    });
                });
                allFields.forEach((field) => {
                    if (field.FieldType === 8 && field.ApiFieldAddress.includes('?cr')) {
                        this.patchTableData(field)
                    }
                })
            }
        }, { allowSignalWrites: true });

        effect(() => {
            if (this.newApplicationService.uiResponseAllFields()) {
                let isFeeField = this.newApplicationService.uiResponseAllFields()!.find((field) => field.ApiFieldAddress === "Fee_Calculation");

                if (!isFeeField && this.feeAPIName() || this.newApplicationService.newRequestData()) {

                    let payload = {
                        "FKServiceID": this.apiBody?.FKServiceID,
                        "FKProcessID": this.apiBody?.FKProcessID,
                        "FkStatusId": this.apiBody?.FKCurrentStatusID,
                        "FunctionName": this.feeAPIName(),
                        "RequestID": this.newApplicationService.requestData()?.RequestID || null,
                        "RenewYears": this.newApplicationService.requestData()?.RenewYears || this.newApplicationService.newRequestData()?.RenewYears || 0,
                        "FkPrevStatus": this.newApplicationService.requestData()?.FkPrevStatus || this.newApplicationService.newRequestData()?.FkPrevStatus || 0,
                        'TotalNewSecondaryActivties': this.newApplicationService.requestData()?.NewSecondaryActivityCount || this.newApplicationService.newRequestData()?.NewSecondaryActivityCount || 0,
                        'OriginalFkSexID': [this.newApplicationService.newRequestData()?.FkSexID].find(value => value !== -1) || 0 || 0,
                        'FkSexID': [this.newApplicationService.newRequestData()?.FkSexID].find(value => value !== -1) || 0 || 0,
                        "FkApplicantTypeID": this.newApplicationService.requestData()?.ApplicantType || this.newApplicationService.newRequestData()?.ApplicantType || 0,
                        "FkEventID": this.newApplicationService.requestData()?.EventType || this.newApplicationService.newRequestData()?.EventType || 0,
                        "TotalSecondaryActivties": this.newApplicationService.requestData()?.ServiceTables?.filter((rData: any) => rData.SourceTableID === 2801).length || this.newApplicationService.newRequestData()?.ServiceTables?.filter((rData: any) => rData.SourceTableID === 2801).length || 0,
                        "FKActivityAllIds": this.newApplicationService.requestData()?.ServiceTables?.filter((rData: any) => rData.SourceTableID === 2801).map((rData: any) => rData.FKActivityID).join(',') || this.newApplicationService.newRequestData()?.ServiceTables?.filter((rData: any) => rData.SourceTableID === 2801).map((rData: any) => rData.FKActivityID).join(',') || 0,
                        "FkMembershipTypeID": this.newApplicationService.requestData()?.ServiceTables?.filter((rData: any) => rData.SourceTableID === 2802)?.[0].FKType || this.newApplicationService.newRequestData()?.ServiceTables?.filter((rData: any) => rData.SourceTableID === 2802)?.[0].FKType || 0
                    }
                    if (this.firstCalculate) {
                        this.newApplicationService.getFees(payload, 'field.ApiFieldAddress').subscribe((res: any) => {
                            this.newApplicationService.activityFees.set(res.FeeValue)
                            this.calcApiLoading = false;
                            if (
                                (this.newApplicationService.requestData()) &&
                                ![this.newApplicationService.requestData()?.AdminFeesValue,
                                this.newApplicationService.newRequestData()?.AdminFeesValue].includes(this.newApplicationService.activityFees())
                            ) {
                                this.firstCalculate = false;
                                this.newApplicationService.updateFees({
                                    RequestID: this.newApplicationService.requestData()?.RequestID ||
                                        this.newApplicationService.newRequestData()?.RequestID,
                                    NewFee: this.newApplicationService.activityFees()
                                }).subscribe((result: any) => {
                                    console.log(result)
                                });
                            }
                        })
                    }
                }
                if (isFeeField && this.feeAPIName()) {
                    setTimeout(() => {
                        this.newApplicationService.uiResponseAllFields()!.forEach((field) => {
                            if (this.store.auth.user && field.ApiFieldAddress) {
                                if (field.ApiFieldAddress.includes("Fee_Calculation")) {
                                    let control = this.wizardForm!.get(field.InternalFieldName);
                                    control!.valueChanges.pipe(
                                        // 1. Wait briefly to ensure the user has finished typing (optional but recommended for API calls)
                                        debounceTime(300),
                                        filter(() => this.shouldCallApi),
                                        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
                                        takeUntil(this.destroy$)
                                    ).subscribe({
                                        next: () => {
                                            if ((control?.value && control?.value.length > 0) || (!Array.isArray(control?.value) && control?.value > 0)) {
                                                this.calcApiLoading = true;
                                                let payload = {
                                                    "FKServiceID": this.apiBody.FKServiceID,
                                                    "FKProcessID": this.apiBody.FKProcessID,
                                                    "FkStatusId": this.apiBody.FKCurrentStatusID,
                                                    "FKActivityAllIds": [7001, 7002, 7003, 7004].includes(this.apiBody.FKServiceID) ? control?.value.join(',') : null,
                                                    "FkApplicantTypeID":
                                                        field.InternalFieldName === 'ApplicantType' ?
                                                            [5014].includes(this.apiBody.FKServiceID) ? control?.value : 0
                                                            : [5014].includes(this.apiBody.FKServiceID) ? this.wizardForm!.get('ApplicantType')?.value : 0,
                                                    "FkEventID":
                                                        field.InternalFieldName === 'EventLocalOrInternational' ?
                                                            [5014].includes(this.apiBody.FKServiceID) ? control?.value : 0
                                                            : [5014].includes(this.apiBody.FKServiceID) ? this.wizardForm!.get('EventLocalOrInternational')?.value : 0,
                                                    "TotalSecondaryActivties": [5003, 5004, 5005, 5008, 5009, 5010, 5012, 5013].includes(this.apiBody.FKServiceID) ? control?.value.length || 0 : 0,
                                                    'TotalNewSecondaryActivties': this.newApplicationService.requestData()?.NewSecondaryActivityCount || this.newApplicationService.newRequestData()?.NewSecondaryActivityCount || 0,
                                                    "FunctionName": this.feeAPIName(),
                                                    "RequestID": this.newApplicationService.requestData()?.RequestID || null,
                                                    "RenewYears": this.newApplicationService.requestData()?.RenewYears || this.newApplicationService.newRequestData()?.RenewYears || 0,
                                                    "FkPrevStatus": this.newApplicationService.requestData()?.FkPrevStatus || this.newApplicationService.newRequestData()?.FkPrevStatus || 0,
                                                    "FkSexId": [5006].includes(this.apiBody.FKServiceID) ? [this.wizardForm!.get('FkSexID')?.value].find(value => value !== -1) || 0 : 0,
                                                    "FkClubID": [5015].includes(this.apiBody.FKServiceID) ? [this.wizardForm!.get('FkClubID')?.value].find(value => value !== -1) || 0 : 0,
                                                    "FkMembershipTypeID": [5015].includes(this.apiBody.FKServiceID) ? [this.wizardForm!.get('FkMembershipTypeID')?.value].find(value => value !== -1) || 0 : 0
                                                }
                                                this.newApplicationService.getFees(payload, field.ApiFieldAddress).subscribe((res: any) => {
                                                    this.newApplicationService.activityFees.set(res.FeeValue)
                                                    this.calcApiLoading = false;
                                                    if (this.firstCalculate) {
                                                        if (
                                                            (this.newApplicationService.requestData()) &&
                                                            ![this.newApplicationService.requestData()?.AdminFeesValue,
                                                            this.newApplicationService.newRequestData()?.AdminFeesValue].includes(this.newApplicationService.activityFees())
                                                        ) {
                                                            this.firstCalculate = false;
                                                            this.newApplicationService.updateFees({
                                                                RequestID: this.newApplicationService.requestData()?.RequestID ||
                                                                    this.newApplicationService.newRequestData()?.RequestID,
                                                                NewFee: this.newApplicationService.activityFees()
                                                            }).subscribe((result: any) => {
                                                                console.log(result)
                                                            });
                                                        }
                                                    }
                                                })
                                            } else {
                                                this.newApplicationService.activityFees.set(null)
                                            }
                                        },
                                        error: (err: any) => {
                                            console.log(err);
                                            this.newApplicationService.activityFees.set(null);
                                        }
                                    })
                                }
                            }
                        })
                    }, 100)
                }
            }
        })



    }
    ngOnInit() {
        this.openLoader();
        this.route.queryParams.subscribe((params: any) => {
            this.apiBody.FKServiceID = params.ServiceID
            this.openLoader();
            this.currentTabIndex.set(1);
            if (!this.newApplicationService.newRequestData()) {
                this.newApplicationService.ServiceFieldsByActionsApiResponse.set(null);
                this.newApplicationService.requestData.set(null);
                this.newApplicationService.rowsFromApi.set([]);
                this.newApplicationService.CPResultResponse.set(null);
                this.newApplicationService.CRResultResponse.set(null);
                this.newApplicationService.actionDetailsIDs.set('');
                this.newApplicationService.activityFees.set(null);

            }
            this.tabFieldCount.set({})

            // without destroying it (which happens with router param changes).
            this.destroy$.next();

            // 2. Re-create a NEW destroy$ Subject for this new context
            // You MUST re-initialize destroy$ for the new subscriptions to work.
            this.destroy$ = new Subject<void>();


            if ((history.state && history.state.data)) {
                this.apiBody = history.state.data || this.newApplicationService.serviceApiPayload();
                this.apiBody.RequestID = history.state.RequestID || history.state.newRequestData?.RequestID || undefined;
                this.apiBody.SpActionName = history.state.ActionDBName || undefined;
                this.requestID = history.state.RequestID;

                this.pageName = history.state.pageName
                this.itemURL = history.state.itemURL;
                this.newApplicationService.newRequestData.set(history.state.newRequestData);

                // Optionally, if needed, manually trigger change detection
                if (this.requestID || this.newApplicationService.newRequestData()) {
                    if (this.newApplicationService.defaultProcess()) {
                        this.newApplicationService.newRequestData.update((data: any) => {
                            if (!data) return { FkProcessID: this.newApplicationService.defaultProcess() };  // initialize if empty
                            return { ...data, FkProcessID: this.newApplicationService.defaultProcess() };
                        })

                    }
                    this.editApp.set(true);
                    if (!this.newApplicationService.newRequestData() && !this.requestID) {
                        this.apiBody.FKProcessID = 40;
                        this.apiBody.FKCurrentStatusID = null;
                        this.editApp.set(false);
                    }

                } else {
                    this.newApplicationService.activityFees.set(null)
                    this.editApp.set(false);
                    if (!this.newApplicationService.newRequestData()) {
                        this.apiBody.FKProcessID = 40;
                        this.apiBody.FKCurrentStatusID = null;
                    }
                }
                this.newApplicationService.apiBody.set(this.apiBody)
            } else {
                this.getDataFromStorage();
            }


            if (this.apiBody?.FKServiceID && !this.apiBody?.FKCurrentStatusID && !this.apiBody?.FKProcessID) {
                let serviceData = this.findByServiceId(this.menuLinksService.menuResponse(), this.apiBody?.FKServiceID);
                if (!serviceData) {
                    this.closeLoader();
                    this.router.navigate(['Inbox']);
                    return;
                } else {
                    this.apiBody.FKProcessID = !!serviceData.FKProcessID || serviceData.FKProcessID === '0' ? +serviceData.FKProcessID : null;
                    this.apiBody.FKRoleID = this.store.auth.user.FkRoleID
                }
            }

            if ([20, 1804].includes(this.apiBody.FKCurrentStatusID!)) {
                if (this.requestID) {
                    this.newApplicationService.queryrequest(this.requestID, this.applicationNumber).subscribe((res2: any) => {
                        this.newApplicationService.getFeesNameForService(this.apiBody.FKServiceID).subscribe((res: any) => {
                            this.feeAPIName.set(res.result.items[0].FeeCalculationFn)
                            this.newApplicationService.getRequest(this.requestID).subscribe((res: any) => {

                                this.apiBody.FKCurrentStatusID = res.FkStatusID
                                this.apiBody.FKProcessID = res.FkProcessID
                                this.apiBody.FKServiceID = res.ServiceID
                                this.newApplicationService.requestData.set(res);
                                const newState = { ...history.state };
                                newState.data = this.apiBody;
                                history.replaceState(newState, document.title, window.location.href);
                                this.isPaymentMsg = res2.transactionStatusResponse
                                this.isPaymentPending = res2.StopPayment;
                                let payload = {
                                    "FKServiceID": this.apiBody.FKServiceID,
                                    "FKProcessID": this.apiBody.FKProcessID,
                                    "FkStatusId": this.apiBody.FKCurrentStatusID,
                                    "FKActivityAllIds": [7001, 7002, 7003, 7004].includes(this.apiBody.FKServiceID)
                                        ? (res?.['ServiceTables']
                                            ?.filter((item: any) => !!item['FKActivityId'])
                                            ?.map((item: any) => item['FKActivityId'])?.join(',')
                                            || this.newApplicationService.newRequestData()?.['ServiceTables']
                                                ?.filter((item: any) => !!item['FKActivityId'])
                                                ?.map((item: any) => item['FKActivityId'])?.join(','))
                                        : null,
                                    "FkApplicantTypeID": res?.['ApplicantType'] || this.newApplicationService.newRequestData()?.['ApplicantType'] || 0,
                                    "FkEventID": res?.['EventLocalOrInternational'] || this.newApplicationService.newRequestData()?.['EventLocalOrInternational'] || 0,
                                    "TotalSecondaryActivties": [5003, 5004, 5005, 5008, 5009, 5010, 5012, 5013].includes(this.apiBody.FKServiceID)
                                        ? (res?.['ServiceTables']
                                            ?.filter((item: any) => !!item['FkSecondaryActivityID'])
                                            ?.map((item: any) => item['FkSecondaryActivityID']).length
                                            || this.newApplicationService.newRequestData()?.['ServiceTables']
                                                ?.filter((item: any) => !!item['FkSecondaryActivityID'])
                                                ?.map((item: any) => item['FkSecondaryActivityID']).length || 0) : 0,
                                    'TotalNewSecondaryActivties': res?.NewSecondaryActivityCount || this.newApplicationService.newRequestData()?.NewSecondaryActivityCount || 0,
                                    "FunctionName": this.feeAPIName(),
                                    "RequestID": res?.RequestID || null,
                                    "RenewYears": res?.RenewYears || this.newApplicationService.newRequestData()?.RenewYears || 0,
                                    "FkPrevStatus": res?.FkPrevStatus || this.newApplicationService.newRequestData()?.FkPrevStatus || 0,
                                    'FkSexID': [this.newApplicationService.requestData()?.FkSexID, this.newApplicationService.newRequestData()?.FkSexID].find(value => value && value !== -1) || 0 || 0,
                                    "FkClubID": [this.newApplicationService.requestData()?.FkClubID, this.newApplicationService.newRequestData()?.FkClubID].find(value => value && value !== -1) || 0 || 0,
                                    "FkMembershipTypeID": [this.newApplicationService.requestData()?.FkMembershipTypeID, this.newApplicationService.newRequestData()?.FkMembershipTypeID].find(value => value && value !== -1) || 0 || 0,
                                }
                                this.newApplicationService.getFees(payload, '').subscribe((res2: any) => {
                                    let activityFees = res2.FeeValue
                                    this.newApplicationService.activityFees.set(activityFees);
                                    this.calcApiLoading = false;
                                    if (this.firstCalculate) {
                                        this.firstCalculate = false;
                                        if (
                                            (res) &&
                                            ![res?.AdminFeesValue,
                                            this.newApplicationService.newRequestData()?.AdminFeesValue].includes(activityFees)
                                        ) {
                                            this.newApplicationService.updateFees({
                                                RequestID: res?.RequestID ||
                                                    this.newApplicationService.newRequestData()?.RequestID,
                                                NewFee: activityFees
                                            }).subscribe((result: any) => {
                                                console.log(result)
                                                if (this.isPaymentMsg && this.isPaymentMsg.map((item: any) => item.CurrentStatus).includes(0)) {
                                                    let msg = this.translations()?.paymentSuccessMsg.label
                                                    msg = msg.substring(0, msg.lastIndexOf('[ApplicationNumber]')) + `<span dir="ltr">${this.applicationNumber}</span>`

                                                    const newState = { ...history.state };
                                                    newState.data = this.apiBody;
                                                    history.replaceState(newState, document.title, window.location.href);
                                                    this.setupPage();
                                                    Swal.fire({
                                                        icon: 'success',
                                                        title: `${msg}`,
                                                        showConfirmButton: true,
                                                        confirmButtonText: this.translations()?.validationMsgBtn.label
                                                    })
                                                } else {
                                                    this.setupPage();
                                                }
                                            });
                                        } else {
                                            if (this.isPaymentMsg && this.isPaymentMsg.map((item: any) => item.CurrentStatus).includes(0)) {
                                                let msg = this.translations()?.paymentSuccessMsg.label
                                                msg = msg.substring(0, msg.lastIndexOf('[ApplicationNumber]')) + `<span dir="ltr">${this.applicationNumber}</span>`

                                                const newState = { ...history.state };
                                                newState.data = this.apiBody;
                                                history.replaceState(newState, document.title, window.location.href);
                                                this.setupPage();
                                                Swal.fire({
                                                    icon: 'success',
                                                    title: `${msg}`,
                                                    showConfirmButton: true,
                                                    confirmButtonText: this.translations()?.validationMsgBtn.label
                                                })
                                            } else {
                                                this.setupPage();
                                            }
                                        }
                                    } else {
                                        this.setupPage()
                                    }
                                })

                            })

                        })

                    })
                } else {
                    this.newApplicationService.getFeesNameForService(this.apiBody.FKServiceID).subscribe((res: any) => {
                        this.feeAPIName.set(res.result.items[0].FeeCalculationFn)
                        if (this.isPaymentMsg && this.isPaymentMsg.map((item: any) => item.CurrentStatus).includes(0)) {
                            let msg = this.translations()?.paymentSuccessMsg.label
                            msg = msg.substring(0, msg.lastIndexOf('[ApplicationNumber]')) + `<span dir="ltr">${this.applicationNumber}</span>`

                            const newState = { ...history.state };
                            newState.data = this.apiBody;
                            history.replaceState(newState, document.title, window.location.href);
                            this.setupPage();
                            Swal.fire({
                                icon: 'success',
                                title: `${msg}`,
                                showConfirmButton: true,
                                confirmButtonText: this.translations()?.validationMsgBtn.label
                            })
                        } else {
                            this.setupPage();
                        }
                    })
                }
            } else {
                if (this.requestID) {
                    this.newApplicationService.getFeesNameForService(this.apiBody.FKServiceID).subscribe((res: any) => {
                        this.feeAPIName.set(res.result.items[0].FeeCalculationFn)
                        this.newApplicationService.getRequest(this.requestID).subscribe((res: any) => {
                            this.apiBody.FKCurrentStatusID = res.FkStatusID
                            this.apiBody.FKProcessID = res.FkProcessID
                            this.apiBody.FKServiceID = res.ServiceID
                            this.newApplicationService.requestData.set(res);
                            const newState = { ...history.state };
                            newState.data = this.apiBody;
                            history.replaceState(newState, document.title, window.location.href);
                            if (this.feeAPIName()) {
                                let payload = {
                                    "FKServiceID": this.apiBody.FKServiceID,
                                    "FKProcessID": this.apiBody.FKProcessID,
                                    "FkStatusId": this.apiBody.FKCurrentStatusID,
                                    "FKActivityAllIds": [7001, 7002, 7003, 7004].includes(this.apiBody.FKServiceID)
                                        ? (res?.['ServiceTables']
                                            ?.filter((item: any) => !!item['FKActivityId'])
                                            ?.map((item: any) => item['FKActivityId'])?.join(',')
                                            || this.newApplicationService.newRequestData()?.['ServiceTables']
                                                ?.filter((item: any) => !!item['FKActivityId'])
                                                ?.map((item: any) => item['FKActivityId'])?.join(','))
                                        : null,
                                    "FkApplicantTypeID": res?.['ApplicantType'] || this.newApplicationService.newRequestData()?.['ApplicantType'] || 0,
                                    "FkEventID": res?.['EventLocalOrInternational'] || this.newApplicationService.newRequestData()?.['EventLocalOrInternational'] || 0,
                                    "TotalSecondaryActivties": [5003, 5004, 5005, 5008, 5009, 5010, 5012, 5013].includes(this.apiBody.FKServiceID)
                                        ? (res?.['ServiceTables']
                                            ?.filter((item: any) => !!item['FkSecondaryActivityID'])
                                            ?.map((item: any) => item['FkSecondaryActivityID']).length
                                            || this.newApplicationService.newRequestData()?.['ServiceTables']
                                                ?.filter((item: any) => !!item['FkSecondaryActivityID'])
                                                ?.map((item: any) => item['FkSecondaryActivityID']).length || 0) : 0,
                                    'TotalNewSecondaryActivties': res?.NewSecondaryActivityCount || this.newApplicationService.newRequestData()?.NewSecondaryActivityCount || 0,
                                    "FunctionName": this.feeAPIName(),
                                    "RequestID": res?.RequestID || null,
                                    "RenewYears": res?.RenewYears || this.newApplicationService.newRequestData()?.RenewYears || 0,
                                    "FkPrevStatus": res?.FkPrevStatus || this.newApplicationService.newRequestData()?.FkPrevStatus || 0,
                                    "FkSexId": [res.FkSexID].find(value => value !== -1) || 0,
                                    "FkClubID": [5015].includes(this.apiBody.FKServiceID)
                                        ? [res.FkClubID, this.newApplicationService.newRequestData()?.FkClubID].find(value => value !== -1) || 0 : 0,
                                    "FkMembershipTypeID": [5015].includes(this.apiBody.FKServiceID) ? [res.FkMembershipTypeID, this.newApplicationService.newRequestData()?.FkMembershipTypeID].find(value => value !== -1) || 0 : 0
                                }
                                this.newApplicationService.getFees(payload, '').subscribe((res2: any) => {
                                    let activityFees = res2.FeeValue;
                                    this.newApplicationService.activityFees.set(activityFees);
                                    this.calcApiLoading = false;
                                    if (this.firstCalculate) {
                                        this.firstCalculate = false;
                                        if (
                                            (res) &&
                                            ![res?.AdminFeesValue,
                                            this.newApplicationService.newRequestData()?.AdminFeesValue].includes(activityFees)
                                        ) {
                                            this.newApplicationService.updateFees({
                                                RequestID: res?.RequestID ||
                                                    this.newApplicationService.newRequestData()?.RequestID,
                                                NewFee: activityFees
                                            }).subscribe((result: any) => {
                                                console.log(result)
                                                this.setupPage()
                                            });
                                        } else {
                                            this.setupPage()
                                        }
                                    } else {
                                        this.setupPage()
                                    }
                                })
                            } else {
                                this.setupPage()
                            }
                        })
                    })
                } else {
                    this.newApplicationService.getFeesNameForService(this.apiBody.FKServiceID).subscribe((res: any) => {
                        this.feeAPIName.set(res.result.items[0].FeeCalculationFn)
                        this.setupPage()
                    })
                }
            }


            /*  if (!this.router.url.includes('Services/NewRequest')) { 12
                 this.newApplicationService.newRequestData.set(null);
             } */
            if (!this.router.url.includes('RequestData')) {
                this.newApplicationService.openDimFields.set(false);
            }
            if (!this.router.url.includes('RequestData') && !this.router.url.includes('Services/NewRequest')) {
                this.newApplicationService.requestData.set(null);
            }
        })
    }
    destroy$ = new Subject<void>();

    setupPage() {

        if (this.editApp()) {

            this.newApplicationService.getUI(this.apiBody!).subscribe((res: ResponseBody) => {
                let currentTabFields: any = []
                res.NavigationTabs.forEach((tab) => {
                    tab.TabSections.forEach(section => {
                        currentTabFields.push(...section.FieldsJson);
                    });
                })
                this.newApplicationService.uiResponseAllFields.set(currentTabFields)
                this.getUIResponse.set(res);
                this.newApplicationService.uiResponse.set(res);
                console.log(res);
                const parsed: ResponseBody = JSON.parse(JSON.stringify(res));
                this.applicationTabs = parsed.NavigationTabs.map((tab: any, index: number) => {
                    return {
                        id: res.NavigationTabs[index].TabOrder,
                        title: this.store.index.locale == 'en' ? parsed.NavigationTabs[index].TitleEn : parsed.NavigationTabs[index].TitleAr,
                        content: '',
                        icon: this.setIcon(parsed.NavigationTabs[index].TitleEn),
                        tabSections: parsed.NavigationTabs[index].TabSections,
                        isActive: false,
                        isCompleted: false,
                        isAccessible: false,
                        tabID: parsed.NavigationTabs[index].NavigationTabID,
                        aiTabOrder: parsed.NavigationTabs[index].AITabOrder
                    }
                })

                this.navigationTabs.set(parsed.NavigationTabs.sort((a, b) => a.TabOrder - b.TabOrder));
                if (this.navigationTabs() && !this.navigationTabs()?.every((tab) => !tab.StepID)) {
                    let phases = [...new Set(this.navigationTabs()?.map(item => item.StepID))];
                    this.transformTabs(this.navigationTabs()!, phases);
                }

                //to be changed
                this.actions = parsed.Actions.sort((a, b) => a.ActionSortOrder - b.ActionSortOrder);
                if (this.newApplicationService.openDimFields()) {
                    this.actions = this.actions.filter((action) => action.ActionStyle === 2854)
                    this.actions[0].SpecialAction = null
                }
                this.wizardService.EServicesSpActionProcessStatus().subscribe((res: any) => {
                    this.newApplicationService.processList.set(res.items)
                    let apiRuns = false;
                    this.actions.forEach((action) => {
                        let singleActionProcess = this.newApplicationService.processList().filter((item: any) => {
                            return item.ActionID === action.ActionID && item.FKServiceID === this.apiBody.FKServiceID
                        });
                        let needServices = singleActionProcess.find((item: any) => {
                            return item.HasServiceID
                        })
                        if (needServices && !apiRuns) {
                            apiRuns = true;
                            this.newApplicationService.getActivityServices(this.requestID).subscribe((servicesData: any) => {
                                this.btnRelatedServices.set(servicesData.services)
                            })
                        }
                        if (singleActionProcess.length > 1) {
                            action.isDropdown = true;
                        }
                    })
                })
                if (!this.editApp()) {
                    if (this.actions.length) {
                        this.newApplicationService.GetServiceFieldsByActions({
                            "ActionDetailsIDs": this.actions.map((action) => action.ActionDetailsID)
                        }).subscribe((res: GetServiceFieldsByActionsApiResponse) => {
                            this.ServiceFieldsByActionsApiResponse = res;
                            this.newApplicationService.ServiceFieldsByActionsApiResponse.set(res);
                            this.getUIResponse.update((value) => {
                                value!.Actions = this.actions
                                    .filter(item => Object.keys(res.items).includes(String(item.ActionDetailsID)))
                                return value
                            })
                            this.actions = Array.from(
                                this.actions
                                    .filter(item => Object.keys(res.items).includes(String(item.ActionDetailsID)))
                                    .reduce((map, item) => map.set(item.ActionID, item), new Map())
                                    .values()
                            );
                        })
                        this.actions = [
                            {
                                ActionDetailsID: 127989,
                                ActionID: 862351,
                                ExtraConditions: null,
                                Action: "Previous",
                                TitleAR: "السابق",
                                TitleEN: "Previous",
                                ActionSortOrder: 1,
                                ClickConditionId: null
                            },
                            {
                                ActionDetailsID: this.getUIResponse()!.Actions.find((action) => action.ActionID === 862)!.ActionDetailsID,
                                ActionID: 862,
                                ExtraConditions: null,
                                Action: "Next",
                                TitleAR: "التالي",
                                TitleEN: "Next",
                                ActionSortOrder: 4,
                                ClickConditionId: null
                            },
                            ...this.actions
                        ]
                    }

                } else {
                    if (this.actions.length) {
                        this.newApplicationService.GetServiceFieldsByActions({
                            "ActionDetailsIDs": this.actions.map((action) => action.ActionDetailsID)
                        }, this.requestID).subscribe((res: GetServiceFieldsByActionsApiResponse) => {
                            this.ServiceFieldsByActionsApiResponse = res;
                            this.newApplicationService.ServiceFieldsByActionsApiResponse.set(res)
                            this.getUIResponse.update((value) => {
                                value!.Actions = this.actions
                                    .filter(item => Object.keys(res.items).includes(String(item.ActionDetailsID)))
                                return value
                            })
                            this.actions = Array.from(
                                this.actions
                                    .filter(item => Object.keys(res.items).includes(String(item.ActionDetailsID)))
                                    .reduce((map, item) => map.set(item.ActionID, item), new Map())
                                    .values()
                            );
                            this.displayActions.set(this.groupActions(this.actions))
                            let editedDataBtn = this.actions.find((action) => action.ActionID === 1850)
                            if (editedDataBtn) {
                                this.newApplicationService.auditLog({ RequestID: this.requestID }).subscribe(res => {
                                    this.newApplicationService.auditData.set(res.result.items);
                                    this.newApplicationService.auditDataMap = this.newApplicationService.auditData().reduce((acc: any, historyItem: any) => {
                                        acc[historyItem.FieldName] = historyItem;
                                        return acc;
                                    }, {} as Record<string, any>);

                                    const currentTabFields: FieldJson[] = [];
                                    this.navigationTabs()!.forEach((tab) => {
                                        tab.TabSections.forEach(section => {
                                            currentTabFields.push(...section.FieldsJson);
                                        });
                                    })
                                    currentTabFields.map((field) => {
                                        field.hasHistory = !!this.newApplicationService.auditDataMap[field.InternalFieldName]
                                        field.historyData = this.newApplicationService.auditDataMap[field.InternalFieldName]
                                    })
                                })
                            }
                        })
                    }
                }
                // Also set up listeners for relevant field changes
                this.navigationTabs()!.forEach(tab => {
                    this.isSection[tab.NavigationTabID] = {}
                    tab.TabSections.forEach(section => {
                        this.isSection[tab.NavigationTabID][section.SectionID] = true
                        const groupedByRow: FieldJson[][] = this.groupFieldsByRow(section.FieldsJson);
                        this.groupedSections[section.SectionOrder] = groupedByRow; // Store the grouped result
                        this.prepareControlsForReactiveForm(section);
                    });
                });
                this.initializeTabFieldCount();
                this.calculateTabVisibility(); // Add this line
                this.setupRelevantFieldListeners();



                console.log(this.wizardForm);
                if (this.editApp()) {
                    const currentTabFields: FieldJson[] = [];
                    this.navigationTabs()!.forEach((tab) => {
                        tab.TabSections.forEach(section => {
                            currentTabFields.push(...section.FieldsJson);
                        });
                    })
                    currentTabFields.forEach(field => {
                        let control = this.wizardForm!.get(field.InternalFieldName);
                        let lookupTechnicalApproval = field.LookupValues?.find((item) => !!item.TechnicalApprovalFile);
                        if (lookupTechnicalApproval) {
                            const fieldName = field.InternalFieldName
                            control?.valueChanges.pipe(
                                takeUntil(this.destroy$)
                            ).subscribe({
                                next: (value) => {
                                    let values = field.LookupValues?.filter((item) => value.includes(item.LookupID));
                                    this.newApplicationService.updateSelectedLookup(fieldName, values);
                                },
                                error: (err) => {
                                    console.log(err);
                                }
                            })
                        }
                        /*  if (this.store.auth.user && field.ApiFieldAddress) {
                             if (field.ApiFieldAddress.includes("Fee_Calculation")) {
                                 control!.valueChanges.pipe(
                                     // 1. Wait briefly to ensure the user has finished typing (optional but recommended for API calls)
                                     debounceTime(300),
 
                                     // 2. Crucial: Use a custom comparator (like Lodash's isEqual) for deep comparison
                                     // This ignores emissions where the value object is the same, 
                                     // even if it's a new object reference created by Angular's internal logic.
                                     distinctUntilChanged(),
                                     takeUntil(this.destroy$)
                                 ).subscribe({
                                     next: () => {
                                         if ((control?.value && control?.value.length > 0) || (!Array.isArray(control?.value) && control?.value > 0)) {
                                             this.calcApiLoading = true;
                                             let payload = {
                                                 "FKServiceID": this.apiBody.FKServiceID,
                                                 "FKProcessID": this.apiBody.FKProcessID,
                                                 "FkStatusId": this.apiBody.FKCurrentStatusID,
                                                 "FKActivityAllIds": [7001, 7002, 7003, 7004].includes(this.apiBody.FKServiceID) ? control?.value.join(',') : null,
                                                 "FkApplicantTypeID":
                                                     field.InternalFieldName === 'ApplicantType' ?
                                                         [5014].includes(this.apiBody.FKServiceID) ? control?.value : 0
                                                         : [5014].includes(this.apiBody.FKServiceID) ? this.wizardForm!.get('ApplicantType')?.value : 0,
                                                 "FkEventID":
                                                     field.InternalFieldName === 'EventLocalOrInternational' ?
                                                         [5014].includes(this.apiBody.FKServiceID) ? control?.value : 0
                                                         : [5014].includes(this.apiBody.FKServiceID) ? this.wizardForm!.get('EventLocalOrInternational')?.value : 0,
                                                 "TotalSecondaryActivties": [5003, 5004, 5005, 5008, 5009, 5010, 5012, 5013].includes(this.apiBody.FKServiceID) ? control?.value.length || 0 : 0,
                                                 'TotalNewSecondaryActivties': this.newApplicationService.requestData()?.NewSecondaryActivityCount || this.newApplicationService.newRequestData()?.NewSecondaryActivityCount || 0,
                                                 "FunctionName": this.feeAPIName(),
                                                 "RequestID": this.newApplicationService.requestData()?.RequestID || null,
                                                 "RenewYears": this.newApplicationService.requestData()?.RenewYears || this.newApplicationService.newRequestData()?.RenewYears || 0,
                                                 "FkPrevStatus": this.newApplicationService.requestData()?.FkPrevStatus || this.newApplicationService.newRequestData()?.FkPrevStatus || 0,
                                                 "FkSexId": [5006].includes(this.apiBody.FKServiceID) ? [this.wizardForm!.get('FkSexID')?.value].find(value => value !== -1) || 0 : 0,
                                                 "FkClubID": [5015].includes(this.apiBody.FKServiceID) ? [this.wizardForm!.get('FkClubID')?.value].find(value => value !== -1) || 0 : 0,
                                                 "FkMembershipTypeID": [5015].includes(this.apiBody.FKServiceID) ? [this.wizardForm!.get('FkMembershipTypeID')?.value].find(value => value !== -1) || 0 : 0
                                             }
                                             this.newApplicationService.getFees(payload, field.ApiFieldAddress).subscribe((res: any) => {
                                                 this.newApplicationService.activityFees.set(res.FeeValue)
                                                 this.calcApiLoading = false;
                                                 if (this.firstCalculate) {
                                                     if (
                                                         (this.newApplicationService.requestData()) &&
                                                         ![this.newApplicationService.requestData()?.AdminFeesValue,
                                                         this.newApplicationService.newRequestData()?.AdminFeesValue].includes(this.newApplicationService.activityFees())
                                                     ) {
                                                         this.firstCalculate = false;
                                                         this.newApplicationService.updateFees({
                                                             RequestID: this.newApplicationService.requestData()?.RequestID ||
                                                                 this.newApplicationService.newRequestData()?.RequestID,
                                                             NewFee: this.newApplicationService.activityFees()
                                                         }).subscribe((result: any) => {
                                                             console.log(result)
                                                         });
                                                     }
                                                 }
                                             })
                                         } else {
                                             this.newApplicationService.activityFees.set(null)
                                         }
                                     },
                                     error: (err: any) => {
                                         console.log(err);
                                         this.newApplicationService.activityFees.set(null);
                                     }
                                 })
                             }
                         } */


                        if (field.BusinessRuleFun === 'Check_ServiceOwnerEligibility' && !field.FieldAddress.includes('SSO') && !field.ApiFieldAddress.includes('SSO')) {

                            control!.valueChanges.pipe(
                                // 1. Wait briefly to ensure the user has finished typing (optional but recommended for API calls)
                                debounceTime(300),

                                // 2. Crucial: Use a custom comparator (like Lodash's isEqual) for deep comparison
                                // This ignores emissions where the value object is the same,  12
                                // even if it's a new object reference created by Angular's internal logic.
                                //      distinctUntilChanged(),
                                takeUntil(this.destroy$)
                            ).subscribe({
                                next: (value) => {
                                    if (value && !this.apiLoading) {
                                        if (!Swal.isVisible()) {
                                            this.apiLoading = true;
                                            this.fireBusinessApi_serviceOwner(currentTabFields, field)
                                        }
                                    }
                                },
                                error: (err: any) => {
                                    console.log(err);
                                }
                            })
                        }

                        if ([4, 6, 19].includes(field.FieldType)) {
                            this.setupRelevantLookupFilter(field.LookupValues!, currentTabFields, field);
                        }
                        if (field.FieldType === 8) {
                            field.TableServiceFields!.forEach((tableField) => {
                                if ([4, 6, 19].includes(tableField.FieldType)) {
                                    this.setupRelevantLookupFilter(tableField.LookupValues!, currentTabFields, tableField, field);
                                }
                            })
                        }
                    })
                    let crFields = currentTabFields.filter((field) => {
                        return field.ApiFieldAddress.includes("cr=");
                    })
                    let cpFields = currentTabFields.filter((field) => {
                        return field.ApiFieldAddress.includes("cp=");
                    })

                    // Get the names of the fields you need
                    const crFieldNames = crFields.map(field => field.InternalFieldName);
                    const cpFieldNames = cpFields.map(field => field.InternalFieldName);

                    let businessGetRequestDataFor_7002 = currentTabFields.filter((field) => {
                        return field.BusinessRuleFun && field.BusinessRuleFun.includes("GetRequestDataFor_7002");
                    })
                    let businessGetRequestDataFor_5014 = currentTabFields.filter((field) => {
                        return field.BusinessRuleFun && field.BusinessRuleFun.includes("GetRequestDataFor_5014");
                    })
                    let businesssp_GetSecondaryActivity_ByArea = currentTabFields.filter((field) => {
                        return field.BusinessRuleFun && field.BusinessRuleFun.includes("sp_GetSecondaryActivity_ByArea");
                    })

                    let businesssp_GenerateRegistrationNumber = currentTabFields.filter((field) => {
                        return field.BusinessRuleFun && field.BusinessRuleFun.includes("sp_GenerateRegistrationNumber");
                    })



                    this.businessGetRequestDataFor_7002 = businessGetRequestDataFor_7002
                    this.businessGetRequestDataFor_5014 = businessGetRequestDataFor_5014
                    this.businesssp_GetSecondaryActivity_ByArea = businesssp_GetSecondaryActivity_ByArea

                    runInInjectionContext(this.injector, () => {
                        this.setupFormSubscriptions(cpFields, crFields);
                        if (businessGetRequestDataFor_7002.length > 0) {
                            this.setupFormBusinessSubscriptions(businessGetRequestDataFor_7002, currentTabFields, 'GetRequestDataFor_7002')
                        }
                        if (businessGetRequestDataFor_5014.length > 0) {
                            this.setupFormBusinessSubscriptions(businessGetRequestDataFor_5014, currentTabFields, 'GetRequestDataFor_5014')
                        }
                        if (businesssp_GenerateRegistrationNumber.length > 0) {
                            this.setupFormBusinessSubscriptions(businesssp_GenerateRegistrationNumber, currentTabFields, 'sp_GenerateRegistrationNumber')
                        }
                        if (businesssp_GetSecondaryActivity_ByArea.length > 0) {
                            this.setupFormBusinessSubscriptions(businesssp_GetSecondaryActivity_ByArea, currentTabFields, 'sp_GetSecondaryActivity_ByArea')
                        }
                    });
                    if (!this.newApplicationService.newRequestData()) {

                        if (this.newApplicationService.requestData()) {
                            if (!this.newApplicationService.openDimFields()) {
                                if (this.newApplicationService.requestData().Attachments) {
                                    this.transformAttachmentData(this.newApplicationService.requestData());
                                }
                                this.transformUpdateData(this.newApplicationService.requestData());
                            }
                            this.wizardForm!.patchValue(this.newApplicationService.requestData());
                            if (this.newApplicationService.requestData().Attachments) {
                                this.newApplicationService.requestData().Attachments.forEach((attachmentData: any) => {
                                    // Find the FormGroup with the matching FkAttachmentTypeID
                                    const attachmentFormGroup = (this.wizardForm!.get('Attachements') as FormArray)
                                        .controls.find(control =>
                                            control.get('FkAttachmentTypeID')!.value === attachmentData.FkAttachmentTypeID
                                        ) as FormGroup;
                                    if (attachmentFormGroup) {
                                        // Get the files FormArray from the found FormGroup
                                        const filesFormArray = attachmentFormGroup.get('files') as FormControl;
                                        if (attachmentData.files) {
                                            filesFormArray.patchValue(attachmentData.files.map((file: any, index: any) => ({ ...file, name: this.translations()?.storedAttachmentName.label })));
                                        }
                                    }
                                })
                            }
                        }
                        this.navigationTabs()!.forEach(tab => {
                            this.isSection[tab.NavigationTabID] = {}
                            tab.TabSections.forEach(section => {
                                this.isSection[tab.NavigationTabID][section.SectionID] = true
                                const groupedByRow: FieldJson[][] = this.groupFieldsByRow(section.FieldsJson);
                                this.groupedSections[section.SectionOrder] = groupedByRow; // Store the grouped result
                                this.prepareControlsForReactiveForm(section);
                            });
                        });
                        this.initializeTabFieldCount();
                        this.calculateTabVisibility(); // Add this line
                        this.setupRelevantFieldListeners();
                        this.closeLoader();


                    } else {
                        console.log(this.navigationTabs());
                        console.log(this.visibleNavigationTabs());
                        console.log(this.currentTab());
                        this.initializeTabFieldCount();
                        this.calculateTabVisibility(); // Add this line
                        this.setupRelevantFieldListeners();
                        this.closeLoader();

                        this.navigationTabs()!.forEach(tab => {
                            this.isSection[tab.NavigationTabID] = {}
                            tab.TabSections.forEach(section => {
                                this.isSection[tab.NavigationTabID][section.SectionID] = true
                                const groupedByRow: FieldJson[][] = this.groupFieldsByRow(section.FieldsJson);
                                this.groupedSections[section.SectionOrder] = groupedByRow; // Store the grouped result
                                this.prepareControlsForReactiveForm(section);
                            });
                        });
                        this.initializeTabFieldCount();
                        this.calculateTabVisibility(); // Add this line
                        this.setupRelevantFieldListeners();
                        this.closeLoader();

                        let crFields = currentTabFields.filter((field) => {
                            return field.ApiFieldAddress.includes("cr=");
                        })
                        let cpFields = currentTabFields.filter((field) => {
                            return field.ApiFieldAddress.includes("cp=");
                        })

                        // Get the names of the fields you need
                        const crFieldNames = crFields.map(field => field.InternalFieldName);
                        const cpFieldNames = cpFields.map(field => field.InternalFieldName);

                        let businessGetRequestDataFor_7002 = currentTabFields.filter((field) => {
                            return field.BusinessRuleFun && field.BusinessRuleFun.includes("GetRequestDataFor_7002");
                        })
                        let businessGetRequestDataFor_5014 = currentTabFields.filter((field) => {
                            return field.BusinessRuleFun && field.BusinessRuleFun.includes("GetRequestDataFor_5014");
                        })
                        let businesssp_GetSecondaryActivity_ByArea = currentTabFields.filter((field) => {
                            return field.BusinessRuleFun && field.BusinessRuleFun.includes("sp_GetSecondaryActivity_ByArea");
                        })

                        let businesssp_GenerateRegistrationNumber = currentTabFields.filter((field) => {
                            return field.BusinessRuleFun && field.BusinessRuleFun.includes("sp_GenerateRegistrationNumber");
                        })



                        this.businessGetRequestDataFor_7002 = businessGetRequestDataFor_7002
                        this.businessGetRequestDataFor_5014 = businessGetRequestDataFor_5014
                        this.businesssp_GetSecondaryActivity_ByArea = businesssp_GetSecondaryActivity_ByArea

                        runInInjectionContext(this.injector, () => {
                            this.setupFormSubscriptions(cpFields, crFields);
                            if (businessGetRequestDataFor_7002.length > 0) {
                                this.setupFormBusinessSubscriptions(businessGetRequestDataFor_7002, currentTabFields, 'GetRequestDataFor_7002')
                            }
                            if (businessGetRequestDataFor_5014.length > 0) {
                                this.setupFormBusinessSubscriptions(businessGetRequestDataFor_5014, currentTabFields, 'GetRequestDataFor_5014')
                            }
                            if (businesssp_GenerateRegistrationNumber.length > 0) {
                                this.setupFormBusinessSubscriptions(businesssp_GenerateRegistrationNumber, currentTabFields, 'sp_GenerateRegistrationNumber')
                            }
                            if (businesssp_GetSecondaryActivity_ByArea.length > 0) {
                                this.setupFormBusinessSubscriptions(businesssp_GetSecondaryActivity_ByArea, currentTabFields, 'sp_GetSecondaryActivity_ByArea')
                            }
                        });
                        if (this.newApplicationService.newRequestData()) {
                            if (this.newApplicationService.newRequestData().Attachments) {
                                this.transformAttachmentData(this.newApplicationService.newRequestData());
                            }
                            this.transformUpdateData(this.newApplicationService.newRequestData());
                            let data = this.newApplicationService.newRequestData()
                            for (const key in data) {
                                if (!data[key] && data[key] != 0) {
                                    delete data[key]
                                }
                            }
                            this.newApplicationService.newRequestData.set(data);
                            this.wizardForm!.patchValue(this.newApplicationService.newRequestData())
                            if (this.newApplicationService.newRequestData().Attachments) {
                                this.newApplicationService.newRequestData().Attachments.forEach((attachmentData: any) => {
                                    // Find the FormGroup with the matching FkAttachmentTypeID
                                    const attachmentFormGroup = (this.wizardForm!.get('Attachements') as FormArray)
                                        .controls.find(control =>
                                            control.get('FkAttachmentTypeID')!.value === attachmentData.FkAttachmentTypeID
                                        ) as FormGroup;
                                    if (attachmentFormGroup) {
                                        // Get the files FormArray from the found FormGroup
                                        const filesFormArray = attachmentFormGroup.get('files') as FormControl;
                                        if (attachmentData.files) {
                                            filesFormArray.patchValue(attachmentData.files.map((file: any, index: any) => ({ ...file, name: this.translations()?.storedAttachmentName.label })));
                                        }
                                    }
                                })
                            }
                            console.log(this.newApplicationService.newRequestData())
                            if (this.newApplicationService.defaultProcess()) {
                                let control = this.wizardForm!.get('FkProcessID');
                                control?.valueChanges
                                    .pipe(
                                        //           distinctUntilChanged(),     // ignore duplicate values
                                        takeUntil(this.destroy$)    // unsubscribe when destroying / before rebuild
                                    )
                                    .subscribe(value => {
                                        if (!value || value === this.apiBody?.FKProcessID) return; // guard: no-op if same
                                        this.apiBody.FKProcessID = value;
                                        const newState = { ...history.state, defaultProcess: value };
                                        history.replaceState(newState, document.title, window.location.href);
                                        console.log(this.apiBody);
                                        this.newApplicationService.newRequestData.update((data: any) => {
                                            if (!data) return { FkProcessID: value };  // initialize if empty
                                            return { ...data, FkProcessID: value };
                                        })
                                        console.log(this.newApplicationService.newRequestData());
                                        this.openLoader();
                                        this.setupPage(); // hint: smaller function
                                    });
                            }

                        }
                    }
                    /* let serviceOwnerField = currentTabFields.find((field) => field.BusinessRuleFun === 'Check_ServiceOwnerEligibility')
                    if (serviceOwnerField && !this.apiLoading) {
                        this.apiLoading = true;
                        this.wizardService.businessCondition(this.wizardForm!.value, currentTabFields, serviceOwnerField.BusinessRuleColmns, this.requestID, serviceOwnerField.BusinessRuleFun, this.apiBody.FKServiceID).subscribe((business: any) => {
                            if (!business[0]?.CanContinue) {
                                this.apiLoading = false;
                                this.businessError = { field: serviceOwnerField, business: business };
                                const currentTabFields: FieldJson[] = [];
                                if (!this.editApp()) {
                                    this.currentTab()?.TabSections.forEach(section => {
                                        currentTabFields.push(...section.FieldsJson);
                                    });
                                } else {
                                    this.visibleNavigationTabs()!.forEach((tab) => {
                                        tab.TabSections.forEach(section => {
                                            currentTabFields.push(...section.FieldsJson);
                                        });
                                    })
                                }
                                this.showBusinessError(serviceOwnerField.BusinessRuleFun, this.businessError, currentTabFields);
                            } else {
                                this.apiLoading = false;
                                this.businessError = null
                            }
                        })
                    } */

                }
                this.navigationTabs!.update((tabs) => {
                    return tabs!.sort((a, b) => a.TabOrder - b.TabOrder)
                });
                this.currentTabIndex.set(1);
                this.visibleTabs.set(this.visibleTabs()!.sort((a, b) => a.id - b.id));
                this.visibleTabs.update(tabs => {
                    if (tabs && tabs.length > 0) {
                        tabs![0].isActive = true;
                        tabs![0].isAccessible = true;
                    }
                    return tabs;
                })
            });

        } else {
            if (this.wizardForm && this.wizardForm!.dirty) {
                this.wizardForm!.reset();
            }

            this.newApplicationService.getUI(this.apiBody!).subscribe((res: ResponseBody) => {
                let allTabFields: any = []
                res.NavigationTabs.forEach((tab) => {
                    tab.TabSections.forEach(section => {
                        allTabFields.push(...section.FieldsJson);
                    });
                })
                this.newApplicationService.uiResponseAllFields.set(allTabFields)
                this.getUIResponse.set(res);
                this.newApplicationService.uiResponse.set(res);

                console.log(res);
                const parsed: ResponseBody = JSON.parse(JSON.stringify(res));
                this.applicationTabs = parsed.NavigationTabs.map((tab: any, index: number) => {
                    return {
                        id: res.NavigationTabs[index].TabOrder,
                        title: this.store.index.locale == 'en' ? parsed.NavigationTabs[index].TitleEn : parsed.NavigationTabs[index].TitleAr,
                        content: '',
                        icon: this.setIcon(parsed.NavigationTabs[index].TitleEn),
                        tabSections: parsed.NavigationTabs[index].TabSections,
                        isActive: false,
                        isCompleted: false,
                        isAccessible: false,
                        tabID: parsed.NavigationTabs[index].NavigationTabID,
                        aiTabOrder: parsed.NavigationTabs[index].AITabOrder
                    }
                })
                this.navigationTabs.set(parsed.NavigationTabs.sort((a, b) => a.TabOrder - b.TabOrder));
                if (this.navigationTabs() && !this.navigationTabs()?.every((tab) => !tab.StepID)) {
                    let phases = [...new Set(this.navigationTabs()?.map(item => item.StepID))];
                    this.transformTabs(this.navigationTabs()!, phases);
                }

                //to be changed
                this.actions = parsed.Actions.sort((a, b) => a.ActionSortOrder - b.ActionSortOrder);
                if (this.newApplicationService.openDimFields()) {
                    this.actions = this.actions.filter((action) => action.ActionStyle === 2854)
                    this.actions[0].SpecialAction = null
                }
                if (this.actions.length) {
                    this.newApplicationService.GetServiceFieldsByActions({
                        "ActionDetailsIDs": this.actions.map((action) => action.ActionDetailsID)
                    }).subscribe((res: GetServiceFieldsByActionsApiResponse) => {
                        this.ServiceFieldsByActionsApiResponse = res;
                        this.newApplicationService.ServiceFieldsByActionsApiResponse.set(res);
                        this.getUIResponse.update((value) => {
                            value!.Actions = this.actions
                                .filter(item => Object.keys(res.items).includes(String(item.ActionDetailsID)))
                            return value
                        })
                        this.actions = Array.from(
                            this.actions
                                .filter(item => Object.keys(res.items).includes(String(item.ActionDetailsID)))
                                .reduce((map, item) => map.set(item.ActionID, item), new Map())
                                .values()
                        );
                        if (!this.editApp()) {
                            this.actions = [
                                {
                                    ActionDetailsID: 127989,
                                    ActionID: 86832471,
                                    ExtraConditions: null,
                                    Action: "Previous",
                                    TitleAR: "السابق",
                                    TitleEN: "Previous",
                                    ActionSortOrder: 1,
                                    ClickConditionId: null
                                },
                                {
                                    ActionDetailsID: this.getUIResponse()!.Actions.find((action) => action.ActionID === 862 || action.ActionID === 1909)!.ActionDetailsID,
                                    ActionID: 862,
                                    ExtraConditions: null,
                                    Action: "Next",
                                    TitleAR: "التالي",
                                    TitleEN: "Next",
                                    ActionSortOrder: 4,
                                    ClickConditionId: null
                                },
                                ...this.actions
                            ]
                        }
                    })
                }


                // Also set up listeners for relevant field changes
                this.navigationTabs()!.forEach(tab => {
                    this.isSection[tab.NavigationTabID] = {}
                    tab.TabSections.forEach(section => {
                        this.isSection[tab.NavigationTabID][section.SectionID] = true
                        const groupedByRow: FieldJson[][] = this.groupFieldsByRow(section.FieldsJson);
                        this.groupedSections[section.SectionOrder] = groupedByRow; // Store the grouped result
                        this.prepareControlsForReactiveForm(section);
                    });
                });
                this.initializeTabFieldCount();
                this.calculateTabVisibility(); // Add this line
                this.setupRelevantFieldListeners();


                console.log(this.wizardForm);
                const currentTabFields: FieldJson[] = [];

                this.visibleNavigationTabs()!.forEach((tab) => {
                    tab.TabSections.forEach(section => {
                        currentTabFields.push(...section.FieldsJson);
                    });
                })
                let crFields = currentTabFields.filter((field) => {
                    return field.ApiFieldAddress.includes("cr=");
                })
                let cpFields = currentTabFields.filter((field) => {
                    return field.ApiFieldAddress.includes("cp=");
                })

                // Get the names of the fields you need
                const crFieldNames = crFields.map(field => field.InternalFieldName);
                const cpFieldNames = cpFields.map(field => field.InternalFieldName);

                let businessGetRequestDataFor_7002 = currentTabFields.filter((field) => {
                    return field.BusinessRuleFun && field.BusinessRuleFun.includes("GetRequestDataFor_7002");
                })
                let businessGetRequestDataFor_5014 = currentTabFields.filter((field) => {
                    return field.BusinessRuleFun && field.BusinessRuleFun.includes("GetRequestDataFor_5014");
                })
                let businesssp_GetSecondaryActivity_ByArea = currentTabFields.filter((field) => {
                    return field.BusinessRuleFun && field.BusinessRuleFun.includes("sp_GetSecondaryActivity_ByArea");
                })

                let businesssp_GenerateRegistrationNumber = currentTabFields.filter((field) => {
                    return field.BusinessRuleFun && field.BusinessRuleFun.includes("sp_GenerateRegistrationNumber");
                })



                this.businessGetRequestDataFor_7002 = businessGetRequestDataFor_7002
                this.businessGetRequestDataFor_5014 = businessGetRequestDataFor_5014
                this.businesssp_GetSecondaryActivity_ByArea = businesssp_GetSecondaryActivity_ByArea

                runInInjectionContext(this.injector, () => {
                    this.setupFormSubscriptions(cpFields, crFields);
                    if (businessGetRequestDataFor_7002.length > 0) {
                        this.setupFormBusinessSubscriptions(businessGetRequestDataFor_7002, currentTabFields, 'GetRequestDataFor_7002')
                    }
                    if (businessGetRequestDataFor_5014.length > 0) {
                        this.setupFormBusinessSubscriptions(businessGetRequestDataFor_5014, currentTabFields, 'GetRequestDataFor_5014')
                    }
                    if (businesssp_GenerateRegistrationNumber.length > 0) {
                        this.setupFormBusinessSubscriptions(businesssp_GenerateRegistrationNumber, currentTabFields, 'sp_GenerateRegistrationNumber')
                    }
                    if (businesssp_GetSecondaryActivity_ByArea.length > 0) {
                        this.setupFormBusinessSubscriptions(businesssp_GetSecondaryActivity_ByArea, currentTabFields, 'sp_GetSecondaryActivity_ByArea')
                    }
                });

                currentTabFields.forEach(field => {
                    let control = this.wizardForm!.get(field.InternalFieldName);

                    if (this.store.auth.user && field.FieldAddress) {
                        let fieldKey: any;
                        if (field.FieldAddress.startsWith('SSO') || field.FieldAddress?.toLowerCase().startsWith('login.')) {
                            if (field.FieldAddress.startsWith('SSO')) {

                                field.FieldAddress = field.FieldAddress.replace(/SSO\./g, '');
                            } else {
                                field.FieldAddress = field.FieldAddress?.replace(/Login\./, '')
                            }

                            if (field.FieldAddress.includes(',') && this.store.index.locale === 'en') {
                                fieldKey = field.FieldAddress.split(',')[1];

                            } else if (field.FieldAddress.includes(',') && this.store.index.locale !== 'en') {
                                fieldKey = field.FieldAddress.split(',')[0];

                            } else if (field.FieldAddress === 'EstablishmentID' || field.FieldAddress === 'CompanyName') {
                                if (this.store.auth.user['IsCompany'] === '1') {
                                    fieldKey = field.FieldAddress
                                }

                            } else {
                                fieldKey = field.FieldAddress
                            }
                            if (fieldKey) {
                                if (control) {
                                    const toLower = (val: any): any =>
                                        typeof val === 'string' ? val?.toLowerCase() : val;
                                    if (field.FieldType === 6) {
                                        let newVal = field.LookupValues!.find((lv) => {
                                            return [
                                                lv.LookupID,
                                                lv.ISOLookupID,
                                                toLower(lv.ISOTitleAr),
                                                toLower(lv.ISOTitleEn),
                                                toLower(lv.TitleAr),
                                                toLower(lv.TitleEn),
                                                toLower(lv.TitleEn),
                                                toLower(lv.TitleAr)
                                            ].includes(
                                                toLower(this.store.auth.user[fieldKey])
                                            )
                                        });
                                        if (newVal) {
                                            control.patchValue(newVal.LookupID);
                                        }
                                    } else if (field.FieldType === 3) {
                                        let newVal = this.store.auth.user[fieldKey]?.split('-')?.reverse()?.join('/');
                                        if (newVal) {
                                            control.patchValue(newVal);
                                        }
                                    } else {
                                        control.patchValue(this.store.auth.user[fieldKey]);
                                    }
                                }
                            }
                        }
                        /* if (field.FieldAddress.includes('FkClubID')) {
                            if (control) {
                                if (field.FieldType === 6) {
                                    let newVal = field.LookupValues!.find((lv) => {
                                        return [
                                            lv.LookupID,
                                            lv.ISOLookupID,
                                            lv.ISOTitleAr?.toLowerCase(),
                                            lv.ISOTitleEn?.toLowerCase(),
                                            lv.TitleAr?.toLowerCase(),
                                            lv.TitleEn?.toLowerCase(),
                                            lv.TitleEn.toLowerCase(),
                                            lv.TitleAr.toLowerCase()
                                        ].includes(this.store.auth.user['FkClubID'])
                                    });
                                    if (newVal) {
                                        control.patchValue(newVal.LookupID);
                                    }
                                } else if (field.FieldType === 3) {
                                    let newVal = this.store.auth.user[fieldKey]?.split('-')?.reverse()?.join('/');
                                    if (newVal) {
                                        control.patchValue(newVal);
                                    }
                                } else {
                                    control.patchValue(this.store.auth.user[fieldKey]);
                                }
                            }
                        } */
                    }


                    /* if (field.ApiFieldAddress.includes("Fee_Calculation")) {
                        control!.valueChanges.pipe(
                            // 1. Wait briefly to ensure the user has finished typing (optional but recommended for API calls)
                            debounceTime(300),

                            // 2. Crucial: Use a custom comparator (like Lodash's isEqual) for deep comparison
                            // This ignores emissions where the value object is the same, 
                            // even if it's a new object reference created by Angular's internal logic.
                            //        distinctUntilChanged(),
                            takeUntil(this.destroy$)
                        ).subscribe({
                            next: () => {
                                if ((control?.value && control?.value.length > 0) || (!Array.isArray(control?.value) && control?.value > 0)) {

                                    let payload = {
                                        "FKServiceID": this.apiBody.FKServiceID,
                                        "FKProcessID": this.apiBody.FKProcessID,
                                        "FkStatusId": this.apiBody.FKCurrentStatusID,
                                        "FKActivityAllIds": [7001, 7002, 7004].includes(this.apiBody.FKServiceID) ? control?.value.join(',') : null,
                                        "FkApplicantTypeID":
                                            field.InternalFieldName === 'ApplicantType' ?
                                                [5014].includes(this.apiBody.FKServiceID) ? control?.value : 0
                                                : [5014].includes(this.apiBody.FKServiceID) ? this.wizardForm!.get('ApplicantType')?.value : 0,
                                        "FkEventID":
                                            field.InternalFieldName === 'EventLocalOrInternational' ?
                                                [5014].includes(this.apiBody.FKServiceID) ? control?.value : 0
                                                : [5014].includes(this.apiBody.FKServiceID) ? this.wizardForm!.get('EventLocalOrInternational')?.value : 0,
                                        "TotalSecondaryActivties": [5003, 5004, 5005, 5008, 5009, 5010, 5012, 5013].includes(this.apiBody.FKServiceID) ? control?.value.length || 0 : 0,
                                        'TotalNewSecondaryActivties': this.newApplicationService.requestData()?.NewSecondaryActivityCount || this.newApplicationService.newRequestData()?.NewSecondaryActivityCount || 0,
                                        "FkPrevStatus": this.newApplicationService.requestData()?.FkPrevStatus || this.newApplicationService.newRequestData()?.FkPrevStatus || 0,
                                        "RenewYears": null,
                                        "FunctionName": this.feeAPIName(),
                                        "FkSexId": [5006].includes(this.apiBody.FKServiceID) ? [this.wizardForm!.get('FkSexID')?.value].find(value => value !== -1) || 0 : 0,
                                        "FkClubID": [5015].includes(this.apiBody.FKServiceID) ? [this.wizardForm!.get('FkClubID')?.value].find(value => value !== -1) || 0 : 0,
                                        "FkMembershipTypeID": [5015].includes(this.apiBody.FKServiceID) ? [this.wizardForm!.get('FkMembershipTypeID')?.value].find(value => value !== -1) || 0 : 0
                                    }
                                    this.newApplicationService.getFees(payload, field.ApiFieldAddress).subscribe((res: any) => {
                                        this.newApplicationService.activityFees.set(res.FeeValue)
                                        this.calcApiLoading = false;
                                    })
                                } else {
                                    this.newApplicationService.activityFees.set(null)
                                }
                            },
                            error: (err: any) => {
                                console.log(err);
                                this.newApplicationService.activityFees.set(null)
                            }
                        })
                    } */

                    if (field.BusinessRuleFun === 'Check_ServiceOwnerEligibility' && !field.FieldAddress.includes('SSO') && !field.ApiFieldAddress.includes('SSO')) {
                        control!.valueChanges.pipe(
                            // 1. Wait briefly to ensure the user has finished typing (optional but recommended for API calls)
                            debounceTime(300),

                            // 2. Crucial: Use a custom comparator (like Lodash's isEqual) for deep comparison
                            // This ignores emissions where the value object is the same, 
                            // even if it's a new object reference created by Angular's internal logic.
                            //               distinctUntilChanged(),
                            takeUntil(this.destroy$)
                        ).subscribe({
                            next: (value) => {
                                if (value && !this.apiLoading) {
                                    if (!Swal.isVisible()) {
                                        this.apiLoading = true;
                                        this.fireBusinessApi_serviceOwner(currentTabFields, field)
                                    }
                                }
                            },
                            error: (err: any) => {
                                console.log(err);
                            }
                        })
                    }

                    if (field.EqualValue) {
                        this.setupEqualValue(field);
                    }

                    if ([4, 6, 19].includes(field.FieldType)) {
                        this.setupRelevantLookupFilter(field.LookupValues!, currentTabFields, field);
                    }
                    if (field.FieldType === 8) {
                        field.TableServiceFields!.forEach((tableField) => {
                            if ([4, 6, 19].includes(tableField.FieldType)) {
                                this.setupRelevantLookupFilter(tableField.LookupValues!, currentTabFields, tableField, field);
                            }
                        })
                    }
                })
                if (this.newApplicationService.newRequestData()) {
                    let data = this.newApplicationService.newRequestData()
                    for (const key in data) {
                        if (!data[key] && data[key] != 0) {
                            delete data[key]
                        }
                    }
                    this.newApplicationService.newRequestData.set(data);
                    this.wizardForm!.patchValue(this.newApplicationService.newRequestData())
                    if (this.newApplicationService.newRequestData().Attachments) {
                        this.newApplicationService.newRequestData().Attachments.forEach((attachmentData: any) => {
                            // Find the FormGroup with the matching FkAttachmentTypeID
                            const attachmentFormGroup = (this.wizardForm!.get('Attachements') as FormArray)
                                .controls.find(control =>
                                    control.get('FkAttachmentTypeID')!.value === attachmentData.FkAttachmentTypeID
                                ) as FormGroup;
                            if (attachmentFormGroup) {
                                // Get the files FormArray from the found FormGroup
                                const filesFormArray = attachmentFormGroup.get('files') as FormControl;
                                if (attachmentData.files) {
                                    filesFormArray.patchValue(attachmentData.files.map((file: any, index: any) => ({ ...file, name: this.translations()?.storedAttachmentName.label })));
                                }
                            }
                        })
                    }
                    console.log(this.newApplicationService.newRequestData())
                    if (this.newApplicationService.defaultProcess()) {
                        let control = this.wizardForm!.get('FkProcessID');
                        control?.valueChanges
                            .pipe(
                                distinctUntilChanged(),     // ignore duplicate values
                                takeUntil(this.destroy$)    // unsubscribe when destroying / before rebuild
                            )
                            .subscribe(value => {
                                if (!value || value === this.apiBody?.FKProcessID) return; // guard: no-op if same
                                this.apiBody.FKProcessID = value;
                                const newState = { ...history.state, defaultProcess: value };
                                history.replaceState(newState, document.title, window.location.href);
                                console.log(this.apiBody);
                                this.newApplicationService.newRequestData.update((data: any) => {
                                    if (!data) return { FkProcessID: value };  // initialize if empty
                                    return { ...data, FkProcessID: value };
                                })
                                console.log(this.newApplicationService.newRequestData());
                                this.openLoader();
                                this.setupPage(); // hint: smaller function
                            });
                    }

                }
                this.navigationTabs!.update((tabs) => {
                    return tabs!.sort((a, b) => a.TabOrder - b.TabOrder)
                });
                this.currentTabIndex.set(1);
                this.visibleTabs.set(this.visibleTabs()!.sort((a, b) => a.id - b.id));
                this.visibleTabs.update(tabs => {
                    if (tabs && tabs.length > 0) {
                        tabs![0].isActive = true;
                        tabs![0].isAccessible = true;
                    }
                    return tabs;
                })
                this.closeLoader();


            });
        }

        this.cdr.detectChanges();

        this.wizardForm = this.fb.group({});
        this.checkScreenSize();

    }

    /*  setupApiEffects() {
         // Convert signals to observables
         const cpResponse$ = toObservable(this.newApplicationService.CPResultResponse).pipe(takeUntil(this.destroy$));
         const crResponse$ = toObservable(this.newApplicationService.CRResultResponse).pipe(takeUntil(this.destroy$));
 
         // Combine both and skip the initial null/undefined values
         combineLatest([cpResponse$, crResponse$])
             .pipe(
                 skip(1), // Skip the initial combined value on setup
                 filter(([cpRes, crRes]) => {
                     // Only run if either result is NOT null (i.e., API call completed)
                     return !cpRes || !crRes;
                 }),
                 takeUntil(this.destroy$)
             )
             .subscribe(([cpRes, crRes]) => {
                 // Your old table clearing logic here
                 if (this.getUIResponse()) {
                     // Find all FormArray fields (FieldType === 8)
                     const allTableFields = this.visibleNavigationTabs()!
                         .flatMap(tab => tab.TabSections.flatMap(section => section.FieldsJson))
 
                     allTableFields.forEach((field) => {
                         if ((field.FieldAddress.includes('GDX.CP') && !cpRes) || (field.FieldAddress.includes('GDX.CR') && !crRes)) {
                             if (field.InternalFieldName !== 'CommercialRegistrationNo') {
                                 if (field.FieldType === 8) {
                                     const formArray = this.wizardForm!.get(field.InternalFieldName) as FormArray;
                                     if (formArray) {
                                         // Clear all but the last control (assuming the last one is the empty template row)
                                         // Note: The correct way to clear a FormArray is to remove at index 0 until length is 1.
                                         while (formArray.length > 1) {
                                             formArray.removeAt(0);
                                         }
                                     }
                                 } else if (field.FieldType === 6 || field.FieldType === 4) {
                                     this.wizardForm!.get(field.InternalFieldName)?.patchValue(-1);
                                 } else if (field.FieldType === 19) {
                                     this.wizardForm!.get(field.InternalFieldName)?.patchValue([]);
                                 } else {
                                     this.wizardForm!.get(field.InternalFieldName)?.patchValue('');
                                 }
                             }
                         }
                     });
 
                     // Clear the external rows tracker
                     this.newApplicationService.rowsFromApi.set([]);
                 }
             });
     } */
    setupFormSubscriptions(cpFields: FieldJson[], crFields: FieldJson[]) {


        // Get the names of the fields you need
        const crFieldNames = crFields.map(field => field.InternalFieldName);
        const cpFieldNames = cpFields.map(field => field.InternalFieldName);

        // Convert the signal to an observable for use in the RxJS pipeline
        const cpSignal$ = toObservable(this.newApplicationService.CPResultResponse).pipe(
            distinctUntilChanged(),
            takeUntil(this.destroy$)
        );

        // Combine all necessary observables into a single stream
        combineLatest([
            this.wizardForm!.valueChanges.pipe(
                debounceTime(500),
                startWith(this.wizardForm!.value),
                pairwise(),
                takeUntil(this.destroy$)
            ),
            cpSignal$
        ]).pipe(
            filter(([[prevForm, currForm], cpSignal]) => {
                const crTriggered = crFieldNames.some(name => currForm[name] !== prevForm[name]);
                const cpTriggered = cpFieldNames.some(name => currForm[name] !== prevForm[name]);

                // Allow stream if a key field was cleared (resetting)
                const crCleared = crFieldNames.some(name => !!prevForm[name] && !currForm[name]);
                const cpCleared = cpFieldNames.some(name => !!prevForm[name] && !currForm[name]);
                if (crCleared || cpCleared) {
                    return true;
                }

                // Your existing logic for triggering API calls
                if (cpTriggered && cpFieldNames.every(name => !!currForm[name])) {
                    return true;
                }

                if (crTriggered) {
                    if (cpSignal) {
                        const firstCrFieldName = crFieldNames[0];
                        return !!currForm[firstCrFieldName] && currForm[firstCrFieldName] !== prevForm[firstCrFieldName];
                    } else {
                        return crFieldNames.every(name => !!currForm[name]);
                    }
                }

                return false;
            }),
            // Transform the filtered value to an object containing the required data for the API call
            map(([[prevForm, currForm], cpSignal]) => ({
                formValue: currForm,
                cpSignal,
                prevForm,
            })),
            distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
            takeUntil(this.destroy$)
        ).subscribe(({ formValue, cpSignal, prevForm }) => {
            try {
                this.GDXStarterFlag = true;
                const cpTriggered = cpFieldNames.some(name => formValue[name] !== prevForm[name]);
                const crTriggered = crFieldNames.some(name => formValue[name] !== prevForm[name]);

                const crCleared = crFieldNames.some(name => !!prevForm[name] && !formValue[name] && Object.hasOwn(formValue, 'CommercialRegistrationNo'));
                const cpCleared = cpFieldNames.some(name => !!prevForm[name] && !formValue[name] && Object.hasOwn(formValue, 'CommercialLicenseNumber'));

                // Logic to clear signals when a field is emptied
                if (crCleared) {
                    this.newApplicationService.CRResultResponse.set(null);
                }
                if (cpCleared) {
                    this.newApplicationService.CPResultResponse.set(null);
                }


                if (cpTriggered && cpFieldNames.every(name => !!formValue[name])) {
                    // Call the CP API
                    const firstCpField = cpFields[0];
                    this.newApplicationService.getCP(`${firstCpField.ApiFieldAddress}${formValue[firstCpField.InternalFieldName]}`).subscribe({
                        next: (res: any) => {
                            try {
                                if (res?.result?.result === 'ERROR') {
                                    if (this.currentTab()!.TabSections[0].FieldsJson[0].FieldType !== 9 || this.apiBody?.FKCurrentStatusID !== null) {
                                        Swal.fire({
                                            icon: 'error',
                                            title: this.translations()?.errorCP.label,
                                            showConfirmButton: true,
                                            confirmButtonText: this.translations()?.validationMsgBtn.label
                                        }).then(() => {
                                            let fileControl = this.wizardForm!.get(firstCpField.RelatedAIInternalFieldName)
                                            if (fileControl) {
                                                const fieldId = firstCpField.RelatedAIInternalFieldName;
                                                const inputElement = document.getElementById(fieldId);

                                                if (inputElement) {
                                                    // 1. Find the parent container of both the input and the button
                                                    const container = inputElement.parentElement;

                                                    // 2. Look for the button with the 'clear' label inside that container
                                                    const deleteButton = container?.querySelector('button[aria-label="clear"]') as HTMLElement;

                                                    if (deleteButton) {
                                                        Swal.fire({
                                                            icon: 'info',
                                                            title: this.translations()?.fileDeletedMsg.label,
                                                            showConfirmButton: true,
                                                            confirmButtonText: this.translations()?.validationMsgBtn.label
                                                        })
                                                        deleteButton.click();
                                                    } else {
                                                        console.warn(`Delete button for ${fieldId} not found in DOM. Is a file actually selected?`);
                                                    }
                                                }
                                            }
                                        })
                                    }
                                } else {
                                    let expireDate = this.wizardForm!.get('CommercialLicense_Expire_Date');

                                    const [year, month, day] = res.CommercialPermitInfogetCommercialPermitInfoResponse1.commercialPermit.expiryDate.split("T")[0].split("-");
                                    const formattedExpiryDate = `${day}/${month}/${year}`;

                                    if (formattedExpiryDate === expireDate?.value) {
                                        this.currentTabIsValid['cp'] = true;
                                        this.newApplicationService.CPResultResponse.set(res);
                                    } else {
                                        if (this.currentTab()!.TabSections[0].FieldsJson[0].FieldType !== 9 || this.apiBody?.FKCurrentStatusID !== null) {
                                            Swal.fire({
                                                icon: 'error',
                                                title: this.translations()?.expiryDateCPErr.label,
                                                showConfirmButton: true,
                                                confirmButtonText: this.translations()?.validationMsgBtn.label
                                            }).then(() => {

                                                let fileControl = this.wizardForm!.get(firstCpField.RelatedAIInternalFieldName)
                                                if (fileControl) {
                                                    const fieldId = firstCpField.RelatedAIInternalFieldName;
                                                    const inputElement = document.getElementById(fieldId);

                                                    if (inputElement) {
                                                        // 1. Find the parent container of both the input and the button
                                                        const container = inputElement.parentElement;

                                                        // 2. Look for the button with the 'clear' label inside that container
                                                        const deleteButton = container?.querySelector('button[aria-label="clear"]') as HTMLElement;

                                                        if (deleteButton) {
                                                            Swal.fire({
                                                                icon: 'info',
                                                                title: this.translations()?.fileDeletedMsg.label,
                                                                showConfirmButton: true,
                                                                confirmButtonText: this.translations()?.validationMsgBtn.label
                                                            })
                                                            deleteButton.click();
                                                        } else {
                                                            console.warn(`Delete button for ${fieldId} not found in DOM. Is a file actually selected?`);
                                                        }
                                                    }
                                                }
                                            })
                                        }
                                        this.currentTabIsValid['cp'] = false
                                    }
                                }
                            } catch (error) {

                            }
                        },
                        error: (err: any) => {
                            if (this.currentTab()!.TabSections[0].FieldsJson[0].FieldType !== 9 || this.apiBody?.FKCurrentStatusID !== null) {
                                Swal.fire({
                                    icon: 'error',
                                    title: this.translations()?.errorCP.label,
                                    showConfirmButton: true,
                                    confirmButtonText: this.translations()?.validationMsgBtn.label
                                }).then(() => {
                                    let fileControl = this.wizardForm!.get(firstCpField.RelatedAIInternalFieldName)
                                    if (fileControl) {
                                        const fieldId = firstCpField.RelatedAIInternalFieldName;
                                        const inputElement = document.getElementById(fieldId);

                                        if (inputElement) {
                                            // 1. Find the parent container of both the input and the button
                                            const container = inputElement.parentElement;

                                            // 2. Look for the button with the 'clear' label inside that container
                                            const deleteButton = container?.querySelector('button[aria-label="clear"]') as HTMLElement;

                                            if (deleteButton) {
                                                Swal.fire({
                                                    icon: 'info',
                                                    title: this.translations()?.fileDeletedMsg.label,
                                                    showConfirmButton: true,
                                                    confirmButtonText: this.translations()?.validationMsgBtn.label
                                                })
                                                deleteButton.click();
                                            } else {
                                                console.warn(`Delete button for ${fieldId} not found in DOM. Is a file actually selected?`);
                                            }
                                        }
                                    }
                                })
                            }

                            // Handle error
                        }
                    });
                    return;
                }

                // This logic runs only if a CP change didn't trigger an API call.
                // Check if the CR condition is met
                if (crTriggered) {
                    let shouldCallCr = false;
                    if (cpSignal) {
                        const firstCrFieldName = crFieldNames[0];
                        shouldCallCr = !!formValue[firstCrFieldName];
                    } else {
                        shouldCallCr = crFieldNames.every(name => !!formValue[name]);
                    }

                    if (shouldCallCr) {
                        // Call the CR API
                        const firstCrField = crFields[0];
                        this.newApplicationService.getCR(`${firstCrField.ApiFieldAddress}${formValue[firstCrField.InternalFieldName]}`).subscribe({
                            next: (res: any) => {
                                try {

                                    if (res?.result?.result === 'ERROR') {
                                        if (this.currentTab()!.TabSections[0].FieldsJson[0].FieldType !== 9 || this.apiBody?.FKCurrentStatusID !== null) {
                                            Swal.fire({
                                                icon: 'error',
                                                title: this.translations()?.errorCR.label,
                                                showConfirmButton: true,
                                                confirmButtonText: this.translations()?.validationMsgBtn.label
                                            }).then(() => {
                                                let fileControl = this.wizardForm!.get(firstCrField.RelatedAIInternalFieldName)
                                                if (fileControl) {
                                                    const fieldId = firstCrField.RelatedAIInternalFieldName;
                                                    const inputElement = document.getElementById(fieldId);

                                                    if (inputElement) {
                                                        // 1. Find the parent container of both the input and the button
                                                        const container = inputElement.parentElement;

                                                        // 2. Look for the button with the 'clear' label inside that container
                                                        const deleteButton = container?.querySelector('button[aria-label="clear"]') as HTMLElement;

                                                        if (deleteButton) {
                                                            Swal.fire({
                                                                icon: 'info',
                                                                title: this.translations()?.fileDeletedMsg.label,
                                                                showConfirmButton: true,
                                                                confirmButtonText: this.translations()?.validationMsgBtn.label
                                                            })
                                                            deleteButton.click();
                                                        } else {
                                                            console.warn(`Delete button for ${fieldId} not found in DOM. Is a file actually selected?`);
                                                        }
                                                    }
                                                }
                                            })
                                        }
                                    } else {
                                        let sotredExpireDate: any = this.wizardForm!.get('CommercialRegistry_Expire_Date')?.value;

                                        const [year, month, day] = res.result.expiryDate.split("T")[0].split("-");
                                        const formattedExpiryDate = `${day}/${month}/${year}`;
                                        if (!cpSignal && formattedExpiryDate === sotredExpireDate) {
                                            this.currentTabIsValid['cr'] = true;
                                            this.newApplicationService.CRResultResponse.set(res);
                                        } else if (cpSignal) {
                                            this.currentTabIsValid['cr'] = true;
                                            this.newApplicationService.CRResultResponse.set(res);
                                        } else {
                                            if (this.currentTab()!.TabSections[0].FieldsJson[0].FieldType !== 9 || this.apiBody?.FKCurrentStatusID !== null) {
                                                Swal.fire({
                                                    icon: 'error',
                                                    title: this.translations()?.expiryDateCRErr.label,
                                                    showConfirmButton: true,
                                                    confirmButtonText: this.translations()?.validationMsgBtn.label
                                                }).then(() => {
                                                    let fileControl = this.wizardForm!.get(firstCrField.RelatedAIInternalFieldName)
                                                    if (fileControl) {
                                                        const fieldId = firstCrField.RelatedAIInternalFieldName;
                                                        const inputElement = document.getElementById(fieldId);

                                                        if (inputElement) {
                                                            // 1. Find the parent container of both the input and the button
                                                            const container = inputElement.parentElement;

                                                            // 2. Look for the button with the 'clear' label inside that container
                                                            const deleteButton = container?.querySelector('button[aria-label="clear"]') as HTMLElement;

                                                            if (deleteButton) {
                                                                Swal.fire({
                                                                    icon: 'info',
                                                                    title: this.translations()?.fileDeletedMsg.label,
                                                                    showConfirmButton: true,
                                                                    confirmButtonText: this.translations()?.validationMsgBtn.label
                                                                })
                                                                deleteButton.click();
                                                            } else {
                                                                console.warn(`Delete button for ${fieldId} not found in DOM. Is a file actually selected?`);
                                                            }
                                                        }
                                                    }
                                                })
                                            }
                                            this.currentTabIsValid['cr'] = false
                                        }
                                    }
                                } catch (error) {

                                }
                            },
                            error: (err: any) => {
                                if (this.currentTab()!.TabSections[0].FieldsJson[0].FieldType !== 9 || this.apiBody?.FKCurrentStatusID !== null) {
                                    Swal.fire({
                                        icon: 'error',
                                        title: this.translations()?.errorCR.label,
                                        showConfirmButton: true,
                                        confirmButtonText: this.translations()?.validationMsgBtn.label
                                    }).then(() => {
                                        let fileControl = this.wizardForm!.get(firstCrField.RelatedAIInternalFieldName)
                                        if (fileControl) {
                                            const fieldId = firstCrField.RelatedAIInternalFieldName;
                                            const inputElement = document.getElementById(fieldId);

                                            if (inputElement) {
                                                // 1. Find the parent container of both the input and the button
                                                const container = inputElement.parentElement;

                                                // 2. Look for the button with the 'clear' label inside that container
                                                const deleteButton = container?.querySelector('button[aria-label="clear"]') as HTMLElement;

                                                if (deleteButton) {
                                                    Swal.fire({
                                                        icon: 'info',
                                                        title: this.translations()?.fileDeletedMsg.label,
                                                        showConfirmButton: true,
                                                        confirmButtonText: this.translations()?.validationMsgBtn.label
                                                    })
                                                    deleteButton.click();
                                                } else {
                                                    console.warn(`Delete button for ${fieldId} not found in DOM. Is a file actually selected?`);
                                                }
                                            }
                                        }
                                    })
                                }
                            }
                        });
                    }
                }
            } catch (error) {

            }
        });
    }

    setupFormBusinessSubscriptions(businessFields: FieldJson[], currentTabFields: FieldJson[], BusinessRuleFun: any) {
        const businessFieldNames = businessFields.map(field => field.InternalFieldName);

        this.wizardForm!.valueChanges.pipe(
            debounceTime(500),
            startWith(this.wizardForm!.value),
            pairwise(),
            filter(([prevForm, currForm]) => {
                let businessFieldsTriggered = businessFieldNames.some(name => currForm[name] !== prevForm[name]);
                const businessFieldsCleared = businessFieldNames.some(name => !!prevForm[name] && !currForm[name]);
                // Your existing logic for triggering API calls
                let ApprovalNumber_YouthEvent = currForm['ApprovalNumber_YouthEvent'];
                if (businessFieldsTriggered && ApprovalNumber_YouthEvent &&
                    businessFieldNames.some(name => !!currForm[name] && name !== 'ApprovalNumber_YouthEvent')) {
                    return true;
                }
                if (this.apiBody.FKServiceID === 5014 && businessFieldsTriggered) {
                    if (businessFieldsTriggered) {
                        return true;
                    }
                }
                if (businessFieldsTriggered && this.apiBody.FKServiceID === 5006) {
                    return true;
                }
                if (businessFieldsTriggered && this.apiBody.FKServiceID === 7007) {
                    return true
                }
                if (businessFieldsCleared) {
                    return true;
                }
                return false;

            }),
            map(([prevForm, currForm]) => ({
                formValue: currForm,
                prevForm,
                // You can add logic here to determine if the call is a 'clear' or 'trigger'
            })),
            distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
            takeUntil(this.destroy$)
        ).subscribe(({ formValue, prevForm }) => {
            const businessFieldsCleared = businessFieldNames.some(name => !!prevForm[name] && !formValue[name]);
            if (businessFieldsCleared) {
                const allFields = this.extractFields(this.navigationTabs());
                const patchFields = allFields.filter((field) => {
                    return field.FetchDataFun === BusinessRuleFun
                })
                patchFields.forEach(field => {
                    if ([5, 6].includes(field.FieldType)) {
                        this.wizardForm!.patchValue({ [field.InternalFieldName]: -1 });
                    } else {
                        this.wizardForm!.get(field.InternalFieldName)?.reset();
                    }

                })

                return;
            }
            /* if (this.apiBody.FKServiceID === 5006 && !this.apiLoading) {
                this.apiLoading = true;
                this.wizardService.businessCondition(formValue, currentTabFields, businessFields[0].BusinessRuleColmns, this.requestID, businessFields[0].BusinessRuleFun, this.apiBody.FKServiceID).subscribe((business: any) => {
                    const allFields = this.extractFields(this.navigationTabs());
                    const patchFields = allFields.filter((field) => {
                        return field.FetchDataFun === BusinessRuleFun
                    })
                    const patchFieldsNames = patchFields.map(field => field.InternalFieldName);
                    let payload: any = {};
                    for (const key in business[0]) {
                        if (!Object.hasOwn(business[0], key)) continue;
                        if (patchFieldsNames.includes(key)) {
                            if (business[0][key])
                                payload[key] = [business[0][key]];
                        } else {
                            payload[key] = [];
                        }
                    }
                    this.wizardForm!.patchValue(payload);
                    this.apiLoading = false;
                })
                return;
            }
            if (!this.apiLoading) {
                this.apiLoading = true
                this.wizardService.businessCondition(formValue, currentTabFields, businessFields[0].BusinessRuleColmns, this.requestID, businessFields[0].BusinessRuleFun, this.apiBody.FKServiceID).subscribe((business: any) => {
                    if (!business[0].CanContinue) {
                        this.businessError = { field: businessFields[0], business: business };
                        const currentTabFields: FieldJson[] = [];
                        if (!this.editApp()) {
                            this.currentTab()?.TabSections.forEach(section => {
                                currentTabFields.push(...section.FieldsJson);
                            });
                        } else {
                            this.visibleNavigationTabs()!.forEach((tab) => {
                                tab.TabSections.forEach(section => {
                                    currentTabFields.push(...section.FieldsJson);
                                });
                            })
                        }
                        this.apiLoading = false;
                        this.showBusinessError(businessFields[0].BusinessRuleFun, this.businessError, currentTabFields);
                    } else {
                        this.businessError = null;
                        if (business[0].RequestID) {
                            this.newApplicationService.getRequest(business[0].RequestID).subscribe((res: any) => {
                                // if (this.newApplicationService.requestData().Attachments) {
                                //    this.transformAttachmentData(this.newApplicationService.requestData());
                               // } 

                                this.transformUpdateData(res);
                                const allFields = this.extractFields(this.navigationTabs());
                                const patchFields = allFields.filter((field) => {
                                    return field.FetchDataFun === BusinessRuleFun
                                })
                                const patchFieldsNames = patchFields.map(field => field.InternalFieldName);
                                let payload: any = {};
                                for (const key in res) {
                                    if (!Object.hasOwn(res, key)) continue;
                                    if (patchFieldsNames.includes(key)) {
                                        payload[key] = res[key];
                                    }
                                }
                                this.apiLoading = false;
                                this.wizardForm!.patchValue(payload);
                            })
                        }
                    }
                })
            } */
            this.fireBusinessApi_getRequest(businessFields, BusinessRuleFun, currentTabFields, formValue);

        })

    }
    async fireBusinessApi_getRequest(
        businessFields: FieldJson[],
        BusinessRuleFun: any,
        currentTabFields: FieldJson[],
        formValue: any
    ) {
        if (this.apiLoading) return; // prevent duplicate
        this.apiLoading = true;

        // Call businessCondition and WAIT for it
        const business = await firstValueFrom(
            this.wizardService.businessCondition(
                formValue,
                currentTabFields,
                businessFields[0].BusinessRuleColmns,
                this.requestID,
                businessFields[0].BusinessRuleFun,
                this.apiBody.FKServiceID
            )
        );

        // ----------------------
        // CASE 1: ServiceID 5006
        // ----------------------
        if (this.apiBody.FKServiceID === 5006 || this.apiBody.FKServiceID === 7007) {
            const allFields = this.extractFields(this.navigationTabs());
            const patchFields = allFields.filter(
                field => field.FetchDataFun === BusinessRuleFun
            );
            const patchFieldsNames = patchFields.map(f => f.InternalFieldName);

            let payload: any = {};
            for (const key in business[0]) {
                if (!Object.hasOwn(business[0], key)) continue;
                if (patchFieldsNames.includes(key)) {

                    if (business[0][key]) {
                        payload[key] = [business[0][key]]
                    } else {
                        if (this.apiBody.FKServiceID === 7007) {
                            payload[key] = '';
                        }
                    }
                } else {
                    payload[key] = [];
                }
            }

            this.wizardForm!.patchValue(payload);
            this.apiLoading = false;
            return business; // return so caller can await value
        }

        // ----------------------
        // CASE 2: Cannot Continue
        // ----------------------
        if (!business[0].CanContinue) {
            this.businessError = { field: businessFields[0], business };

            const tabFields: FieldJson[] = [];

            if (!this.editApp()) {
                this.currentTab()?.TabSections.forEach(section =>
                    tabFields.push(...section.FieldsJson)
                );
            } else {
                this.visibleNavigationTabs()?.forEach(tab =>
                    tab.TabSections.forEach(section =>
                        tabFields.push(...section.FieldsJson)
                    )
                );
            }

            this.apiLoading = false;

            // ❗ async or sync, doesn't matter
            this.showBusinessError(
                businessFields[0].BusinessRuleFun,
                this.businessError,
                tabFields
            );

            return business; // allow awaiting
        } else {
            this.businessError = null
        }

        // ----------------------
        // CASE 3: Continue + fetch request data
        // ----------------------
        if (business[0].RequestID) {
            const res = await firstValueFrom(
                this.newApplicationService.getRequest(business[0].RequestID)
            );

            this.transformUpdateData(res);

            const allFields = this.extractFields(this.navigationTabs());
            const patchFields = allFields.filter(
                field => field.FetchDataFun === BusinessRuleFun
            );
            const patchFieldsNames = patchFields.map(f => f.InternalFieldName);

            for (const patchField of patchFields) {
                let data = res[patchField.InternalFieldName];
                if ([4, 5, 6, 19].includes(patchField?.FieldType!)) {
                    patchField?.LookupValues!.forEach((lv) => {
                        lv.disabled = lv.DimIfNotAutoReturned && !data?.includes(lv.LookupID);
                    })
                }
            }
            let payload: any = {};
            for (const key in res) {
                if (patchFieldsNames.includes(key)) {
                    payload[key] = res[key];
                }
            }

            this.wizardForm!.patchValue(payload);
            this.apiLoading = false;

            return business;
        } else {
            this.businessError = null
        }

        this.apiLoading = false;
        return business;
    }

    async fireBusinessApi_serviceOwner(
        currentTabFields: FieldJson[],
        field: FieldJson
    ) {
        // Convert observable → promise
        const business = await firstValueFrom(
            this.wizardService.businessCondition(
                this.wizardForm!.value,
                currentTabFields,
                field.BusinessRuleColmns,
                this.requestID,
                field.BusinessRuleFun,
                this.apiBody.FKServiceID
            )
        );

        if (!business[0]?.CanContinue) {
            this.businessError = { field: field, business: business };

            const tabFields: FieldJson[] = [];

            if (!this.editApp()) {
                this.currentTab()?.TabSections.forEach(section => {
                    tabFields.push(...section.FieldsJson);
                });
            } else {
                this.visibleNavigationTabs()?.forEach(tab => {
                    tab.TabSections.forEach(section => {
                        tabFields.push(...section.FieldsJson);
                    });
                });
            }

            this.showBusinessError(field.BusinessRuleFun, this.businessError, tabFields);

        } else {
            this.apiLoading = false;
            this.businessError = null;
        }

        return business; // optional (lets caller await the result)
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
    getNestedValue(obj: any, path: string) {
        const keys = path.split('.');

        const resolver = (currentObj: any, remainingKeys: string[]): any => {
            if (currentObj === undefined || currentObj === null) return undefined;
            if (remainingKeys.length === 0) return currentObj;

            const [key, ...rest] = remainingKeys;

            if (key.endsWith('[]')) {
                const arrayKey = key.slice(0, -2);
                if (Array.isArray(currentObj[arrayKey])) {
                    return currentObj[arrayKey].map(item => resolver(item, rest));
                } else {
                    return undefined;
                }
            } else {
                return resolver(currentObj[key], rest);
            }
        };

        return resolver(obj, keys);
    }

    private setupEffect(field: FieldJson | TableServiceField): void {


        if (!("ServiceTableFieldID" in field)) {
            // FieldJson type
            const control = this.wizardForm!.get(field.InternalFieldName);
            if (!control) {
                return; // Early exit if no form control is found
            }


            const fieldPaths = field.FieldAddress.includes('(OR)')
                ? field.FieldAddress.split('(OR)').map(p => p.trim())
                : [field.FieldAddress];

            for (const path of fieldPaths) {
                // Determine source based on path prefix
                const sourceInfo = this.getSourceInfo(path);
                if (!sourceInfo) {
                    continue;
                }
                /* if (fieldPaths.every((path) => !this.getSourceInfo(path)?.responseFn())) {
                    console.log('are all signals empty?');
                    console.log(fieldPaths.every((path) => !this.getSourceInfo(path)?.responseFn()));
                    fieldPaths.forEach((path) => {
                        console.log(this.getSourceInfo(path)?.responseFn());
                    })
                    if (field.FieldType === 6 || field.FieldType === 19 || field.FieldType === 4 || field.FieldType === 5) {
                        control.patchValue(field.LookupValues![0].LookupID);
                    } else {
                        control.patchValue('');
                    }
                } */
                if (field.InternalFieldName === 'CommercialRegistry_Expire_Date' && !this.newApplicationService.CPResultResponse()) {
                    return;
                }
                // Skip the first run for the specific source
                if (this[sourceInfo.patchFlagKey]) {
                    // Resolve the value from the source
                    const value = this.resolveValue(sourceInfo.responseFn(), sourceInfo.prefix, path);

                    // Patch the control if a usable value is found
                    if (this.canPatchValue(value)) {
                        this.newApplicationService.uiResponseAllFields.update((value2) => {
                            let index = value2!.findIndex((item) => {
                                if (item.InternalFieldName === field.InternalFieldName) {
                                    return item;
                                } else {
                                    return false;
                                }
                            })
                            value2![index].hasDataFromAiPriority = this.newApplicationService.hasDataFromAiPriority();
                            return value2;
                        })
                        if (field.FieldType === 6 || field.FieldType === 19 || field.FieldType === 4 || field.FieldType === 5) {
                            if (field.FieldType === 19 || field.FieldType === 4) {
                                let newVals = field.LookupValues!.filter((item) => [item.ISOTitleAr?.trim(), item.ISOTitleEn?.trim(), item.ISOLookupID].some(val => val === value.trim()));
                                if (newVals.length > 0) {
                                    field.isGDXVal = true;
                                    control.patchValue(newVals.map((newVal) => newVal.LookupID));
                                }
                            } else {
                                let newVal = field.LookupValues!.find((item) => [item.ISOTitleAr?.trim(), item.ISOTitleEn?.trim(), item.ISOLookupID].includes(value.trim()))
                                if (newVal) {
                                    field.isGDXVal = true;
                                    control.patchValue(newVal.LookupID);
                                }
                            }
                        } else {
                            if (field.InternalFieldName === 'CommercialRegistry_Expire_Date') {
                                field.isGDXVal = true;
                                control.patchValue(new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value)));
                            } else {
                                field.isGDXVal = true;
                                control.patchValue(value);
                            }
                        }
                        if (value) { // Break if we found a value in an (OR) case
                            break;
                        }
                    }
                }
                this[sourceInfo.patchFlagKey] = true;
            }
        } else {
            const fieldPaths = field.FieldAddress.includes('(OR)')
                ? field.FieldAddress.split('(OR)').map(p => p.trim())
                : [field.FieldAddress];

            for (const path of fieldPaths) {
                // Determine source based on path prefix
                const sourceInfo = this.getSourceInfo(path);
                if (!sourceInfo) {
                    continue;
                }
                if (this[sourceInfo.patchFlagKey]) {
                    if (path === 'establishmentPartners[].commercialRegistrationCodehasvalue' && (field.FieldType === 6 || field.FieldType === 19 || field.FieldType === 5 || field.FieldType === 4) && sourceInfo.responseFn()) {
                        let newVal = field.LookupValues!.find((item) => [item.ISOTitleAr?.trim(), item.ISOTitleEn?.trim(), ...(item.ISOLookupID !== undefined ? item.ISOLookupID.split(',') : [])].includes(path.trim()))
                        this.newApplicationService.appendColumnValuesFromPath(path, field.InternalFieldName, [newVal!.LookupID] as any[]);
                    } else if (path.includes('establishmentPartners[].commercialRegistrationCodehasvalue') && (field.FieldType === 6 || field.FieldType === 19 || field.FieldType === 5 || field.FieldType === 4) && sourceInfo.responseFn()) {
                        let newPath = path.split(',')
                        let columnValues = this.resolveValue(sourceInfo.responseFn(), sourceInfo.prefix, 'GDX.CR.result.establishmentPartners[]');
                        if (columnValues) {
                            let newVal = field.LookupValues!.find((item) => [item.ISOTitleAr?.trim(), item.ISOTitleEn?.trim(), ...(item.ISOLookupID !== undefined ? item.ISOLookupID.split(',') : [])].includes(newPath[newPath.length - 1].trim()));
                            this.newApplicationService.appendColumnValuesFromPath(newPath[newPath.length - 1], field.InternalFieldName, [newVal!.LookupID] as any[]);
                        }
                    }
                    if (sourceInfo.responseFn()) {
                        let columnValues = this.resolveValue(sourceInfo.responseFn(), sourceInfo.prefix, path);
                        /* this.newApplicationService.appendColumnValues(path, field.InternalFieldName, columnValues); */
                        if (typeof columnValues === 'object' && !Array.isArray(columnValues)) {
                            // Multiple sources
                            for (let [sourceKey, values] of Object.entries(columnValues)) {
                                values = values || []
                                if (field.FieldType === 6 || field.FieldType === 19 || field.FieldType === 5 || field.FieldType === 4) {
                                    let newVal = (values as any[]).map((value) => field.LookupValues!.find((item) => [item.ISOTitleAr?.trim(), item.ISOTitleEn?.trim(), ...(item.ISOLookupID !== undefined ? item.ISOLookupID.split(',') : [])].includes(value.trim())))


                                    if (newVal && (newVal as any[]).filter((val) => !!val).length > 0) {
                                        newVal = (newVal as any[]).map((newVal: any) => newVal.LookupID)
                                        this.newApplicationService.appendColumnValuesToSource(sourceKey, field.InternalFieldName, newVal as any[]);
                                    }
                                } else {
                                    if (field.FieldType === 6 || field.FieldType === 19 || field.FieldType === 5 || field.FieldType === 4) {
                                        let newVal = (values as any[]).map((value) => field.LookupValues!.find((item) => [item.ISOTitleAr?.trim(), item.ISOTitleEn?.trim(), item.ISOLookupID].includes(value.trim())))
                                        if (newVal && (newVal as any[]).filter((val) => !!val).length > 0) {
                                            this.newApplicationService.appendColumnValuesToSource(sourceKey, field.InternalFieldName, values as any[]);
                                        }
                                    } else {
                                        this.newApplicationService.appendColumnValuesToSource(sourceKey, field.InternalFieldName, values as any[]);
                                    }
                                }

                            }
                        } else {
                            if (field.FieldType === 6 || field.FieldType === 19 || field.FieldType === 5 || field.FieldType === 4) {
                                columnValues = columnValues || []
                                let newVal = (columnValues as any[]).map((value) => field.LookupValues!.find((item) => [item.ISOTitleAr?.trim(), item.ISOTitleEn?.trim(), ...(item.ISOLookupID !== undefined ? item.ISOLookupID.split(',') : [])].includes(value.trim())))
                                if (newVal && (newVal as any[]).filter((val) => !!val).length > 0) {
                                    newVal = (newVal as any[]).map((newVal: any) => newVal.LookupID)
                                    this.newApplicationService.appendColumnValuesFromPath(path, field.InternalFieldName, newVal as any[]);
                                }
                            } else {
                                // Single source
                                this.newApplicationService.appendColumnValuesFromPath(path, field.InternalFieldName, columnValues as any[]);
                            }
                        }
                    }
                }
                this[sourceInfo.patchFlagKey] = true;
            }
        }
    }

    private getSourceInfo(path: string): { prefix: string; responseFn: () => any; patchFlagKey: 'hasPatchedCR' | 'hasPatchedCP' } | null {
        if (path.includes('GDX.CR')) {
            return {
                prefix: 'GDX.CR.',
                responseFn: () => this.newApplicationService.CRResultResponse(),
                patchFlagKey: 'hasPatchedCR',
            };
        }
        if (path.includes('GDX.CP')) {
            return {
                prefix: 'GDX.CP.',
                responseFn: () => this.newApplicationService.CPResultResponse(),
                patchFlagKey: 'hasPatchedCP',
            };
        }
        return null;
    }

    private resolveValue(source: any, prefix: string, path: string): any {
        const cleanedPath = path.replace(new RegExp(prefix, 'g'), '');
        // Case 1: joined with '/'
        if (cleanedPath.includes('/')) {
            const parts = cleanedPath.split('/');
            const values = parts.map(p => this.getNestedValue(source, p));

            if (values.every(val => !!val && values[values.length - 1] != 0)) {
                return values.join('/');
            } else {
                return values[0];
            }
        }

        // Case 2: comma-separated (multiple sources)
        if (path.includes(',')) {
            const parts = path.split(',').map(p => p.trim());

            return parts.reduce((acc, p) => {
                const sourceKey = this.newApplicationService.getSourceKey(p);
                acc[sourceKey] = this.getNestedValue(source, p.replace(new RegExp(prefix, 'g'), ''));
                return acc || [];
            }, {} as Record<string, any[]>);
        }

        // Case 3: simple path
        return this.getNestedValue(source, cleanedPath);
    }

    private canPatchValue(value: any): boolean {
        if (Array.isArray(value)) {
            // A bit more robust check for non-empty arrays with meaningful content
            return value.length > 0 && value.some(val => val !== null && val !== undefined && val !== '');
        }
        return value !== null && value !== undefined && value !== '';
    }

    transformUpdateData(formData: any) {

        const currentTabFields: FieldJson[] = [];

        this.navigationTabs()!.forEach((tab) => {
            tab.TabSections.forEach(section => {
                currentTabFields.push(...section.FieldsJson);
            });
        })
        for (const field of currentTabFields) {
            if (field.FieldType === 4 || field.FieldType === 19) {
                if (formData.ServiceTables) {
                    let newData = formData.ServiceTables.filter((fieldData: any) => fieldData.SourceTableID == field.TableServiceFields!.find((arrItem) => arrItem.IsSystemField === false)!.SourceTableID).reduce((acc: any, fieldData: any) => [...acc, fieldData[field.TableServiceFields!.find((arrItem) => arrItem.IsSystemField === false)!.InternalFieldName]], []);

                    let titlesEn = formData.ServiceTables
                        .filter((fieldData: any) => fieldData.SourceTableID == field.TableServiceFields!
                            .find((arrItem) => arrItem.IsSystemField === false)!.SourceTableID)
                        .reduce((acc: any, fieldData: any) => [...acc, fieldData[`${field.TableServiceFields!
                            .find((arrItem) => arrItem.IsSystemField === false)!.InternalFieldName}_TitleEn`]], []);

                    let titlesAr = formData.ServiceTables
                        .filter((fieldData: any) => fieldData.SourceTableID == field.TableServiceFields!
                            .find((arrItem) => arrItem.IsSystemField === false)!.SourceTableID)
                        .reduce((acc: any, fieldData: any) => [...acc, fieldData[`${field.TableServiceFields!
                            .find((arrItem) => arrItem.IsSystemField === false)!.InternalFieldName}_TitleAr`]], []);


                    let TechnicalApprovalFile = formData.ServiceTables
                        .filter((fieldData: any) => fieldData.SourceTableID == field.TableServiceFields!
                            .find((arrItem) => arrItem.IsSystemField === false)!.SourceTableID)
                        .reduce((acc: any, fieldData: any) => [...acc, fieldData[`${field.TableServiceFields!
                            .find((arrItem) => arrItem.IsSystemField === false)!.InternalFieldName}_TechnicalApprovalFile`]], []);


                    formData[field.InternalFieldName] = newData;
                    formData[`${field.InternalFieldName}_TitleEn`] = titlesEn;
                    formData[`${field.InternalFieldName}_TitleAr`] = titlesAr;
                    formData[`${field.InternalFieldName}_TechnicalApprovalFile`] = TechnicalApprovalFile;
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
    prepareControlsForReactiveForm(section: TabSection) {
        section.FieldsJson.forEach(field => {
            const validators = [];
            if (field.FieldType === 18) {
                return; // Skip fields of type 18 (e.g., label)
            }
            if (field.InternalFieldName === 'FkProcessID' && this.newApplicationService.newRequestData() && this.newApplicationService.newRequestData().Processes.length > 0) {
                field.LookupValues = this.newApplicationService.newRequestData().Processes;
            }
            if (field.FieldDefaultRequired) {
                validators.push(Validators.required);
            }
            // Add more validators based on FieldType or other field properties as needed
            // Add other type-specific validators (e.g., Validators.email for email fields)
            // Multi-checkbox or RadioButton
            if (field.FieldType === 4 || field.FieldType === 19) {
                // Initialize with an empty array if it's a multi-checkbox
                const initialValue = Array.isArray(+field.FieldDefaultValue) ? field.FieldDefaultValue : [];
                const control = new FormControl({ value: initialValue, disabled: field.IsSystemField }, validators);
                this.wizardForm!.addControl(field.InternalFieldName, control);
            }
            let defaultValue: any
            if (field.FieldType === 6 || field.FieldType === 5) {
                defaultValue = field.FieldDefaultValue || '';

                if (!defaultValue && field.LookupValues && field.LookupValues.length > 0) {
                    defaultValue = field.LookupValues.find((lv) => lv.LookupID === -1)?.LookupID; // Default to the first lookup value if available
                }
                defaultValue = Number(defaultValue); // Ensure it's a number for numeric fields

            }
            // ADD THE CUSTOM VALIDATOR HERE FOR LOOKUP_ID BASED FIELDS
            if ((!field.FieldDim) && ((field.FieldType === 5 && field.FieldDefaultRequired) || (field.FieldType === 6 && field.FieldDefaultRequired))) { // RadioButton or DropDownList
                // Using the noNegativeOne static validator:
                validators.push(CustomValidators.noNegativeOne);
                // Or, using the more generic invalidValue factory:
                // validators.push(CustomValidators.invalidValue(-1));
            }
            if (field.FieldType === 8) {
                const fieldFormGroup = new FormGroup({})
                field.TableServiceFields?.sort((a, b) => a.OrderID - b.OrderID).forEach(tableField => {
                    if (tableField.FieldType === 14) {
                        return;
                    }
                    const validators = [];
                    let defaultValue: any = ''

                    let extraValidators = this.setupExtraValidations(tableField as any as FieldJson, field.InternalFieldName);
                    if (!field.FieldDim && ((tableField.FieldType === 6 && tableField.Required) || (tableField.FieldType === 5 && tableField.Required)
                        || (tableField.FieldType === 19 && tableField.Required))) {
                        validators.push(CustomValidators.noNegativeOne);
                    } else if (!field.FieldDim && tableField.Required) {
                        validators.push(Validators.required);
                    }
                    if (tableField.FieldType === 21) {
                        validators.push(Validators.email)
                    }
                    if (tableField.MAX_Length > 0 && (tableField.FieldType === 12 || tableField.FieldType === 15 || tableField.FieldType === 11 || tableField.FieldType === 20)) {
                        validators.push(Validators.maxLength(tableField.MAX_Length));
                    }
                    if ((tableField.FieldType === 12 || tableField.FieldType === 15 || tableField.FieldType === 11 || tableField.FieldType === 20) && (tableField.MIN_Length > 0)) {
                        validators.push(CustomValidators.numberMinLength(tableField.MIN_Length))
                    }
                    if (tableField.FieldType === 6 || (tableField.FieldType === 5)
                        || (tableField.FieldType === 19)) {
                        defaultValue = +tableField.FieldDefaultValue || tableField.LookupValues!.find((lv) => lv.LookupID === -1)?.LookupID
                    }

                    const tableFieldControl = new FormControl({ value: defaultValue, disabled: !!tableField.IsSystemField }, [...validators, ...extraValidators]);
                    fieldFormGroup.addControl(tableField.InternalFieldName, tableFieldControl)

                })
                const formArr = new FormArray([fieldFormGroup]);
                this.wizardForm!.addControl(field.InternalFieldName, formArr);
                return;
            }
            let AttachmentIDs: any[] = [];
            let idsFieldName: any = '';
            if (field.FieldType === 9 && field.Attachments) {
                /* this.tabsRendered = true;
                this.aiPopupFirstInitFlag.set(true);
                this.aiPopupAnswer.set(''); */
                const formArr = new FormArray<any>([]);
                field.Attachments?.forEach(attachment => {
                    const attachmentFormGroup = new FormGroup({});
                    AttachmentIDs.push(attachment.ID);
                    field.AttachmentsFields?.forEach(attachmentField => {
                        if (attachmentField.FieldType !== 13) {
                            return;
                        }


                        idsFieldName = attachmentField.InternalFieldName
                        let defaultValue: any = '';

                        if (attachmentField.FieldType === 13) {
                            defaultValue = attachment.ID
                        }
                        const attachmentControl = new FormControl(
                            { value: defaultValue, disabled: !!attachmentField.IsSystemField }
                        );

                        if (field.FieldType === 13) {
                            attachmentControl.disable();
                        }
                        if (!!field.IsSystemField) {
                            attachmentControl.disable();
                        }
                        const attachmentFilesControl = new FormControl([]);
                        attachmentFormGroup.addControl('files', attachmentFilesControl);
                        attachmentFormGroup.addControl(`${attachmentField.InternalFieldName}`, attachmentControl);
                    });
                    formArr.push(attachmentFormGroup);
                })
                this.wizardForm!.addControl(idsFieldName, new FormControl(AttachmentIDs));
                this.wizardForm!.addControl(field.InternalFieldName, formArr);
                return; // Skip the regular field processing for type 9
            } else if (field.FieldType === 9) {
                let tab = this.navigationTabs()!.find((tab) => tab.TabSections[0].FieldsJson[0].FieldType === 9)
                this.applicationTabs = this.applicationTabs.filter((viewerTab) => viewerTab.tabID !== tab!.NavigationTabID)
                this.navigationTabs.set(this.navigationTabs()!.filter((viewerTab) => viewerTab.NavigationTabID !== tab!.NavigationTabID))
                /* this.aiPopupFirstInitFlag.set(false);
                this.aiPopupAnswer.set('no') */
                return;
            }

            if ((field.FieldType === 12 || field.FieldType === 15 || field.FieldType === 11 || field.FieldType === 20) && (field.MIN_Length)) {
                validators.push(CustomValidators.numberMinLength(field.MIN_Length))
            }

            if (field.FieldType === 21) {
                validators.push(Validators.email);
            }

            let extraValidators = this.setupExtraValidations(field);

            defaultValue = defaultValue || ''
            const control = new FormControl(
                { value: defaultValue, disabled: !!field.IsSystemField },
                {
                    validators: [...validators, ...extraValidators],
                    updateOn: field.ApiFieldAddress ? 'blur' : 'change'
                }
            );
            // Add the control to the main wizardForm
            this.wizardForm!.addControl(field.InternalFieldName, control);
        });
    }

    /**
 * Parses a date string into a Date object, handling 'dd/mm/yyyy' and ISO formats.
 * @param dateStr The date string to parse.
 * @returns A Date object or null if parsing fails.
 */
    parseDateString(dateStr: string): Date | null {
        if (!dateStr) {
            return null;
        }

        // 1. Check for 'dd/mm/yyyy' format
        const ddMMyyyyMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (ddMMyyyyMatch) {
            // Note: Months in Date constructor are 0-indexed (0=Jan, 11=Dec)
            const day = parseInt(ddMMyyyyMatch[1], 10);
            const month = parseInt(ddMMyyyyMatch[2], 10) - 1; // Subtract 1 for 0-indexing
            const year = parseInt(ddMMyyyyMatch[3], 10);
            return new Date(year, month, day);
        }

        // 2. Assume ISO format (YYYY-MM-DD or full timestamp)
        // The Date constructor handles standard ISO format directly.
        const isoDate = new Date(dateStr);

        // Check if the resulting date is valid (a quick check for invalid ISO strings)
        if (!isNaN(isoDate.getTime())) {
            return isoDate;
        }

        return null;
    }


    MS_PER_DAY = 1000 * 60 * 60 * 24;

    /**
 * Converts a control's value (which might be a date string) into a numerical value for calculation.
 * If it's a valid date string, it returns the number of days since epoch (for consistency).
 * Otherwise, it returns the value converted to a number.
 * @param value The raw control value.
 * @returns The numerical representation of the value (either a simple number or days since epoch).
 */
    parseControlValue(value: any): number {
        // Check for missing values (null, undefined, or empty string)
        if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
            return NaN; // Signal that the value is missing and calculation should stop
        }

        if (typeof value === 'string') {
            const date = this.parseDateString(value);
            if (date) {
                // Return days since epoch for date subtraction
                return Math.floor(date.getTime() / this.MS_PER_DAY);
            }
        }

        const numValue = Number(value);

        // Check if the non-date value is a valid number
        if (isNaN(numValue)) {
            return NaN; // Signal that the value is invalid
        }

        return numValue;
    }

    setupEqualValue(field: FieldJson) {
        // 1. Get the target control for the result
        const resultControl = this.wizardForm?.get(field.InternalFieldName);

        if (!resultControl || !field.EqualValue) {
            console.warn(`Target control ${field.InternalFieldName} not found or formula is missing.`);
            return;
        }


        // Parse the formula: e.g., 'EventDate_To - EventDate_From + 1'
        const formulaParts = field.EqualValue.split(/\s+/).filter(part => part.length > 0);
        const controlsToWatch: { control: AbstractControl | null, name: string }[] = [];
        const controlObservables: { [key: string]: AbstractControl['valueChanges'] } = {};

        // Identify controls/constants and build observables map
        formulaParts.forEach(part => {
            const control = this.wizardForm?.get(part);

            if (control) {
                controlsToWatch.push({ control, name: part });
                controlObservables[part] = control.valueChanges.pipe(startWith(control.value));
            }
            // Operators and constants are handled in the 'map' step
        });

        const controlNames = controlsToWatch.map(c => c.name);
        if (controlNames.length === 0) {
            console.warn(`No valid controls found in formula: ${field.EqualValue}`);
            return;
        }

        // Combine valueChanges of all dependent controls
        const combinedValues$ = combineLatest(controlNames.map(name => controlObservables[name]));

        // 

        // Subscribe to calculate and update the result
        const subscription = combinedValues$.pipe(
            map((values: any[]) => {
                // 1. Create a mapping from control name to its latest PARSED numerical value
                const nameToValueMap = new Map<string, number>();
                let calculationShouldStop = false;

                controlNames.forEach((name, index) => {
                    const parsedValue = this.parseControlValue(values[index]);
                    nameToValueMap.set(name, parsedValue);

                    // If any dependent control value is missing (returns NaN), flag to stop calculation
                    if (isNaN(parsedValue)) {
                        calculationShouldStop = true;
                    }
                });

                // 2. Stop calculation immediately if a required control value is missing
                if (calculationShouldStop) {
                    return NaN;
                }

                // 3. Calculation logic starts here
                let result: number | null = null;
                let currentOperatorIndex = 0;

                // Start with the value of the very first operand
                const firstPart = formulaParts[0];
                if (nameToValueMap.has(firstPart)) {
                    result = nameToValueMap.get(firstPart)!;
                } else if (!isNaN(Number(firstPart))) {
                    // Allows starting with a constant, e.g., '10 - Control'
                    result = Number(firstPart);
                }

                if (result === null || isNaN(result)) {
                    return NaN;
                }

                // Iterate through the remaining parts (operator and operand pairs)
                for (let i = 1; i < formulaParts.length; i += 2) {
                    const operator = formulaParts[i];
                    const operandPart = formulaParts[i + 1];
                    let operandValue: number;

                    // Retrieve operand value from map (if control) or parse as a constant
                    if (nameToValueMap.has(operandPart)) {
                        operandValue = nameToValueMap.get(operandPart)!;
                    } else if (!isNaN(Number(operandPart))) {
                        operandValue = Number(operandPart);
                    } else {
                        // Should be caught by parsing, but as a safeguard
                        console.error(`Invalid operand in formula: ${operandPart}`);
                        return NaN;
                    }

                    // If any operand is missing/invalid, stop calculation (redundant check, but safe)
                    if (isNaN(operandValue)) {
                        return NaN;
                    }

                    switch (operator) {
                        case '+': result! += operandValue; break;
                        case '-': result! -= operandValue; break;
                        case '*': result! *= operandValue; break;
                        case '/':
                            if (operandValue === 0) {
                                console.warn('Division by zero encountered. Result set to NaN.');
                                return NaN; // Explicitly return NaN on error
                            }
                            result! /= operandValue;
                            break;
                        default:
                            console.error(`Unsupported operator: ${operator}`);
                            return NaN;
                    }
                }
                return result;
            })
        ).subscribe((calculatedValue) => {
            // 4. Update the result control's value based on the calculation status
            // Check for NaN, which indicates a missing value or calculation error
            if (calculatedValue !== null && !isNaN(calculatedValue)) {
                // Use Math.round() for clean day counts when dealing with dates
                const finalValue = Math.round(calculatedValue);

                // Use emitEvent: false to prevent recursive updates
                resultControl.setValue(finalValue, { emitEvent: false });
            } else {
                // Set control value to null when calculation stops
                resultControl.setValue(null, { emitEvent: false });
            }
        });
    }

    setupExtraValidations(field: FieldJson, isTableName?: string): any[] {
        const validators: any[] = [];
        let tableValidators: any[] = [];

        // ---------- URL validation ----------
        if (field.FieldType === 22) {
            const URLRegex =
                /[a-z0-z]+(?:[\-\.]{1}[a-z0-9]+)*\.[a-z]{2,63}/i;
            validators.push(Validators.pattern(URLRegex));
        }

        if (field.ExtraValidationValue?.toLowerCase() === 'currentdate' && ![null, 0, 2].includes(this.apiBody.FKCurrentStatusID)) {
            return validators;
        }

        const addOperatorValidator = (
            operator?: string,
            value?: any,
            fieldType?: number,
            isTable?: boolean
        ) => {
            if (!operator || value == null) return;
            if (isTable) {
                switch (operator) {
                    case '>=':
                        tableValidators.push(
                            fieldType === 3
                                ? (
                                    isNaN(+value)
                                        ? value.toLowerCase().includes('currentdate')
                                            ? CustomValidators.compareWithToday(operator, value)
                                            : CustomValidators.compareWithOtherControl(value, this.wizardForm!, operator, isTableName)
                                        : CustomValidators.minYears(+value))
                                : Validators.min(+value)
                        );
                        break;

                    case '=':
                        String(value).toLowerCase().includes(' if ') ?
                            validators.push(CustomValidators.conditionalValueCompare(value, operator, this.wizardForm!)) :
                            validators.push(
                                CustomValidators.exactValue(
                                    isNaN(+value) ? value : +value
                                )
                            );
                        break;

                    case '>':
                        tableValidators.push(
                            fieldType === 3
                                ? (
                                    isNaN(+value)
                                        ? value.toLowerCase().includes('currentdate')
                                            ? CustomValidators.compareWithToday(operator)
                                            : CustomValidators.compareWithOtherControl(value, this.wizardForm!, operator, isTableName)
                                        : CustomValidators.minYears(+value))
                                : Validators.min(+value)
                        );
                        break;

                }
            }

            switch (operator) {
                case '>=':
                    validators.push(
                        fieldType === 3
                            ? (
                                isNaN(+value)
                                    ? value.toLowerCase().includes('currentdate')
                                        ? CustomValidators.compareWithToday(operator, value)
                                        : CustomValidators.compareWithOtherControl(value, this.wizardForm!, operator, isTableName)
                                    : CustomValidators.minYears(+value))
                            : Validators.min(+value)
                    );
                    break;

                case '=':
                    String(value).toLowerCase().includes(' if ') ?
                        validators.push(CustomValidators.conditionalValueCompare(value, operator, this.wizardForm!)) :
                        validators.push(
                            CustomValidators.exactValue(
                                isNaN(+value) ? value : +value
                            )
                        );
                    break;

                case '>':
                    validators.push(
                        fieldType === 3
                            ? (
                                isNaN(+value)
                                    ? value.toLowerCase().includes('currentdate')
                                        ? CustomValidators.compareWithToday(operator, value)
                                        : CustomValidators.compareWithOtherControl(value, this.wizardForm!, operator, isTableName)
                                    : CustomValidators.minYears(+value))
                            : Validators.min(+value)
                    );
                    break;
                case 'between':
                    validators.push(
                        fieldType === 3
                            ? (
                                isNaN(+value)
                                    ? CustomValidators.compareWithOtherControl(value, this.wizardForm!, operator, isTableName)
                                    : CustomValidators.minYears(+value))
                            : Validators.min(+value)
                    );
                    break;

            }
        };


        // ---------- Main field ----------
        if (field.ExtraValidationOperator) {
            if (![8, 3].includes(field.FieldType)) {
                addOperatorValidator(
                    field.ExtraValidationOperator,
                    field.ExtraValidationValue,
                    field.FieldType
                );
            } else if (field.FieldType === 8) {
                field.TableServiceFields?.forEach(tableField => {
                    if (![8, 3].includes(tableField.FieldType)) {
                        addOperatorValidator(
                            tableField.ExtraValidationOperator,
                            tableField.ExtraValidationValue,
                            tableField.FieldType
                        );
                    } else {
                        addOperatorValidator(
                            tableField.ExtraValidationOperator,
                            tableField.ExtraValidationValue,
                            tableField.FieldType
                        );
                    }


                });
            } else {
                addOperatorValidator(
                    field.ExtraValidationOperator,
                    field.ExtraValidationValue,
                    field.FieldType
                );
            }
        }


        if (field.FieldType === 8) {
            field.TableServiceFields?.forEach(tableField => {
                tableValidators = []
                if (tableField.FieldType === 22) {
                    const URLRegex =
                        /[a-z0-z]+(?:[\-\.]{1}[a-z0-9]+)*\.[a-z]{2,63}/i;
                    tableValidators.push(Validators.pattern(URLRegex));
                }
                if (![8, 3].includes(tableField.FieldType)) {
                    addOperatorValidator(
                        tableField.ExtraValidationOperator,
                        tableField.ExtraValidationValue,
                        tableField.FieldType,
                        true
                    );
                } else {
                    addOperatorValidator(
                        tableField.ExtraValidationOperator,
                        tableField.ExtraValidationValue,
                        tableField.FieldType,
                        true
                    );
                }
                let lastIndex = (this.wizardForm!.get(field.InternalFieldName) as FormArray).length - 1;
                let formArray = this.wizardForm!.get(field.InternalFieldName) as FormArray
                if (tableValidators.length > 0) {
                    formArray.at(lastIndex).get(tableField.InternalFieldName)?.addValidators(tableValidators);
                    formArray.at(lastIndex).get(tableField.InternalFieldName)?.updateValueAndValidity();
                }
            })
            return [];

        }


        return validators;
    }

    async nextTab(actionDetailsIDsForSubmission: number) {
        const currentTabFields: FieldJson[] = [];
        this.currentTab()?.TabSections.forEach(section => {
            currentTabFields.push(...section.FieldsJson);
        });
        let allFields: FieldJson[] = this.extractFields(this.navigationTabs());

        this.apiLoading = true;
        let oneServiceOwnerField = currentTabFields.find(field => field.BusinessRuleFun === 'Check_ServiceOwnerEligibility');
        if (oneServiceOwnerField) {
            await this.fireBusinessApi_serviceOwner(this.newApplicationService.uiResponseAllFields()!, oneServiceOwnerField)
        }

        if (this.businessGetRequestDataFor_7002 && this.businessGetRequestDataFor_7002.length > 0) {
            await this.fireBusinessApi_getRequest(this.businessGetRequestDataFor_7002, this.businessGetRequestDataFor_7002[0].BusinessRuleFun, allFields, this.wizardForm!.value);
        }
        if (this.businessGetRequestDataFor_5014 && this.businessGetRequestDataFor_5014.length > 0) {
            await this.fireBusinessApi_getRequest(this.businessGetRequestDataFor_5014, this.businessGetRequestDataFor_5014[0].BusinessRuleFun, allFields, this.wizardForm!.value);
        }
        if (this.businesssp_GetSecondaryActivity_ByArea && this.businesssp_GetSecondaryActivity_ByArea.length > 0) {
            await this.fireBusinessApi_getRequest(this.businesssp_GetSecondaryActivity_ByArea, this.businesssp_GetSecondaryActivity_ByArea[0].BusinessRuleFun, allFields, this.wizardForm!.value);
        }
        if (this.businessError && !this.visibleTabs()![this.currentTabIndex()].isAccessible) {
            this.showBusinessError(this.businessError.field.BusinessRuleFun, this.businessError, currentTabFields);
            return;
        }
        if (this.actionBusinessError && !this.visibleTabs()![this.currentTabIndex()].isAccessible) {
            this.showBusinessError(this.actionBusinessError.field.BusinessRuleFun, this.actionBusinessError, currentTabFields);
            return;
        }
        this.apiLoading = false;
        if (this.businessError && !this.visibleTabs()![this.currentTabIndex()].isAccessible) {
            this.showBusinessError(this.businessError.field.BusinessRuleFun, this.businessError, currentTabFields);
            return;
        }
        if (this.actionBusinessError && !this.visibleTabs()![this.currentTabIndex()].isAccessible) {
            this.showBusinessError(this.actionBusinessError.field.BusinessRuleFun, this.actionBusinessError, currentTabFields);
            return;
        }
        if (this.isFileLoading()) {
            let hostElement: HTMLElement | null = null;
            for (const key in this.fileService.fileLoader()) {
                if (!Object.hasOwn(this.fileService.fileLoader(), key)) continue;
                if (this.fileService.fileLoader()[key]) {
                    hostElement = document.querySelector<HTMLElement>(
                        `.file${key}`);
                }
            }
            const active = document.activeElement as HTMLElement | null;
            if (active) active.blur();
            let focusableElement: HTMLElement | null = hostElement;
            if (focusableElement) {
                focusableElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            Swal.fire({
                icon: 'error',
                title: this.translations()?.nextTabErrMsg.label,
                showConfirmButton: true,
                confirmButtonText: this.translations()?.validationMsgBtn.label
            }).then(() => {
                if (focusableElement) {
                    focusableElement.focus();
                }
            });
            // 4. Optionally, after Swal closes, restore focus to your input if needed
            Swal.getPopup()?.addEventListener('afterClose', () => {
                if (focusableElement) {
                    focusableElement.focus({ preventScroll: true });
                }
            });
            return;
        }
        console.log(this.visibleNavigationTabs);

        this.applyDynamicValidationRules(actionDetailsIDsForSubmission, currentTabFields);

        if (!this.currentTabIsValid.cr) {
            let shouldValidate = this.wizardForm!.get('CommercialRegistry_Expire_Date')?.hasValidator(Validators.required);
            if (shouldValidate) {

                let hostElement: HTMLElement | null = null;
                const active = document.activeElement as HTMLElement | null;
                if (active) active.blur();
                hostElement = document.querySelector<HTMLElement>(
                    `[id=CommercialRegistry_Expire_Date]`);
                let focusableElement: HTMLElement | null = hostElement;
                if (focusableElement) {
                    focusableElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                Swal.fire({
                    icon: 'error',
                    title: this.translations()?.expiryDateCRErr.label,
                    showConfirmButton: true,
                    confirmButtonText: this.translations()?.validationMsgBtn.label
                }).then(() => {
                    if (focusableElement) {
                        focusableElement.focus();
                    }
                });
                // 4. Optionally, after Swal closes, restore focus to your input if needed
                Swal.getPopup()?.addEventListener('afterClose', () => {
                    if (focusableElement) {
                        focusableElement.focus({ preventScroll: true });
                    }
                });
                return;
            }
        }
        if (!this.currentTabIsValid.cp) {
            let shouldValidate = this.wizardForm!.get('CommercialLicense_Expire_Date')?.hasValidator(Validators.required);
            if (shouldValidate) {

                const active = document.activeElement as HTMLElement | null;
                if (active) active.blur();
                let hostElement: HTMLElement | null = null;
                hostElement = document.querySelector<HTMLElement>(
                    `[id=CommercialLicense_Expire_Date]`);
                let focusableElement: HTMLElement | null = hostElement;
                if (focusableElement) {
                    focusableElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                Swal.fire({
                    icon: 'error',
                    title: this.translations()?.expiryDateCPErr.label,
                    showConfirmButton: true,
                    confirmButtonText: this.translations()?.validationMsgBtn.label
                }).then(() => {
                    if (focusableElement) {
                        focusableElement.focus();
                    }
                });
                // 4. Optionally, after Swal closes, restore focus to your input if needed
                Swal.getPopup()?.addEventListener('afterClose', () => {
                    if (focusableElement) {
                        focusableElement.focus({ preventScroll: true });
                    }
                });
                return;
            }
        }
        if (this.currentTabIndex() < this.navigationTabs()!.length) {
            // Optional: Add form validation check here before moving to the next tab

            let currentTabIsValid = true;
            for (const field of currentTabFields) {
                const control = this.wizardForm!.get(field.InternalFieldName);
                if (field.FieldType === 9 && field.Attachments) {
                    // Loop through attachment fields first
                    const formArray = this.wizardForm!.get(field.InternalFieldName) as FormArray;
                    for (let index = 0; index < formArray.controls.length; index++) {
                        const control = formArray.controls[index];
                        // Get the FormGroup for this attachment field

                        // Loop through attachments within this FormGroup

                        let attachmentControl = control.get('files');
                        if (attachmentControl instanceof FormControl) {
                            if (attachmentControl.invalid) {
                                currentTabIsValid = false;
                                attachmentControl.markAsTouched();
                                attachmentControl.updateValueAndValidity();
                                let hostElement: HTMLElement | null = null;
                                hostElement = document.querySelector<HTMLElement>(
                                    `.file${control.value['FkAttachmentTypeID']}`);
                                let focusableElement: HTMLElement | null = hostElement;

                                if (focusableElement) {
                                    focusableElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                                // 2. Blur active element so Swal cannot restore focus to it later


                                let errorMessage = '';
                                if (attachmentControl.errors?.['requiredFile'] || attachmentControl.errors?.['requiredArray']) {
                                    errorMessage = this.store.index.locale == 'en' ? field.AttachmentsFields?.find((af) => af.FieldType === 13)!.ValidationMsgEn + ' ' + field.Attachments![index].TitleEn : field.AttachmentsFields?.find((af) => af.FieldType === 13)!.ValidationMsgAr + ' ' + field.Attachments![index].TitleAr;
                                }
                                const active = document.activeElement as HTMLElement | null;
                                if (active) active.blur();
                                Swal.fire({
                                    icon: "error",
                                    title: errorMessage,
                                    padding: '10px 20px',
                                    confirmButtonText: this.translations()?.validationMsgBtn.label,
                                }).then(() => {
                                    if (focusableElement) {
                                        focusableElement.focus();
                                    }
                                });
                                // 4. Optionally, after Swal closes, restore focus to your input if needed
                                Swal.getPopup()?.addEventListener('afterClose', () => {
                                    if (focusableElement) {
                                        focusableElement.focus({ preventScroll: true });
                                    }
                                });
                                this.shouldCallApi = true;
                                break;

                            }


                        }
                        continue;
                    }
                }
                if (field.FieldType === 8 && field.TableServiceFields) {
                    const formArray = this.wizardForm!.get(field.InternalFieldName) as FormArray;
                    if (formArray && formArray.hasError('atLeastOneEntry')) {
                        const formArray = this.wizardForm!.get(field.InternalFieldName) as FormArray;

                        currentTabIsValid = false;
                        let hostElement: HTMLElement | null = null;
                        hostElement = document.querySelector<HTMLElement>(`#${field.InternalFieldName}`);
                        let focusableElement: HTMLElement | null = hostElement;

                        if (focusableElement) {
                            focusableElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                        const active = document.activeElement as HTMLElement | null;
                        if (active) active.blur();
                        Swal.fire({
                            icon: 'error',
                            title: this.store.index.locale == 'en' ? field.ValidationMsgEn : field.ValidationMsgAr,
                            showConfirmButton: true,
                            confirmButtonText: this.translations()?.validationMsgBtn.label
                        }).then(() => {
                            if (focusableElement) {
                                focusableElement.focus();
                            }
                        });

                        Swal.getPopup()?.addEventListener('afterClose', () => {
                            if (focusableElement) {
                                focusableElement.focus({ preventScroll: true });
                            }
                        });
                        break;

                    }
                    if (formArray.length > 1) {
                        currentTabIsValid = this.validateRowsForMissingData(formArray, field)
                        if (!currentTabIsValid) {
                            break;
                        }
                    }

                }
                if (control instanceof FormControl) {
                    if (control.invalid) {
                        currentTabIsValid = false;
                        control.markAsTouched();
                        control.updateValueAndValidity();
                        let hostElement: HTMLElement | null = null;
                        if (field.FieldType === 4 || field.FieldType === 16 || field.FieldType === 5) {
                            hostElement = document.querySelector<HTMLElement>(
                                `[name="${field.InternalFieldName}"]`
                            )
                        } else if (field.FieldType === 10 && field.VisibilityActionID === 0) {

                            hostElement = document.querySelector<HTMLElement>(
                                `.${field.InternalFieldName}`
                            )
                        } else {
                            hostElement = document.querySelector<HTMLElement>(
                                `[id="${field.InternalFieldName}"]`
                            );
                        }
                        // Log the actual state you care about
                        let focusableElement: HTMLElement | null = hostElement;

                        if (hostElement?.tagName.toLowerCase() === 'ng-select') {
                            const containerDiv = hostElement.querySelector<HTMLElement>('.ng-select-container');
                            if (containerDiv) {
                                focusableElement = containerDiv;
                            }
                        }

                        if (focusableElement) {
                            focusableElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                        // 2. Blur active element so Swal cannot restore focus to it later
                        const active = document.activeElement as HTMLElement | null;
                        if (active) active.blur();
                        Swal.fire({
                            icon: "error",
                            title: `${this.store.index.locale == 'en' ? field.ValidationMsgEn : field.ValidationMsgAr}`,
                            padding: '10px 20px',
                            confirmButtonText: this.translations()?.validationMsgBtn.label,
                        }).then(() => {
                            if (focusableElement) {
                                focusableElement.focus();
                            }
                        });
                        // 4. Optionally, after Swal closes, restore focus to your input if needed
                        Swal.getPopup()?.addEventListener('afterClose', () => {
                            if (focusableElement) {
                                focusableElement.focus({ preventScroll: true });
                            }
                        });
                        this.shouldCallApi = true;
                        break;
                    }
                }
            }

            if (!currentTabIsValid) {
                console.log('Current tab is invalid. Cannot proceed.');
                return;
            } else {
                const tabs = this.visibleTabs()!;
                this.visibleTabs.update(currentTabs => {
                    currentTabs![this.currentTabIndex() - 1].isCompleted = true;
                    this.currentTabIndex.update((index) => {
                        return index + 1;
                    });
                    currentTabs![this.currentTabIndex() - 1].isActive = true;
                    currentTabs![this.currentTabIndex() - 1].isAccessible = true;
                    console.log(this.currentTab());
                    return currentTabs!;
                });

                console.log(this.visibleTabs()!);
                window.scrollTo(0, 0);
                this.shouldCallApi = true;
            }
        }
    }

    // Navigation methods


    prevTab(): void {
        if (this.currentTabIndex() > 0) {
            this.currentTabIndex.update((index) => {
                return index - 1;
            });
        }
        window.scrollTo(0, 0);
    }
    // Helper to determine if a specific action button should be shown
    showAction(actionName: string): boolean {
        if (actionName.includes('Save Draft')) {
            return this.currentTabIndex() < this.navigationTabs!.length - 1;
        }
        if (actionName === 'Previous') {
            return this.currentTabIndex() <= 0;
        }
        if (actionName.includes('Send Request')) {
            return this.currentTabIndex() === this.navigationTabs!.length - 1;
        }
        return false;
    }

    // Handle action button clicks
    handleAction(action: Action, HasServiceID?: boolean, processID?: number): void {
        console.log(`Handling action: ${action.TitleEN}`);
        switch (action.TitleEN) {
            case 'Next':
                this.nextTab(action.ActionDetailsID);
                break;
            case 'Previous':
                this.prevTab();
                break;
            case 'Send Request':
            case 'Save Draft':
                this.onSubmit(action, HasServiceID, processID);
                break;
            // Add more cases for other actions if needed
            default:
                this.onSubmit(action, HasServiceID, processID);
                break;
        }
    }
    // Instead, the pre-processed grouped data is accessed.
    getGroupedFieldsForSection(sectionId: number): FieldJson[][] {
        return this.groupedSections[sectionId] || [];
    }
    groupFieldsByRow(fields: FieldJson[]) {
        const grouped: any[] = [];
        fields.forEach(field => {
            /* if (this.editApp() && this.newApplicationService.requestData()) {
                if (field.VisibilityExtraCondition) {
                    if (!(field.VisibilityActionID > 0)) {
                        if (field.VisibilityExtraCondition.toLocaleLowerCase() === 'is not null' && !this.newApplicationService.requestData()[field.InternalFieldName]) {
                            return;
                        } else if ((field.VisibilityExtraCondition === '> 0' || field.VisibilityExtraCondition === '>0') && !(+this.newApplicationService.requestData()[field.InternalFieldName] > 0)) {
                            return;
                        }
                    } else if (this.atLeastOneFormControlHasValue(field)) {
                        if (field.VisibilityExtraCondition.toLocaleLowerCase() === 'IS NOT NULL' && !this.newApplicationService.requestData()[field.InternalFieldName]) {
                            return;
                        } else if ((field.VisibilityExtraCondition === '> 0' || field.VisibilityExtraCondition === '>0') && !(+this.newApplicationService.requestData()[field.InternalFieldName] > 0)) {
                            return;
                        }
                    }
                }
            } */
            let row = grouped.find(r => r[0]?.RowID === field.RowID);
            if (!row) {
                row = [];
                grouped.push(row);
            }
            row.push(field);
        });
        return grouped;
    }
    // Store the grouped fields per section
    groupedSections: { [sectionId: number]: FieldJson[][] } = {};

    /**
   * Performs a deep comparison of two objects to check for structural and value equality.
   * This is a simplified version and may need refinement for nested arrays or Date objects.
   */
    private areObjectsEqual(obj1: any, obj2: any): boolean {
        // Fast check for reference equality
        if (obj1 === obj2) return true;

        // Check if both are objects and not null
        if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
            return false;
        }

        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);

        // Check number of properties
        if (keys1.length !== keys2.length) {
            return false;
        }

        // Check property values recursively
        for (const key of keys1) {
            if (!keys2.includes(key) || !this.areObjectsEqual(obj1[key], obj2[key])) {
                return false;
            }
        }

        return true;
    }

    // --- Utility 2: Object Stringifier (Required for sorting objects consistently) ---
    /**
     * Converts an object into a stable, consistent string representation
     * for sorting purposes. Uses a JSON stringify replacer to ensure keys are
     * always ordered alphabetically.
     */
    getObjectSortKey(obj: any): string {
        return JSON.stringify(obj, (key, value) => {
            // If the value is an object (and not null), replace it with a sorted version
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                return Object.keys(value).sort().reduce((sorted, k) => {
                    sorted[k] = value[k];
                    return sorted;
                }, {} as any);
            }
            return value;
        });
    }

    // --- Main Method: Array of Objects Comparison ---

    /**
     * Checks if two arrays contain the exact same objects, regardless of order.
     * Objects are considered equal if they have the same properties and values (deep comparison).
     * * @param arr1 The first array of objects.
     * @param arr2 The second array of objects.
     * @returns A boolean indicating whether the arrays are equal in content.
     */
    areObjectArraysEqualIgnoringOrder(arr1: any[], arr2: any[]): boolean {
        // 1. Check for length difference (fastest check)
        if (arr1.length !== arr2.length) {
            return false;
        }

        // 2. Sort the objects based on a consistent string key
        // This places structurally identical objects at the same index in both arrays.
        const sortFunction = (a: any, b: any) => {
            const keyA = this.getObjectSortKey(a);
            const keyB = this.getObjectSortKey(b);

            if (keyA < keyB) return -1;
            if (keyA > keyB) return 1;
            return 0;
        };

        const sortedArr1 = [...arr1].sort(sortFunction);
        const sortedArr2 = [...arr2].sort(sortFunction);

        // 3. Compare objects element by element using deep equality
        // Since both arrays are sorted by object content, we can now compare corresponding elements.
        for (let i = 0; i < sortedArr1.length; i++) {
            if (!this.areObjectsEqual(sortedArr1[i], sortedArr2[i])) {
                return false;
            }
        }

        // If the loop completes, all objects matched
        return true;
    }
    areArraysEqualIgnoringOrder<T>(arr1: T[], arr2: T[]): boolean {
        // 1. Check for length difference (fastest check)
        if (arr1.length !== arr2.length) {
            return false;
        }

        // 2. Handle null/undefined checks (though length check handles some cases)
        if (!arr1 || !arr2) {
            // If lengths are equal and both are null/undefined (e.g., both are []), 
            // they might be considered equal, but for clarity:
            // if one is null/undefined and the other isn't (but they have the same length, which is 0 for [])
            return arr1 === arr2;
        }

        // 3. Create copies and sort them
        // Sorting allows element-by-element comparison in the next step.
        // The default sort() works well for strings and numbers.
        const sortedArr1 = [...arr1].sort();
        const sortedArr2 = [...arr2].sort();

        // 4. Compare element by element
        // Since both arrays are now sorted, if they are equal, their elements
        // must match at every corresponding index.
        for (let i = 0; i < sortedArr1.length; i++) {
            if (sortedArr1[i] !== sortedArr2[i]) {
                return false;
            }
        }

        // If the loop completes, all elements matched
        return true;
    }
    checkIfFieldHasNewVal(control: AbstractControl, field: FieldJson, dynamicRule: ActionDetail, requestData: any, action: Action) {

        let currControlValue = control.value
        if (Boolean(dynamicRule.PreviousFieldValueChange)) {
            if (currControlValue === requestData[field.InternalFieldName] && field.FieldType !== 8 && field.FieldType !== 19) {
                let hostElement: HTMLElement | null = null;
                if (field.FieldType === 4 || field.FieldType === 16 || field.FieldType === 5) {
                    hostElement = document.querySelector<HTMLElement>(
                        `[name="${field.InternalFieldName}"]`
                    )
                } else if (field.FieldType === 10 && field.VisibilityActionID === 0) {

                    hostElement = document.querySelector<HTMLElement>(
                        `.${field.InternalFieldName}`
                    )
                } else {
                    hostElement = document.querySelector<HTMLElement>(
                        `[id="${field.InternalFieldName}"]`
                    );
                }
                let focusableElement: HTMLElement | null = hostElement;
                if (hostElement?.tagName.toLowerCase() === 'ng-select') {
                    const containerDiv = hostElement.querySelector<HTMLElement>('.ng-select-container');
                    if (containerDiv) {
                        focusableElement = containerDiv;
                    }
                }

                if (focusableElement) {
                    focusableElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                // 2. Blur active element so Swal cannot restore focus to it later
                const active = document.activeElement as HTMLElement | null;
                if (active) active.blur();
                Swal.fire({
                    icon: "error",
                    title: `${this.translations()?.submitWithNoChangesErr.label.replace('[field]', this.store.index.locale === 'en' ? field.TitleEn : field.TitleAr)}`,
                    padding: '10px 20px',
                    confirmButtonText: this.translations()?.validationMsgBtn.label,
                }).then(() => {
                    if (focusableElement) {
                        focusableElement.focus();
                    }
                });
                // 4. Optionally, after Swal closes, restore focus to your input if needed
                Swal.getPopup()?.addEventListener('afterClose', () => {
                    if (focusableElement) {
                        focusableElement.focus({ preventScroll: true });
                    }
                });
                return true;
            }
            if (field.FieldType === 19 || field.FieldType === 4) {
                if (this.areArraysEqualIgnoringOrder(currControlValue, requestData[field.InternalFieldName])) {
                    let hostElement: HTMLElement | null = null;

                    hostElement = document.querySelector<HTMLElement>(
                        `[id="${field.InternalFieldName}"]`
                    );

                    let focusableElement: HTMLElement | null = hostElement;
                    if (hostElement?.tagName.toLowerCase() === 'ng-select') {
                        const containerDiv = hostElement.querySelector<HTMLElement>('.ng-select-container');
                        if (containerDiv) {
                            focusableElement = containerDiv;
                        }
                    }

                    if (focusableElement) {
                        focusableElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    // 2. Blur active element so Swal cannot restore focus to it later
                    const active = document.activeElement as HTMLElement | null;
                    if (active) active.blur();
                    Swal.fire({
                        icon: "error",
                        title: `${this.translations()?.submitWithNoChangesErr.label.replace('[field]', this.store.index.locale === 'en' ? field.TitleEn : field.TitleAr)}`,
                        padding: '10px 20px',
                        confirmButtonText: this.translations()?.validationMsgBtn.label,
                    }).then(() => {
                        if (focusableElement) {
                            focusableElement.focus();
                        }
                    });
                    // 4. Optionally, after Swal closes, restore focus to your input if needed
                    Swal.getPopup()?.addEventListener('afterClose', () => {
                        if (focusableElement) {
                            focusableElement.focus({ preventScroll: true });
                        }
                    });
                    return true
                }
            }

            if (field.FieldType === 8) {
                let currentValues = control.value.slice(0, -1);
                let data = requestData.ServiceTables.filter((rData: any) => {
                    return rData.SourceTableID === field.TableServiceFields![0].SourceTableID
                })
                data = data.map((d: any, index: any) => {
                    let newRow: any = {}
                    field.TableServiceFields!.forEach((tableField) => {
                        if (d[tableField.InternalFieldName]) {
                            newRow[tableField.InternalFieldName] = d[tableField.InternalFieldName]
                        } else if (tableField.FieldType !== 14) {
                            newRow[tableField.InternalFieldName] = ''
                        }
                    })
                    return { ...newRow }
                })

                if (this.areObjectArraysEqualIgnoringOrder(currentValues, data)) {
                    let hostElement: HTMLElement | null = null;
                    hostElement = document.querySelector<HTMLElement>(`#${field.InternalFieldName}`);
                    let focusableElement: HTMLElement | null = hostElement;

                    if (focusableElement) {
                        focusableElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    const active = document.activeElement as HTMLElement | null;
                    if (active) active.blur();
                    console.log('field with problem ', field);
                    let msg = this.translations()?.addRequestError.label
                        .replace('[field]', this.store.index.locale === 'en' ? field.TitleEn : field.TitleAr);
                    Swal.fire({
                        icon: 'error',
                        title: `${msg}`,
                        showConfirmButton: true,
                        confirmButtonText: this.translations()?.validationMsgBtn.label
                    }).then(() => {
                        if (focusableElement) {
                            focusableElement.focus();
                        }
                    });

                    Swal.getPopup()?.addEventListener('afterClose', () => {
                        if (focusableElement) {
                            focusableElement.focus({ preventScroll: true });
                        }
                    });
                    return true
                }

            }

        }
        return false
    }

    checkIfAnyFieldHasNewVal(control: AbstractControl, field: FieldJson, dynamicRule: ActionDetail, requestData: any, action: Action) {

        if (field.FieldType === 8) {
            let currentValues = control.value.slice(0, -1);
            let data = requestData.ServiceTables.filter((rData: any) => {
                return rData.SourceTableID === field.TableServiceFields![0].SourceTableID
            })
            data = data.map((d: any, index: any) => {
                let newRow: any = {}
                field.TableServiceFields!.forEach((tableField) => {
                    if (d[tableField.InternalFieldName]) {
                        newRow[tableField.InternalFieldName] = d[tableField.InternalFieldName]
                    } else if (tableField.FieldType !== 14) {
                        newRow[tableField.InternalFieldName] = ''
                    }
                })
                return { ...newRow }
            })

            if (!this.areObjectArraysEqualIgnoringOrder(currentValues, data)) {

                return true
            }

        }
        let currControlValue = control.value
        if (requestData[field.InternalFieldName] && currControlValue) {
            if (currControlValue !== requestData[field.InternalFieldName] && field.FieldType !== 8 && field.FieldType !== 19) {

                return true;
            }
            if (field.FieldType === 19 || field.FieldType === 4) {
                if (!this.areArraysEqualIgnoringOrder(currControlValue, requestData[field.InternalFieldName])) {

                    return true
                }
            }

        } else if (field.FieldType !== 8 && field.FieldType !== 19 && field.FieldType !== 4 && field.FieldType !== 9 && ((requestData[field.InternalFieldName] && !currControlValue) || (!requestData[field.InternalFieldName] && currControlValue))) {
            return true
        }


        return false
    }

    isFieldPreviousFieldValueChange = false;
    // --- Dynamic Validation Logic ---
    private applyDynamicValidationRules(actionDetailsIDs: number, currentTabFields: any, actionID?: number, action?: Action) {
        this.newApplicationService.actionDetailsIDs.set(actionDetailsIDs)
        this.isPopup = false;
        // Flatten the rules into a map for easy lookup by ServiceFieldID
        this.dynamicValidationRules = {};
        this.ServiceFieldsByActionsApiResponse.items[actionDetailsIDs].forEach(rule => {
            this.dynamicValidationRules[rule.ServiceFieldID] = rule;
        });
        let notContinue = false;
        let noFieldPreviousFieldValueChange: any = false;;

        this.navigationTabs()!.forEach(tab => {
            tab.TabSections.forEach(section => {
                if (notContinue) {
                    return;
                }
                section.FieldsJson.forEach(field => {
                    if (notContinue) {
                        return;
                    }
                    const dynamicRule = this.dynamicValidationRules[field.ServiceFieldID];
                    let control = this.wizardForm!.get(field.InternalFieldName);
                    if (action?.PreviousFieldValueChange) {
                        if (control) {
                            if (dynamicRule) {
                                if (this.newApplicationService.requestData() || this.newApplicationService.newRequestData() && field.InternalFieldName !== 'AdminFeesValue') {
                                    if (
                                        this.checkIfFieldHasNewVal(control, field, dynamicRule, this.newApplicationService.requestData() || this.newApplicationService.newRequestData(), action!)
                                    ) {
                                        notContinue = true
                                        return;
                                    }
                                }
                            }
                        }
                    }
                    if (field.RelevantRequiredOperator) {
                        return;
                    }
                    if (control) {
                        // Get the dynamic rule for this field, if any
                        // field.ID (from FieldJson) corresponds to ServiceFieldID (from ActionDetail)

                        // Rebuild validators: start with static ones relevant to this field's type
                        const currentValidators: ValidatorFn[] = [];


                        if (dynamicRule) {

                            // Apply dynamic required rule
                            if (dynamicRule.FieldRequired == true) {
                                let extraValidators = this.setupExtraValidations(field);
                                if (extraValidators) {
                                    currentValidators.push(...extraValidators);
                                }
                                // Re-add other static validators (like maxLength)
                                if (field.MAX_Length > 0 && (field.FieldType === 12 || field.FieldType === 15 || field.FieldType === 11 || field.FieldType === 20)) {
                                    currentValidators.push(Validators.maxLength(field.MAX_Length));
                                }
                                if (field.FieldType === 21) {
                                    currentValidators.push(Validators.email);
                                }
                                if ((field.FieldType === 12 || field.FieldType === 15 || field.FieldType === 11 || field.FieldType === 20) && (field.MIN_Length > 0)) {
                                    currentValidators.push(CustomValidators.numberMinLength(field.MIN_Length))
                                }

                                if (field.VisibilityActionID > 0) {
                                    this.navigationTabs()!.forEach(tab => {
                                        tab.TabSections.forEach(section => {
                                            if (section.FieldsJson[0].VisibilityActionID > 0 && !this.atLeastOneFormControlHasValue(section.FieldsJson) && section.FieldsJson[0].VisibilityActionID === actionID) {
                                                this.isPopup = true;
                                            }
                                        })
                                    })
                                }

                                if (!field.FieldDim && (field.FieldType === 6 || field.FieldType === 5)) {
                                    currentValidators.push(CustomValidators.noNegativeOne);
                                } else if (field.FieldType === 8 && !field.FieldDim) {
                                    let atleastOneReq = false
                                    field.TableServiceFields!.forEach((tableField) => {
                                        if (tableField.Required) {
                                            atleastOneReq = true
                                        }
                                    })
                                    if (atleastOneReq) {
                                        currentValidators.push(CustomValidators.atLeastOneEntry)
                                    }
                                } else {
                                    currentValidators.push(Validators.required);
                                }

                                if (field.FieldType === 9 && field.Attachments && field.AttachmentsFields && !field.FieldDim) {
                                    field.Attachments!.forEach((attachment, index) => {
                                        const attachmentFormGroup = (control as FormArray).at(index);

                                        let attachmentkey = field.AttachmentsFields!.find((af) => af.FieldType === 13)
                                        if (!field.FieldDim && attachment.REQ[0].IsRequired) {
                                            let fileControl = attachmentFormGroup.get('files')

                                            if (fileControl) {
                                                fileControl.setValidators([CustomValidators.requiredArrayValidator()])
                                                fileControl.updateValueAndValidity();
                                            }
                                        }
                                        attachmentFormGroup.updateValueAndValidity();
                                    })
                                }

                                control.setValidators(currentValidators)

                            } else if (dynamicRule.FieldRequired == false) {
                                if (field.FieldType === 9 && field.Attachments && field.AttachmentsFields && !field.FieldDim) {
                                    field.Attachments!.forEach((attachment, index) => {
                                        const attachmentFormGroup = (control as FormArray).at(index);
                                        let attachmentkey = field.AttachmentsFields!.find((af) => af.FieldType === 13)
                                        attachmentFormGroup.get(`${attachmentkey?.InternalFieldName}`)?.clearValidators()
                                        let fileControl = attachmentFormGroup.get(`files`)
                                        fileControl?.clearValidators()
                                        fileControl?.updateValueAndValidity();
                                        attachmentFormGroup.updateValueAndValidity();
                                    })
                                }
                                control.clearValidators();
                            }

                        } else if (!dynamicRule) {
                            if (field.FieldType === 9 && field.Attachments && field.AttachmentsFields && !field.FieldDim) {
                                field.Attachments!.forEach((attachment, index) => {
                                    const attachmentFormGroup = (control as FormArray).at(index);
                                    let attachmentkey = field.AttachmentsFields!.find((af) => af.FieldType === 13)
                                    attachmentFormGroup.get(`${attachmentkey?.InternalFieldName}`)?.clearValidators()
                                    let fileControl = attachmentFormGroup.get(`files`)
                                    fileControl?.clearValidators()
                                    fileControl?.updateValueAndValidity();
                                    attachmentFormGroup.updateValueAndValidity();
                                })
                            }
                            /* console.log('we cleared the shit', field.TitleAr); */
                            /* console.log('we cleared the shit', field.TitleAr); */

                            control.clearValidators();
                        }
                        // If no dynamic rule, revert to FieldDefaultRequired state
                        /* if (!field.FieldDim && field.FieldDefaultRequired) {
                          currentValidators.push(Validators.required);
                        } */
                        // Revert enable/disable based on original FieldDim
                        /* if (field.FieldDim) {
                            control.disable();
                            } else {
                                control.enable();
                        } */
                        control.updateValueAndValidity(); // Re-run validation immediately


                        // Update validators for the control
                        /* console.log(`Updated validators for ${field.TitleAr}:`, currentValidators); */
                    }
                });
            });
        });

        console.log('Dynamic validation rules applied and form re-validated.', this.wizardForm);
        if (action?.PreviousFieldValueChange && !this.isFieldPreviousFieldValueChange) {
            this.navigationTabs()!.forEach(tab => {
                tab.TabSections.forEach(section => {
                    section.FieldsJson.forEach(field => {
                        const dynamicRule = this.dynamicValidationRules[field.ServiceFieldID];
                        let control = this.wizardForm!.get(field.InternalFieldName);
                        if (action?.PreviousFieldValueChange) {
                            if (control && !noFieldPreviousFieldValueChange) {
                                if (dynamicRule && field.InternalFieldName !== 'AdminFeesValue') {
                                    noFieldPreviousFieldValueChange = this.checkIfAnyFieldHasNewVal(control, field, dynamicRule, this.newApplicationService.requestData() || this.newApplicationService.newRequestData(), action!)
                                }
                            }
                        }
                    })
                })
            })
            if (!noFieldPreviousFieldValueChange) {
                Swal.fire({
                    icon: "error",
                    title: `${this.translations()?.globalFieldNotChangedErr.label}`,
                    padding: '10px 20px',
                    confirmButtonText: this.translations()?.validationMsgBtn.label,
                })
                return true;
            }
        }
        return notContinue
    }
    public fieldVisibilityMap: { [fieldName: string]: boolean } = {};
    onFieldHidden(field: FieldJson, isHidden: boolean, emptyTabID: number) {
        this.fieldVisibilityMap[field.InternalFieldName] = isHidden;

        // Find the tab this field belongs to
        /* if (field.InternalFieldName === 'OwnerPassport') {
            debugger;
        } */
        const tab = this.applicationTabs.find(t => t.tabID === emptyTabID);

        if (tab && this.tabFieldCount()[tab.tabID!]) {
            const sectionCounter = this.sectionFieldCount()[tab.tabID!][field.SectionID];
            if (sectionCounter) {
                if (isHidden && isHidden !== this.fieldVisibilityMap[field.InternalFieldName]) {
                    sectionCounter.hidden++;
                } else if (isHidden !== this.fieldVisibilityMap[field.InternalFieldName]) {
                    sectionCounter.hidden--;
                }
            }
            const tabCounter = this.tabFieldCount()[tab.tabID!];
            if (isHidden && isHidden !== this.fieldVisibilityMap[field.InternalFieldName]) {
                tabCounter.hidden++;
            } else if (isHidden !== this.fieldVisibilityMap[field.InternalFieldName]) {
                tabCounter.hidden--;
            }
            // Re-run the filter logic every time a field's visibility changes
            this.updateVisibleTabs();
        }
    }
    visibleTabs = signal<any[] | null>([]);
    private tabFieldCount = signal<{ [tabId: number]: { total: number, hidden: number } }>({});
    private initializeTabFieldCount(): void {
        this.applicationTabs.forEach(tab => {
            let totalFields = 0;
            // Get all fields belonging to this tab from your field data structure
            // For this example, we'll assume a method exists to get the
            const fieldsForTab = this.getAllFieldsForTab(tab);
            const fieldsForSection = this.getAllFieldsForSection(tab);
            totalFields = fieldsForTab.length;
            for (const key in fieldsForSection) {
                if (Object.prototype.hasOwnProperty.call(fieldsForSection, key)) {
                    let sectionData = {
                        [key]: { total: fieldsForSection[key].length, hidden: 0 }
                    }
                    this.sectionFieldCount.update((fieldsCount) => {
                        fieldsCount[tab.tabID!] = { ...fieldsCount[tab.tabID!], ...sectionData };
                        return { ...fieldsCount };
                    });
                }
            }
            this.tabFieldCount.update((tabFieldCounts) => {
                tabFieldCounts[tab.tabID!] = { total: totalFields, hidden: 0 }
                return tabFieldCounts
            });
        });
    }
    private lastResult: any[] | null = null;
    private _lastKey = '';
    visibleNavigationTabs = computed<NavigationTab[] | null>(() => {
        const tabs = this.navigationTabs()!
        const sectionCounts = this.sectionFieldCount();
        const tabCounts = this.tabFieldCount();

        if (!tabs || !sectionCounts || !tabCounts) {
            return null
        };

        // Optional: skip rebuild if counts didn’t change
        const key = JSON.stringify({ sectionCounts, tabCounts });
        if (this._lastKey === key && this.lastResult && this._lastKey !== `{"sectionCounts":{},"tabCounts":{}}`) {
            return this.lastResult;
        }
        this._lastKey = key;

        const result = tabs
            .filter(tab => {
                const counter = tabCounts[tab.NavigationTabID];
                return counter ? counter.hidden < counter.total : true;
            })
            .map(tab => ({
                ...tab,
                TabSections: tab.TabSections.filter(section => {
                    const counter = sectionCounts[section.FKNavigationTabID];
                    return counter
                        ? counter[section.SectionID].hidden < counter[section.SectionID].total
                        : true;
                })
            }));

        /* if(result.length){
            debugger;
        } */

        this.lastResult = result;
        return result;
    });
    /* get visibleNavigationTabs(): NavigationTab[] {
        return this.navigationTabs()!.filter(tab => {
            const counter = this.tabFieldCount()[tab.NavigationTabID];
            return counter ? counter.hidden < counter.total : true;
        }).map((tab) => {
            tab.TabSections = tab.TabSections.filter((section) => {
                const counter = this.sectionFieldCount[section.FKNavigationTabID];
                return counter ? counter[section.SectionID].hidden < counter[section.SectionID].total : true;
            });
            return tab;
        });

    } */

    private updateVisibleTabs(): void {
        // Filter the applicationTabs to only include those with at least one visible field
        this.visibleTabs.set(this.applicationTabs.filter(tab => {
            const counter = this.tabFieldCount()[tab.tabID!];
            // A tab is visible if the number of hidden fields is less than the total number of fields
            return counter ? counter.hidden < counter.total : true;
        }))
        /* .sort((a, b) => {
            return this.aiPopupAnswer() === 'yes' ? a.aiTabOrder - b.aiTabOrder : a.id - b.id;
        }) */
    }
    /* private updateVisibleSections(): void {
        // Filter the applicationTabs to only include those with at least one visible field
        this.navigationTabs!.forEach(tab => {
            const counter = this.sectionFieldCount[tab.NavigationTabID!];
            // A tab is visible if the number of hidden fields is less than the total number of fields
            return counter ? counter.hidden < counter.total : true;
        })
    } */
    // --- This is a helper method you'll need to create ---
    private getAllFieldsForTab(tab: any): any[] {
        // You'll need to implement the logic to get all fields
        // that belong to the sections of this specific tab.
        // This will depend on your data structure.
        // E.g., You might have a `allFields` array and filter it.
        const fields: FieldJson[] = [];
        const navigationTab = this.getUIResponse()!.NavigationTabs.find(f => tab.tabID === f.NavigationTabID);

        if (navigationTab) {
            navigationTab.TabSections.forEach(section => {
                fields.push(...section.FieldsJson);
            });
        }

        return fields;
    }
    private getAllFieldsForSection(tab: any): any[] {
        // You'll need to implement the logic to get all fields
        // that belong to the sections of this specific tab.
        // This will depend on your data structure.
        // E.g., You might have a `allFields` array and filter it.
        const fields: any = {};
        const navigationTab = this.getUIResponse()!.NavigationTabs.find(f => tab.tabID === f.NavigationTabID);

        if (navigationTab) {
            navigationTab.TabSections.forEach(section => {
                fields[section.SectionID] = [...section.FieldsJson];
            });
        }

        return fields;
    }
    openLoader() {
        setTimeout(() => {
            this.loaderService.show();
        })
    }
    closeLoader() {
        setTimeout(() => {
            this.loaderService.hide();
        })
    }

    ngAfterViewInit() {
        this.tabsRendered = true

    }
    initStore() {
        this.storeData
            .select(({ index, auth }) => ({ index, auth }))
            .subscribe((d) => {
                this.store = d;
            });
    }
    setIcon(icon: string) {
        switch (icon) {
            case 'Application and Activity Data':
                return 'document';
            case "Applicant and Manager Data":
                return 'building';
            case "Company and Headquarters Data":
                return 'money';
            case "Trade Name Description":
                return 'chart';
            case "Terms and Conditions":
                return 'certificate';
            case "Technical approval":
                return 'certificates';
            case "Attachments":
                return 'attachment';
            default:
                return 'document'; // Default icon if no match found
        }
    }
    onEditorCreated(quill: any) {
        // quill.root is the contenteditable div
        const editorEl = quill.root as HTMLElement;
        editorEl.setAttribute('role', 'textbox');
        editorEl.setAttribute('aria-multiline', 'true');
        editorEl.setAttribute('aria-label', 'Commercial activity general description editor');
    }
    @HostListener('window:resize', [])
    onWindowResize() {
        this.checkScreenSize();
    }

    uiExtraHidden(action: Action) {
        let context = {
            AdminFeesValue: this.wizardForm!.get('AdminFeesValue')?.value || null,
            DutyFree: this.wizardForm!.get('DutyFree')?.value || null,
            FeesValue: this.wizardForm!.get('FeesValue')?.value || null
        }
        if (!action.UIExtraConditions) return false;
        if (action.UIExtraConditions.includes('DutyFree') && context.DutyFree) {
            return this.evaluateCondition(action.UIExtraConditions, context);
        } else if (!action.UIExtraConditions.includes('DutyFree')) {
            return this.evaluateCondition(action.UIExtraConditions, context);
        } else {
            return true;
        }
    }
    checkScreenSize() {
        this.isMobileScreen = window.innerWidth < 992;
        if (this.isMobileScreen) {
            this.sidebarCollapsed = true;
        } else {
            this.sidebarCollapsed = false;
        }
    }
    isFieldsFullWidth: any;
    fieldsFullWidth: any;
    checkScreenSizeForFields() {
        this.isFieldsFullWidth = window.innerWidth < 340;
        if (this.isFieldsFullWidth) {
            this.fieldsFullWidth = true;
        } else {
            this.fieldsFullWidth = false;
        }
    }
    /* onAiPopupClosed(event: any) {
        if (event === 'yes') {
            this.aiPopupAnswer.set('yes')
        } else {
            this.aiPopupAnswer.set('no')
        }
        this.aiPopupFirstInitFlag.set(false);
    } */
    openApplicationModal() {
        if (this.modal1) {
            this.modal1.open({ ariaLabel: "confirm application and remarks modal" });
        }
    }
    private evaluateCondition(condition: string, context: any): boolean {
        if (!condition) return false;

        // 1. Normalize SQL-like syntax to JS syntax
        let jsFriendlyCondition = condition
            .replace(/\band\b/gi, '&&')
            .replace(/\bor\b/gi, '||')
            .replace(/\bis null\b/gi, ' == null')
            .replace(/=/g, '==');

        // 2. Replace variable names with actual values from context
        // This regex finds words (variables) and replaces them with context[word]
        for (const key in context) {
            const regex = new RegExp(`\\b${key}\\b`, 'g');
            const value = typeof context[key] === 'string' ? `'${context[key]}'` : context[key];
            jsFriendlyCondition = jsFriendlyCondition.replace(regex, value);
        }

        try {
            // 3. Use Function constructor for a scoped evaluation (safer than eval)
            return new Function(`return ${jsFriendlyCondition}`)();
        } catch (e) {
            console.error("Condition Evaluation Error:", e, jsFriendlyCondition);
            return false;
        }
    }
    confirmModalFlag = signal<any>('')
    serviceSelectModalFlag = signal<any>('')
    lastGroup: FormGroup | null = null
    private shouldCallApi = true;
    async onSubmit(action: Action, HasServiceID?: boolean, processID?: number) {
        const currentTabFields: FieldJson[] = [];
        if (!this.editApp()) {
            this.currentTab()?.TabSections.forEach(section => {
                currentTabFields.push(...section.FieldsJson.map(field => ({
                    ...field,
                    StepID: this.currentTab()?.StepID // Now the field knows where it belongs!
                })));
            });
        } else {
            this.visibleNavigationTabs()!.forEach((tab) => {
                tab.TabSections.forEach(section => {
                    currentTabFields.push(...section.FieldsJson.map(field => ({
                        ...field,
                        StepID: tab.StepID // Now the field knows where it belongs!
                    })));
                });
            })
        }
        let allFields = this.extractFields(this.navigationTabs()!);
        let newService: number | null = null

        /*    this.apiLoading = true;
           if (this.newApplicationService.newRequestData() || !this.editApp()) {
               let oneServiceOwnerField = allFields.find(field => field.BusinessRuleFun === 'Check_ServiceOwnerEligibility');
               if (oneServiceOwnerField) {
                   await this.fireBusinessApi_serviceOwner(this.newApplicationService.uiResponseAllFields()!, oneServiceOwnerField)
               }
   
               if (action.BusinessRuleFun === 'GetRequestDataFor_7002' && this.businessGetRequestDataFor_7002 && this.businessGetRequestDataFor_7002.length > 0) {
                   await this.fireBusinessApi_getRequest(this.businessGetRequestDataFor_7002, this.businessGetRequestDataFor_7002[0].BusinessRuleFun, allFields, this.wizardForm!.value);
               }
               if (action.BusinessRuleFun === 'GetRequestDataFor_5014' && this.businessGetRequestDataFor_5014 && this.businessGetRequestDataFor_5014.length > 0) {
                   await this.fireBusinessApi_getRequest(this.businessGetRequestDataFor_5014, this.businessGetRequestDataFor_5014[0].BusinessRuleFun, allFields, this.wizardForm!.value);
               }
               if (action.BusinessRuleFun === 'sp_GetSecondaryActivity_ByArea' && this.businesssp_GetSecondaryActivity_ByArea && this.businesssp_GetSecondaryActivity_ByArea.length > 0) {
                   await this.fireBusinessApi_getRequest(this.businesssp_GetSecondaryActivity_ByArea, this.businesssp_GetSecondaryActivity_ByArea[0].BusinessRuleFun, allFields, this.wizardForm!.value);
               }
               if (this.businessError) {
                   this.showBusinessError(this.businessError.field.BusinessRuleFun, this.businessError, allFields);
                   return;
               }
               if (this.actionBusinessError) {
                   this.showBusinessError(this.actionBusinessError.field.BusinessRuleFun, this.actionBusinessError, allFields);
                   return;
               }
           }
           this.apiLoading = false; */


        if (this.actionBusinessError) {
            this.showBusinessError(this.actionBusinessError.field.BusinessRuleFun, this.actionBusinessError, currentTabFields);
            return;
        }
        if (this.businessError) {
            this.showBusinessError(this.businessError.field.BusinessRuleFun, this.businessError, currentTabFields);
            return;
        }
        if (action.ActionID === 1851 && [20, 1804].includes(this.apiBody.FKCurrentStatusID!)) {
            let msg: any;
            const res2: any = await firstValueFrom(this.newApplicationService.queryrequest(this.requestID, this.applicationNumber))
            this.isPaymentMsg = res2.transactionStatusResponse
            this.isPaymentPending = res2.StopPayment;
            if (this.isPaymentPending && this.isPaymentMsg && this.isPaymentMsg.map((item: any) => item.CurrentStatus).includes(26)) {
                msg = this.translations()?.paymentPendingMsg.label
                Swal.close();
                Swal.fire({
                    icon: 'info',
                    title: msg,
                    showConfirmButton: true,
                    confirmButtonText: this.translations()?.validationMsgBtn.label
                })
                return;
            } else if (this.isPaymentMsg && this.isPaymentMsg.map((item: any) => item.CurrentStatus).includes(0)) {
                msg = this.translations()?.paymentSuccessMsg.label
                msg = msg.substring(0, msg.lastIndexOf('[ApplicationNumber]')) + `<span dir="ltr">${this.applicationNumber}</span>`

                const newState = { ...history.state };
                newState.data = this.apiBody;
                history.replaceState(newState, document.title, window.location.href);
                Swal.close();
                window.location.reload();
            }
            Swal.close();
        }

        let ActionDetailsID: any;
        let actionID: any;
        if (action.LookupIDFieldInternalName) {
            let relevantValue = this.wizardForm?.get(action.LookupIDFieldInternalName)?.value;
            if (relevantValue && relevantValue !== -1) {
                ActionDetailsID = this.getUIResponse()?.Actions.find((item: any) => item.FkLookupID === relevantValue)?.ActionDetailsID
                if (!ActionDetailsID) {
                    ActionDetailsID = action.ActionDetailsID
                    actionID = action.ActionID
                }
            } else {
                ActionDetailsID = action.ActionDetailsID
                actionID = action.ActionID
            }
        } else {
            if (action.ActionID === 862) {
                const context = {
                    AdminFeesValue: this.wizardForm!.get('AdminFeesValue')?.value || 0,
                    DutyFree: this.wizardForm!.get('DutyFree')?.value || 0 // Assuming this is where DutyFree comes from
                };
                const matchingAction = this.actions.find((item: any) => {
                    if (!item.UIExtraConditions) return false;
                    return this.evaluateCondition(item.UIExtraConditions, context);
                });

                if (matchingAction) {
                    ActionDetailsID = matchingAction.ActionDetailsID;
                    action = matchingAction;
                } else {
                    // Default fallback if no conditions match
                    ActionDetailsID = action.ActionDetailsID;
                    actionID = action.ActionID;
                }
            } else {
                // Default fallback if no conditions match
                ActionDetailsID = action.ActionDetailsID;
                actionID = action.ActionID;
            }
        }
        if (this.newApplicationService.isPrinter || [1842, 1993, 1843, 1852, 1853, 1860, 1901].includes(action.ActionID)) {
            this.showCustomLoader();
        }
        this.shouldCallApi = false;
        let formArray: FormArray | null = null;
        let lastGroupDisabled: boolean = false
        let backupValidators: { [key: string]: ValidatorFn | null } = {};
        let backupAsyncValidators: any;
        if (this.applyDynamicValidationRules(ActionDetailsID, currentTabFields, actionID, action)) {
            return;
        }
        console.log('Form Submitted!', this.wizardForm);
        let isValid = true;
        console.log(currentTabFields);
        let count = 0;
        for (const field of currentTabFields) {
            let isValidField = true;
            let targetAttachment = null;

            // --- CASE 1: ATTACHMENTS (Type 9) ---
            if (field.FieldType === 9 && field.Attachments) {
                for (const attachment of field.Attachments) {
                    const index = field.Attachments.indexOf(attachment);
                    const control = (this.wizardForm!.get(field.InternalFieldName) as FormArray).at(index)?.get('files');

                    if (control?.invalid) {
                        control.markAsTouched();
                        isValidField = false;
                        targetAttachment = attachment;
                        break;
                    }
                }
            }

            // --- CASE 2: TABLES (Type 8) ---
            else if (field.FieldType === 8 && field.TableServiceFields) {
                const formArray = this.wizardForm!.get(field.InternalFieldName) as FormArray;
                if (formArray?.hasError('atLeastOneEntry')) {
                    isValidField = false;
                }
                // ... include your specific table row logic here ...
                let isTableReq = this.ServiceFieldsByActionsApiResponse.items[ActionDetailsID].find((item) => {
                    return item.ServiceFieldID === field.ServiceFieldID
                })?.FieldRequired
                if (formArray.length > 1 && isTableReq) {
                    isValid = this.validateRowsForMissingData(formArray, field);
                }
                Object.keys(formArray.controls).slice(0, -1).forEach((key: any, index: any) => {
                    field.TableServiceFields?.forEach((tableField: any) => {
                        if (formArray?.at(index)?.get(tableField.InternalFieldName)) {
                            this.shouldBeRequired(tableField, formArray!.at(index).get(tableField.InternalFieldName) as FormControl, index, field)
                        }
                    })
                })
                this.lastGroup = formArray.at(formArray.length - 1) as FormGroup<any>;
                if (this.lastGroup.invalid) {
                    backupValidators = Object.fromEntries(
                        Object.entries(this.lastGroup.controls).map(([key, control]) => [key, control.validator])
                    );
                    backupAsyncValidators = Object.fromEntries(
                        Object.entries(this.lastGroup.controls).map(([key, control]) => [key, control.asyncValidator])
                    );
                    // Remove and store the group
                    this.lastGroup = formArray.at(formArray.length - 1) as FormGroup;
                    Object.values(this.lastGroup.controls).forEach(control => {
                        control.clearValidators();
                        control.updateValueAndValidity({ emitEvent: false });
                    });
                    this.lastGroup.updateValueAndValidity({ emitEvent: false });
                    lastGroupDisabled = true;
                }

            }

            // --- CASE 3: STANDARD FIELDS ---
            else {
                const control = this.wizardForm!.get(field.InternalFieldName);
                const shouldCheck = (field.VisibilityActionID === 0) || (field.VisibilityActionID > 0 && !this.isPopup);
                if (control?.invalid && shouldCheck) {
                    control.markAsTouched();
                    isValidField = false;
                }
            }

            // --- FINAL ACTION: SWITCH TAB & FOCUS ---
            if (!isValidField) {
                isValid = false;

                // Check if we need to switch phases
                const needsSwitch = this.phaseIDs()?.length > 0 && field.StepID !== this.currentPhaseIndex();

                if (needsSwitch) {
                    this.changePhase(field.StepID);
                    // The FIX: Wait for Angular to render the new tab's DOM
                    setTimeout(() => this.executeFocusAndAlert(field, targetAttachment), 150);
                } else {
                    this.executeFocusAndAlert(field, targetAttachment);
                }
                if (!isValid) {
                    if (lastGroupDisabled) {
                        Object.entries(this.lastGroup!.controls).forEach(([key, control]) => {
                            control.setValidators(backupValidators[key]);
                            control.setAsyncValidators(backupAsyncValidators[key]);
                            control.updateValueAndValidity({ emitEvent: false });
                        });
                        this.lastGroup!.updateValueAndValidity({ emitEvent: false });
                    }
                }
                return; // Stop the loop at the first error
            }
        }
        console.log('isValid: ', isValid);
        console.log('isPopup: ', this.isPopup);

        if (action.ClickConditionId) {
            console.log(action.ClickConditionId);
            this.newApplicationService.evaluateClickConditionApi({ RequestID: this.requestID, ActionDetailsID: ActionDetailsID, ClickConditionId: action.ClickConditionId }).subscribe(async (res) => {
                if (res.IsTrue) {
                    if (action.BusinessRuleFun) {
                        this.wizardService.businessCondition(this.wizardForm!.value, allFields, action.BusinessRuleColmns, this.requestID, action.BusinessRuleFun, this.apiBody.FKServiceID).subscribe(async (business: any) => {
                            if (business[0]?.CanContinue) {
                                if (HasServiceID) {
                                    this.serviceSelectModalFlag.set(true)
                                    try {
                                        // 1. Use await with firstValueFrom to wait for the result
                                        // The take(1) is NOT needed here because firstValueFrom automatically 
                                        // subscribes and resolves with the first value, then completes the subscription.
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
                                this.fireSubmit(action, currentTabFields, ActionDetailsID, isValid, lastGroupDisabled, backupValidators, backupAsyncValidators, newService || null, processID);
                            } else {
                                this.businessError = { field: action, business: business };
                                this.showBusinessError(action.BusinessRuleFun, this.businessError, allFields);
                                this.businessError = null;
                                return;
                            }

                        })
                    } else {
                        if (HasServiceID) {
                            this.serviceSelectModalFlag.set(true)
                            try {
                                // 1. Use await with firstValueFrom to wait for the result
                                // The take(1) is NOT needed here because firstValueFrom automatically 
                                // subscribes and resolves with the first value, then completes the subscription.
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
                        this.fireSubmit(action, currentTabFields, ActionDetailsID, isValid, lastGroupDisabled, backupValidators, backupAsyncValidators, newService || null, processID);
                    }
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: this.store.index.locale === 'en' ? res.ActionMessageEn : res.ActionMessageAr,
                        showConfirmButton: true,
                        confirmButtonText: this.translations()?.swalConfirmationBtn.label
                    })
                    return;
                }
            })
        } else {

            if (action.BusinessRuleFun) {
                this.wizardService.businessCondition(this.wizardForm!.value, allFields, action.BusinessRuleColmns, this.requestID, action.BusinessRuleFun, this.apiBody.FKServiceID).subscribe(async (business: any) => {
                    if (business[0]?.CanContinue) {
                        if (HasServiceID) {
                            this.serviceSelectModalFlag.set(true)
                            try {
                                // 1. Use await with firstValueFrom to wait for the result
                                // The take(1) is NOT needed here because firstValueFrom automatically 
                                // subscribes and resolves with the first value, then completes the subscription.
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
                        this.fireSubmit(action, currentTabFields, ActionDetailsID, isValid, lastGroupDisabled, backupValidators, backupAsyncValidators, newService || null, processID);
                    } else {
                        this.businessError = { field: action, business: business };
                        this.showBusinessError(action.BusinessRuleFun, this.businessError, allFields);
                        this.businessError = null;
                        return;
                    }

                })
            } else {
                if (HasServiceID) {
                    this.serviceSelectModalFlag.set(true)
                    try {
                        // 1. Use await with firstValueFrom to wait for the result
                        // The take(1) is NOT needed here because firstValueFrom automatically 
                        // subscribes and resolves with the first value, then completes the subscription.
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
                this.fireSubmit(action, currentTabFields, ActionDetailsID, isValid, lastGroupDisabled, backupValidators, backupAsyncValidators, newService || null, processID);
            }

        }
    }
    fireSubmit(action: Action, currentTabFields: FieldJson[], ActionDetailsID: any, isValid: boolean, lastGroupDisabled: boolean, backupValidators: { [key: string]: ValidatorFn | null }, backupAsyncValidators: any, newService: number | null,
        processID?: number
    ) {
        if (action.SpecialAction) {
            if (action.ActionStyle === 2840) {
                action.HasConfirmMsg ? Swal.fire({
                    title: this.translations()?.swalConfirmAppMsgTitle.label,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: action.ActionID !== 1851 ? this.translations()?.normalConfirmMsgBtn.label : this.translations()?.aiPopupYesBtn.label,
                    cancelButtonText: action.ActionID !== 1851 ? this.translations()?.normalNoMsgBtn.label : this.translations()?.aiPopupNoBtn.label,
                }).then((result) => {
                    if (result.value) {
                        return this.patchDataForNewApplication({ RequestID: this.requestID, ActionDBName: action.ActionDBName!, FKProcessID: this.defaultProcess || null, ActivityServiceID: newService || null }, action, processID);
                    }
                })
                    : this.patchDataForNewApplication({ RequestID: this.requestID, ActionDBName: action.ActionDBName!, FKProcessID: this.defaultProcess || null, ActivityServiceID: newService || null }, action, processID);
            }
            if (action.ActionStyle === 2854) {
                this.openLoader();
                this.setupPage();
                this.newApplicationService.openDimFields.set(true);
            }
            if (action.ActionStyle === 2839) {
                if (action.ActionID === 1859) {
                    this.allApplicationService.initActivityLog({ ItemID: this.newApplicationService.requestData().RequestID },
                        this.newApplicationService.requestData().ApplicationNumber,
                        this.store.index.locale === 'en' ? this.newApplicationService.requestData().FkStatusID_TitleEn : this.newApplicationService.requestData().FkStatusID_TitleAr,
                        this.store.index.locale === 'en' ? this.newApplicationService.requestData().FkProcessID_TitleEn : this.newApplicationService.requestData().FkProcessID_TitleAr
                    );
                }
                if (action.ActionID === 1865) {
                    this.allApplicationService.initRelatedRequests(this.newApplicationService.requestData().RequestID);
                }
                if (action.ActionID === 1850) {
                    this.newApplicationService.isAuditData.set(true);
                }
            }
            return;
        }
        if (this.isPopup) {
            this.confirmModalFlag.set(true)
            this.confirmModalSubscription = this.confirmModalService.open(action.ActionID)
                .pipe(
                    take(1),
                    switchMap(confirmed => {
                        if (confirmed) {
                            if (this.wizardForm!.valid) {
                                this.showCustomLoader();
                                return this.wizardService.serviceDataActionApi(this.wizardForm!.getRawValue(), action, this.ServiceFieldsByActionsApiResponse, currentTabFields, this.newApplicationService.requestData()?.RequestID, this.newApplicationService.newRequestData()?.FkParentID, this.newApplicationService.newRequestData()?.SeconedParentRequestid, ActionDetailsID).pipe(take(1))
                            } else {
                                if (lastGroupDisabled) {
                                    Object.entries(this.lastGroup!.controls).forEach(([key, control]) => {
                                        control.setValidators(backupValidators[key]);
                                        control.setAsyncValidators(backupAsyncValidators[key]);
                                        control.updateValueAndValidity({ emitEvent: false });
                                    });
                                    this.lastGroup!.updateValueAndValidity({ emitEvent: false });
                                }
                                this.isPopup = false
                                return of(false)
                            }
                        } else {
                            if (lastGroupDisabled) {
                                Object.entries(this.lastGroup!.controls).forEach(([key, control]) => {
                                    control.setValidators(backupValidators[key]);
                                    control.setAsyncValidators(backupAsyncValidators[key]);
                                    control.updateValueAndValidity({ emitEvent: false });
                                });
                                this.lastGroup!.updateValueAndValidity({ emitEvent: false });
                            }
                            this.isPopup = false
                            return of(null);
                        }
                    })
                )
                .subscribe({
                    next: (res: any) => {
                        if (res) {
                            Swal.close();
                            if (this.newApplicationService.newRequestData()) {
                                this.newApplicationService.newRequestData.set(null);
                                this.newApplicationService.defaultProcess.set('');
                            }
                            let msg: any;
                            if (action.SuperMsgEn?.includes('ApplicationNumber')) {
                                msg = this.store.index.locale === 'en' ? (action.SuperMsgEn?.includes('ApplicationNumber') ? action.SuperMsgEn.substring(0, action.SuperMsgEn.lastIndexOf('ApplicationNumber')) + `<span dir="ltr">${res.ApplicationNumber}</span>` + action.SuperMsgEn.substring(action.SuperMsgEn.lastIndexOf('ApplicationNumber') + 'ApplicationNumber'.length) : action.SuperMsgEn) : (action.SuperMsgAr?.includes('ApplicationNumber') ? action.SuperMsgAr.substring(0, action.SuperMsgAr.lastIndexOf('ApplicationNumber')) + `<span dir="ltr">${res.ApplicationNumber}</span>` + action.SuperMsgAr.substring(action.SuperMsgAr.lastIndexOf('ApplicationNumber') + 'ApplicationNumber'.length) : action.SuperMsgAr);
                            } else if (action.SuperMsgEn?.includes('ApprovedLicense')) {
                                msg = this.store.index.locale === 'en' ? (action.SuperMsgEn?.includes('ApprovedLicense') ? action.SuperMsgEn.substring(0, action.SuperMsgEn.lastIndexOf('ApprovedLicense')) + `<span dir="ltr">${res.ApprovedLicense}</span>` + action.SuperMsgEn.substring(action.SuperMsgEn.lastIndexOf('ApprovedLicense') + 'ApprovedLicense'.length) : action.SuperMsgEn) : (action.SuperMsgAr?.includes('ApprovedLicense') ? action.SuperMsgAr.substring(0, action.SuperMsgAr.lastIndexOf('ApprovedLicense')) + `<span dir="ltr">${res.ApprovedLicense}</span>` + action.SuperMsgAr.substring(action.SuperMsgAr.lastIndexOf('ApprovedLicense') + 'ApprovedLicense'.length) : action.SuperMsgAr);
                            } else {
                                msg = this.store.index.locale === 'en' ? action.SuperMsgEn : action.SuperMsgAr
                            }

                            if (this.apiBody.FKServiceID !== 7008) {
                                let mainTab = this.findByServices(this.menuLinksService.menuResponse(), this.apiBody.FKServiceID)?.TitleEn
                                if (res.FkStatusID === 10) {
                                    this.router.navigate(['/Inbox'],
                                        {
                                            state: {
                                                mainTab: mainTab || history.state.mainTab,
                                                branchTab: history.state.branchTab,
                                                restoreTabs: true
                                            }
                                        }
                                    )
                                } else {
                                    this.router.navigate(['/Inbox'],
                                        {
                                            state: {
                                                mainTab: mainTab || history.state.mainTab,
                                                branchTab: history.state.branchTab,
                                                restoreTabs: true
                                            }
                                        }
                                    )
                                }
                            } else {
                                let linkData = this.findMenuByUrl(this.menuLinksService.menuResponse(), 'ComplaintsRequests');
                                this.router.navigate(['/ComplaintsRequests'], {
                                    state: {
                                        menuData: linkData
                                    }
                                })
                            }
                            Swal.fire({
                                icon: "success",
                                title: msg,
                                confirmButtonText: this.translations()?.swalConfirmationBtn.label,
                                padding: '10px 20px',
                            });
                        }
                    },
                    error: (error) => {
                        if (error.error.result && error.error.result.details && error.error.result.result === 'ERROR') {
                            Swal.close();
                            let match = error.error.result.details.match(/Error ID:\s*([a-fA-F0-9]+)/);
                            match = match[0].replace('Error ID: ', this.translations()?.submitErrMsgKeyLabel.label);
                            let err = this.translations()?.submitErrMsg.label.replace('[err]', '<br>' + match)
                            Swal.fire({
                                icon: "error",
                                title: err,
                                confirmButtonText: this.translations()?.swalConfirmationBtn.label,
                            })
                            this.router.navigate(['/Inbox'],
                                {
                                    state: {
                                        mainTab: history.state.mainTab,
                                        branchTab: history.state.branchTab,
                                        restoreTabs: true
                                    }
                                }
                            )
                            return;
                        } else {
                            let err = this.translations()?.submitErrMsg.label.replace('[err] <br>', '')
                            Swal.fire({
                                icon: "error",
                                title: err,
                                confirmButtonText: this.translations()?.swalConfirmationBtn.label,
                            })
                            this.router.navigate(['/Inbox'],
                                {
                                    state: {
                                        mainTab: history.state.mainTab,
                                        branchTab: history.state.branchTab,
                                        restoreTabs: true
                                    }
                                }
                            )
                        }
                    }
                })
        } else if (isValid && this.editApp() && !this.isPopup) {
            console.log('Form Submitted!', this.wizardForm!.value);
            let currentTabFields2: any = [];
            this.visibleNavigationTabs()!.forEach((tab) => {
                tab.TabSections.forEach(section => {
                    currentTabFields2.push(...section.FieldsJson);
                });
            })

            action.HasConfirmMsg ? Swal.fire({
                title: this.translations()?.swalConfirmAppMsgTitle.label,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: action.ActionID !== 1851 ? this.translations()?.normalConfirmMsgBtn.label : this.translations()?.aiPopupYesBtn.label,
                cancelButtonText: action.ActionID !== 1851 ? this.translations()?.normalNoMsgBtn.label : this.translations()?.aiPopupNoBtn.label,
            }).then((result) => {
                if (result.value) {
                    this.showCustomLoader();
                    this.wizardService.serviceDataActionApi(this.wizardForm!.getRawValue(), action, this.ServiceFieldsByActionsApiResponse, currentTabFields2, this.newApplicationService.requestData()?.RequestID, this.newApplicationService.newRequestData()?.FkParentID, this.newApplicationService.newRequestData()?.SeconedParentRequestid, ActionDetailsID).pipe(take(1)).subscribe({
                        next: (res: any) => {
                            if (this.newApplicationService.newRequestData()) {
                                this.newApplicationService.newRequestData.set(null);
                                this.newApplicationService.defaultProcess.set('');
                            }
                            console.log(res);
                            if (this.newApplicationService.isPrinter) {
                                this.newApplicationService.isPrinter = false;
                                return;
                            }
                            let msg: any;
                            if (action.SuperMsgEn?.includes('ApplicationNumber')) {
                                msg = this.store.index.locale === 'en' ? (action.SuperMsgEn?.includes('ApplicationNumber') ? action.SuperMsgEn.substring(0, action.SuperMsgEn.lastIndexOf('ApplicationNumber')) + `<span dir="ltr">${res.ApplicationNumber}</span>` + action.SuperMsgEn.substring(action.SuperMsgEn.lastIndexOf('ApplicationNumber') + 'ApplicationNumber'.length) : action.SuperMsgEn) : (action.SuperMsgAr?.includes('ApplicationNumber') ? action.SuperMsgAr.substring(0, action.SuperMsgAr.lastIndexOf('ApplicationNumber')) + `<span dir="ltr">${res.ApplicationNumber}</span>` + action.SuperMsgAr.substring(action.SuperMsgAr.lastIndexOf('ApplicationNumber') + 'ApplicationNumber'.length) : action.SuperMsgAr);
                            } else if (action.SuperMsgEn?.includes('ApprovedLicense')) {
                                msg = this.store.index.locale === 'en' ? (action.SuperMsgEn?.includes('ApprovedLicense') ? action.SuperMsgEn.substring(0, action.SuperMsgEn.lastIndexOf('ApprovedLicense')) + `<span dir="ltr">${res.ApprovedLicense}</span>` + action.SuperMsgEn.substring(action.SuperMsgEn.lastIndexOf('ApprovedLicense') + 'ApprovedLicense'.length) : action.SuperMsgEn) : (action.SuperMsgAr?.includes('ApprovedLicense') ? action.SuperMsgAr.substring(0, action.SuperMsgAr.lastIndexOf('ApprovedLicense')) + `<span dir="ltr">${res.ApprovedLicense}</span>` + action.SuperMsgAr.substring(action.SuperMsgAr.lastIndexOf('ApprovedLicense') + 'ApprovedLicense'.length) : action.SuperMsgAr);
                            } else {
                                msg = this.store.index.locale === 'en' ? action.SuperMsgEn : action.SuperMsgAr
                            }
                            /*   */
                            if (this.apiBody.FKServiceID !== 7008) {
                                let mainTab = this.findByServices(this.menuLinksService.menuResponse(), this.apiBody.FKServiceID)?.TitleEn
                                if (res.FkStatusID === 10) {
                                    this.router.navigate(['/Inbox'],
                                        {
                                            state: {
                                                mainTab: mainTab || history.state.mainTab,
                                                branchTab: history.state.branchTab,
                                                restoreTabs: true
                                            }
                                        }
                                    )
                                } else {
                                    this.router.navigate(['/Inbox'],
                                        {
                                            state: {
                                                mainTab: mainTab || history.state.mainTab,
                                                branchTab: history.state.branchTab,
                                                restoreTabs: true
                                            }
                                        }
                                    )
                                }
                            } else {
                                let linkData = this.findMenuByUrl(this.menuLinksService.menuResponse(), 'ComplaintsRequests');
                                this.router.navigate(['/ComplaintsRequests'], {
                                    state: {
                                        menuData: linkData
                                    }
                                })
                            }
                            Swal.close();
                            Swal.fire({
                                icon: "success",
                                title: msg,
                                confirmButtonText: this.translations()?.swalConfirmationBtn.label,
                                padding: '10px 20px',
                            });
                        },
                        error: (error) => {
                            if (error.error.result && error.error.result.details && error.error.result.result === 'ERROR') {
                                Swal.close();
                                let match = error.error.result.details.match(/Error ID:\s*([a-fA-F0-9]+)/);
                                match = match[0].replace('Error ID: ', this.translations()?.submitErrMsgKeyLabel.label);
                                let err = this.translations()?.submitErrMsg.label.replace('[err]', '<br>' + match)
                                Swal.fire({
                                    icon: "error",
                                    title: err,
                                    confirmButtonText: this.translations()?.swalConfirmationBtn.label,
                                })
                                this.router.navigate(['/Inbox'],
                                    {
                                        state: {
                                            mainTab: history.state.mainTab,
                                            branchTab: history.state.branchTab,
                                            restoreTabs: true
                                        }
                                    }
                                )
                                return;
                            } else {
                                let err = this.translations()?.submitErrMsg.label.replace('[err] <br>', '')
                                Swal.fire({
                                    icon: "error",
                                    title: err,
                                    confirmButtonText: this.translations()?.swalConfirmationBtn.label,
                                })
                                this.router.navigate(['/Inbox'],
                                    {
                                        state: {
                                            mainTab: history.state.mainTab,
                                            branchTab: history.state.branchTab,
                                            restoreTabs: true
                                        }
                                    }
                                )
                            }
                        }
                    })
                } else {
                    if (lastGroupDisabled) {
                        Object.entries(this.lastGroup!.controls).forEach(([key, control]) => {
                            control.setValidators(backupValidators[key]);
                            control.setAsyncValidators(backupAsyncValidators[key]);
                            control.updateValueAndValidity({ emitEvent: false });
                        });
                        this.lastGroup!.updateValueAndValidity({ emitEvent: false });
                    }
                }
            })
                : this.wizardService.serviceDataActionApi(this.wizardForm!.getRawValue(), action, this.ServiceFieldsByActionsApiResponse, currentTabFields2, this.newApplicationService.requestData()?.RequestID, this.newApplicationService.newRequestData()?.FkParentID, this.newApplicationService.newRequestData()?.SeconedParentRequestid, ActionDetailsID).pipe(
                    tap(() => { this.showCustomLoader(); })
                ).subscribe({
                    next: (res: any) => {
                        Swal.close();
                        if (this.newApplicationService.newRequestData()) {
                            this.newApplicationService.newRequestData.set(null);
                            this.newApplicationService.defaultProcess.set('');
                        }
                        if (this.newApplicationService.isPrinter) {
                            this.newApplicationService.isPrinter = false;
                            return;
                        }
                        console.log(res);
                        let msg: any;
                        if (action.SuperMsgEn?.includes('ApplicationNumber')) {
                            msg = this.store.index.locale === 'en' ? (action.SuperMsgEn?.includes('ApplicationNumber') ? action.SuperMsgEn.substring(0, action.SuperMsgEn.lastIndexOf('ApplicationNumber')) + `<span dir="ltr">${res.ApplicationNumber}</span>` + action.SuperMsgEn.substring(action.SuperMsgEn.lastIndexOf('ApplicationNumber') + 'ApplicationNumber'.length) : action.SuperMsgEn) : (action.SuperMsgAr?.includes('ApplicationNumber') ? action.SuperMsgAr.substring(0, action.SuperMsgAr.lastIndexOf('ApplicationNumber')) + `<span dir="ltr">${res.ApplicationNumber}</span>` + action.SuperMsgAr.substring(action.SuperMsgAr.lastIndexOf('ApplicationNumber') + 'ApplicationNumber'.length) : action.SuperMsgAr);
                        } else if (action.SuperMsgEn?.includes('ApprovedLicense')) {
                            msg = this.store.index.locale === 'en' ? (action.SuperMsgEn?.includes('ApprovedLicense') ? action.SuperMsgEn.substring(0, action.SuperMsgEn.lastIndexOf('ApprovedLicense')) + `<span dir="ltr">${res.ApprovedLicense}</span>` + action.SuperMsgEn.substring(action.SuperMsgEn.lastIndexOf('ApprovedLicense') + 'ApprovedLicense'.length) : action.SuperMsgEn) : (action.SuperMsgAr?.includes('ApprovedLicense') ? action.SuperMsgAr.substring(0, action.SuperMsgAr.lastIndexOf('ApprovedLicense')) + `<span dir="ltr">${res.ApprovedLicense}</span>` + action.SuperMsgAr.substring(action.SuperMsgAr.lastIndexOf('ApprovedLicense') + 'ApprovedLicense'.length) : action.SuperMsgAr);
                        } else {
                            msg = this.store.index.locale === 'en' ? action.SuperMsgEn : action.SuperMsgAr
                        }
                        if (this.apiBody.FKServiceID !== 7008) {
                            let mainTab = this.findByServices(this.menuLinksService.menuResponse(), this.apiBody.FKServiceID)?.TitleEn
                            if (res.FkStatusID === 10) {
                                this.router.navigate(['/Inbox'],
                                    {
                                        state: {
                                            mainTab: mainTab || history.state.mainTab,
                                            branchTab: history.state.branchTab,
                                            restoreTabs: true
                                        }
                                    }
                                )
                            } else {
                                this.router.navigate(['/Inbox'],
                                    {
                                        state: {
                                            mainTab: mainTab || history.state.mainTab,
                                            branchTab: history.state.branchTab,
                                            restoreTabs: true
                                        }
                                    }
                                )
                            }
                        } else {
                            let linkData = this.findMenuByUrl(this.menuLinksService.menuResponse(), 'ComplaintsRequests');
                            this.router.navigate(['/ComplaintsRequests'], {
                                state: {
                                    menuData: linkData
                                }
                            })
                        }
                        Swal.fire({
                            icon: "success",
                            title: msg,
                            confirmButtonText: this.translations()?.swalConfirmationBtn.label,
                            padding: '10px 20px',
                        });
                    },
                    error: (error) => {
                        if (error.error.result && error.error.result.details && error.error.result.result === 'ERROR') {
                            Swal.close();
                            let match = error.error.result.details.match(/Error ID:\s*([a-fA-F0-9]+)/);
                            match = match[0].replace('Error ID: ', this.translations()?.submitErrMsgKeyLabel.label);
                            let err = this.translations()?.submitErrMsg.label.replace('[err]', '<br>' + match)
                            Swal.fire({
                                icon: "error",
                                title: err,
                                confirmButtonText: this.translations()?.swalConfirmationBtn.label,
                            })
                            this.router.navigate(['/Inbox'],
                                {
                                    state: {
                                        mainTab: history.state.mainTab,
                                        branchTab: history.state.branchTab,
                                        restoreTabs: true
                                    }
                                }
                            )
                            return;
                        } else {
                            let err = this.translations()?.submitErrMsg.label.replace('[err] <br>', '')
                            Swal.fire({
                                icon: "error",
                                title: err,
                                confirmButtonText: this.translations()?.swalConfirmationBtn.label,
                            })
                            this.router.navigate(['/Inbox'],
                                {
                                    state: {
                                        mainTab: history.state.mainTab,
                                        branchTab: history.state.branchTab,
                                        restoreTabs: true
                                    }
                                }
                            )
                        }
                    }
                });

        } else if (isValid && !this.editApp() && !this.isPopup) {
            console.log('Form Submitted!', this.wizardForm);
            let currentTabFields2: any = [];
            this.visibleNavigationTabs()!.forEach((tab) => {
                tab.TabSections.forEach(section => {
                    currentTabFields2.push(...section.FieldsJson);
                });
            })

            action.HasConfirmMsg ? Swal.fire({
                title: this.translations()?.swalConfirmAppMsgTitle.label,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: action.ActionID !== 1851 ? this.translations()?.normalConfirmMsgBtn.label : this.translations()?.aiPopupYesBtn.label,
                cancelButtonText: action.ActionID !== 1851 ? this.translations()?.normalNoMsgBtn.label : this.translations()?.aiPopupNoBtn.label,
            }).then((result) => {
                if (result.value) {
                    this.showCustomLoader();
                    this.wizardService.serviceDataActionApi(this.wizardForm!.getRawValue(), action, this.ServiceFieldsByActionsApiResponse, currentTabFields2, undefined, this.newApplicationService.newRequestData()?.FkParentID, this.newApplicationService.newRequestData()?.SeconedParentRequestid, ActionDetailsID).pipe(take(1)).subscribe({
                        next: (res: any) => {
                            if (this.newApplicationService.newRequestData()) {
                                this.newApplicationService.newRequestData.set(null);
                                this.newApplicationService.defaultProcess.set('');
                            }
                            console.log(res);
                            let msg: any;
                            if (action.SuperMsgEn?.includes('ApplicationNumber')) {
                                msg = this.store.index.locale === 'en' ? (action.SuperMsgEn?.includes('ApplicationNumber') ? action.SuperMsgEn.substring(0, action.SuperMsgEn.lastIndexOf('ApplicationNumber')) + `<span dir="ltr">${res.ApplicationNumber}</span>` + action.SuperMsgEn.substring(action.SuperMsgEn.lastIndexOf('ApplicationNumber') + 'ApplicationNumber'.length) : action.SuperMsgEn) : (action.SuperMsgAr?.includes('ApplicationNumber') ? action.SuperMsgAr.substring(0, action.SuperMsgAr.lastIndexOf('ApplicationNumber')) + `<span dir="ltr">${res.ApplicationNumber}</span>` + action.SuperMsgAr.substring(action.SuperMsgAr.lastIndexOf('ApplicationNumber') + 'ApplicationNumber'.length) : action.SuperMsgAr);
                            } else if (action.SuperMsgEn?.includes('ApprovedLicense')) {
                                msg = this.store.index.locale === 'en' ? (action.SuperMsgEn?.includes('ApprovedLicense') ? action.SuperMsgEn.substring(0, action.SuperMsgEn.lastIndexOf('ApprovedLicense')) + `<span dir="ltr">${res.ApprovedLicense}</span>` + action.SuperMsgEn.substring(action.SuperMsgEn.lastIndexOf('ApprovedLicense') + 'ApprovedLicense'.length) : action.SuperMsgEn) : (action.SuperMsgAr?.includes('ApprovedLicense') ? action.SuperMsgAr.substring(0, action.SuperMsgAr.lastIndexOf('ApprovedLicense')) + `<span dir="ltr">${res.ApprovedLicense}</span>` + action.SuperMsgAr.substring(action.SuperMsgAr.lastIndexOf('ApprovedLicense') + 'ApprovedLicense'.length) : action.SuperMsgAr);
                            } else {
                                msg = this.store.index.locale === 'en' ? action.SuperMsgEn : action.SuperMsgAr
                            }
                            if (this.apiBody.FKServiceID !== 7008) {
                                let mainTab = this.findByServices(this.menuLinksService.menuResponse(), this.apiBody.FKServiceID)?.TitleEn
                                if (res.FkStatusID === 10) {
                                    this.router.navigate(['/Inbox'],
                                        {
                                            state: {
                                                mainTab: mainTab || history.state.mainTab,
                                                branchTab: history.state.branchTab,
                                                restoreTabs: true
                                            }
                                        }
                                    )
                                } else {
                                    this.router.navigate(['/Inbox'],
                                        {
                                            state: {
                                                mainTab: mainTab || history.state.mainTab,
                                                branchTab: history.state.branchTab,
                                                restoreTabs: true
                                            }
                                        }
                                    )
                                }
                            } else {
                                let linkData = this.findMenuByUrl(this.menuLinksService.menuResponse(), 'ComplaintsRequests');
                                this.router.navigate(['/ComplaintsRequests'], {
                                    state: {
                                        menuData: linkData
                                    }
                                })
                            }
                            Swal.close();
                            Swal.fire({
                                icon: "success",
                                title: msg,
                                confirmButtonText: this.translations()?.swalConfirmationBtn.label,
                                padding: '10px 20px',
                            });
                        },
                        error: (error) => {
                            if (error.error.result && error.error.result.details && error.error.result.result === 'ERROR') {
                                Swal.close();
                                let match = error.error.result.details.match(/Error ID:\s*([a-fA-F0-9]+)/);
                                match = match[0].replace('Error ID: ', this.translations()?.submitErrMsgKeyLabel.label);
                                let err = this.translations()?.submitErrMsg.label.replace('[err]', '<br>' + match)
                                Swal.fire({
                                    icon: "error",
                                    title: err,
                                    confirmButtonText: this.translations()?.swalConfirmationBtn.label,
                                })
                                this.router.navigate(['/Inbox'],
                                    {
                                        state: {
                                            mainTab: history.state.mainTab,
                                            branchTab: history.state.branchTab,
                                            restoreTabs: true
                                        }
                                    }
                                )
                                return;
                            } else {
                                let err = this.translations()?.submitErrMsg.label.replace('[err] <br>', '')
                                Swal.fire({
                                    icon: "error",
                                    title: err,
                                    confirmButtonText: this.translations()?.swalConfirmationBtn.label,
                                })
                                this.router.navigate(['/Inbox'],
                                    {
                                        state: {
                                            mainTab: history.state.mainTab,
                                            branchTab: history.state.branchTab,
                                            restoreTabs: true
                                        }
                                    }
                                )
                            }
                        }
                    })
                } else {
                    if (lastGroupDisabled) {
                        Object.entries(this.lastGroup!.controls).forEach(([key, control]) => {
                            control.setValidators(backupValidators[key]);
                            control.setAsyncValidators(backupAsyncValidators[key]);
                            control.updateValueAndValidity({ emitEvent: false });
                        });
                        this.lastGroup!.updateValueAndValidity({ emitEvent: false });
                    }
                }
            })
                : this.wizardService.serviceDataActionApi(this.wizardForm!.getRawValue(), action, this.ServiceFieldsByActionsApiResponse, currentTabFields2, undefined, this.newApplicationService.newRequestData()?.FkParentID, this.newApplicationService.newRequestData()?.SeconedParentRequestid, ActionDetailsID).pipe(
                    tap(() => { this.showCustomLoader(); })
                ).subscribe({
                    next: (res: any) => {
                        Swal.close();
                        if (this.newApplicationService.newRequestData()) {
                            this.newApplicationService.newRequestData.set(null);
                            this.newApplicationService.defaultProcess.set('');
                        }
                        console.log(res);
                        let msg: any;
                        if (action.SuperMsgEn?.includes('ApplicationNumber')) {
                            msg = this.store.index.locale === 'en' ? (action.SuperMsgEn?.includes('ApplicationNumber') ? action.SuperMsgEn.substring(0, action.SuperMsgEn.lastIndexOf('ApplicationNumber')) + `<span dir="ltr">${res.ApplicationNumber}</span>` + action.SuperMsgEn.substring(action.SuperMsgEn.lastIndexOf('ApplicationNumber') + 'ApplicationNumber'.length) : action.SuperMsgEn) : (action.SuperMsgAr?.includes('ApplicationNumber') ? action.SuperMsgAr.substring(0, action.SuperMsgAr.lastIndexOf('ApplicationNumber')) + `<span dir="ltr">${res.ApplicationNumber}</span>` + action.SuperMsgAr.substring(action.SuperMsgAr.lastIndexOf('ApplicationNumber') + 'ApplicationNumber'.length) : action.SuperMsgAr);
                        } else if (action.SuperMsgEn?.includes('ApprovedLicense')) {
                            msg = this.store.index.locale === 'en' ? (action.SuperMsgEn?.includes('ApprovedLicense') ? action.SuperMsgEn.substring(0, action.SuperMsgEn.lastIndexOf('ApprovedLicense')) + `<span dir="ltr">${res.ApprovedLicense}</span>` + action.SuperMsgEn.substring(action.SuperMsgEn.lastIndexOf('ApprovedLicense') + 'ApprovedLicense'.length) : action.SuperMsgEn) : (action.SuperMsgAr?.includes('ApprovedLicense') ? action.SuperMsgAr.substring(0, action.SuperMsgAr.lastIndexOf('ApprovedLicense')) + `<span dir="ltr">${res.ApprovedLicense}</span>` + action.SuperMsgAr.substring(action.SuperMsgAr.lastIndexOf('ApprovedLicense') + 'ApprovedLicense'.length) : action.SuperMsgAr);
                        } else {
                            msg = this.store.index.locale === 'en' ? action.SuperMsgEn : action.SuperMsgAr
                        }
                        if (this.apiBody.FKServiceID !== 7008) {
                            let mainTab = this.findByServices(this.menuLinksService.menuResponse(), this.apiBody.FKServiceID)?.TitleEn
                            if (res.FkStatusID === 10) {
                                this.router.navigate(['/Inbox'],
                                    {
                                        state: {
                                            mainTab: mainTab || history.state.mainTab,
                                            branchTab: history.state.branchTab,
                                            restoreTabs: true
                                        }
                                    }
                                )
                            } else {
                                this.router.navigate(['/Inbox'],
                                    {
                                        state: {
                                            mainTab: mainTab || history.state.mainTab,
                                            branchTab: history.state.branchTab,
                                            restoreTabs: true
                                        }
                                    }
                                )
                            }
                        } else {
                            let linkData = this.findMenuByUrl(this.menuLinksService.menuResponse(), 'ComplaintsRequests');
                            this.router.navigate(['/ComplaintsRequests'], {
                                state: {
                                    menuData: linkData
                                }
                            })
                        }
                        Swal.fire({
                            icon: "success",
                            title: msg,
                            confirmButtonText: this.translations()?.swalConfirmationBtn.label,
                            padding: '10px 20px',
                        });
                    },
                    error: (error) => {
                        if (error.error.result && error.error.result.details && error.error.result.result === 'ERROR') {
                            Swal.close();
                            let match = error.error.result.details.match(/Error ID:\s*([a-fA-F0-9]+)/);
                            match = match[0].replace('Error ID: ', this.translations()?.submitErrMsgKeyLabel.label);
                            let err = this.translations()?.submitErrMsg.label.replace('[err]', '<br>' + match)
                            Swal.fire({
                                icon: "error",
                                title: err,
                                confirmButtonText: this.translations()?.swalConfirmationBtn.label,
                            })
                            this.router.navigate(['/Inbox'],
                                {
                                    state: {
                                        mainTab: history.state.mainTab,
                                        branchTab: history.state.branchTab,
                                        restoreTabs: true
                                    }
                                }
                            )
                            return;
                        } else {
                            let err = this.translations()?.submitErrMsg.label.replace('[err] <br>', '')
                            Swal.fire({
                                icon: "error",
                                title: err,
                                confirmButtonText: this.translations()?.swalConfirmationBtn.label,
                            })
                            this.router.navigate(['/Inbox'],
                                {
                                    state: {
                                        mainTab: history.state.mainTab,
                                        branchTab: history.state.branchTab,
                                        restoreTabs: true
                                    }
                                }
                            )
                        }
                    }
                });

        }
    }

    stripHtml(html: string): string {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || '';
    }


    private executeFocusAndAlert(field: any, attachment?: any) {
        const isEn = this.store.index.locale === 'en';
        let selector = '';
        let errorMessage = isEn ? field.ValidationMsgEn : field.ValidationMsgAr;

        // 1. Determine Selector & Message
        if (field.FieldType === 9 && attachment) {
            selector = `.file${attachment.ID}`;
            const af = field.AttachmentsFields!.find((f: any) => f.FieldType === 13);
            errorMessage = isEn ? `${af.ValidationMsgEn} ${attachment.TitleEn}` : `${af.ValidationMsgAr} ${attachment.TitleAr}`;
        } else if (field.FieldType === 10) {
            selector = `.${field.InternalFieldName}`;
        } else if ([4, 5, 16].includes(field.FieldType)) {
            selector = `[name="${field.InternalFieldName}"]`;
        } else {
            selector = `[id="${field.InternalFieldName}"]`;
        }

        // 2. Find Element
        const hostElement = document.querySelector<HTMLElement>(selector);
        if (!hostElement) return;

        // 3. Handle ng-select specifics
        let focusable: HTMLElement = hostElement;
        if (hostElement.tagName.toLowerCase() === 'ng-select') {
            focusable = hostElement.querySelector<HTMLElement>('.ng-select-container') || hostElement;
        }

        const elementPosition = hostElement.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - 300;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
        (document.activeElement as HTMLElement)?.blur();

        Swal.fire({
            icon: "error",
            title: errorMessage,
            confirmButtonText: this.translations()?.validationMsgBtn.label,
        }).then(() => focusable.focus());

        // Ensure focus after popup closes
        Swal.getPopup()?.addEventListener('afterClose', () => {
            focusable.focus({ preventScroll: true });
        });
    }

    getActiveTab(): ApplicationTab | undefined {
        return this.applicationTabs.find(tab => tab.isActive);
    }

    toggleSidebar(): void {
        this.sidebarCollapsed = !this.sidebarCollapsed;
    }

    sendStep() {
        console.log('تم إرسال الطلب');
    }
    private calculateTabVisibility(): void {
        this.applicationTabs.forEach(tab => {
            const fieldsForTab = this.getAllFieldsForTab(tab);
            let hiddenCount = 0;
            const fieldsForSection = this.getAllFieldsForSection(tab);
            for (const key in fieldsForSection) {
                let hiddenSectionFieldCount = 0;
                if (Object.prototype.hasOwnProperty.call(fieldsForSection, key)) {
                    let sectionID: any;
                    fieldsForSection[key].forEach((field: FieldJson) => {
                        sectionID = field.SectionID
                        let isHidden = this.shouldFieldBeHidden(field);
                        if (isHidden && isHidden !== this.fieldVisibilityMap[field.InternalFieldName]) {
                            hiddenSectionFieldCount++;
                        } else {
                            this.fieldVisibilityMap[field.InternalFieldName] = false;
                        }
                        /* if (field.InternalFieldName === 'btnCheckTechnicalApproval') {
                            debugger;
                        } */

                    })
                    this.sectionFieldCount.update((fieldsCount) => {
                        fieldsCount[tab.tabID!][sectionID].hidden = hiddenSectionFieldCount;
                        return { ...fieldsCount };
                    })
                }
            }

            fieldsForTab.forEach(field => {
                let isHidden = this.shouldFieldBeHidden(field);

                /*  if (field.VisibilityActionID > 0) {
                     const section = this.navigationTabs!.find(tab => tab.TabSections.find(section => section.FieldsJson[0].InternalFieldName === field.InternalFieldName))!.TabSections.find(section => section.FieldsJson[0].InternalFieldName === field.InternalFieldName);
                     if (!this.atLeastOneFormControlHasValue(section!.FieldsJson)) {
                         hiddenSection = fieldsForTab.length;
                     }
                 } */

                if (isHidden && isHidden !== this.fieldVisibilityMap[field.InternalFieldName]) {
                    hiddenCount++;
                    this.wizardForm!.get(field.InternalFieldName)!.disable();
                } else {
                    this.fieldVisibilityMap[field.InternalFieldName] = false;
                }

                this.fieldVisibilityMap[field.InternalFieldName] = isHidden;

            })
            if ((this.editApp() && !this.newApplicationService.newRequestData() && this.newApplicationService.requestData()) ||
                this.apiBody.FKServiceID === 5015) {
                this.tabFieldCount.update((tabFieldCount: any) => {
                    tabFieldCount[tab.tabID!] = {
                        total: fieldsForTab.length,
                        hidden: this.calculateVisibilityExtraCondition(this.navigationTabs()!.find(navTab => navTab.NavigationTabID === tab.tabID)!, hiddenCount)
                    };
                    return tabFieldCount
                })
            } else {
                this.tabFieldCount.update((tabFieldCount: any) => {
                    tabFieldCount[tab.tabID!] = {
                        total: fieldsForTab.length,
                        hidden: hiddenCount
                    };
                    return tabFieldCount
                })
            }

        });

        this.updateVisibleTabs();
    }

    private shouldFieldBeHidden(field: FieldJson): boolean {
        if (!field.RelevantInternalName || !field.RelevantVisibleOperator) {
            return false;
        }

        const relevantControl = this.wizardForm!.get(field.RelevantInternalName);
        if (!relevantControl) {
            return false;
        }

        const relevantValue = relevantControl.value;

        const targetValue = field.RelevantVisibleValue;
        const relevantValueIsArray = Array.isArray(relevantValue);
        const numericRelevantValue = Number(relevantValue);
        const numericTargetValue = Number(targetValue);
        if (relevantValueIsArray) {
            switch (field.RelevantVisibleOperator.toLowerCase()) {
                case 'in':
                    // Use loose equality (==) or check types to handle potential string/number mismatches
                    return !relevantValue.includes(numericTargetValue);
                case 'not in':
                    return relevantValue.includes(numericTargetValue);
                case '=':
                    return !relevantValue.includes(numericTargetValue) && relevantValue.length === 1;
                case '!=':
                    return relevantValue.includes(numericTargetValue) && relevantValue.length === 1;
                case '>':
                    return relevantValue.some((value: any) => Number(value) < numericTargetValue);
                case '<':
                    return relevantValue.some((value: any) => Number(value) > numericTargetValue);
                case 'is not null':
                    return !(relevantValue.length > 0);
                default:
                    return false;
            }
        } else {
            switch (field.RelevantVisibleOperator.toLowerCase()) {
                case 'in':
                    return !targetValue!.includes(`${relevantValue!}`);
                case '=':
                    return numericRelevantValue !== numericTargetValue;
                case '!=':
                    return numericRelevantValue === numericTargetValue;
                case '>':
                    return numericRelevantValue <= numericTargetValue;
                case '<':
                    return numericRelevantValue >= numericTargetValue;
                case 'is not null':
                    return !(relevantValue.length);
                default:
                    return false;
            }
        }
    }
    private setupRelevantFieldListeners(): void {
        const relevantFields = new Set<string>();

        // Collect all relevant field names
        this.navigationTabs()!.forEach(tab => {
            tab.TabSections.forEach(section => {
                section.FieldsJson.forEach(field => {
                    if (field.RelevantInternalName && field.RelevantVisibleOperator || field.FieldAddress?.toLowerCase()?.includes('fee')) {
                        relevantFields.add(field.RelevantInternalName || field.InternalFieldName);
                    }
                });
            });
        });

        // Listen to changes on relevant fields
        relevantFields.forEach(fieldName => {
            const control = this.wizardForm!.get(fieldName);
            if (control) {
                control.valueChanges.pipe(
                    takeUntil(this.destroy$)
                ).subscribe(() => {
                    this.calculateTabVisibility();
                });
            }
        });
    }

    scrollTo(id: string, event: Event, section?: any): void {
        event.preventDefault();
        if (!this.activeDropdown.includes(id)) {
            this.disableScrollScan = true;
        }
        // Store the clicked element (the 'a' tag)
        const clickedElement = event.currentTarget as HTMLElement;

        // Optional: Immediately blur the clicked element to remove the 'focus' style
        // This is the fastest way to remove the light-red style.

        const element = document.getElementById(id);
        if (element) {
            this.activeSection = `${id}`;
            const parentTab = this.visibleNavigationTabs()!.find(tab =>
                tab.TabSections.some(sec => sec.SectionID.toString() === id)
            );

            if (parentTab) {
                let activeTabId = parentTab.NavigationTabID;
                this.activeDropdown = [activeTabId.toString()];
            }
            // Get distance from top of document to the element
            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;

            // Adjust by header height (replace 120 with your header height in px)12
            const offsetPosition = elementPosition - 200;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
            // Use a slight delay to allow smooth scroll to complete
            setTimeout(() => {
                if (element) {
                    clickedElement?.blur();
                    element.focus();
                    // Announce the new section for screen readers
                    // This is more advanced, might require a live region or similar,
                    // but simply focusing the heading will often suffice.
                    const heading = element.querySelector('h1, h2, h3, h4, h5, h6');
                    if (heading) {
                        (heading as HTMLElement).focus(); // Focus the heading inside the section
                    } else {
                        (element as HTMLElement).focus(); // Fallback to focusing the section itself
                    }
                }
                this.disableScrollScan = false;
            }, 600); // Adjust delay as needed, slightly longer than your scroll behavior duration
        }
    }

    private disableScrollScan = false
    @HostListener('window:scroll', [])
    onWindowScroll() {
        if (this.disableScrollScan) return
        let sectionIds: any = [];
        this.visibleNavigationTabs()!.forEach((tab) => {
            sectionIds.push(...tab.TabSections.map((section) => section.SectionID));
        })
        for (let id of sectionIds) {
            const el = document.getElementById(`${id}`);
            if (el) {
                const rect = el.getBoundingClientRect();
                if (rect.top <= 490 && rect.bottom >= 490) {
                    this.activeSection = `${id}`;
                    const parentTab = this.visibleNavigationTabs()!.find(tab =>
                        tab.TabSections.some(sec => sec.SectionID === id)
                    );

                    if (parentTab) {
                        let activeTabId = parentTab.NavigationTabID;
                        this.activeDropdown = [activeTabId.toString()];
                    }
                    break;
                }
            }
        }
        // Check if the current scroll position is greater than the sticky offset.
        // When window.scrollY exceeds 150px, the element becomes truly 'stuck' at the top.
        if (window.scrollY > this.STICKY_OFFSET) {
            this.shouldApplyShadow = true;
        } else {
            this.shouldApplyShadow = false;
        }
    }

    scrollActiveAnchorIntoView(activeSectionId: string | null): void {
        if (!activeSectionId) {
            return;
        }

        // The anchor tag has an href attribute of '#{tab.tabID}' (i.e., '#sectionId')
        // We can select the anchor tag directly.
        // It's inside an <li> element. We can also select the <li> or the <a>.
        // Let's select the <a> tag as it's the direct target.

        // Find the anchor link element by its href attribute
        const anchorSelector = `a[href="#${activeSectionId}"]`;
        const activeAnchorEl = document.querySelector(anchorSelector) as HTMLElement;

        if (activeAnchorEl) {
            activeAnchorEl.scrollIntoView({
                // Adjust behavior for a smooth scroll if desired
                behavior: 'smooth',
                // Align to the 'nearest' edge (top or bottom) so it scrolls only if necessary
                block: 'nearest'
            });
        }
    }

    getConfirmButtonName(section: any): string {
        const action = this.actions.find(btn => btn.ActionID === section.FieldsJson[0].VisibilityActionID);
        return this.store.index.locale === 'en' ? (action?.TitleEN || ' ') : (action?.TitleAR || ' ');
    }

    atLeastOneFormControlHasValue(fields: FieldJson[] | FieldJson): boolean {
        let controls: any[] = [];
        if (this.newApplicationService.requestData()) {
            if (Array.isArray(fields)) {
                fields.forEach((field) => {
                    let control = this.newApplicationService.requestData()[field.InternalFieldName]
                    controls.push(control)
                });
            } else {
                let control = this.newApplicationService.requestData()[fields.InternalFieldName]
                if (control) {
                    controls.push(control);
                }
            }
            return controls.some(control => control && control !== null && control !== undefined && control !== '' && control !== -1 && control !== 0);
        } else {
            return true;
        }


    }


    // This method contains the logic you want to apply
    shouldShowSaveDraft(action: any): boolean {
        let tabWithId5 = this.visibleTabs()!.find(tab => tab.tabID === 5);
        let tabId5Index = tabWithId5 ? this.visibleTabs()!.indexOf(tabWithId5) : -1;
        // Check if the action is 'Save Draft'
        if (action.TitleEN !== 'Save Draft') {
            return true; // Return true for other actions that are not 'Save Draft'
        }

        // Check the condition for 'Save Draft'
        // It should not appear if the tab with ID 5 is the first tab (index 0) AND the current tab is also the first one (index 1 is wrong, it should be 0)
        // Let's assume the first tab's index is 0, and currentTabIndex corresponds to a 1-based index (like your original code)
        // Let's also adjust the logic to be more robust.

        tabId5Index = this.visibleTabs()!.findIndex(tab => tab.tabID === 5);

        const isTab5First = tabId5Index === 0;
        const isCurrentTabFirst = this.currentTabIndex() === 1; // Assuming 1-based index from your example

        // Return true if it's NOT the case that (tab 5 is first AND we are on the first tab)
        return !(isTab5First && isCurrentTabFirst);
    }
    tabVisible: any = {};
    calculateVisibilityActionID(currentTab: NavigationTab) {
        this.tabVisible[currentTab.NavigationTabID] = (currentTab.TabSections.length === 1 &&
            currentTab.TabSections[0].FieldsJson[0].VisibilityActionID > 0 &&
            !this.atLeastOneFormControlHasValue(currentTab.TabSections[0].FieldsJson))
        return (currentTab.TabSections.length === 1 &&
            currentTab.TabSections[0].FieldsJson[0].VisibilityActionID > 0 &&
            !this.atLeastOneFormControlHasValue(currentTab.TabSections[0].FieldsJson))
    }

    calculateVisibilityExtraCondition(tab: NavigationTab, hiddenCount: number): any {
        tab.TabSections.forEach((section) => {
            this.isSection[tab.NavigationTabID][section.SectionID] = false;
            section.FieldsJson.forEach((field) => {
                if (this.newApplicationService.requestData()) {
                    if (field.VisibilityExtraCondition) {
                        if (!(field.VisibilityActionID > 0)) {
                            if (field.VisibilityExtraCondition.toLowerCase() === 'is not null' && this.newApplicationService.requestData()[field.InternalFieldName]) {
                                if (field.InternalFieldName.toLowerCase().includes('fees')) {

                                    if (this.newApplicationService.activityFees() > 0) {
                                        if (this.fieldVisibilityMap[field.InternalFieldName] !== false) {
                                            hiddenCount--;
                                        }
                                        this.isSection[tab.NavigationTabID][section.SectionID] = true;
                                        this.fieldVisibilityMap[field.InternalFieldName] = false
                                    } else {
                                        if (this.fieldVisibilityMap[field.InternalFieldName] !== true) {
                                            hiddenCount++;
                                        }
                                        this.fieldVisibilityMap[field.InternalFieldName] = true
                                    }
                                } else {
                                    this.isSection[tab.NavigationTabID][section.SectionID] = true;
                                    if (this.fieldVisibilityMap[field.InternalFieldName] !== false) {
                                        hiddenCount--;
                                    }
                                    this.fieldVisibilityMap[field.InternalFieldName] = false
                                }
                                return;
                            } else if ((field.VisibilityExtraCondition === '> 0' || field.VisibilityExtraCondition === '>0') && (+this.newApplicationService.requestData()[field.InternalFieldName] > 0)) {
                                if (field.InternalFieldName.toLowerCase().includes('fees')) {

                                    if (this.newApplicationService.activityFees() > 0) {
                                        if (this.fieldVisibilityMap[field.InternalFieldName] !== false) {
                                            hiddenCount--;
                                        }
                                        this.isSection[tab.NavigationTabID][section.SectionID] = true;
                                        this.fieldVisibilityMap[field.InternalFieldName] = false
                                    } else {
                                        if (this.fieldVisibilityMap[field.InternalFieldName] !== true) {
                                            hiddenCount++;
                                        }
                                        this.fieldVisibilityMap[field.InternalFieldName] = true
                                    }
                                } else {
                                    this.isSection[tab.NavigationTabID][section.SectionID] = true;
                                    if (this.fieldVisibilityMap[field.InternalFieldName] !== false) {
                                        hiddenCount--;
                                    }
                                    this.fieldVisibilityMap[field.InternalFieldName] = false
                                }
                                return;
                            } else {
                                if (field.InternalFieldName.toLowerCase().includes('fees')) {

                                    if (this.newApplicationService.activityFees() > 0) {
                                        if (this.fieldVisibilityMap[field.InternalFieldName] !== false) {
                                            hiddenCount--;
                                        }
                                        this.isSection[tab.NavigationTabID][section.SectionID] = true;
                                        this.fieldVisibilityMap[field.InternalFieldName] = false
                                    } else {
                                        if (this.fieldVisibilityMap[field.InternalFieldName] !== true) {
                                            hiddenCount++;
                                        }
                                        this.fieldVisibilityMap[field.InternalFieldName] = true
                                    }
                                } else {
                                    if (this.fieldVisibilityMap[field.InternalFieldName] !== true) {
                                        hiddenCount++;
                                    }
                                    this.fieldVisibilityMap[field.InternalFieldName] = true
                                }
                            }

                        } else {
                            if (this.atLeastOneFormControlHasValue(field)) {
                                this.isSection[tab.NavigationTabID][section.SectionID] = true;
                            }
                            if (field.VisibilityExtraCondition.toLowerCase() === 'is not null' && this.newApplicationService.requestData()[field.InternalFieldName]) {
                                if (this.atLeastOneFormControlHasValue(field)) {
                                    this.isSection[tab.NavigationTabID][section.SectionID] = true;
                                    if (this.fieldVisibilityMap[field.InternalFieldName] !== false) {
                                        hiddenCount++;
                                    }
                                    this.fieldVisibilityMap[field.InternalFieldName] = false
                                }
                                return;
                            } else if ((field.VisibilityExtraCondition === '> 0' || field.VisibilityExtraCondition === '>0') && (+this.newApplicationService.requestData()[field.InternalFieldName] > 0)) {
                                if (this.atLeastOneFormControlHasValue(field)) {
                                    this.isSection[tab.NavigationTabID][section.SectionID] = true;
                                    if (this.fieldVisibilityMap[field.InternalFieldName] !== false) {
                                        hiddenCount++;
                                    }
                                    this.fieldVisibilityMap[field.InternalFieldName] = false
                                }
                                return;
                            } else {
                                if (this.atLeastOneFormControlHasValue(field)) {
                                    if (this.fieldVisibilityMap[field.InternalFieldName] !== true) {
                                        hiddenCount--;
                                    }
                                    this.fieldVisibilityMap[field.InternalFieldName] = true
                                }
                            }
                        }
                    } else {
                        this.isSection[tab.NavigationTabID][section.SectionID] = true;
                        return;
                    }
                } else {
                    if (field.VisibilityExtraCondition) {
                        if (!(field.VisibilityActionID > 0)) {
                            if (field.VisibilityExtraCondition.toLowerCase() === 'is not null') {
                                if (field.InternalFieldName.toLowerCase().includes('fees')) {

                                    if (this.newApplicationService.activityFees() > 0) {
                                        if (this.fieldVisibilityMap[field.InternalFieldName] !== false) {
                                            hiddenCount--;
                                        }
                                        this.isSection[tab.NavigationTabID][section.SectionID] = true;
                                        this.fieldVisibilityMap[field.InternalFieldName] = false
                                    } else {
                                        if (this.fieldVisibilityMap[field.InternalFieldName] !== true) {
                                            hiddenCount++;
                                        }
                                        this.fieldVisibilityMap[field.InternalFieldName] = true
                                    }
                                }
                                return;
                            } else if ((field.VisibilityExtraCondition === '> 0' || field.VisibilityExtraCondition === '>0')) {
                                if (field.InternalFieldName.toLowerCase().includes('fees')) {

                                    if (this.newApplicationService.activityFees() > 0) {
                                        if (this.fieldVisibilityMap[field.InternalFieldName] !== false) {
                                            hiddenCount--;
                                        }
                                        this.isSection[tab.NavigationTabID][section.SectionID] = true;
                                        this.fieldVisibilityMap[field.InternalFieldName] = false
                                    } else {
                                        if (this.fieldVisibilityMap[field.InternalFieldName] !== true) {
                                            hiddenCount++;
                                        }
                                        this.fieldVisibilityMap[field.InternalFieldName] = true
                                    }
                                }
                                return;
                            } else {
                                if (field.InternalFieldName.toLowerCase().includes('fees')) {

                                    if (this.newApplicationService.activityFees() > 0) {
                                        if (this.fieldVisibilityMap[field.InternalFieldName] !== false) {
                                            hiddenCount--;
                                        }
                                        this.isSection[tab.NavigationTabID][section.SectionID] = true;
                                        this.fieldVisibilityMap[field.InternalFieldName] = false
                                    } else {
                                        if (this.fieldVisibilityMap[field.InternalFieldName] !== true) {
                                            hiddenCount++;
                                        }
                                        this.fieldVisibilityMap[field.InternalFieldName] = true
                                    }
                                }
                            }

                        } else {
                            if (this.atLeastOneFormControlHasValue(field)) {
                                this.isSection[tab.NavigationTabID][section.SectionID] = true;
                            }
                            if (field.VisibilityExtraCondition.toLowerCase() === 'is not null') {
                                if (this.atLeastOneFormControlHasValue(field)) {
                                    this.isSection[tab.NavigationTabID][section.SectionID] = true;
                                    if (this.fieldVisibilityMap[field.InternalFieldName] !== false) {
                                        hiddenCount++;
                                    }
                                    this.fieldVisibilityMap[field.InternalFieldName] = false
                                }
                                return;
                            } else if ((field.VisibilityExtraCondition === '> 0' || field.VisibilityExtraCondition === '>0')) {
                                if (this.atLeastOneFormControlHasValue(field)) {
                                    this.isSection[tab.NavigationTabID][section.SectionID] = true;
                                    if (this.fieldVisibilityMap[field.InternalFieldName] !== false) {
                                        hiddenCount++;
                                    }
                                    this.fieldVisibilityMap[field.InternalFieldName] = false
                                }
                                return;
                            } else {
                                if (this.atLeastOneFormControlHasValue(field)) {
                                    if (this.fieldVisibilityMap[field.InternalFieldName] !== true) {
                                        hiddenCount--;
                                    }
                                    this.fieldVisibilityMap[field.InternalFieldName] = true
                                }
                            }
                        }
                    } else {
                        this.isSection[tab.NavigationTabID][section.SectionID] = true;
                        return;
                    }
                }
            })
        })
        let isTab = true;
        for (const key in this.isSection[tab.NavigationTabID]) {
            if (this.isSection[tab.NavigationTabID][key] === true) {
                isTab = false
            }
        }


        if (isTab && (tab.TabSections[0].FieldsJson[0].VisibilityActionID === 0 || tab.TabSections[0].FieldsJson[0].VisibilityActionID > 0 && this.atLeastOneFormControlHasValue(tab.TabSections[0].FieldsJson))) {
            let total = this.tabFieldCount()[tab.NavigationTabID].total
            this.tabFieldCount.update(tabFieldCount => {
                tabFieldCount[tab.NavigationTabID] = {
                    total: total,
                    hidden: total
                }
                return { ...tabFieldCount };
            });
            return total
        } else {
            return hiddenCount;
        }
    }
    validateRowsForMissingData(formArray: FormArray, field: FieldJson) {
        let isValid = true;
        Object.keys(formArray.controls).slice(0, -1).forEach((key: any, index: any) => {

            field.TableServiceFields?.forEach((tableField: any) => {
                this.shouldBeRequired(tableField, formArray.at(index).get(tableField.InternalFieldName) as FormControl, index, field)
            })

            const formGroup = formArray.get(key)! as FormGroup;
            Object.keys(formGroup.controls).forEach(key2 => {
                const control = formGroup.get(key2)! as FormGroup;
                if (control.invalid) {
                    this.newApplicationService.rowIndex.set(+key + 1)
                    this.newApplicationService.tableName.set(field.InternalFieldName)
                    isValid = false;
                    let hostElement: HTMLElement | null = null;
                    hostElement = document.querySelector<HTMLElement>(`#${field.InternalFieldName}`);
                    let focusableElement: HTMLElement | null = hostElement;

                    if (focusableElement) {
                        focusableElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    const active = document.activeElement as HTMLElement | null;
                    if (active) active.blur();
                    Swal.fire({
                        icon: 'error',
                        title: this.translations()?.missingRowData.label,
                        showConfirmButton: true,
                        confirmButtonText: this.translations()?.validationMsgBtn.label
                    }).then(() => {
                        if (focusableElement) {
                            focusableElement.focus();
                        }
                    });

                    Swal.getPopup()?.addEventListener('afterClose', () => {
                        if (focusableElement) {
                            focusableElement.focus({ preventScroll: true });
                        }
                    });
                    this.shouldCallApi = true;
                    return;
                }
            })
            if (isValid === false) {
                return;
            }
        })
        return isValid;
    }

    ngOnDestroy(): void {
        if (this.confirmModalSubscription) {
            // Unsubscribe when the component is destroyed to prevent memory leaks
            // and duplicate firing.
            this.confirmModalSubscription.unsubscribe();
        }
        this.wizardForm = null
        this.destroy$.next(); // Emit a value
        this.destroy$.complete(); // Complete the Subject
        this.newApplicationService.requestData.set(null)
        sessionStorage.removeItem(this.currentStorageKey);



    }

    patchDataForNewApplication(payload: {
        "RequestID": string,
        "ActionDBName": string,
        "FKProcessID"?: number,
        "ActivityServiceID"?: number | null
    }, action: Action, processID?: number) {
        this.wizardService.getSpActionRequest(payload).subscribe((res: any) => {
            console.log(res);
            this.newApplicationService.newRequestData.set(res)
            this.newApplicationService.CPResultResponse.set(null)
            this.newApplicationService.CRResultResponse.set(null)
            this.newApplicationService.requestData.set(null);
            this.wizardForm = null;


            let routingPayload: ServiceApiPayload = {
                FKCurrentStatusID: res.FkStatusID,
                FKProcessID: this.defaultProcess || res.FkProcessID,
                FKRoleID: this.store.auth.user.FkRoleID,
                FKServiceID: payload.ActivityServiceID || res.ServiceID,
            }
            Swal.close();
            this.router.navigate(['/Services/NewRequest/spAction'],
                {
                    state: {
                        data: routingPayload,
                        itemURL: `Services/NewRequest?ServiceID=${payload.ActivityServiceID || res.ServiceID}`,
                        pageName: this.pageName,
                        applicationNumber: res.ApplicationNumber,
                        newRequestData: res,
                        defaultProcess: processID,
                        ActionDBName: payload.ActionDBName
                    },
                    queryParams: { ServiceID: payload.ActivityServiceID || res.ServiceID }

                }
            )

        })
    }
    openMenus: { [key: string]: boolean } = {};
    toggleMenu(key: string) {
        this.openMenus = { [key]: !this.openMenus[key] };
    }
    @ViewChildren('menuWrapper') menuWrappers!: QueryList<ElementRef>;
    @HostListener('document:click', ['$event'])
    handleClickOutside(event: Event) {
        const target = event.target as HTMLElement;
        const clickedInside = this.menuWrappers.some(wrapper =>
            wrapper.nativeElement.contains(target)
        );
        if (!clickedInside) {
            // programmatically "close" all menus by clicking their hlMenuButton if open
            this.menuWrappers.forEach(wrapper => {
                const button = wrapper.nativeElement.querySelector('[hlMenuButton]');
                if (button && !button.getAttribute('aria-expanded') === false) {
                    (button as HTMLElement).click();
                }
            });
            this.openMenus = {}
        }
    }
    filteredProcessList(action: Action) {
        let filteredProcessList = this.newApplicationService.processList().filter(
            (item: any) => item.ActionID === action.ActionID && item.FKServiceID === this.apiBody.FKServiceID
        ).map((item: any) => item.FKProcessID);
        const allFields: FieldJson[] = [];
        this.visibleNavigationTabs()!.forEach((tab) => {
            tab.TabSections.forEach((section) => {
                allFields.push(...section.FieldsJson);
            });
        });
        let processField = allFields.find((field) => {
            return field.InternalFieldName === 'FkProcessID'
        })!
        return processField.LookupValues?.filter((lookup: any) => filteredProcessList.includes(lookup.LookupID))
    }
    defaultProcess: any;
    setDefaultProcess(processID: any, item?: any, action?: Action) {
        this.clickedActionTitle.set(this.store.index.locale === 'en' ? item?.TitleEn : item?.TitleAr)

        this.defaultProcess = processID
        /* const newState = { ...history.state , defaultProcess: processID };
        history.replaceState(newState, document.title, window.location.href); */
        this.newApplicationService.defaultProcess.set(processID)
        this.handleAction(action!, item?.HasServiceID, processID)
    }
    scrollToTop() {
        window.scrollTo(0, 0);
    }
    /* shownav() {
        console.log(this.visibleNavigationTabs());
        console.log(this.currentTab());
    } */
    changeTab(index: number, sectionID: any, event: any) {
        event.preventDefault();
        this.currentTabIndex.update(() => { return index })
        setTimeout(() => {
            this.scrollTo(sectionID, event)
        }, 100)
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

    private previousRowsFromApi: any = [];
    patchTableData(field: FieldJson) {
        let data: any;
        if (this.newApplicationService.rowsFromApi()) {
            /* this.rows.set(null); */
            const currentRowsFromApi = this.newApplicationService.rowsFromApi();
            data = structuredClone((Object.values(this.newApplicationService.rowsFromApi()).flat().reduce((prev: any, curr) => prev.concat(curr), []) as any).filter((obj: any) => Object.keys(obj).every(key => obj[key] !== null)));
        }

        if (JSON.stringify(data) === JSON.stringify(this.previousRowsFromApi)) {
            // Data hasn't changed, so we exit the function immediately.
            console.log('API data is the same. Patching skipped.');
            return;
        }
        // Update the cache with the new data before proceeding.
        this.previousRowsFromApi = data;

        if (data) {
            let formArray = this.wizardForm!.get(field.InternalFieldName)! as FormArray;
            let lastIndex = formArray.length;
            if (formArray.length > 0) {
                formArray.clear();
            }
            if (data.length > 0) {
                field.isGDXVal = true;
                data.forEach((singleRow: any) => {
                    this.addTableRow(field);
                    lastIndex = formArray.length;
                    // Patch the new last row with the API data
                    let newRowIndex = formArray.length - 1;
                    formArray.at(newRowIndex).patchValue(singleRow);
                })
                this.addTableRow(field)
            } else {
                this.addTableRow(field)
            }

        }
    }
    addTableRow(field: FieldJson): void {
        const formArray = this.wizardForm!.get(field.InternalFieldName)! as FormArray;
        const newFormGroup = new FormGroup({});

        // Add controls for each table field
        field.TableServiceFields?.forEach(tableField => {
            if (tableField.FieldType === 14) {
                return;
            }
            const validators = [];
            let defaultValue: any = ''
            if ((tableField.FieldType === 6 && tableField.Required) || (tableField.FieldType === 5 && tableField.Required)
                || (tableField.FieldType === 19 && tableField.Required)) {
                validators.push(CustomValidators.noNegativeOne);
            } else if (tableField.Required) {
                validators.push(Validators.required);
            }
            if (tableField.FieldType === 6 || (tableField.FieldType === 5)
                || (tableField.FieldType === 19)) {
                defaultValue = +tableField.FieldDefaultValue || tableField.LookupValues!.find((lv) => lv.LookupID === -1)?.LookupID
            }

            if (tableField.FieldType === 21) {
                validators.push(Validators.email)
            }
            if (tableField.MAX_Length > 0 && (tableField.FieldType === 12 || tableField.FieldType === 15 || tableField.FieldType === 11 || tableField.FieldType === 20)) {
                validators.push(Validators.maxLength(tableField.MAX_Length));
            }
            if ((tableField.FieldType === 12 || tableField.FieldType === 15 || tableField.FieldType === 11 || tableField.FieldType === 20) && (tableField.MIN_Length > 0)) {
                validators.push(CustomValidators.numberMinLength(tableField.MIN_Length))
            }
            const control = new FormControl(defaultValue, validators);
            newFormGroup.addControl(tableField.InternalFieldName, control);
        });
        newFormGroup.addControl('GDXTableFieldIDs', new FormControl({ value: '', disabled: true }));
        formArray.push(newFormGroup);
    }
    transformTableData(field: FieldJson) {
        if (this.newApplicationService.requestData() && this.newApplicationService.requestData().ServiceTables) {
            let data = this.newApplicationService.requestData().ServiceTables.filter((rData: any) => {
                return rData.SourceTableID === field.TableServiceFields![0].SourceTableID
            })
            data = data.map((d: any, index: any) => {
                return { ...d, currentIndex: index + 1 }
            })
            return data;
        } else if (this.newApplicationService.newRequestData() && this.newApplicationService.newRequestData().ServiceTables) {
            let data = this.newApplicationService.newRequestData().ServiceTables.filter((rData: any) => {
                return rData.SourceTableID === field.TableServiceFields![0].SourceTableID
            })
            data = data.map((d: any, index: any) => {
                return { ...d, currentIndex: index + 1 }
            })
            return data;
        }
        return null
    }

    /**
   * Tracks whether the user has scrolled past the sticky point.
   * This value is determined by the `top-[150px]` utility on the sticky element.
   */
    shouldApplyShadow: boolean = false;

    // The sticky offset from your class: top-[150px]
    private readonly STICKY_OFFSET = 150;

    onUserClose(answer: string) {
        this.allApplicationService.closeActivityLog();
        this.allApplicationService.closeRelatedModal();
        this.newApplicationService.closeAuditModal();
        this.openAnalysisModel.set(false)
    }

    getDataFromStorage() {
        const storageKey = this.route.snapshot.queryParamMap.get('stateKey');

        if (storageKey) {
            // 2. Retrieve the data using the key
            const rawData = sessionStorage.getItem(storageKey);

            if (rawData) {
                // 3. Parse the data back into an object
                const stateData = JSON.parse(rawData);

                console.log('Successfully retrieved navigation state:', stateData);
                // Now you can use stateData.data, stateData.RequestID, etc. 12
                if (stateData && stateData.data) {
                    console.log(stateData);
                    history.replaceState(stateData, document.title, window.location.href);
                    // Map the properties from the storage data
                    this.apiBody = stateData.data || this.newApplicationService.serviceApiPayload();
                    this.apiBody.RequestID = stateData.RequestID || history.state.newRequestData?.RequestID || undefined;
                    this.apiBody.SpActionName = stateData.ActionDBName || undefined;
                    this.requestID = stateData.RequestID;
                    this.pageName = stateData.pageName;
                    this.itemURL = stateData.itemURL;
                    this.applicationNumber = stateData.applicationNumber;

                    // Your existing conditional logic follows:
                    if (this.requestID || this.newApplicationService.newRequestData()) {
                        this.editApp.set(true);

                        if (!this.newApplicationService.newRequestData() && !this.requestID) {
                            this.apiBody.FKProcessID = this.apiBody.FKServiceID === 7008 ? null : 40;
                            this.apiBody.FKCurrentStatusID = null;
                            this.editApp.set(false);
                        }

                    } else {
                        this.newApplicationService.activityFees.set(null);
                        this.editApp.set(false);

                        if (!this.newApplicationService.newRequestData()) {
                            this.apiBody.FKProcessID = this.apiBody.FKServiceID === 7008 ? null : 40;
                            this.apiBody.FKCurrentStatusID = null;
                        }
                    }

                    this.newApplicationService.apiBody.set(this.apiBody);

                } else {
                    // If no data was retrieved via storage, use your default application service logic
                    console.log('No data found in storage. Defaulting to new application logic.');

                    // This is the logic that runs if history.state was NOT available (in your original code)
                    // You'd typically load data from a URL parameter, a service, or start a fresh form.
                    this.apiBody = this.newApplicationService.serviceApiPayload(); // or whatever default
                    this.newApplicationService.apiBody.set(this.apiBody);
                }

                // 4. IMPORTANT: Clean up the storage immediately to prevent stale data
                this.currentStorageKey = storageKey;
            } else {
                console.warn(`Navigation key '${storageKey}' found in URL, but no matching data in sessionStorage. (Data was already used or tab was refreshed).`);
            }
        } else {
            console.warn('No navigation state key found in URL.');
            // This case handles a user opening the URL directly without navigation
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
    isFileLoading() {
        if (!this.fileService.fileLoader()) return false;
        let isLoading = false;
        for (const key in this.fileService.fileLoader()) {
            if (!Object.hasOwn(this.fileService.fileLoader(), key)) continue;
            if (this.fileService.fileLoader()[key] === true) {
                isLoading = true;
                break;
            }
        }
        return isLoading
    }

    shouldBeRequired(field: FieldJson | TableServiceField, targetControl: FormControl, index: number, mainField?: FieldJson) {
        if (!field.RelevantInternalName || !field.RelevantRequiredOperator) {
            return;
        }
        if (!("ServiceTableFieldID" in field)) {
            if (this.newApplicationService.actionDetailsIDs() && this.newApplicationService.ServiceFieldsByActionsApiResponse()?.items[this.newApplicationService.actionDetailsIDs()]) {

                let fieldToCheck = this.newApplicationService.ServiceFieldsByActionsApiResponse().items[this.newApplicationService.actionDetailsIDs()].find((fieldReq: any) => fieldReq.ServiceFieldID === field.ServiceFieldID);
                let shouldBeRequired = false;
                const relevantControl = this.wizardForm!.get(field.RelevantInternalName);
                if (!relevantControl) {
                    console.log(this.wizardForm!.value);
                    console.warn(`Relevant control '${field.RelevantInternalName}' not found in form.`);
                    return;
                }

                const relevantValue = relevantControl.value;
                const targetValue = field.RelevantRequiredValue; // This might be a string
                const relevantValueIsArray = Array.isArray(relevantControl.value);
                const numericRelevantValue = Number(relevantValue);
                const numericTargetValue = Number(targetValue);
                if (fieldToCheck && fieldToCheck.FieldRequired === true) {
                    if (field.RelevantRequiredOperator) {
                        if (relevantValueIsArray) {
                            switch (field.RelevantRequiredOperator.toLocaleLowerCase()) {
                                case 'in':
                                    // Use loose equality (==) or check types to handle potential string/number mismatches
                                    shouldBeRequired = relevantValue.includes(numericTargetValue);
                                    break;
                                case 'not in':
                                    shouldBeRequired = !relevantValue.includes(numericTargetValue);
                                    break;
                                case '=':
                                    shouldBeRequired = relevantValue.includes(numericTargetValue) && relevantValue.length === 1;
                                    break;
                                case '!=':
                                    shouldBeRequired = !(relevantValue.includes(numericTargetValue) && relevantValue.length === 1);
                                    break;
                                case '>':
                                    shouldBeRequired = relevantValue.some((value: any) => Number(value) > numericTargetValue);
                                    break;
                                case '<':
                                    shouldBeRequired = relevantValue.some((value: any) => Number(value) < numericTargetValue);
                                    break;
                                case 'is not null':
                                    shouldBeRequired = (relevantValue.length > 0);
                                    break;
                                default:
                                    shouldBeRequired = false;
                                    break;
                            }
                        } else {
                            // Handle number conversion for comparison
                            switch (field.RelevantRequiredOperator.toLocaleLowerCase()) {
                                case 'in':
                                    shouldBeRequired = !targetValue!.includes(`${relevantValue!}`);
                                    break;
                                case '=':
                                    // Use loose equality (==) or check types to handle potential string/number mismatches
                                    shouldBeRequired = relevantValue == targetValue;
                                    break;
                                case '!=':
                                    shouldBeRequired = relevantValue != targetValue;
                                    break;
                                case '>':
                                    shouldBeRequired = numericRelevantValue > numericTargetValue;
                                    break;
                                case '<':
                                    shouldBeRequired = numericRelevantValue < numericTargetValue;
                                    break;
                                case 'is not null':
                                    shouldBeRequired = !!(relevantValue);
                                    break;
                                default:
                                    shouldBeRequired = false;
                                    break;
                            }
                        }
                    }
                }
                if (shouldBeRequired) {
                    let validators: ValidatorFn[] = [];
                    // --- Run the logic on initialization ---
                    if (field.MAX_Length > 0 && (field.FieldType === 12 || field.FieldType === 15 || field.FieldType === 11 || field.FieldType === 20)) {
                        validators.push(Validators.maxLength(field.MAX_Length));
                    }
                    if (field.FieldType === 21) {
                        validators.push(Validators.email);
                    }
                    if ((field.FieldType === 12 || field.FieldType === 15 || field.FieldType === 11 || field.FieldType === 20) && (field.MIN_Length > 0)) {
                        validators.push(CustomValidators.numberMinLength(field.MIN_Length))
                    }

                    if (!field.FieldDim && (field.FieldType === 6 || field.FieldType === 5)) {
                        validators.push(CustomValidators.noNegativeOne);
                    } else {
                        validators.push(Validators.required);
                    }
                    targetControl.setValidators(validators);
                    targetControl.updateValueAndValidity()

                } else {
                    targetControl.clearValidators()
                    targetControl.updateValueAndValidity()

                }
            }
        } else {
            if (field.Required) {
                let shouldBeRequired = false;
                const relevantControl = (this.wizardForm!.get(mainField!.InternalFieldName)! as FormArray).at(index).get(field.RelevantInternalName);
                if (!relevantControl) {
                    console.warn(`Relevant control '${field.RelevantInternalName}' not found in form.`);
                    return;
                }

                const relevantValue = relevantControl.value;
                const targetValue = field.RelevantRequiredValue; // This might be a string
                const relevantValueIsArray = Array.isArray(relevantControl.value);
                const numericRelevantValue = Number(relevantValue);
                const numericTargetValue = Number(targetValue);

                if (field.RelevantRequiredOperator) {
                    if (relevantValueIsArray) {
                        switch (field.RelevantRequiredOperator.toLocaleLowerCase()) {
                            case 'in':
                                // Use loose equality (==) or check types to handle potential string/number mismatches
                                shouldBeRequired = relevantValue.includes(numericTargetValue);
                                break;
                            case 'not in':
                                shouldBeRequired = !relevantValue.includes(numericTargetValue);
                                break;
                            case '=':
                                shouldBeRequired = relevantValue.includes(numericTargetValue) && relevantValue.length === 1;
                                break;
                            case '!=':
                                shouldBeRequired = !relevantValue.includes(numericTargetValue) && relevantValue.length === 1;
                                break
                            case '>':
                                shouldBeRequired = relevantValue.some((value: any) => Number(value) > numericTargetValue);
                                break;
                            case '<':
                                shouldBeRequired = relevantValue.some((value: any) => Number(value) < numericTargetValue);
                                break;
                            case 'is not null':
                                shouldBeRequired = (relevantValue.length > 0);
                                break;
                            default:
                                shouldBeRequired = false;
                                break;
                        }
                    } else {
                        // Handle number conversion for comparison
                        switch (field.RelevantRequiredOperator.toLocaleLowerCase()) {
                            case '=':
                                // Use loose equality (==) or check types to handle potential string/number mismatches
                                shouldBeRequired = relevantValue == targetValue;
                                break;
                            case '!=':
                                shouldBeRequired = relevantValue != targetValue;
                                break;
                            case '>':
                                shouldBeRequired = numericRelevantValue > numericTargetValue;
                                break;
                            case '<':
                                shouldBeRequired = numericRelevantValue < numericTargetValue;
                                break;
                            case 'is not null':
                                shouldBeRequired = !!(relevantValue);
                                break;
                            default:
                                shouldBeRequired = false;
                                break;
                        }
                    }
                }

                if (shouldBeRequired) {
                    let validators: ValidatorFn[] = [];
                    // --- Run the logic on initialization ---
                    if (field.MAX_Length > 0 && (field.FieldType === 12 || field.FieldType === 15 || field.FieldType === 11 || field.FieldType === 20)) {
                        validators.push(Validators.maxLength(field.MAX_Length));
                    }
                    if (field.FieldType === 21) {
                        validators.push(Validators.email);
                    }
                    if ((field.FieldType === 12 || field.FieldType === 15 || field.FieldType === 11 || field.FieldType === 20) && (field.MIN_Length > 0)) {
                        validators.push(CustomValidators.numberMinLength(field.MIN_Length))
                    }

                    if ((field.FieldType === 6 || field.FieldType === 5)) {
                        validators.push(CustomValidators.noNegativeOne);
                    } else {
                        validators.push(Validators.required);
                    }
                    targetControl.setValidators(validators);
                    targetControl.updateValueAndValidity()

                } else {
                    targetControl.clearValidators()
                    targetControl.updateValueAndValidity()

                }
            }
        }
    }

    changedFields: any = [];
    onFieldChanged(event: any) {
        let fieldIDs: any = [];
        Object.keys(event).forEach((key: any, index: any) => {
            event[key].aiPriorities.forEach((element: any) => {
                let data = this.newApplicationService.uiResponseAllFields()?.find((field) => {
                    return field.AIExtractDataPriority === element
                })
                if (data) {
                    fieldIDs.push(this.store.index.locale === 'en' ? data.TitleEn : data.TitleAr);
                }
            })
            event[key].fieldIDs = fieldIDs;
        })
        this.changedFields.push(event);
    }

    uploadComplete(event: any) {
        console.log(this.changedFields)
        console.log(this.newApplicationService.uiResponseAllFields())
        if (this.changedFields.length > 0) {
            let msg = this.translations()?.aiNoMatchErrMsg.label
            msg = msg.replace('[Files]', this.changedFields[0][Object.keys(this.changedFields[0])[0]].fieldIDs.join(' و '));
            let keys = this.changedFields.map((item: any) => {
                return Object.keys(item).find((key: any) => {
                    return key !== 'fieldIDs'
                })
            });
            msg = msg.replace('[Fields]', keys.join('<br>'));
            Swal.fire({
                icon: 'info',
                title: msg,
                showConfirmButton: true,
                confirmButtonText: this.translations()?.validationMsgBtn.label,
            }).then(() => {
                this.changedFields = [];
            })
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
        const finalDisplay = [...ungroupedActions, ...finalActionGroups];

        // Sort the combined list by the ActionSortOrder property
        finalDisplay.sort((a, b) => a.ActionSortOrder - b.ActionSortOrder);

        return finalDisplay;
    }

    findMenuByUrl(menu: any[], url: string): any | null {
        for (const item of menu) {
            // Check current level
            if (item.ItemURL === url) {
                return item;
            }

            // If it has children → search recursively
            if (item.children && item.children.length > 0) {
                const found = this.findMenuByUrl(item.children, url);
                if (found) return found;
            }
        }

        return null; // Not found
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
            sessionStorage.removeItem(storageKey);
        })
    }

    showBusinessError(businessRuleFun: any, data: any, fields: FieldJson[]) {
        const isEn = this.store.index.locale === 'en';
        const field = data.field;
        this.apiLoading = false;

        let baseMessage: any
        if (businessRuleFun.includes('GetRequestDataFor') || businessRuleFun.includes('Check_ServiceOwner')) {
            baseMessage = isEn
                ? data.business[0].ErrorMessageEn
                : data.business[0].ErrorMessageAR
        } else {
            baseMessage = isEn
                ? field.BusinessRuleMessageEN
                : field.BusinessRuleMessageAR;
        }

        let title = baseMessage;
        let buttonHtml: HTMLElement | string = '';
        // If extra message exists → replace the placeholder
        if (data.business[0].ExtraMessage && data.business[0]) {
            buttonHtml = `<button class="text-primary underline cursor-pointer font-bold text-xl" id="appNum" dir="ltr">${data.business[0].ExtraMessage}</button>`;

            title = baseMessage?.replace('[ApplicationNumber]', '');
        }
        if (!Swal.isVisible()) {
            let focusField = fields.find((field) => field.BusinessRuleFun === businessRuleFun)
            if (focusField) {
                let hostElement: HTMLElement | null = null;
                const active = document.activeElement as HTMLElement | null;
                hostElement = document.querySelector<HTMLElement>(`#${focusField.InternalFieldName}`);
                let focusableElement: HTMLElement | null = hostElement;
                if (hostElement?.tagName.toLowerCase() === 'ng-select') {
                    const containerDiv = hostElement.querySelector<HTMLElement>('.ng-select-container');
                    if (containerDiv) {
                        focusableElement = containerDiv;
                    }
                }
                if (active) active.blur();
                if (focusableElement) {
                    focusableElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }

        if (!Swal.isVisible()) {
            Swal.fire({
                icon: 'error',
                title,
                html: buttonHtml,
                showConfirmButton: true,
                confirmButtonText: this.translations()?.swalConfirmationBtn.label,
                didOpen: () => {
                    const id = data.business[0]?.RequestID;
                    if (id) {
                        document.getElementById('appNum')?.addEventListener('click', () => {
                            this.handleSpanClick(id);
                        });
                    }
                }
            });
        }
    }
    setupRelevantLookupFilter(lookups: LookupValue[], allFields: FieldJson[], field: FieldJson | TableServiceField, tableFieldJson?: FieldJson) {
        if (!lookups || lookups.length === 0) return;
        let relevantLookup = lookups.find(lookup => {
            return lookup.RelevantLookupInternalFieldName && lookup.RelevantLookupId
        })
        if (relevantLookup) {
            /* let relevantMap = new Map();
            lookups.forEach(lookup => {
                if (lookup.RelevantLookupInternalFieldName && lookup.RelevantLookupId) {
                    lookup.RelevantLookupId.split(',').forEach(id => {
                        relevantMap.set(id, lookup.RelevantLookupId)
                    });

                }
            }) */
            this.wizardForm!.get(relevantLookup.RelevantLookupInternalFieldName!)?.valueChanges.subscribe(value => {


                lookups = lookups!.map(lookup => {
                    lookup.isFiltered = !lookup.RelevantLookupId?.includes(`${value}`) && lookup.LookupID !== -1
                    return lookup;
                })



            })
        }
    }

    onFileLoading(event: any) {
        if (event) {
            this.apiLoading = true;
        } else {
            this.apiLoading = false;
        }
    }
    findByServiceId(tree: any[], serviceId: any): any | null {
        // ensure serviceId is a number
        const targetId = Number(serviceId);

        for (const item of tree) {
            if (Number(item.ServiceID) === targetId) {
                return item;
            }

            if (item.children?.length) {
                const found = this.findByServiceId(item.children, targetId);
                if (found) return found;
            }
        }

        return null;
    }
    findByServices(tree: any[], serviceId: any): any | null {
        // ensure serviceId is a number
        const targetId = Number(serviceId);

        for (const item of tree) {
            if (item.Services.includes(targetId)) {
                return item;
            }

            if (item.children?.length) {
                const found = this.findByServices(item.children, targetId);
                if (found) return found;
            }
        }

        return null;
    }
    openAnalysisModel = signal(false);
    openRequestAnalysis() {
        this.showCustomLoader();
        this.fileService.readRequestAnalysis(this.apiBody!).subscribe((res: any) => {
            Swal.close();
            this.fileService.fileAnalysisData.set({ ...this.fileService.fileAnalysisData(), 'request': res })
            this.openAnalysisModel.set(true)
        })
    }
    activeDropdown: string[] = [''];
    toggleAccordion(name: string, parent?: string) {
        if (this.activeDropdown.includes(name)) {
            this.activeDropdown = this.activeDropdown.filter((d) => d !== name);
        } else {
            this.activeDropdown = [name];
        }
    }
    allSections = computed(() => this.visibleNavigationTabs()?.flatMap(tab => tab.TabSections));
    getAllSections(id: any) {
        let allSections: any = []
        allSections = this.allSections()?.filter(section => section.FKNavigationTabID === id && section.FieldsJson[0].VisibilityActionID === 0);
        return allSections || [];
    }

    phasesWithTabs = signal<any>({});
    phaseIDs = signal<any[]>([]);
    transformTabs(tabs: NavigationTab[], phases: any[]) {
        const allFields: FieldJson[] = this.extractFields(this.navigationTabs());
        let processField = allFields.find((field) => {
            return field.InternalFieldName === 'FkProcessID'
        })!
        let phaseIDs: any = [];
        let phasesWithTabs: any = {}
        phases.forEach(phase => {
            let phaseObj = processField.LookupValues?.find((lookup: any) => lookup.LookupID === phase);
            if (phaseObj) {
                phaseIDs.push(phaseObj)
            }
        })
        phases.forEach(phase => {
            phasesWithTabs[phase] = tabs.filter(tab => tab.StepID === phase)
        })
        this.phasesWithTabs.set(phasesWithTabs);
        this.phaseIDs.set(phaseIDs.sort((a: any, b: any) => a - b));
        this.currentPhaseIndex.set(phases[phases.length - 1]);
        this.applicationTabs = phasesWithTabs[this.currentPhaseIndex()].map((tab: any, index: number) => {
            return {
                id: tab.TabOrder,
                title: this.store.index.locale == 'en' ? tab.TitleEn : tab.TitleAr,
                content: '',
                icon: this.setIcon(tab.TitleEn),
                tabSections: tab.TabSections,
                isActive: index === 0,
                isCompleted: false,
                isAccessible: false,
                tabID: tab.NavigationTabID,
                aiTabOrder: tab.AITabOrder
            }
        })
        this.updateVisibleTabs();
    }
    changePhase(id: any) {
        this.currentPhaseIndex.set(id)
        this.applicationTabs = this.phasesWithTabs()[this.currentPhaseIndex()].map((tab: any, index: number) => {
            return {
                id: tab.TabOrder,
                title: this.store.index.locale == 'en' ? tab.TitleEn : tab.TitleAr,
                content: '',
                icon: this.setIcon(tab.TitleEn),
                tabSections: tab.TabSections,
                isActive: index === 0,
                isCompleted: false,
                isAccessible: index === 0,
                tabID: tab.NavigationTabID,
                aiTabOrder: tab.AITabOrder
            }
        })
        this.updateVisibleTabs();
    }
}
