import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GraphModule } from 'angular-d3-graph/module';
import { TranslateModule } from '@ngx-translate/core';
import { PopoverModule } from 'ngx-bootstrap/popover';
import { TooltipModule } from 'ngx-bootstrap/tooltip';

import { UiModule } from '../ui/ui.module';
import { EvictionGraphsComponent } from './eviction-graphs.component';
import { GraphTooltipsComponent } from './graph-tooltips/graph-tooltips.component';

@NgModule({
  exports: [ EvictionGraphsComponent, GraphTooltipsComponent ],
  imports: [
    CommonModule,
    UiModule,
    GraphModule.forRoot(),
    TranslateModule,
    PopoverModule.forRoot(),
    TooltipModule.forRoot()
  ],
  declarations: [
    EvictionGraphsComponent, GraphTooltipsComponent
  ]
})
export class EvictionGraphsModule { }
