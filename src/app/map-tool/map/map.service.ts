import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { interval } from 'rxjs/observable/interval';
import 'rxjs/add/operator/distinct';
import 'rxjs/add/observable/fromEvent';
import * as bbox from '@turf/bbox';
import * as union from '@turf/union';
import * as polylabel from 'polylabel';
import area from '@turf/area';
import { coordAll } from '@turf/meta';
import * as _isEqual from 'lodash.isequal';  

import { MapLayerGroup } from '../data/map-layer-group';
import { MapFeature } from './map-feature';
import { LoadingService } from '../../services/loading.service';

@Injectable()
export class MapService {
  embedded = false;
  private map: mapboxgl.Map;
  private _zoom = new BehaviorSubject<number>(null);
  zoom$ = this._zoom.asObservable();
  private colors = ['#e24000', '#434878', '#2c897f'];
  get mapCreated() { return this.map !== undefined; }
  /** Returns true if highlighting features on hover is enabled */
  get hoverEnabled() { 
    return this._hoverEnabled && this._mapHighlights.length < this._maxLocations; 
  }
  private _debug = true;
  private _maxLocations = 3;
  private _mapHighlights = [];
  private _mapHover = [];
  private _hoverEnabled = true;

  constructor(private loader: LoadingService) { }

  /** Expose any MapboxGL API functions that are needed  */
  // https://www.mapbox.com/mapbox-gl-js/api/#map#setpaintproperty
  setLayerStyle(...args: any[]) { return this.map.setPaintProperty.apply(this.map, arguments); }
  // https://www.mapbox.com/mapbox-gl-js/api/#map#setfilter
  setLayerFilter(...args: any[]) { return this.map.setFilter.apply(this.map, arguments); }
  // https://www.mapbox.com/mapbox-gl-js/api/#map#setzoom
  setZoomLevel(...args: any[]) { return this.map.setZoom.apply(this.map, arguments); }
  enableZoom() { return (this.map ? this.map.scrollZoom.enable() : null); }
  disableZoom() { return (this.map ? this.map.scrollZoom.disable() : null); }

  /**
   * Create new Mapbox GL map from options object
   * @param options
   */
  createMap(options: Object) {
    const _tmpStyle = options['style'];
    options['style'] = {version: 8, sources: {}, layers: []};
    const map = new mapboxgl.Map(options);
    map.setStyle(_tmpStyle);
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();
    return map;
  }

  /** Set a map source as loading, and watch the source until it's loaded */
  setSourceLoading(sourceId: string) {
    if (this.loader.isItemLoading(sourceId)) { return; }
    const sourceLoaded$ = interval(200)
      .map(() => this.map.isSourceLoaded(sourceId))
      .filter(loaded => loaded)
      .take(1);
    this.loader.start(sourceId, sourceLoaded$);
  }

  setZoomEvent(zoom: number) {
    this._zoom.next(zoom);
  }

  /**
   * Sets the map instance for the service to control
   * @param map mapbox instance
   */
  setMapInstance(map) { this.map = map; }

  /**
   * Set the visibility for a mapbox layer
   * @param layerId layer id of the mapbox layer
   * @param visible sets the layer visible if true, or hides if false
   */
  setLayerVisibility(layerId: string, visible: boolean) {
    const visibility = visible ? 'visible' : 'none';
    if (this.map.getLayer(layerId)) {
      this.map.setLayoutProperty(layerId, 'visibility', visibility);
    }
  }

  /**
   * Set the visibility for a layer group
   * @param layerGroup the group of layers
   * @param visible sets the group visible if true, or hides if false
   */
  setLayerGroupVisibility(layerGroup: MapLayerGroup, visible: boolean) {
    layerGroup['layerIds'].forEach((layerId: string) => {
      this.setLayerVisibility(layerId, visible);
    });
  }

  /**
   * Update the layer styles of the layers within a group
   * @param layerGroup the layer group
   * @param styleProperty the paint style property to change (e.g. "fill-color")
   * @param newStyle the new property style (e.g. "#000000")
   */
  setLayerGroupStyle(layerGroup: MapLayerGroup, styleProperty: string, newStyle: any) {
    layerGroup['layerIds'].forEach((layerId) => {
      this.setLayerStyle(layerId, styleProperty, newStyle);
    });
  }

  /**
   * Update only the data property referenced in a map style
   * @param layerId
   * @param styleProperty
   * @param dataProperty
   */
  setLayerDataProperty(layerId: string, styleProperty: string, property: string) {
    const layerProperty = { ...this.map.getPaintProperty(layerId, styleProperty) };
    layerProperty['property'] = property;
    this.map.setPaintProperty(layerId, styleProperty, layerProperty);
  }

