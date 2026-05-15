import { TestBed } from '@angular/core/testing';

import { AsistenciasListService } from './asistencias-list.service';

describe('AsistenciasListService', () => {
  let service: AsistenciasListService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AsistenciasListService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
