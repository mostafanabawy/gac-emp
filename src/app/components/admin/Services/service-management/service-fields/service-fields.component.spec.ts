import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceFieldsComponent } from './service-fields.component';

describe('ServiceStatusesComponent', () => {
  let component: ServiceFieldsComponent;
  let fixture: ComponentFixture<ServiceFieldsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceFieldsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServiceFieldsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
