// TypeScript export type definitions for the current response

export type LookupValue = {
    LookupID: number;
    TitleEn: string;
    TitleAr: string;
    ISOTitleAr?: string;
    ISOTitleEn?: string;
    ISOLookupID?: string;
    DimIfNotAutoReturned?: boolean;
    isFiltered?: boolean;
    HasServiceID?: boolean;
    RelevantLookupInternalFieldName?: string;
    RelevantLookupId?: string;
    ValueCategoryEn?: string;
    disabled?: boolean;
    ValueCategoryAr?: string;
    TechnicalApprovalFile?: string | null;
};

export type AttachmentField = {
    ServiceTableFieldID: number;
    FKServiceID: number;
    ValidationMsgAr: string;
    ValidationMsgEn: string;
    IsActive: boolean;
    TitleAr: string;
    TitleEn: string;
    FieldType: number;
    ValidationOrder: number;
    IsSystemField: boolean;
    InternalFieldName: string;
    SourceTableID: number;
    OrderID: number;
    RowID: number;
    RelevantInternalName: string;
    RelevantVisibleValue: string;
    RelevantVisibleOperator: string;
    RelevantServiceFieldID: number;
    MAX_Length?: number;
    ValidMsgArAllowedFile?: string;
    ValidMsgEnAllowedFile?: string;
    ValidMsgArMaxSize?: string;
    ValidMsgEnMaxSize?: string;
    ColumnID: number;
    Required: boolean;
};


export type Attachments = {
    ID: number;
    TitleAr: string;
    TitleEn: string;
    Notes: string;
    Active: boolean;
    HasModel: boolean;
    ModelURL?: string;
    FKServiceID: number;
    AIHelpAr: string;
    AIHelpEn: string;
    MaxAttachmentSizeKB: number;
    AllowedFileTypes: string;
    AddMoreThanOne: boolean;
    REQ: {
        ID: number;
        FkAttachmetID: number;
        FKServiceID: number;
        FKProcessID: number;
        IsRequired: boolean;
        FKReqID: number;
        DepartmentId: number;
        SectionsID: number;
    }[];
};
export type TableServiceField = {
    ServiceTableFieldID: number;
    FKServiceID: number;
    ValidationMsgAr: string;
    ValidationMsgEn: string;
    IsActive: boolean;
    AiHelpTextAr: string;
    ExtraValidationOperator?: string;
    ExtraValidationValue?: string;
    RelatedAIInternalFieldName: string;
    AiMappingName: string;
    TitleAr: string;
    TitleEn: string;
    HasModel: boolean;
    ModelURL?: string;
    AllowDuplicateValues?: boolean;
    MAX_Length: number;
    MIN_Length: number;
    FieldType: number;
    ValidationOrder: number;
    FieldAddress: string;
    FieldDefaultValue: string;
    IsSystemField: boolean;
    InternalFieldName: string;
    SourceTableID: number;
    RelevantInternalName: string;
    RelevantVisibleOperator: string;
    RelevantVisibleValue: string;
    RelevantRequiredOperator: string;
    RelevantRequiredValue: string;
    OrderID: number;
    AIExtractDataPriority?: number;
    hasDataFromAiPriority?: number;
    GDXDim: boolean;
    RowID: number;
    LookupValues?: LookupValue[]
    ColumnID: number;
    Required: boolean;
    MaxAttachmentSizeKB?: number;
    AllowedFileTypes?: string;
    ValidMsgArAllowedFile?: string;
    ValidMsgEnAllowedFile?: string;
    ValidMsgArMaxSize?: string;
    ValidMsgEnMaxSize?: string;
};
export type FieldJson = {
    ID: number;
    SectionID: number;
    ServiceFieldID: number;
    ApiFieldAddress: string;
    hasHistory: boolean;
    historyData?: any;
    EqualValue?: string;
    UploadFileIfAIDataMismatch?: boolean;
    MIN_Length: number;
    AIExtractDataPriority?: number;
    hasDataFromAiPriority?: number;
    isGDXVal?: boolean;
    GDXDim: boolean;
    BusinessRuleColmns?: string;
    BusinessRuleFun?: string;
    BusinessRuleMessageAR?: string;
    BusinessRuleMessageEN?: string;
    SuperMsgWithFeesAr?: string;
    SuperMsgWithFeesEn?: string;
    DimExtraCondition?: string;
    FetchDataFun?: string;
    AiMappingName: string;
    HasModel: boolean;
    ModelURL?: string;
    RelatedAIFKAttachmentTypeID: number;
    RelatedAIInternalFieldName: string;
    CorrectionDim: boolean;
    AttachmentsFields?: AttachmentField[];
    TableServiceFields?: TableServiceField[];
    Attachments?: Attachments[];
    ExtraValidationOperator: string;
    ExtraValidationValue: string;
    ExtraValidationMsgAr: string;
    ExtraValidationMsgEn: string;
    OrderID: number;
    RowID: number;
    ColumnID: number;
    LastUpdateDate: string;
    FKServiceID: number;
    ValidationMsgAr: string;
    ValidationMsgEn: string;
    TitleAr: string;
    TitleEn: string;
    FieldType: number;
    MAX_Length: number;
    ValidationOrder: number;
    FieldAddress: string;
    FieldSource: string;
    IsSystemField: boolean;
    InternalFieldName: string;
    AiHelpTextAr: string;
    AiHelpTextEn: string;
    DescriptionEn: string;
    DescriptionAr: string;
    RelevantInternalName: string;
    RelevantVisibleValue: string;
    RelevantVisibleOperator: string;
    RelevantRequiredOperator: string;
    RelevantRequiredValue: string;
    RelevantServiceFieldID: number;
    StepID?: number;
    FieldDefaultValue: number;
    ClickVisibleTab: number;
    VisibilityMatrixRowId: number;
    FieldVisible: boolean;
    FieldDim: boolean;
    VisibilityActionID: number;
    SourceTableID: number;
    VisibilityExtraCondition: string;
    DefaultValue: string;
    FieldDefaultRequired: boolean;
    LookupValues?: LookupValue[];
    MaxAttachmentSizeKB?: number;
    AllowedFileTypes?: string;
    ValidMsgArAllowedFile?: string;
    ValidMsgEnAllowedFile?: string;
    ValidMsgArMaxSize?: string;
    ValidMsgEnMaxSize?: string;
};

