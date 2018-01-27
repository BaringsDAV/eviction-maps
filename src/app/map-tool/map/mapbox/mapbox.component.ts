import {
  Component, OnInit, Input, Output, AfterViewInit,
  EventEmitter, ViewChild, ElementRef, NgZone, HostListener
} from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { MapService } from '../map.service';
import { PlatformService } from '../../../platform.service';
import { MapLayerGroup } from '../../map/map-layer-group';
import { MapFeature } from '../../map/map-feature';
import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/operator/throttleTime';
import 'rxjs/add/operator/distinctUntilChanged';

@Component({
  selector: 'app-mapbox',
  templateUrl: './mapbox.component.html',
  styleUrls: ['./mapbox.component.scss']
})
export class MapboxComponent implements AfterViewInit {
  private map: mapboxgl.Map;
  private popup: mapboxgl.Popup;
  private mapStyle: Object;
  private activeFeature: any;
  @ViewChild('map') mapEl: ElementRef;
  @Input() mapConfig: Object;
  @Input() eventLayers: Array<string> = [];
  @Input() selectedLayer: MapLayerGroup;
  @Input() featureCount = 0;
  @Output() ready: EventEmitter<any> = new EventEmitter();
  @Output() zoomEnd: EventEmitter<number> = new EventEmitter();
  @Output() moveEnd: EventEmitter<Array<number>> = new EventEmitter();
  @Output() featureClick: EventEmitter<number> = new EventEmitter();
  featureMouseMove: EventEmitter<any> = new EventEmitter();
  hoverColors = [
    'rgba(226,64,0,0.8)', 'rgba(67,72,120,0.8)', 'rgba(44,137,127,0.8)', 'rgba(255,255,255,0.8)'
  ];

  constructor(
    private mapService: MapService,
    private platform: PlatformService,
    private zone: NgZone
  ) { }

