import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardDeportComponent } from './dashboard-deport.component';

describe('DashboardDeportComponent', () => {
  let component: DashboardDeportComponent;
  let fixture: ComponentFixture<DashboardDeportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardDeportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardDeportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