  /**
   * Updates the data property used in filters. Mostly used for updating null layers
   * @param layerId
   * @param property
   */
  setLayerFilterProperty(layerId: string, property: string) {
    const layerFilter = this.map.getFilter(layerId);
    layerFilter[1] = property;
    this.map.setFilter(layerId, layerFilter);
  }

  /**
   * Returns a boolean indicating if a layer has any features matching
   * the query
   *
   * @param layerId ID of vector tile layer to query
   * @param feature feature with attributes to query
   */
  isHighlightVisible(feature: MapFeature): boolean {
    const layerId = feature['properties']['layerId'] as string;
    return this.map.queryRenderedFeatures(undefined, {
      layers: [ layerId, 'highlight' ],
      filter: ['==', 'GEOID', feature.properties['GEOID']]
    }).length > 0;
  }

  /**
   * Queries a layer for all features matching the name and parent-location of
   * a supplied feature, returns a GeoJSON feature combining the geographies of
   * all matching features. Used to consolidate GeoJSON features split by tiling
   *
   * @param layerId ID of vector tile layer to query
   * @param feature feature with attributes to query
   */
  getUnionFeature(layerId: string, feature: MapFeature): GeoJSON.Feature<GeoJSON.Polygon> | null {
    const queryFeatures = this.map.queryRenderedFeatures(undefined, {
      layers: [ (layerId === 'states' ? 'boundary_state' : layerId) ],
      filter: ['==', 'GEOID', feature.properties['GEOID']]
    });
    this.debug('get union feature', layerId, feature['properties']['n'], queryFeatures);
    // Combine features, ignoring any TopologyExceptions
    try {
      const feats = queryFeatures.reduce((currFeat, nextFeat) => {
        return union(
          currFeat as GeoJSON.Feature<GeoJSON.Polygon>,
          nextFeat as GeoJSON.Feature<GeoJSON.Polygon>
        );
      }) as GeoJSON.Feature<GeoJSON.Polygon>;
      return feats;
    } catch (e) { }
  }

  /**
   * Gets the bounds of the current map view and returns an array
   */
  getBoundsArray() {
    return this.map.getBounds().toArray();
  }

  /** sets if map features should be highlighted on hover */
  setHoverEnabled(value: boolean) {
    this._hoverEnabled = value;
  }

  /** Updates the 'hover' source on the map if there is a new hovered feature */
  setHoveredFeature(feature) {
    if (!this.hoverEnabled) { return false; }
    const newFeature = feature ? [ feature ] : [];
    if (this.areFeaturesEqual(newFeature, this._mapHover)) { return; }
    this._mapHover = newFeature;
    this.setSourceData('hover', newFeature);
  }

  /** Checks if the geometry of two feature arrays are equal */
  areFeaturesEqual(f1:MapFeature[], f2: MapFeature[]) {
    if (f1.length !== f2.length) { return false; }
    if (f1.length === 0) { return true; }
    return f1
      .map((f,i) => _isEqual(f['geometry'], f2[i]['geometry']))
      .reduce((acc, curr) => acc ? curr : false);
  }

  /** Sets the highlighted features to the given feature array */
  setHighlightedFeatures(features: MapFeature[]) {
    if (this.areFeaturesEqual(features, this._mapHighlights)) { return; }
    this._mapHighlights = features;
    this.setSourceData('highlight', features);
  }

  /** Gets an updated feature geometry */
  getUpdatedFeature(layerId: string, f: MapFeature) {
    const featureActive = this.isHighlightVisible(f);
    const currentFeature = this._mapHighlights
      .find(sf => sf['properties']['GEOID'] === f['properties']['GEOID']);
    const updatedFeature = this.getUnionFeature(f.properties['layerId'] as string, f);
    if (!featureActive && !currentFeature) {
      // feature is not highlighted and not in the active layer - use bounding box
      f.geometry['type'] = 'Polygon';
      f.geometry['coordinates'] = this.bboxPolygon(f.bbox);
      return f;
    } else if (featureActive && updatedFeature) {
      // the feature is visible and has an updated geometry
      return updatedFeature;
    }
    // feature is not highlighted, but exists in _mapHighlights
    return currentFeature;
  }