  /**
   * Create map object from mapEl ViewChild
   */
  ngAfterViewInit() {
    this.map = this.mapService.createMap({
      ...this.mapConfig, container: this.mapEl.nativeElement, attributionControl: false
    });
    this.map.addControl(new mapboxgl.AttributionControl(), 'bottom-left');
    this.map.addControl(new mapboxgl.NavigationControl(), 'top-left');
    this.map.addControl(new mapboxgl.GeolocateControl({showUserLocation: false}), 'top-left');
    this.map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'top-left');
    this.popup = new mapboxgl.Popup({ closeButton: false });
    this.map.on('load', () => {
      this.onMapInstance(this.map);
    });
    this.map.on('error', (e) => {
      if (e && e.error && e.error.tile && e.error.tile.state === 'Errored') {
      } else {
        console.error(e);
      }
    });
  }

  /** passes focus to the map canvas */
  @HostListener('focus', ['$event']) onfocus(e) {
    this.mapEl.nativeElement.getElementsByTagName('canvas')[0].focus();
  }

  /**
   * Pass any .on() calls to the map instance
   * @param args any amount of arguments that would be passed to mapboxgl's .on()
   */
  on(...args: any[]) { return this.map.on.apply(this.map, arguments); }

  onMouseEnterFeature(e) {
    this.map.getCanvas().style.cursor = 'pointer';
    this.updatePopupContent(e.features.length > 0 ? e.features[0] : null);
    this.updatePopupLocation(e);
  }

  onMouseLeaveFeature() {
    this.map.getCanvas().style.cursor = '';
    this.activeFeature = null;
    this.mapService.setSourceData('hover');
    // Make sure debounced featureMouseMove doesn't re-add element
    this.featureMouseMove.emit({features: []});
    this.popup.remove();
  }

  /**
   * Updates the active feature outlined on the map
   * @param feature Feature or null
   */
  updateActiveFeature(feature) {
    if (feature === null) {
      this.mapService.setSourceData('hover');
      return;
    }
    this.activeFeature = feature;
    if (feature.layer.id === this.selectedLayer.id) {
      const union = this.mapService.getUnionFeature(this.selectedLayer.id, feature);
      if (union !== null) {
        union.properties['color'] = this.hoverColors[this.featureCount];
        this.mapService.setSourceData('hover', [union]);
      }
    } else {
      this.mapService.setSourceData('hover');
    }
  }

  /**
   * when the map is ready, bind the events
   * @param map mapbox instance
   */
  onMapInstance(map) {
    this.map = map;
    this.mapStyle = map.getStyle();
    this.setupEmitters();
    if (this.platform.isLargerThanMobile) {
      this.zone.runOutsideAngular(() => {
        // Function to process observable
        const distinctFeature = (obs) => {
          return obs
            .map(e => e.features.length > 0 ? e.features[0] : null)
            .filter(e => e !== null)
            .distinctUntilChanged((prev, next) => {
              if (prev === next) { return false; }
              if (prev === null || next === null) { return true; }
              return prev['properties']['GEOID'] === next['properties']['GEOID'];
            });
        };

        this.featureMouseMove
          .subscribe(e => this.updatePopupLocation(e));
        distinctFeature(this.featureMouseMove.debounceTime(150))
          .subscribe(feat => this.updateActiveFeature(feat));
        distinctFeature(this.featureMouseMove.debounceTime(50))
          .subscribe(feat => this.updatePopupContent(feat));
      });
    }
    this.ready.emit(this.map);
  }

  /**
   * Bind to map events for zoom and any specified event layers
   */
  private setupEmitters() {
    this.map.on('moveend', (e) => this.moveEnd.emit(e));
    // Emit feature on zoom end to account for geography details changing across zooms
    this.map.on('zoomend', () => this.zoomEnd.emit(this.map.getZoom()));
    this.map.on('data', (e) =>  this.mapService.setLoading(!this.map.areTilesLoaded()));
    this.map.on('dataloading', (e) => this.mapService.setLoading(!this.map.areTilesLoaded()));
    this.eventLayers.forEach((layer) => {
      if (this.platform.isLargerThanMobile) {
        this.map.on('mouseenter', layer, (ev) => this.onMouseEnterFeature(ev));
        this.map.on('mouseleave', layer, (ev) => this.onMouseLeaveFeature());
        this.map.on('mousemove', layer, (ev) => this.featureMouseMove.emit(ev));
      }
      this.map.on('click', layer, (e) => {
        if (e.features.length) {
          this.featureClick.emit(e.features[0]);
        }
      });
    });
  }

  private updatePopupLocation(e: any) {
    if (!e.hasOwnProperty('lngLat')) {
      this.popup.remove();
    } else if (this.popup.isOpen()) {
      this.popup.setLngLat(e.lngLat);
    }
  }

  /**
   * Update hover tooltip content
   */
  private updatePopupContent(feature: MapFeature | null) {
    // Since fires before updating outline, remove outline
    this.mapService.setSourceData('hover');
    if (!feature) {
      this.popup.remove();
      return;
    }
    const labelLayerId = `${feature['layer']['id']}_text`;
    const mapLayers = this.mapStyle['layers'].map(l => l.id);

    let updatePopup;
    // Check if label layer exists, otherwise update
    if (mapLayers.indexOf(labelLayerId) === -1) {
      updatePopup = true;
    } else {
      // If label layer exists and has text-opacity with stops not visible, update popup
      const labelLayer = this.mapStyle['layers'].filter(l => l.id === labelLayerId)[0];
      updatePopup = (
        labelLayer['paint'].hasOwnProperty('text-opacity') &&
        labelLayer['paint']['text-opacity'].hasOwnProperty('stops') &&
        labelLayer['paint']['text-opacity']['stops'][0][0] >= this.map.getZoom()
      );
    }

    if (updatePopup) {
      this.popup.setHTML(`${feature.properties.n}, ${feature.properties.pl}`);
      if (!this.popup.isOpen()) {
        this.popup.addTo(this.map);
      }
    } else {
      this.popup.remove();
    }
  }
}
