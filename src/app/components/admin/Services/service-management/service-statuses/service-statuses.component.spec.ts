import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceStatusesComponent } from './service-statuses.component';

describe('ServiceStatusesComponent', () => {
  let component: ServiceStatusesComponent;
  let fixture: ComponentFixture<ServiceStatusesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceStatusesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServiceStatusesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
