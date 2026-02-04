import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnpaidFeesRPTComponent } from './unpaid-fees-rpt.component';

describe('UnpaidFeesRPTComponent', () => {
  let component: UnpaidFeesRPTComponent;
  let fixture: ComponentFixture<UnpaidFeesRPTComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnpaidFeesRPTComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UnpaidFeesRPTComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