export type TabSection = {
    TitleAr: string;
    TitleEn: string;
    SectionID: number;
    SectionOrder: number;
    FKServiceID: number;
    IsActive: boolean;
    LastUpdateDate: string;
    FKNavigationTabID: number;
    FieldsJson: FieldJson[];
};

export type NavigationTab = {
    NavigationTabID: number;
    TitleAr: string;
    TitleEn: string;
    TabOrder: number;
    StepID?: number;
    AITabOrder: number;
    Icon: string | null;
    FKServiceID: number;
    IsActive: boolean;
    LastUpdateDate: string;
    TabSections: TabSection[];
};

export type Action = {
    ActionDetailsID: number;
    ActionID: number;
    ExtraConditions: string | null;
    Action: string;
    TitleAR: string;
    TitleEN: string;
    PostSecondActionDetailsID?: number;
    UIExtraConditions?: string;
    isDropdown?: boolean;
    ShowConditionId?: number | null;
    IsInMoreActions?: boolean;
    visible?: boolean;
    ActionStyle?: number | null;
    ActionDBName?: string | null;
    PreviousFieldValueChange?: string | null;
    SpecialAction?: boolean | null;
    ClickConditionId: number | null;
    groupID?: number;
    groupTitleAR?: string;
    groupTitleEN?: string
    SuperMsgAr?: string;
    SuperMsgEn?: string;
    BusinessRuleColmns?: string;
    BusinessRuleFun?: string;
    BusinessRuleMessageAR?: string;
    BusinessRuleMessageEN?: string;
    SuperMsgWithFeesAr?: string;
    SuperMsgWithFeesEn?: string;
    HasConfirmMsg?: boolean;
    FkLookupID?: number;
    LookupIDFieldInternalName?: string;
    ActionSortOrder: number;
};

export type ResponseBody = {
    result: {
        result: string;
        details: string;
    };
    NavigationTabs: NavigationTab[];
    Actions: Action[];
};



/* validation types------------------------------------- */

// TypeScript types for the response structure

export type ActionDetail = {
    ActionDetailsID: number;
    ServiceFieldID: number;
    FieldRequired: boolean;
    FieldUpdate: boolean;
    PreviousFieldValueChange?: string;
};

export type Items = {
    [key: string]: ActionDetail[];
};


export type GetServiceFieldsByActionsApiResponse = {
    result: {
        result: string;
        details: string;
    };
    items: Items;
};

export interface ServiceApiPayload {
    FKServiceID: number;
    FKProcessID: number | null;
    FKCurrentStatusID: number | null;
    FKRoleID: number;
    RequestID?: string;
    SpActionName?: string;
}

export interface ActionGroup {
    groupID: number | null;
    groupTitleAR: string | null;
    groupTitleEN: string | null;
    isDropdown: boolean;
    ActionSortOrder: number;
    actions: any[]; // Use a proper interface for your action items instead of 'any'
}
