import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TotalRPTComponent } from './total-rpt.component';

describe('TotalRPTComponent', () => {
  let component: TotalRPTComponent;
  let fixture: ComponentFixture<TotalRPTComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TotalRPTComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TotalRPTComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
