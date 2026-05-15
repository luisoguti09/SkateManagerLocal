import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElementosDetailComponent } from './elementos-detail.component';

describe('ElementosDetailComponent', () => {
  let component: ElementosDetailComponent;
  let fixture: ComponentFixture<ElementosDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ElementosDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ElementosDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
