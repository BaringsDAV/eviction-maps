import { Component, OnInit, OnChanges, HostBinding, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/distinctUntilChanged';
import * as _isEqual from 'lodash.isequal';

import { MapDataAttribute } from '../map-data-attribute';
import { MapLayerGroup } from '../map-layer-group';
import { MapDataObject } from '../map-data-object';
import { MapFeature } from '../map-feature';
import { MapboxComponent } from '../mapbox/mapbox.component';
import { MapService } from '../map.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  providers: [ MapService ]
})
export class MapComponent implements OnInit, OnChanges {
  /** Sets and gets the bounds for the map */
  @Input()
  get boundingBox() { return this._store.bounds; }
  set boundingBox(val) {
    if (val && !_isEqual(val, this._store.bounds) && val.length === 4) {
      this._store.bounds =
        val.map(v => Math.round(v * 1000) / 1000); // round bounds to 3 decimals
      if (this._mapInstance) {
        this.map.zoomToBoundingBox(this._store.bounds);
      }
      this.boundingBoxChange.emit(this._store.bounds);
    }
  }

  /** Sets and gets the bubble attribute to display on the map */
  @Input()
  set selectedBubble(newBubble: MapDataAttribute) {
    this._store.bubble = newBubble;
    this.selectedBubbleChange.emit(newBubble);
    this.updateMapBubbles();
    this.updateCardProperties();
  }
  get selectedBubble(): MapDataAttribute { return this._store.bubble; }

  /** Sets and gets the choropleth attribute to display on the map */
  @Input()
  set selectedChoropleth(newChoropleth: MapDataAttribute) {
    this._store.choropleth = newChoropleth;
    this.selectedChoroplethChange.emit(newChoropleth);
    this.updateMapChoropleths();
    this.updateCardProperties();
  }
  get selectedChoropleth(): MapDataAttribute { return this._store.choropleth; }

  /** Sets and gets the layer to display on the map */
  @Input()
  set selectedLayer(newLayer: MapLayerGroup) {
    this._store.layer = newLayer;
    this.selectedLayerChange.emit(newLayer);
    this.updateMapData();
  }
  get selectedLayer(): MapLayerGroup { return this._store.layer; }

  /** Sets and gets the year to display data on the map */
  @Input()
  set year(newYear: number) {
    this._store.year = newYear;
    if (newYear) {
      this.yearChange.emit(newYear);
      if (this._mapInstance) {
        this.updateCensusYear();
        this.updateMapData();
      }
    }
  }
  get year() { return this._store.year; }

  /** Mapboxgl map configuration */
  @Input() mapConfig;
  /** Options available for bubbles */
  @Input() bubbleOptions: MapDataAttribute[] = [];
  /** Options available for choropleths */
  @Input() choroplethOptions: MapDataAttribute[] = [];
  /** Available layers to toggle between */
  @Input() layerOptions: MapLayerGroup[] = [];
  /** Toggle for auto switch between layerOptions based on min / max zooms */
  @Input() autoSwitch = true;
  /** Handles if zoom is enabled on the map */
  @Input() scrollZoom: boolean;
  /** Tracks the vertical (scroll) offset */
  @Input() verticalOffset = 0;
  /** Tracks the currently selected menu item for mobile menu */
  @Input() activeMenuItem: string;
  @Input() activeFeatures: MapFeature[] = [];
  @Output() clickedCardHeader: EventEmitter<any> = new EventEmitter();
  @Output() dismissedCard: EventEmitter<any> = new EventEmitter();
  @Output() featureClick: EventEmitter<any> = new EventEmitter();
  @Output() featureHover: EventEmitter<any> = new EventEmitter();
  @Output() boundingBoxChange: EventEmitter<Array<number>> = new EventEmitter();
  @Output() yearChange: EventEmitter<number> = new EventEmitter();
  @Output() selectedLayerChange: EventEmitter<MapLayerGroup> = new EventEmitter();
  @Output() selectedBubbleChange: EventEmitter<MapDataAttribute> = new EventEmitter();
  @Output() selectedChoroplethChange: EventEmitter<MapDataAttribute> = new EventEmitter();
  @Output() showDataClick = new EventEmitter();
  @Output() showMapClick = new EventEmitter();
  @HostBinding('class.cards-active') get cardsActive() {
    return this.activeFeatures.length;
  }
  @HostBinding('class.slider-active') get sliderActive() {
    return (this.selectedBubble && this.selectedBubble.name !== 'None') ||
      (this.selectedChoropleth && this.selectedChoropleth.name !== 'None') ||
      this.cardsActive;
  }
  /** Gets the layers available at the current zoom */
  get selectDataLevels(): Array<MapLayerGroup> {
    return (this.layerOptions.filter((l) => l.minzoom <= this.zoom) || []);
  }
  /** Gets if the legend should be shown or not */
  get showLegend(): boolean {
    return this.selectedLayer &&
      this.selectedChoropleth &&
      this.selectedChoropleth.name !== 'None';
  }
  /** Gets if the legend is full width */
  get fullWidth(): boolean { return window.innerWidth >= 767; }
  censusYear = 2010;
  mapLoading = false;
  mapEventLayers: Array<string>;
  cardProps;
  private zoom = 3;
  private _store = {
    layer: null,
    bubble: null,
    choropleth: null,
    year: null,
    bounds: null
  };
  private _mapInstance;
  // switch to restore auto switching layers once a map move has ended.
  private restoreAutoSwitch = false;

