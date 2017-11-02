import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/distinctUntilChanged';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import * as _isEqual from 'lodash.isequal';

import { MapDataAttribute } from '../map-data-attribute';
import { MapLayerGroup } from '../map-layer-group';
import { MapDataObject } from '../map-data-object';
import { MapFeature } from '../map-feature';
import { MapboxComponent } from '../mapbox/mapbox.component';
import { MapService } from '../map.service';
import { DataLevels } from '../../../data/data-levels';
import { DataAttributes, BubbleAttributes } from '../../../data/data-attributes';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  providers: [ MapService ]
})
export class MapComponent {
  @Input()
  get boundingBox() { return this._bounds; }
  set boundingBox(val) {
    if (!_isEqual(val, this._bounds)) {
      this._bounds = val;
      this.map.zoomToBoundingBox(val);
      this.bboxChange.emit(val);
    }
  }
  @Input() autoSwitch = true;
  @Output() featureClick: EventEmitter<any> = new EventEmitter();
  @Output() featureHover: EventEmitter<any> = new EventEmitter();
  @Output() yearChange: EventEmitter<number> = new EventEmitter();
  @Output() evictionTypeChange: EventEmitter<string> = new EventEmitter();
  @Output() bboxChange: EventEmitter<Array<number>> = new EventEmitter();
  zoom: number;
  dataYear = 2010;
  censusYear = 2010;
  dataLevels: Array<MapLayerGroup> = DataLevels;
  selectDataLevels: Array<MapLayerGroup> = DataLevels.filter(l => l.minzoom < 3);
  attributes: Array<MapDataAttribute> = DataAttributes;
  bubbleAttributes: Array<MapDataAttribute> = BubbleAttributes;
  mapFeatures: Observable<Object>;
  activeDataLevel: MapLayerGroup;
  activeDataHighlight: MapDataAttribute;
  activeBubbleHighlight: MapDataAttribute;
  mapConfig = {
    style: './assets/style.json',
    center: [-98.5556199, 39.8097343],
    zoom: 3,
    minZoom: 3,
    maxZoom: 14
  };
  legend;
  mapEventLayers: Array<string> =
    [ 'states', 'cities', 'tracts', 'block-groups', 'zip-codes', 'counties' ];
  mapLoading = false;
  private _bounds;
  private _mapInstance;

  constructor(
    private map: MapService,
    private _sanitizer: DomSanitizer
  ) { }

  /**
   * Sets the visibility on a layer group
   * @param mapLayer the layer group that was selected
   */
  setGroupVisibility(layerGroup: MapLayerGroup) {
    // Only change data level and turn off auto switch if wasn't already
    // changed by the onMapZoom event handler
    if (this.activeDataLevel !== layerGroup) {
      this.activeDataLevel = layerGroup;
      this.autoSwitch = false;
    }
    this.dataLevels.forEach((group: MapLayerGroup) => {
      this.map.setLayerGroupVisibility(group, (group.id === layerGroup.id));
    });
    // Reset the hover layer
    this.map.setSourceData('hover');
  }

  /**
   * Set data level based on layer ID string input
   * @param layerId layer ID string
   */
  setDataLevelFromLayer(layerId: string) {
    const dataLevel = this.dataLevels.filter(l => l.id === layerId)[0];
    this.setGroupVisibility(dataLevel);
  }

  /**
   * Sets the highlights (choropleths) to a different data property available in the tile data.
   * @param attr the map data attribute to set highlights for
   */
  setDataHighlight(attr: MapDataAttribute) {
    const dataAttr: MapDataAttribute = this.addYearToObject(attr, this.dataYear);
    this.activeDataHighlight = dataAttr;
    this.updateLegend();
    this.mapEventLayers.forEach((layerId) => {
      const newFill = {
        'property': dataAttr.id,
        'default': dataAttr.default,
        'stops': (dataAttr.fillStops[layerId] ?
          dataAttr.fillStops[layerId] : dataAttr.fillStops['default'])
      };
      this.map.setLayerStyle(layerId, 'fill-color', newFill);
      this.map.setLayerFilterProperty(`${layerId}_null`, dataAttr.id);
    });
  }

  /**
   * Similar to setDataHighlight, but specific to bubble layers
   * @param attr map data attribute to set bubble properties
   */
  setBubbleHighlight(attr: MapDataAttribute) {
    const bubbleAttr: MapDataAttribute = this.addYearToObject(attr, this.dataYear);
    this.activeBubbleHighlight = bubbleAttr;
    // Not used yet, but will be in future
    this.updateLegend();
    this.mapEventLayers.forEach((layerId) => {
      ['circle-radius', 'circle-color', 'circle-stroke-color'].forEach(prop => {
        this.map.setLayerDataProperty(`${layerId}_bubbles`, prop, attr.id);
      });
    });
  }

