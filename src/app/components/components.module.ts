import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';

// shared module
import { SharedModule } from 'src/shared.module';

import { TabsComponent } from './tabs';
import { AccordionsComponent } from './accordions';
import { ModalsComponent } from './modals';
import { CardsComponent } from './cards';
import { CarouselComponent } from './carousel';
import { CountdownComponent } from './countdown';
import { CounterComponent } from './counter';
import { SweetalertComponent } from './sweetalert';
import { TimelineComponent } from './timeline';
import { NotificationsComponent } from './notifications';
import { MediaObjectComponent } from './media-object';
import { ListGroupComponent } from './list-group';
import { PricingTableComponent } from './pricing-table';
import { LightboxComponent } from './lightbox';
import { ApplicationsTabsComponent } from './applications-main-tabs/applications-main-tabs.component';
import { ApplicationTypesComponent } from './application-types/application-types.component';
import { SingleApplicationCardComponent } from './single-application-card/single-application-card.component';
import { BreadCrumpsComponent } from './bread-crumps/bread-crumps.component';
import { ApplicationDetailsSectionComponent } from './application-details-section/application-details-section.component';
import { MyLicensesTypesTabsComponent } from './my-licenses-types-tabs/my-licenses-types-tabs.component';
import { SingleLicenceCardComponent } from './single-licence-card/single-licence-card.component';
import { FileUploadComponent } from './file-upload/file-upload.component';
import { ApplicationComponent } from './application/application.component';
import { SuccessModalComponent } from './success-modal/success-modal.component';
import { RatingModalComponent } from './rating-modal/rating-modal.component';
import { AiPopupComponent } from './ai-popup/ai-popup.component';
import { HelpTutorialModalComponent } from './help-tutorial-modal/help-tutorial-modal.component';
import { UsersGuideModalComponent } from './users-guide-modal/users-guide-modal.component';
import { ServiceCardComponent } from './service-card/service-card.component';
import { ClubsCentersCardComponent } from './clubs-centers-card/clubs-centers-card.component';
import { MediaCentersCardComponent } from './media-centers-card/media-centers-card.component';
import { AppRejectModalComponent } from './app-reject-modal/app-reject-modal.component';
import { LicensesReminderModalComponent } from './licenses-reminder-modal/licenses-reminder-modal.component';
import { PaymentModalComponent } from './payment-modal/payment-modal.component';
import { AdvancedSearchComponent } from './advanced-search/advanced-search.component';
import { AllApplicationsTableComponent } from './all-applications-table/all-applications-table.component';
import { IconModule } from '../shared/icon/icon.module';
import { ApplicationConfirmModalComponent } from './application-confirm-modal/application-confirm-modal.component';
import { AiAnalysisModalComponent } from './ai-analysis-modal/ai-analysis-modal.component';
import { RelatedApplicationsModalComponent } from './related-applications-modal/related-applications-modal.component';
import { ProceduresCompletedModalComponent } from './procedures-completed-modal/procedures-completed-modal.component';
import { DynamicFieldComponent } from './dynamic-field/dynamic-field.component';
import { IdSetterDirective } from '../customDirective/id-setter.directive';
import { DefaultComponent } from './quillEditor/default.component';
import { LongTextPopupComponent } from './long-text-popup/long-text-popup.component';
import { MenuItemComponent } from './menu-item/menu-item.component';
import { AccordionSideMenuComponent } from './accordion-side-menu/accordion-side-menu.component';
import { DistributionTableComponent } from './distribution-table/distribution-table.component';
import { CpModalComponent } from './cp-modal/cp-modal.component';
import { CrModalComponent } from './cr-modal/cr-modal.component';
import { ServicesLogModalComponent } from './services-log-modal/services-log-modal.component';
import { AiCompletionBar } from './ai-completion-bar/ai-completion-bar.component';
import { EditedDataModalComponent } from '../edited-data-modal/edited-data-modal.component';
import { ComplaintsListComponent } from './complaints-list/complaints-list.component';
import { ServiceSelectModalComponent } from './service-select-modal/service-select-modal.component';
import { FeesTableComponent } from './fees-table/fees-table.component';
import { VeryAdvancedSearchComponent } from './very-advanced-search/very-advanced-search.component';
import { EmployeeSelectModalComponent } from './employee-select-modal/employee-select-modal.component';

