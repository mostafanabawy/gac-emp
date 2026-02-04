import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceRolesComponent } from './service-roles.component';

describe('UserRolesComponent', () => {
  let component: ServiceRolesComponent;
  let fixture: ComponentFixture<ServiceRolesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceRolesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServiceRolesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
