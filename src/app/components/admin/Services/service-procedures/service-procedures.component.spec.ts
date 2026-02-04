import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceProceduresComponent } from './service-procedures.component';

describe('ServiceProceduresComponent', () => {
  let component: ServiceProceduresComponent;
  let fixture: ComponentFixture<ServiceProceduresComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceProceduresComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServiceProceduresComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
