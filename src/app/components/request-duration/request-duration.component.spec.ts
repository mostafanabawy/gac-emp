import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestDurationComponent } from './request-duration.component';

describe('RequestDurationComponent', () => {
  let component: RequestDurationComponent;
  let fixture: ComponentFixture<RequestDurationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestDurationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestDurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
