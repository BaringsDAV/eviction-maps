import { TestBed, inject } from '@angular/core/testing';
import { HttpClientModule, HttpRequest } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MapToolService } from './map-tool.service';

describe('MapToolService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MapToolService, TranslateService ],
      imports: [
        HttpClientModule,
        HttpClientTestingModule,
        TranslateModule.forRoot()
      ]
    });
  });

  afterEach(inject([HttpTestingController], (backend: HttpTestingController) => {
    backend.verify();
  }));

  it('should be created', inject([MapToolService], (service: MapToolService) => {
    expect(service).toBeTruthy();
  }));

  it(
    'should make a single http request for data for a single year',
    inject(
      [MapToolService, HttpTestingController],
      (service: MapToolService, backend: HttpTestingController) => {
        service.getTileData('states', [50, 50], 'featureName', false).subscribe();
        backend.expectOne((req: HttpRequest<any>) => {
          return req.url.includes('states')
            && req.method === 'GET'
            && req.responseType === 'arraybuffer';
        }, `GET request to endpoint with data`);
      }
    )
  );
});
