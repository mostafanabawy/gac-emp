import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceProcessesComponent } from './service-processes.component';

describe('ServiceProcessesComponent', () => {
  let component: ServiceProcessesComponent;
  let fixture: ComponentFixture<ServiceProcessesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceProcessesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServiceProcessesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
