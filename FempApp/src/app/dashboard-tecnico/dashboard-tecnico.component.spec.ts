import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardTecnicoComponent } from './dashboard-tecnico.component';

describe('DashboardTecnicoComponent', () => {
  let component: DashboardTecnicoComponent;
  let fixture: ComponentFixture<DashboardTecnicoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardTecnicoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardTecnicoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
