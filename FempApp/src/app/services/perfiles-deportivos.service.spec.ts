import { TestBed } from '@angular/core/testing';

import { PerfilesDeportivosService } from './perfiles-deportivos.service';

describe('PerfilesDeportivosService', () => {
  let service: PerfilesDeportivosService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PerfilesDeportivosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
