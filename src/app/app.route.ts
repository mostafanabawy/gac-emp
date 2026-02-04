import { Routes, ActivatedRouteSnapshot } from '@angular/router';
import { AppLayout } from './layouts/app-layout';
import { AuthLayout } from './layouts/auth-layout';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ApplicationsComponent } from './pages/applications.component';
import { ApplicationComponent } from './components/application/application.component';
import { ComplaintsComponent } from './pages/complaints/complaints.component';
import { NotificationPageComponent } from './pages/notification-page/notification-page.component';
import { AllApplicationsTableComponent } from './components/all-applications-table/all-applications-table.component';
import { EmployeeReportsComponent } from './pages/employee-flow/employee-reports/employee-reports.component';
import { LoginComponent } from './pages/login.component';
import { SportAffairComponent } from './components/sport-affair/sport-affair.component';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { roleGuard } from './guards/role.guard';
import { USER_ROLES } from './constants/roles.constants';
import { ServiceFeesComponent } from './components/service-fees/service-fees.component';
import { LicenseDetailsComponent } from './components/license-details/license-details.component';
import { RequestDetailsComponent } from './components/request-details/request-details.component';
import { RequestDurationComponent } from './components/request-duration/request-duration.component';
import { EscalationComponent } from './components/escalation/escalation.component';
import { LicenseSecondActivityComponent } from './components/license-second-activity/license-second-activity.component';
import { ServiceAttachmentsComponent } from './components/service-attachments/service-attachments.component';
import { DutyFreeRPTComponent } from './components/duty-free-rpt/duty-free-rpt.component';
import { UnpaidFeesRPTComponent } from './components/unpaid-fees-rpt/unpaid-fees-rpt.component';
import { GetLateRPTComponent } from './components/get-late-rpt/get-late-rpt.component';
import { TotalRPTComponent } from './components/total-rpt/total-rpt.component';
import { ClubsDashboardChartsComponent } from './components/clubs-dashboard-charts/clubs-dashboard-charts.component';

// Admin
import { LoginUserComponent } from './components/admin/login-user/login-user.component';
import { UserEditComponent } from './components/admin/login-user/UserEditComponent/systemusersId';
import { DynamicAttachmentsComponent } from './components/admin/Attachments/DynamicAttachments/dynamic-attachments/dynamic-attachments.component';
import { AssignAttachmentToRequestComponent } from './components/admin/Attachments/assign-attachment-to-request/assign-attachment-to-request.component';
import { ServiceProceduresComponent } from './components/admin/Services/service-procedures/service-procedures.component';
import { MessagesComponent } from './components/admin/Messages/messages/messages.component';
import { ServiceManagementComponent } from './components/admin/Services/service-management/service-management.component';
import { ServiceManagementEditComponent } from './components/admin/Services/service-management/service-management-Edit/service-management-edit';
import { DetermineFeesComponent } from './components/admin/Fees/determine-fees/determine-fees.component';
import { MembershipDetailsComponent } from './components/membership-details/membership-details.component';

