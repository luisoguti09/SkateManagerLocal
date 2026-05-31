import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TecnicoResumenCardsComponent } from './tecnico-resumen-cards.component';

describe('TecnicoResumenCardsComponent', () => {
  let component: TecnicoResumenCardsComponent;
  let fixture: ComponentFixture<TecnicoResumenCardsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TecnicoResumenCardsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TecnicoResumenCardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
