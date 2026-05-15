import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OsmPlacePickerComponent } from './osm-place-picker.component';

describe('OsmPlacePickerComponent', () => {
  let component: OsmPlacePickerComponent;
  let fixture: ComponentFixture<OsmPlacePickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OsmPlacePickerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OsmPlacePickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
