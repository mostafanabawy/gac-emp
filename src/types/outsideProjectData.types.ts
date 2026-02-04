/**
 * Interface definition for the commercial permit data structure.
 */
export interface CommercialPermit {
    commercialRegistration: {
        ID: string;
        branchNumber: string;
    };
    establishmentCommercialName: {
        nameArabic: string;
        nameEnglish: string;
    }; 
    issueDate: string;
    expiryDate: string;
    municipalityName: {
        nameArabic: string;
        nameEnglish: string;
    };
    location: {
        buildingNumber: string;
        street: {
            number: string;
            name: {
                nameArabic: string;
                nameEnglish: string;
            };
        };
        zone: {
            number: string;
            name: {
                nameArabic: string;
                nameEnglish: string;
            };
        };
    };
    commercialPermitID: string;
    licenseeQID: string;
    licenseeName: string;
    licenseeNationality: string;
    managerQID: string;
    managerName: string;
    managerNationality: string;
    companyActivity: string;
    buildingOwner: string;
    licenseType: string;
    commercialPermitStatus: string;
}

export interface CPResultResponse {
    commercialPermit: CommercialPermit;
}


/**
 * --- INTERFACES FOR COMMERCIAL REGISTRATION (CR) DATA ---
 */
export interface Activity {
    title: string;
    activitySerial: string;
    cost: string;
}

export interface Partner {
    nameAr: string;
    nationality: string;
    nIN: string;
    nINType: {
        description: string,
        code: string
    }
    percentage?: string;
    partnerType: {
        description: string;
    };
    partnerStatus?: {
        description: string;
    };
}

export interface CRResult {
    activities: Activity[];
    humanPartners: Partner[];
    signatories: Partner[];
    location: string;
    creationDate: string;
    expiryDate: string;
    arabicCommercialName: string;
    englishCommercialName: string;
    companyStartDate: string;
    branchesCount: string;
    commercialRegistrationEntityType: string;
    addressPOBox: string;
    addressStreet: string;
    addressArea: string;
    companyStatus: string;
    companyCapital: string;
    commercialRegistrationCode: string;
}

export interface CRResultResponse {
    result: CRResult;
}