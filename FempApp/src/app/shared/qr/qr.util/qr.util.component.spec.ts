import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QrUtilComponent } from './qr.util.component';

describe('QrUtilComponent', () => {
  let component: QrUtilComponent;
  let fixture: ComponentFixture<QrUtilComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrUtilComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QrUtilComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
