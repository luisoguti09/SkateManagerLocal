import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GooglePlacePickerComponent } from './google-place-picker.component';

describe('GooglePlacePickerComponent', () => {
  let component: GooglePlacePickerComponent;
  let fixture: ComponentFixture<GooglePlacePickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GooglePlacePickerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GooglePlacePickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
