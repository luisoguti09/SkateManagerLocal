import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventQrComponent } from './event-qr.component';

describe('EventQrComponent', () => {
  let component: EventQrComponent;
  let fixture: ComponentFixture<EventQrComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventQrComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventQrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
