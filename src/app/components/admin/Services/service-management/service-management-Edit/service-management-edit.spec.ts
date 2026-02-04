import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IdComponent } from './service-management-edit';

describe('IdComponent', () => {
  let component: IdComponent;
  let fixture: ComponentFixture<IdComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IdComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IdComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
