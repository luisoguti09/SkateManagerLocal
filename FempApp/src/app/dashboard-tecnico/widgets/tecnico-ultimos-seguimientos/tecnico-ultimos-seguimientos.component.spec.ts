import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TecnicoUltimosSeguimientosComponent } from './tecnico-ultimos-seguimientos.component';

describe('TecnicoUltimosSeguimientosComponent', () => {
  let component: TecnicoUltimosSeguimientosComponent;
  let fixture: ComponentFixture<TecnicoUltimosSeguimientosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TecnicoUltimosSeguimientosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TecnicoUltimosSeguimientosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
