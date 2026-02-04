import { TestBed } from '@angular/core/testing';

import { AllApplicationsService } from './all-applications.service';

describe('AllApplicationsService', () => {
  let service: AllApplicationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AllApplicationsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
