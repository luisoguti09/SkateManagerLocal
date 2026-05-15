import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeportistComponent } from './deportist.component';

describe('DeportistComponent', () => {
  let component: DeportistComponent;
  let fixture: ComponentFixture<DeportistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeportistComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeportistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
