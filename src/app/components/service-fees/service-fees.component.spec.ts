import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceFeesComponent } from './service-fees.component';

describe('ServiceFeesComponent', () => {
  let component: ServiceFeesComponent;
  let fixture: ComponentFixture<ServiceFeesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceFeesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServiceFeesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
