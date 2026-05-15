import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AsistenciasListComponent } from './asistencias-list.component';

describe('AsistenciasListComponent', () => {
  let component: AsistenciasListComponent;
  let fixture: ComponentFixture<AsistenciasListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AsistenciasListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AsistenciasListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
