import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetermineFeesComponent } from './determine-fees.component';

describe('DetermineFeesComponent', () => {
  let component: DetermineFeesComponent;
  let fixture: ComponentFixture<DetermineFeesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetermineFeesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetermineFeesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
