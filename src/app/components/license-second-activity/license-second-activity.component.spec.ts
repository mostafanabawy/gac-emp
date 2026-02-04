import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LicenseSecondActivityComponent } from './license-second-activity.component';

describe('LicenseSecondActivityComponent', () => {
  let component: LicenseSecondActivityComponent;
  let fixture: ComponentFixture<LicenseSecondActivityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LicenseSecondActivityComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LicenseSecondActivityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
