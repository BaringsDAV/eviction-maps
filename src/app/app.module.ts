import { BrowserModule, Title } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { Ng2PageScrollModule } from 'ng2-page-scroll';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader, TranslatePipe } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { ToastModule, ToastOptions } from 'ng2-toastr';
import { environment } from '../environments/environment';

// local imports
import { AppComponent } from './app.component';
import { UiModule } from './ui/ui.module';
import { MapToolModule } from './map-tool/map-tool.module';
import { MapToolComponent } from './map-tool/map-tool.component';
import { RankingModule } from './ranking/ranking.module';
import { RankingToolComponent } from './ranking/ranking-tool/ranking-tool.component';
import { HeaderBarComponent } from './header-bar/header-bar.component';
import { FooterComponent } from './footer/footer.component';
import { MenuComponent } from './menu/menu.component';
import { ServicesModule } from './services/services.module';
import { EmbedComponent } from './map-tool/embed/embed.component';

export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

export class CustomOption extends ToastOptions {
  showCloseButton = true;
  positionClass = 'toast-bottom-left';
  maxShown = 1;
}

@NgModule({
  declarations: [ AppComponent, HeaderBarComponent, FooterComponent, MenuComponent ],
  imports: [
    UiModule,
    MapToolModule,
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    RankingModule.forRoot({
      cityUrl: environment.cityRankingDataUrl,
      stateUrl: environment.stateRankingDataUrl
    }),
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (createTranslateLoader),
        deps: [HttpClient]
      }
    }),
    ServicesModule.forRoot(),
    RouterModule.forRoot([], { useHash: true, enableTracing: true }),
    TooltipModule.forRoot(),
    ToastModule.forRoot(),
    Ng2PageScrollModule.forRoot()
  ],
  providers: [
    {provide: ToastOptions, useClass: CustomOption},
    Title
  ],
  bootstrap: [AppComponent],
  entryComponents: [ MapToolComponent, RankingToolComponent, EmbedComponent ]
})
export class AppModule { }
