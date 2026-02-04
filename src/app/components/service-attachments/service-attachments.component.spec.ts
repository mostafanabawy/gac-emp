import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceAttachmentsComponent } from './service-attachments.component';

describe('ServiceAttachmentsComponent', () => {
  let component: ServiceAttachmentsComponent;
  let fixture: ComponentFixture<ServiceAttachmentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceAttachmentsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServiceAttachmentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