export const routes: Routes = [
  // ==================== صفحات الموظفين ====================
  {
    path: '',
    component: AppLayout,
    canActivate: [authGuard],
    data: { breadcrumb: 'breadCrumb.homebc', },
    children: [
      { path: 'dashboard', component: DashboardComponent, data: { title: 'Dashboard' } },

      {
        path: 'Inbox',
        data: { title: 'All Applications', breadcrumb: 'breadCrumb.myApplicationsbc' },
        children: [
          { path: '', component: ApplicationsComponent, data: { title: 'My Applications', breadcrumb: null } },
          { path: 'RequestData', component: ApplicationComponent, data: { title: 'applicationDetail', breadcrumb: 'خدمة نشاط المجمع الرياضي التجاري(الاندية الخاصة)' } },
        ]
      },

      {
        path: 'Services',
        data: { title: 'Services', breadcrumb: 'breadCrumb.servicesbc' },
        children: [
          { path: '', component: ApplicationsComponent, data: { title: 'My Applications', breadcrumb: null } },
          {
            path: 'applicationdetail',
            component: ApplicationComponent,
            data: { title: 'applicationDetail', breadcrumb: (route: ActivatedRouteSnapshot) => history.state?.pageName ?? 'Fallback Label' }
          },
          {
            path: 'NewRequest',
            component: ApplicationComponent,
            data: { title: 'Application', breadcrumb: (route: ActivatedRouteSnapshot) => history.state?.pageName ?? 'Fallback Label' }
          },
          {
            path: 'NewRequest/spAction',
            component: ApplicationComponent,
            data: { title: 'Application', breadcrumb: (route: ActivatedRouteSnapshot) => history.state?.pageName ?? 'Fallback Label' }
          },
          { path: 'SportAffairListing', component: SportAffairComponent, data: { title: 'Sport Affairs', breadcrumb: 'breadCrumb.sportAffairsbc' } }
        ]
      },

      {
        path: 'ComplaintsRequests',
        data: { title: 'Complaints Requests', breadcrumb: 'breadCrumb.myApplicationsbc' },
        children: [
          { path: '', component: ComplaintsComponent, data: { title: 'My Applications', breadcrumb: null } },
          {
            path: 'RequestData',
            component: ApplicationComponent,
            data: { title: 'applicationDetail', breadcrumb: (route: ActivatedRouteSnapshot) => history.state?.pageName ?? 'Fallback Label' }
          },
        ]
      },
      {
        path: 'FeesDetails',
        component: ServiceFeesComponent,
        data: { title: 'Service Fees', breadcrumb: 'breadCrumb.ServiceFees' }
      },
      {
        path: 'LicenseDetails',
        component: LicenseDetailsComponent,
        data: { title: 'License Details', breadcrumb: 'breadCrumb.LicenseDetails' }
      },
      {
        path: 'RequestDetails',
        component: RequestDetailsComponent,
        data: { title: 'Request Details', breadcrumb: 'breadCrumb.RequestDetails' }
      },
      {
        path: 'RequestDuration',
        component: RequestDurationComponent,
        data: { title: 'Request Details', breadcrumb: 'breadCrumb.RequestDuration' }
      },
      {
        path: 'Escalation',
        component: EscalationComponent,
        data: { title: 'Escalation', breadcrumb: 'breadCrumb.Escalation' }
      },
      {
        path: 'LicenseSecondActivity',
        component: LicenseSecondActivityComponent,
        data: { title: 'LicenseSecondActivity', breadcrumb: 'breadCrumb.LicenseSecondActivity' }
      },
      {
        path: 'ServiceAttachments',
        component: ServiceAttachmentsComponent,
        data: { title: 'ServiceAttachments', breadcrumb: 'breadCrumb.ServiceAttachments' }
      },
      {
        path: 'DutyFreeRPT',
        component: DutyFreeRPTComponent,
        data: { title: 'DutyFreeRPT', breadcrumb: 'breadCrumb.DutyFreeRPT' }
      },
      {
        path: 'UnpaidFeesRPT',
        component: UnpaidFeesRPTComponent,
        data: { title: 'UnpaidFeesRPT', breadcrumb: 'breadCrumb.UnpaidFeesRPT' }
      },
      {
        path: 'LateRPT',
        component: GetLateRPTComponent,
        data: { title: 'GetLateRPT', breadcrumb: 'breadCrumb.GetLateRPT' }
      },
      {
        path: 'TotalRPT',
        component: TotalRPTComponent,
        data: { title: 'TotalRPT', breadcrumb: 'breadCrumb.TotalRPT' }
      },
      {
        path: 'ClubsDashboard',
        component: ClubsDashboardChartsComponent,
        data: { title: 'ClubsDashboard', breadcrumb: 'breadCrumb.ClubsDashboard' }
      },
      {
        path: 'MembershipDetails',
        component: MembershipDetailsComponent,
        data: { title: 'MembershipDetails', breadcrumb: 'breadCrumb.MembershipDetails' }
      },
      { path: 'notifications', component: NotificationPageComponent, data: { title: 'Notifications', breadcrumb: '' } },
      { path: 'allApplications', component: AllApplicationsTableComponent, data: { title: 'All Applications', breadcrumb: 'breadCrumb.myApplicationsbc' } },
      { path: 'reports', component: EmployeeReportsComponent, data: { title: 'Reports', breadcrumb: 'breadCrumb.reportsbc' } },
    ]
  },

  // ==================== صفحات الأدمن ====================
  {
    path: '',
    component: AppLayout,
    canActivate: [authGuard, roleGuard],
    data: { breadcrumb: 'breadCrumb.homebc', roles: [USER_ROLES.ADMIN] }, // يمكن للأدمن والموظف الدخول
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent, data: { title: 'Dashboard' } },

      {
        path: 'users',
        data: { title: 'Users', breadcrumb: 'Users' },
        children: [
          { path: 'systemusers', component: LoginUserComponent, data: { title: 'System Users', breadcrumb: 'SystemUsers' } },
          { path: 'systemusers/:id', component: UserEditComponent, data: { title: 'System Users', breadcrumb: 'SystemUsers' } },
        ]
      },
      {
        path: 'services',
        data: { title: 'Services', breadcrumb: 'services' },
        children: [
          { path: 'serviceprocedures', component: ServiceProceduresComponent, data: { title: 'Service Procedures', breadcrumb: 'serviceprocedures' } },
          { path: 'servicemanagement', component: ServiceManagementComponent, data: { title: 'Service Management', breadcrumb: 'serviceManagement' } },
          { path: 'servicemanagement/:id', component: ServiceManagementEditComponent, data: { title: 'Service Management', breadcrumb: 'serviceManagement' } },
        ]
      },
      {
        path: 'attachments',
        data: { title: 'attachments', breadcrumb: 'Attachments' },
        children: [
          { path: 'attachment_Dynamic', component: DynamicAttachmentsComponent, data: { title: 'Dynamic Attachments', breadcrumb: 'DynamicAttachments' } },
          { path: 'assignattachment', component: AssignAttachmentToRequestComponent, data: { title: 'Assign Attachment', breadcrumb: 'DefineServiceAttachments' } },
        ]
      },
      {
        path: 'messages',
        data: { title: 'Messages', breadcrumb: 'Message' },
        children: [
          { path: 'messagesettings', component: MessagesComponent, data: { title: 'Message Settings', breadcrumb: 'MessageSettings' } },
        ]
      },
      {
        path: 'fees',
        data: { title: 'fees', breadcrumb: 'Fees' },
        children: [
          { path: 'DetermineFees', component: DetermineFeesComponent, data: { title: 'Determine Fees', breadcrumb: 'DetermineFees' } },
        ]
      },

      // components
      { path: '', loadChildren: () => import('./components/components.module').then((d) => d.ComponentsModule) },

      // users
      { path: '', loadChildren: () => import('./users/user.module').then((d) => d.UsersModule) },
    ]
  },
  //  
  {
    path: '',
    component: AuthLayout,
    canActivate: [guestGuard],
    children: [
      { path: 'login', component: LoginComponent, data: { title: 'Login' } },
      { path: 'auth', loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule) }
    ]
  },

  { path: '**', redirectTo: '' }
];
