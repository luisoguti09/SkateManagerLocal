import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AsistenciasScannerComponent } from './asistencias-scanner.component';

describe('AsistenciasScannerComponent', () => {
  let component: AsistenciasScannerComponent;
  let fixture: ComponentFixture<AsistenciasScannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AsistenciasScannerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AsistenciasScannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
