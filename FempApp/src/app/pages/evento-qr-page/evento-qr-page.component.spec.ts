import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventoQrPageComponent } from './evento-qr-page.component';

describe('EventoQrPageComponent', () => {
  let component: EventoQrPageComponent;
  let fixture: ComponentFixture<EventoQrPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventoQrPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventoQrPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
