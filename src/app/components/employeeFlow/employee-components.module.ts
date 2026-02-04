import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmployeeApplicationTabsComponent } from './employee-application-tabs/employee-application-tabs.component';
import { RouterModule } from '@angular/router';
import { routes } from 'src/app/app.route';
import { SharedModule } from 'src/shared.module';
import { ComponentsModule } from '../components.module';
import { IconModule } from 'src/app/shared/icon/icon.module';
import { ApplicationsStatsEmployeeManagerComponent } from '../applications-stats-employee-manager/applications-stats-employee-manager.component';
import { PendingApplicationsSectionComponent } from '../pending-applications-section/pending-applications-section.component';
import { SingleApplicationHorizontalRowComponent } from '../single-application-horizontal-row/single-application-horizontal-row.component';



@NgModule({
  declarations: [
    EmployeeApplicationTabsComponent, ApplicationsStatsEmployeeManagerComponent, PendingApplicationsSectionComponent,
    SingleApplicationHorizontalRowComponent
  ],
  exports: [
    EmployeeApplicationTabsComponent, ApplicationsStatsEmployeeManagerComponent, PendingApplicationsSectionComponent,
    SingleApplicationHorizontalRowComponent
  ],
  imports: [
    RouterModule.forChild(routes), CommonModule, SharedModule.forRoot(), ComponentsModule, IconModule
  ]
})
export class EmployeeComponentsModule {
  
}
