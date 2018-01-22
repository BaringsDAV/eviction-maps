import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Ng2PageScrollModule } from 'ng2-page-scroll';
import { TranslateModule } from '@ngx-translate/core';

import { MapToolComponent } from './map-tool.component';
import { MapModule } from './map/map.module';
import { UiModule } from '../ui/ui.module';
import { DataPanelModule } from './data-panel/data-panel.module';
import { DataService } from '../data/data.service';


@NgModule({
  declarations: [ MapToolComponent ],
  exports: [ MapToolComponent ],
  imports: [
    CommonModule,
    HttpClientModule,
    UiModule,
    DataPanelModule,
    MapModule,
    Ng2PageScrollModule,
    TranslateModule
  ]
})
export class MapToolModule { }
