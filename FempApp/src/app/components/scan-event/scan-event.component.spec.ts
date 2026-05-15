import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScanEventComponent } from './scan-event.component';

describe('ScanEventComponent', () => {
  let component: ScanEventComponent;
  let fixture: ComponentFixture<ScanEventComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScanEventComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScanEventComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
