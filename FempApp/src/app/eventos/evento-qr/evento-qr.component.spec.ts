import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventoQrComponent } from './evento-qr.component';

describe('EventoQrComponent', () => {
  let component: EventoQrComponent;
  let fixture: ComponentFixture<EventoQrComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventoQrComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventoQrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