  constructor(private map: MapService) { }

  ngOnInit() {
    this.mapEventLayers = this.layerOptions.map((layer) => layer.id);
    this.updateCardProperties();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.scrollZoom) {
      changes.scrollZoom.currentValue ? this.enableZoom() : this.disableZoom();
    }
  }

  /**
   * Sets the visibility on a layer group
   * @param mapLayer the layer group that was selected
   */
  setGroupVisibility(layerGroup: MapLayerGroup) {
    if (this._mapInstance) {
      // Only change data level and turn off auto switch if wasn't already
      // changed by the onMapZoom event handler
      if (this.selectedLayer !== layerGroup) {
        this.selectedLayer = layerGroup;
        this.autoSwitch = false;
        this.restoreAutoSwitch = false;
      }
      this.layerOptions.forEach((group: MapLayerGroup) => {
        this.map.setLayerGroupVisibility(group, (group.id === layerGroup.id));
      });
      // Reset the hover layer
      this.map.setSourceData('hover');
    }
  }

  /**
   * Zoom to Point feature
   * @param feature Point feature
   */
  zoomToPointFeature(feature: MapFeature) {
    this.map.zoomToPoint(feature);
  }

  /**
   * Zoom to Polygon feature
   * @param feature Polygon feature
   */
  zoomToFeature(feature: MapFeature) {
    this.map.zoomToFeature(feature);
  }

  /**
   * Zoom to bounding box
   * @param bbox
   */
  zoomToBoundingBox(bbox: number[]) {
    this.map.zoomToBoundingBox(bbox);
  }

  /**
   * Set the map instance, the data level, highlight layer, current year, and zoom
   * handler when the map is ready
   * @param map mapbox instance
   */
  onMapReady(map) {
    this._mapInstance = map;
    this.map.setMapInstance(map);
    this.map.setupHoverPopup(this.mapEventLayers);
    this.setGroupVisibility(this.selectedLayer);
    this.updateCensusYear();
    this.updateMapData();
    this.map.isLoading$.distinctUntilChanged()
      .debounceTime(200)
      .subscribe((state) => { this.mapLoading = state; });
    if (this.boundingBox) {
      this.map.zoomToBoundingBox(this.boundingBox);
      // Only toggle if autoSwitch is currently on
      if (this.autoSwitch) {
        this.autoSwitch = false; // needs to be off when navigating to a param location
        this.restoreAutoSwitch = true; // restore auto switch after zoom
      }
    }
  }

  /**
   * Set the zoom value for the app, auto adjust layers if enabled
   * @param zoom the current zoom level of the map
   */
  onMapZoom(zoom) {
    this.zoom = zoom;
    if (this.selectedLayer && this.selectedLayer.minzoom > zoom) {
      this.autoSwitch = true;
    }
    if (this.autoSwitch) {
      const visibleGroups = this.map.filterLayerGroupsByZoom(this.layerOptions, zoom);
      if (visibleGroups.length > 0) {
        if (this.selectedLayer !== visibleGroups[0]) {
          this.selectedLayer = visibleGroups[0];
        }
      }
    }
  }

  enableZoom() { return this.map.enableZoom(); }
  disableZoom() { return this.map.disableZoom(); }

  /**
   * Emits the new bounds of the current map view anytime the map finishes moving
   * @param e the moveend event
   */
  onMapMoveEnd(e) {
    this._store.bounds = this.map.getBoundsArray()
      .reduce((a, b) => a.concat(b))
      .map(v => Math.round(v * 1000) / 1000);
    this.boundingBoxChange.emit(this._store.bounds);
    if (this.restoreAutoSwitch) { this.autoSwitch = true; }
  }

  /**
   * Activates a feature if it is currently in a "hovered" state
   * If the feature is not yet in a "hovered" state, set the feature
   * as hovered.
   * @param feature the map feature
   */
  onFeatureClick(feature) {
    if (feature && feature.properties) {
      this.featureClick.emit(feature);
    }
  }

  /**
   * Sets the tooltip and highlighted shape on the map
   * @param feature the feature being hovered (or null if no longer hovering)
   */
  onFeatureHover(feature) {
    this.featureHover.emit(feature);
    if (feature && feature.layer.id === this.selectedLayer.id) {
      const union = this.map.getUnionFeature(this.selectedLayer.id, feature);
      this.map.setSourceData('hover', union);
    } else {
      this.map.setSourceData('hover');
    }
  }

  /**
   * Gets the currently active data attribute with the year appended
   * @param type either 'choropleth' or 'bubble'
   */
  private getAttributeWithYear(type: string) {
    const data = (type === 'choropleth') ? this.selectedChoropleth : this.selectedBubble;
    return this.addYearToObject(data, this.year);
  }

  /**
   * Add year to data attribute or level from selector
   * @param dataObject
   * @param year
   */
  private addYearToObject(dataObject: MapDataObject, year: number): MapDataObject {
    if (!dataObject) { return null; }
    if (/.*\d{2}.*/g.test(dataObject.id)) {
      dataObject.id = dataObject.id.replace(/\d{2}/g, ('' + year).slice(2));
    } else {
      dataObject.id += '-' + ('' + year).slice(2);
    }
    return dataObject;
  }

  /**
   * Checks to see if the current year is in a different census source
   * and updates if it is.
   */
  private updateCensusYear() {
    // Get census year, check if changed, update sources only if it did
    const censusYear = this.yearToCensusYear(this.year);
    if (this.censusYear !== censusYear) {
      this.censusYear = censusYear;
      this.map.updateCensusSource(this.layerOptions, ('' + this.censusYear).slice(2));
    }
  }

  /**
   * Convert any year to the nearest decennial census year
   * @param year
   */
  private yearToCensusYear(year: number) {
    return Math.floor(year / 10) * 10;
  }

  /**
   * Updates card properties to correspond to selected data
   */
  private updateCardProperties() {
    if (
      this.bubbleOptions.length === 0 || this.choroplethOptions.length === 0 ||
      !this.selectedBubble || !this.selectedChoropleth
    ) { return; }
    const cardProps = {};
    const bubbleStat = (this.selectedBubble.name === 'None') ?
      this.bubbleOptions[1] : this.selectedBubble;
    const choroStat = (!this.selectedChoropleth || this.selectedChoropleth.name === 'None') ?
      null : this.selectedChoropleth;
    // need to strip the year from the ID to pass to location cards
    cardProps[bubbleStat.id.split('-')[0]] = bubbleStat.name;
    // dropping the 'r' from the stat and removing the word "rate"
    // TODO: we should have a better way of managing these labels
    cardProps[bubbleStat.id.split('-')[0].slice(0, -1)] = bubbleStat.name.replace(' Rate', 's');
    if (choroStat) {
      cardProps[choroStat.id.split('-')[0]] = choroStat.name;
    }
    this.cardProps = cardProps;
  }

  /**
   * Updates the bubbles on the map, based on the current year ans selected
   * bubble attribute.
   */
  private updateMapBubbles() {
    if (this._mapInstance) {
      const bubble = this.addYearToObject(this.selectedBubble, this.year);
      if (bubble) {
        this.mapEventLayers.forEach((layerId) => {
          ['circle-radius', 'circle-color', 'circle-stroke-color'].forEach(prop => {
            this.map.setLayerDataProperty(`${layerId}_bubbles`, prop, bubble.id);
          });
        });
      }
    }
  }

  /**
   * Updates the choropleths on the map, based on the current year ans selected
   * choropleth attribute.
   */
  private updateMapChoropleths() {
    if (this._mapInstance) {
      const choropleth =
        this.addYearToObject(this.selectedChoropleth, this.year) as MapDataAttribute;
      if (choropleth) {
        this.mapEventLayers.forEach((layerId) => {
            const newFill = {
              'property': choropleth.id,
              'default': choropleth.default,
              'stops': (choropleth.fillStops[layerId] ?
                choropleth.fillStops[layerId] : choropleth.fillStops['default'])
            };
            this.map.setLayerStyle(layerId, 'fill-color', newFill);
            this.map.setLayerFilterProperty(`${layerId}_null`, choropleth.id);
        });
      }
    }
  }

  /**
   * Updates the bubbles and choropleths on the map with the currently
   * selected layer, bubble, choropleth, and year.
   */
  private updateMapData() {
    this.updateMapBubbles();
    this.updateMapChoropleths();
  }
}