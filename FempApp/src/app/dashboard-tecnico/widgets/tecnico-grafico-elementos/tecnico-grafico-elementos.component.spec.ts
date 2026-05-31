import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TecnicoGraficoElementosComponent } from './tecnico-grafico-elementos.component';

describe('TecnicoGraficoElementosComponent', () => {
  let component: TecnicoGraficoElementosComponent;
  let fixture: ComponentFixture<TecnicoGraficoElementosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TecnicoGraficoElementosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TecnicoGraficoElementosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
