import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApplicationDetailService {
  applicationDetail = signal<any>({})
  readyTestData = signal<any>({
    mainSportActivity: 'zzz',
    theGroup: 'zzz',
    theAgeGroup: 'zzz',
    activities: {
      football: false,
      basketball: true,
      handball: false,
      trackAndField: false,
    },
    sportActivityDescription: '...نص الوصف من الفقرة الخاصة بتوصيف الخدمات الرياضية المقترحة...',
    applicantName: 'عبدالعزيز عبدالله عبدالرحمن المري',
    applicantIdentityTypeProof: 'بطاقة شخصية قطرية',
    applicantNumber: '29181804776',
    applicantPhoneNumber: '+974 5555 1235',
    managerName: 'عبدالله خالد عبدالله المري',
    managerIdentityTypeProof: 'بطاقة شخصية قطرية',
    managerNumber: '28976543211',
    managerPhoneNumber: '+974 5555 1235',
    managerEmail: 'abdullah.almari@example.com',

    businessRegistrationNumber: '5678912346',
    businessLabel: 'الريان SC',
    companyNameAr: 'شركة الريان الرياضية ذ.م.م',
    companyNameEn: 'Al Rayyan Sports Company',
    licenseNumber: 'QSC-2025-00124',
    branchName1: 'فرع الريان',
    branchName2: 'فرع الريان',
    quartersType: 'zzz',
    ownershipStatus: 'zzz',
    geographicalArea: 'الريان',
    locality: 'بلدية الريان',
    propertyNumber: '14',
    apartmentNumber: '4',
    totalArea: 'zzz',
    streetName: 'شارع الريان',
    areaNumber: 'zzz',

    commercialActivityGeneralDescription1: '<p>test1</p>',
    commercialActivityGeneralDescription2: '<p>test2</p>',
    monthsNumber: '6',
    procedures: '<p>test3</p>',
    medicalCheckUp: {
      specialTraining: false,
      medicalBagProvided: true,
      examinedByDoctor: false
    }
  })
  cardData = signal<any>({})
  constructor() { }
  setApplicationDetail(data: any) {
    this.applicationDetail.set(data)
  }
  getApplicationDetail() {
    return this.applicationDetail()
  }
}
