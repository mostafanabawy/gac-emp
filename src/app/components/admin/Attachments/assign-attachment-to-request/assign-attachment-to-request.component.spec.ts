import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignAttachmentToRequestComponent } from './assign-attachment-to-request.component';

describe('AssignAttachmentToRequestComponent', () => {
  let component: AssignAttachmentToRequestComponent;
  let fixture: ComponentFixture<AssignAttachmentToRequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignAttachmentToRequestComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignAttachmentToRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
