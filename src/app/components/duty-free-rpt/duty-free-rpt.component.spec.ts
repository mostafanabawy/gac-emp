import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DutyFreeRPTComponent } from './duty-free-rpt.component';

describe('DutyFreeRPTComponent', () => {
  let component: DutyFreeRPTComponent;
  let fixture: ComponentFixture<DutyFreeRPTComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DutyFreeRPTComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DutyFreeRPTComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