  /**
   * Sets the zoom level across both the map and zoom control components
   * @param zoomLevel new zoom level
   */
  setMapZoomLevel(zoomLevel: number) {
    this.zoom = +zoomLevel;
    this.map.setZoomLevel(zoomLevel);
  }

  /**
   * Zoom to Point feature
   * @param feature Point feature
   */
  zoomToPointFeature(feature: MapFeature) {
    this.map.zoomToPoint(feature);
  }

  /**
   * Sets the data year for the map, updates data highlights and layers
   * @param year
   */
  setDataYear(year: number) {
    this.yearChange.emit(year);
    this.dataYear = year;

    // Get census year, check if changed, update sources only if it did
    const censusYear = this.yearToCensusYear(year);
    if (this.censusYear !== censusYear) {
      this.censusYear = censusYear;
      this.map.updateCensusSource(this.dataLevels, ('' + this.censusYear).slice(2));
    }

    this.setDataHighlight(this.activeDataHighlight);
    this.setBubbleHighlight(this.activeBubbleHighlight);
    this.setGroupVisibility(this.activeDataLevel);
    this.updateLegend();
  }

  /**
   * Returns sanitized gradient for the legend
   */
  getLegendGradient() {
    return this._sanitizer.bypassSecurityTrustStyle(
      `linear-gradient(to right, ${this.legend[1][1]}, ${this.legend[this.legend.length - 1][1]})`
    );
  }

  /**
   * Update the legend to correspond to the fill stops on the active data highlight
   */
  updateLegend() {
    if (!this.activeDataLevel || !this.activeDataHighlight) {
      this.legend = null;
      return;
    }
    this.legend = this.activeDataHighlight.fillStops[this.activeDataLevel.id] ||
      this.activeDataHighlight.fillStops['default'];
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
    this.activeDataLevel = this.dataLevels[0];
    this.activeDataHighlight = this.attributes[0];
    this.activeBubbleHighlight = this.bubbleAttributes[0];
    this.setDataYear(this.dataYear);
    this.onMapZoom(this.mapConfig.zoom);
    this.autoSwitch = true;
    // FIXME: Doing a hack to get layers because we likely won't be loading them outside
    // of prototypes anyway
    setTimeout(() => { this.mapFeatures = this.map.queryMapLayer(this.activeDataLevel); }, 1000);
    this.map.isLoading$.distinctUntilChanged()
      .debounceTime(200)
      .subscribe((state) => { this.mapLoading = state; });
  }

  /**
   * Set the zoom value for the app, auto adjust layers if enabled
   * @param zoom the current zoom level of the map
   */
  onMapZoom(zoom) {
    this.zoom = zoom;
    this.selectDataLevels = DataLevels.filter((l) => l.minzoom <= zoom);
    if (this.activeDataLevel.minzoom > zoom) {
      this.autoSwitch = true;
    }
    if (this.autoSwitch) {
      const visibleGroups = this.map.filterLayerGroupsByZoom(this.dataLevels, zoom);
      if (visibleGroups.length > 0) {
        this.activeDataLevel = visibleGroups[0];
        this.mapFeatures = this.map.queryMapLayer(this.activeDataLevel);
        this.updateLegend();
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
    this._bounds = this.map.getBoundsArray();
    this.bboxChange.emit(this.boundingBox);
  }

  /**
   * Updates mapFeatures on map render
   * @param event
   */
  onMapRender(event) {
    if (this.activeDataLevel) {
      this.mapFeatures = this.map.queryMapLayer(this.activeDataLevel);
    }
  }

  /**
   * Activates a feature if it is currently in a "hovered" state
   * If the feature is not yet in a "hovered" state, set the feature
   * as hovered.
   * @param feature the map feature
   */
  onFeatureClick(feature) {
    if (feature && feature.properties) {
      console.log(feature);
      this.featureClick.emit(feature);
    }
  }

  /**
   * Sets the tooltip and highlighted shape on the map
   * @param feature the feature being hovered (or null if no longer hovering)
   */
  onFeatureHover(feature) {
    this.featureHover.emit(feature);
    if (feature && feature.layer.id === this.activeDataLevel.id) {
      const union = this.map.getUnionFeature(this.activeDataLevel.id, feature);
      this.map.setSourceData('hover', union);
    } else {
      this.map.setSourceData('hover');
    }
  }

  /**
   * Add year to data attribute or level from selector
   * @param dataObject
   * @param year
   */
  private addYearToObject(dataObject: MapDataObject, year: number) {
    if (/.*\d{2}.*/g.test(dataObject.id)) {
      dataObject.id = dataObject.id.replace(/\d{2}/g, ('' + year).slice(2));
    } else {
      dataObject.id += '-' + ('' + year).slice(2);
    }
    return dataObject;
  }

  /**
   * Convert any year to the nearest decennial census year
   * @param year
   */
  private yearToCensusYear(year: number) {
    return Math.floor(year / 10) * 10;
  }
}
