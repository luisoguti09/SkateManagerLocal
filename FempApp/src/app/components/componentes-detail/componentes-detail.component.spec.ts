import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComponentesDetailComponent } from './componentes-detail.component';

describe('ComponentesDetailComponent', () => {
  let component: ComponentesDetailComponent;
  let fixture: ComponentFixture<ComponentesDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentesDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComponentesDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
