import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmpadronadaComponent } from './empadronada.component';

describe('EmpadronadaComponent', () => {
  let component: EmpadronadaComponent;
  let fixture: ComponentFixture<EmpadronadaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmpadronadaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmpadronadaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
