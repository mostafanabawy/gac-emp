import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DynamicAttachmentsComponent } from './dynamic-attachments.component';

describe('DynamicAttachmentsComponent', () => {
  let component: DynamicAttachmentsComponent;
  let fixture: ComponentFixture<DynamicAttachmentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicAttachmentsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DynamicAttachmentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
