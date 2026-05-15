import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QrCanvasComponent } from './qr-canvas.component';

describe('QrCanvasComponent', () => {
  let component: QrCanvasComponent;
  let fixture: ComponentFixture<QrCanvasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrCanvasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QrCanvasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
