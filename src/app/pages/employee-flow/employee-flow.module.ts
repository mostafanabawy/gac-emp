import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconModule } from 'src/app/shared/icon/icon.module';
import { ComponentsModule } from 'src/app/components/components.module';
import { SharedModule } from 'src/shared.module';
import { routes } from 'src/app/app.route';
import { RouterModule } from '@angular/router';
import { EmployeeHomeComponent } from './employee-home.component';
import { EmployeeApplicationsComponent } from './employee-applications/employee-applications.component';
import { EmployeeReportsComponent } from './employee-reports/employee-reports.component';
import { EmployeeComponentsModule } from 'src/app/components/employeeFlow/employee-components.module';



@NgModule({
  imports: [
    RouterModule.forChild(routes), CommonModule, SharedModule.forRoot(), ComponentsModule, IconModule, EmployeeComponentsModule
  ],
  declarations: [
    EmployeeHomeComponent,
    EmployeeApplicationsComponent,
    EmployeeReportsComponent
  ],
  exports: [
    EmployeeHomeComponent
  ]
})
export class EmployeeFlowModule { }
