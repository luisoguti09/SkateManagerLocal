import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TecnicoGraficoEvolucionComponent } from './tecnico-grafico-evolucion.component';

describe('TecnicoGraficoEvolucionComponent', () => {
  let component: TecnicoGraficoEvolucionComponent;
  let fixture: ComponentFixture<TecnicoGraficoEvolucionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TecnicoGraficoEvolucionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TecnicoGraficoEvolucionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
