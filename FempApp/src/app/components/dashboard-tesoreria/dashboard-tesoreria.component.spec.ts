import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardTesoreriaComponent } from './dashboard-tesoreria.component';

describe('DashboardTesoreriaComponent', () => {
  let component: DashboardTesoreriaComponent;
  let fixture: ComponentFixture<DashboardTesoreriaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardTesoreriaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardTesoreriaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
