import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GetLateRPTComponent } from './get-late-rpt.component';

describe('GetLateRPTComponent', () => {
  let component: GetLateRPTComponent;
  let fixture: ComponentFixture<GetLateRPTComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GetLateRPTComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GetLateRPTComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
