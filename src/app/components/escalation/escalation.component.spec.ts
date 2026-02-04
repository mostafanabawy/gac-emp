import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EscalationComponent } from './escalation.component';

describe('EscalationComponent', () => {
  let component: EscalationComponent;
  let fixture: ComponentFixture<EscalationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EscalationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EscalationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