const routes: Routes = [
    { path: 'components/tabs', component: TabsComponent, data: { title: 'Tabs' } },
    { path: 'components/accordions', component: AccordionsComponent, data: { title: 'Accordions' } },
    { path: 'components/modals', component: ModalsComponent, data: { title: 'Modals' } },
    { path: 'components/cards', component: CardsComponent, data: { title: 'Cards' } },
    { path: 'components/carousel', component: CarouselComponent, data: { title: 'Carousel' } },
    { path: 'components/countdown', component: CountdownComponent, data: { title: 'Countdown' } },
    { path: 'components/counter', component: CounterComponent, data: { title: 'Counter' } },
    { path: 'components/sweetalert', component: SweetalertComponent, data: { title: 'Sweetalert' } },
    { path: 'components/timeline', component: TimelineComponent, data: { title: 'Timeline' } },
    { path: 'components/notifications', component: NotificationsComponent, data: { title: 'Notifications' } },
    { path: 'components/media-object', component: MediaObjectComponent, data: { title: 'Media Object' } },
    { path: 'components/list-group', component: ListGroupComponent, data: { title: 'List Group' } },
    { path: 'components/pricing-table', component: PricingTableComponent, data: { title: 'Pricing Table' } },
    { path: 'components/lightbox', component: LightboxComponent, data: { title: 'Lightbox' } },
];
@NgModule({
    imports: [RouterModule.forChild(routes), CommonModule, SharedModule.forRoot(), IconModule, FeesTableComponent],
    declarations: [
        TabsComponent,
        AccordionsComponent,
        ModalsComponent,
        CardsComponent,
        CarouselComponent,
        CountdownComponent,
        CounterComponent,
        SweetalertComponent,
        TimelineComponent,
        NotificationsComponent,
        MediaObjectComponent,
        ListGroupComponent,
        PricingTableComponent,
        LightboxComponent,
        ApplicationsTabsComponent,
        ApplicationTypesComponent,
        SingleApplicationCardComponent,
        BreadCrumpsComponent,
        ApplicationDetailsSectionComponent,
        MyLicensesTypesTabsComponent,
        SingleLicenceCardComponent,
        FileUploadComponent,
        ApplicationComponent,
        SuccessModalComponent,
        RatingModalComponent,
        AiPopupComponent,
        AppRejectModalComponent,
        LicensesReminderModalComponent,
        PaymentModalComponent,
        HelpTutorialModalComponent,
        UsersGuideModalComponent,
        ServiceCardComponent,
        ClubsCentersCardComponent,
        MediaCentersCardComponent,
        AdvancedSearchComponent,
        AllApplicationsTableComponent,
        ApplicationConfirmModalComponent,
        AiAnalysisModalComponent,
        RelatedApplicationsModalComponent,
        ProceduresCompletedModalComponent, DynamicFieldComponent, IdSetterDirective, DefaultComponent,
        LongTextPopupComponent, MenuItemComponent, AccordionSideMenuComponent, DistributionTableComponent,
        CpModalComponent, CrModalComponent, ServicesLogModalComponent, AiCompletionBar,
        EditedDataModalComponent, ComplaintsListComponent, ServiceSelectModalComponent, VeryAdvancedSearchComponent, EmployeeSelectModalComponent
    ],
    exports: [ApplicationsTabsComponent, ApplicationTypesComponent,
        SingleApplicationCardComponent, BreadCrumpsComponent, ApplicationDetailsSectionComponent,
        MyLicensesTypesTabsComponent, SingleLicenceCardComponent, FileUploadComponent, ApplicationComponent,
        SuccessModalComponent, RatingModalComponent, AiPopupComponent, PaymentModalComponent, LicensesReminderModalComponent,
        AppRejectModalComponent, HelpTutorialModalComponent,
        UsersGuideModalComponent, ServiceCardComponent, ClubsCentersCardComponent,
        MediaCentersCardComponent, AdvancedSearchComponent, AllApplicationsTableComponent,
        ApplicationConfirmModalComponent, AiAnalysisModalComponent, RelatedApplicationsModalComponent,
        ProceduresCompletedModalComponent, DynamicFieldComponent, DefaultComponent,
        LongTextPopupComponent, MenuItemComponent, AccordionSideMenuComponent, DistributionTableComponent,
        CpModalComponent, CrModalComponent, ServicesLogModalComponent, AiCompletionBar,
        EditedDataModalComponent, ComplaintsListComponent, ServiceSelectModalComponent, VeryAdvancedSearchComponent, EmployeeSelectModalComponent
    ],
    providers: [],
})
export class ComponentsModule { }
