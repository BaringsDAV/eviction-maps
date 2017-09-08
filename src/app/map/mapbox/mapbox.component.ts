import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs/Observable';

import { MapLayerGroup } from '../../map/map-layer-group';

@Component({
  selector: 'app-mapbox',
  templateUrl: './mapbox.component.html',
  styleUrls: ['./mapbox.component.css']
})
export class MapboxComponent implements OnInit {
  map: any;
  @Input() mapConfig;
  @Input() eventLayers: Array<string> = [];
  @Output() ready: EventEmitter<any> = new EventEmitter();
  @Output() zoom: EventEmitter<number> = new EventEmitter();
  @Output() featureClick: EventEmitter<number> = new EventEmitter();
  @Output() featureMouseEnter: EventEmitter<any> = new EventEmitter();
  @Output() featureMouseLeave: EventEmitter<any> = new EventEmitter();
  @Output() featureMouseMove: EventEmitter<any> = new EventEmitter();

  constructor() {}

  ngOnInit() {}

  /**
   * Pass any .on() calls to the map instance
   * @param args any amount of arguments that would be passed to mapboxgl's .on()
   */
  on(...args: any[]) { return this.map.on.apply(this.map, arguments); }

  onMouseEnterFeature() { this.map.getCanvas().style.cursor = 'pointer'; }

  onMouseLeaveFeature() { this.map.getCanvas().style.cursor = ''; }

  /**
   * when the map is ready, bind the events
   * @param map mapbox instance
   */
  onMapInstance(map) {
    this.map = map;
    this.setupEmitters();
    this.featureMouseEnter.subscribe(this.onMouseEnterFeature.bind(this));
    this.featureMouseLeave.subscribe(this.onMouseLeaveFeature.bind(this));
    this.ready.emit(this.map);
  }

  /**
   * Bind to map events for zoom and any specified event layers
   */
  private setupEmitters() {
    // Emit all zoom end events from map
    this.map.on('zoom', (zoomEvent) => { this.zoom.emit(this.map.getZoom()); });
    this.eventLayers.forEach((layer) => {
      this.map.on('click', layer, (e) => { this.featureClick.emit(e); });
      this.map.on('mouseenter', layer, (e) => { this.featureMouseEnter.emit(e); });
      this.map.on('mouseleave', layer, (e) => { this.featureMouseLeave.emit(e); });
      this.map.on('mousemove', layer, (e) => { this.featureMouseMove.emit(e); });
    });
  }
}
