import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegistroFastComponent } from './registro-fast.component';

describe('RegistroFastComponent', () => {
  let component: RegistroFastComponent;
  let fixture: ComponentFixture<RegistroFastComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistroFastComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegistroFastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
