import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';


import { UiModule } from '../../ui/ui.module';
import { LocationCardsComponent } from './location-cards.component';

@NgModule({
  exports: [ LocationCardsComponent ],
  imports: [
    CommonModule,
    FormsModule,
    UiModule,
    TranslateModule
  ],
  declarations: [ LocationCardsComponent ],
  entryComponents: [ LocationCardsComponent ]
})
export class LocationCardsModule { }
