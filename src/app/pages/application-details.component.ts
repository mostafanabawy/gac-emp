import { Component, HostListener, signal } from '@angular/core';
import { ApplicationDetailService } from '../service/application-detail.service';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-application-details',
  templateUrl: './application-details.component.html',
})
export class ApplicationDetailsComponent {

  modules2 = {
    toolbar: [[{ header: [1, 2, false] }], ['bold', 'italic', 'underline', 'link'], [{ list: 'ordered' }, { list: 'bullet' }], ['clean']],
  };
  activeSection: string = '';
  sidebarCollapsed: boolean = false;
  isMobileScreen = false;
  cardData = signal<{
    isStatus: string,
    date: string,
    applicationType: string,
    stats: {
      'النوع'?: string,
      'رقم الطلب'?: string,
      'رقم الرخصة'?: string
    },
    actions: {
      names: string[],
      icons: string[]
    }
  } | null>(null);
  applicationDataToBeRendered = signal<any>(null);
  applicationEditForm!: FormGroup;
  constructor(
    private applicationDetails: ApplicationDetailService,
    private fb: FormBuilder
  ) {
    this.initForm();
  }
  ngOnInit() {
    this.checkScreenSize();
    if (this.applicationDetails.getApplicationDetail()) {
      this.applicationDataToBeRendered.set(this.applicationDetails.getApplicationDetail());
      this.cardData.set(this.applicationDetails.cardData());
      this.applicationEditForm.patchValue(this.applicationDataToBeRendered());

    }
  }
  initForm() {
    this.applicationEditForm = this.fb.group({
      cvManager: [[]],
      EngineeringSurveyDrawing: [[]],
      academicQualificationsTrainingCertificates: [[]],
      equipmentList: [[]],
      mainSportActivity: [''],
      theGroup: [''],
      theAgeGroup: [''],
      sportActivityDescription: [''],
      applicantName: [''],
      applicantIdentityTypeProof: [''],
      applicantNumber: [''],
      applicantPhoneNumber: [''],
      managerName: [''],
      managerIdentityTypeProof: [''],
      managerNumber: [''],
      managerPhoneNumber: [''],
      managerEmail: [''],
      branchName1: [''],
      businessRegistrationNumber: [''],
      businessLabel: [''],
      companyNameAr: [''],
      companyNameEn: [''],
      licenseNumber: [''],
      branchName2: [''],
      quartersType: [''],
      ownershipStatus: [''],
      geographicalArea: [''],
      locality: [''],
      propertyNumber: [''],
      apartmentNumber: [''],
      totalArea: [''],
      streetName: [''],
      areaNumber: [''],
      commercialActivityGeneralDescription1: [''],
      commercialActivityGeneralDescription2: [''],
      activities: this.fb.group({
        football: [false],
        basketball: [false],
        handball: [false],
        trackAndField: [false]
      }),
      medicalCheckUp: this.fb.group({
        specialTraining: [false],
        medicalBagProvided: [false],
        examinedByDoctor: [false]
      }),
      monthsNumber: [''],
      procedures: ['']
    });
  }
  onEdit() {
    console.log(this.applicationEditForm.value);
  }
  checkScreenSize() {
    this.isMobileScreen = window.innerWidth < 768;
    if (this.isMobileScreen) {
      this.sidebarCollapsed = true;
    } else {
      this.sidebarCollapsed = false;
    }
  }
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }
  @HostListener('window:resize', [])
  onWindowResize() {
    this.checkScreenSize();
  }
  @HostListener('window:scroll', [])
  onWindowScroll() {
    const sectionIds = [
      'attachments-section',
      'application-activity-data-section',
      'applicant-manager-data-section',
      'company-hq-data-section',
      'trade-name-description-section',
      'terms-conditions-section'
    ];

    for (let id of sectionIds) {
      const el = document.getElementById(id);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom >= 150) {
          this.activeSection = id;
          break;
        }
      }
    }
  }
  scrollTo(id: string, event: Event): void {
    event.preventDefault();

    const element = document.getElementById(id);
    if (element) {
      // Get distance from top of document to the element
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;

      // Adjust by header height (replace 120 with your header height in px)
      const offsetPosition = elementPosition - 120;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      // Use a slight delay to allow smooth scroll to complete
      setTimeout(() => {
        if (element) {
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
      }, 600); // Adjust delay as needed, slightly longer than your scroll behavior duration
    }
  }

}