  /**
   * Sets or updates highlight features
   * @param layerId String ID of current displayed map layer
   * @param features Array of active features to highlight
   */
  updateHighlightFeatures(layerId: string, features: MapFeature[]) {
    if (this.embedded) { return; }
    if (features.length === 0) { return this.setHighlightedFeatures([]); }
    console.time('time: update highlighted features');
    const highlightFeatures = features
      .map((f) => { return this.getUpdatedFeature(layerId, f); })
      .map((f, i) => { f['properties']['color'] = this.colors[i]; return f});
    this.setHighlightedFeatures(highlightFeatures);
    console.timeEnd('time: update highlighted features');
  }

  /**
   * Takes an array of layer groups and a source suffix (last two characters of a census
   * layer year) and updates each of the layers in that group to to appropriate source.
   *
   * Ordinarily would try to generalize this, but updating the map style for each layer
   * or even layer group seems unnecessary.
   * @param layerGroups
   * @param sourceSuffix i.e. 00, 10
   */
  updateCensusSource(layerGroups: MapLayerGroup[], sourceSuffix: string) {
    const mapStyle: mapboxgl.Style = this.map.getStyle();
    const layerPrefixes = layerGroups.map(l => l.id);

    mapStyle.layers.map(l => {
      const layerPrefix = l.id.split('_')[0];
      if (layerPrefixes.indexOf(layerPrefix) > -1) {
        l.source = `us-${layerPrefix}-${sourceSuffix}`;
      }
      return l;
    });
    this.map.setStyle(mapStyle);
  }

  /**
   * Hides all layer groups that do not have a zoom range that falls within `zoom`
   * @param layerGroups an array of MapLayerGroup objects, with zoom properties
   * @param zoom the zoom level to hide based on
   * @return an array of MapLayerGroup objects that are currently visible
   */
  filterLayerGroupsByZoom(layerGroups: Array<MapLayerGroup>, zoom: number): Array<MapLayerGroup> {
    const visibleGroups = [];
    layerGroups.forEach((group) => {
      if (!group.zoom) { group.zoom = [-1, -1]; }
      const visible = (zoom >= group.zoom[0] && zoom < group.zoom[1]);
      this.setLayerGroupVisibility(group, visible);
      if (visible) { visibleGroups.push(group); }
    });
    return visibleGroups;
  }

  /**
   * Queries visible map layer, returns observable with distinct map features
   * @param layerGroup
   */
  queryMapLayer(layerGroup: MapLayerGroup) {
    return Observable.from(this.map.queryRenderedFeatures(undefined, {layers: [layerGroup.id]}))
      .distinct((f: MapFeature) => f.properties.n);
  }

  /**
   * Zoom to supplied map features
   * @param feature
   */
  zoomToFeature(feature: MapFeature) {
    const featBbox = feature.hasOwnProperty('bbox') ? feature['bbox'] : bbox(feature);
    this.zoomToBoundingBox(featBbox);
  }

  /**
   * Zoom to supplied point feature
   * @param feature Point feature
   * @param zoom Zoom level
   */
  zoomToPoint(feature: MapFeature, zoom = 14) {
    this.map.flyTo({ center: feature.geometry['coordinates'], zoom: zoom });
  }

  /**
   * Zoom to supplied bounding box
   * @param box An array of 4 numbers representing the bounding box
   */
  zoomToBoundingBox(box: Array<number>) {
    this.map.fitBounds([
      [box[0], box[1]],
      [box[2], box[3]]
    ], { padding: 50 });
  }

  /**
   * Set the data of a GeoJSON layer source, or empty the data if no
   * feature supplied
   * @param sourceId ID of GeoJSON source to modify
   * @param features Array of MapFeature objects
   */
  private setSourceData(sourceId: string, features?: MapFeature[]) {
    this.debug('setting source data', sourceId, features);
    (this.map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData({
      'type': 'FeatureCollection',
      'features': features ? features : []
    });
  }

  /**
   * Based on @turf/bbox-polygon which isn't importing correctly
   * @param bbox Bounding box
   */
  private bboxPolygon(bbox: Array<number>): Array<Array<Array<number>>> {
    const west = bbox[0];
    const south = bbox[1];
    const east = bbox[2];
    const north = bbox[3];

    const lowLeft = [west, south];
    const topLeft = [west, north];
    const topRight = [east, north];
    const lowRight = [east, south];

    return [[
      lowLeft,
      lowRight,
      topRight,
      topLeft,
      lowLeft
    ]];
  }

  private debug(...args) {
    // tslint:disable-next-line
    this._debug ? console.debug.apply(console, args) : null;
  }
}
