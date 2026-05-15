import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventosDisponiblesComponent } from './eventos-disponibles.component';

describe('EventosDisponiblesComponent', () => {
  let component: EventosDisponiblesComponent;
  let fixture: ComponentFixture<EventosDisponiblesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventosDisponiblesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventosDisponiblesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
