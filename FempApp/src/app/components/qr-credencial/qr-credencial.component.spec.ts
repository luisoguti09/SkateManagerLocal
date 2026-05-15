import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QrCredencialComponent } from './qr-credencial.component';

describe('QrCredencialComponent', () => {
  let component: QrCredencialComponent;
  let fixture: ComponentFixture<QrCredencialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrCredencialComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QrCredencialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
