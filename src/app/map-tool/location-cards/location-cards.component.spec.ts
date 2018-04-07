import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TypeaheadModule, TypeaheadMatch } from 'ngx-bootstrap/typeahead';
import { LocationCardsComponent } from './location-cards.component';
import { UiModule } from '../../ui/ui.module';
import { LocationCardsModule } from './location-cards.module';
import { PlatformService } from '../../services/platform.service';

describe('LocationCardsComponent', () => {
  let component: LocationCardsComponent;
  let fixture: ComponentFixture<LocationCardsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ FormsModule, TypeaheadModule.forRoot(), UiModule, LocationCardsModule ],
      providers: [ PlatformService ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LocationCardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
