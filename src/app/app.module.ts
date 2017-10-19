import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { MapModule } from './map/map.module';
import { MapUiModule } from './map-ui/map-ui.module';
import { DataPanelModule } from './data-panel/data-panel.module';
import { PlatformService } from './platform.service';

@NgModule({
  declarations: [ AppComponent ],
  imports: [
    MapUiModule,
    DataPanelModule,
    BrowserModule,
    MapModule
  ],
  providers: [ PlatformService ],
  bootstrap: [ AppComponent ]
})
export class AppModule { }
