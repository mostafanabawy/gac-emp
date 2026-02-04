import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LicenseDetailsComponent } from './license-details.component';

describe('LicenseDetailsComponent', () => {
  let component: LicenseDetailsComponent;
  let fixture: ComponentFixture<LicenseDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LicenseDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LicenseDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
