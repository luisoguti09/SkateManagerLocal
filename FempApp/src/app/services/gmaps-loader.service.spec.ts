import { TestBed } from '@angular/core/testing';

import { GmapsLoaderService } from './gmaps-loader.service';

describe('GmapsLoaderService', () => {
  let service: GmapsLoaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GmapsLoaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
