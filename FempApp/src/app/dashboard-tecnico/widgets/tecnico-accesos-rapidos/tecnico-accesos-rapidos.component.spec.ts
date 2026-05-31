import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TecnicoAccesosRapidosComponent } from './tecnico-accesos-rapidos.component';

describe('TecnicoAccesosRapidosComponent', () => {
  let component: TecnicoAccesosRapidosComponent;
  let fixture: ComponentFixture<TecnicoAccesosRapidosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TecnicoAccesosRapidosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TecnicoAccesosRapidosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
