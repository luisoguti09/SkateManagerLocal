import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TecnicoGraficoComponentesComponent } from './tecnico-grafico-componentes.component';

describe('TecnicoGraficoComponentesComponent', () => {
  let component: TecnicoGraficoComponentesComponent;
  let fixture: ComponentFixture<TecnicoGraficoComponentesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TecnicoGraficoComponentesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TecnicoGraficoComponentesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
