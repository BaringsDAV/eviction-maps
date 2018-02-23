import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { HttpClient, HttpResponse, HttpHeaders } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import * as SphericalMercator from '@mapbox/sphericalmercator';
import * as vt from '@mapbox/vector-tile';
import * as Protobuf from 'pbf';
import * as inside from '@turf/inside';
import * as bbox from '@turf/bbox';
import 'rxjs/add/observable/forkJoin';
import * as _isEqual from 'lodash.isequal';
import * as polylabel from 'polylabel';
import * as geoViewport from '@mapbox/geo-viewport';

import { environment } from '../../environments/environment';
import { PlatformService } from '../services/platform.service';
import { MapDataAttribute } from './data/map-data-attribute';
import { MapLayerGroup } from './data/map-layer-group';
import { MapFeature } from './map/map-feature';
import { DataAttributes } from './data/data-attributes';
import { DataLevels } from './data/data-levels';
import { AnalyticsService } from '../services/analytics.service';

@Injectable()
export class MapToolService {
  dataLevels = DataLevels;
  dataAttributes = DataAttributes;
  /** Attributes to track the current state */
  activeYear;
  activeFeatures: MapFeature[] = [];
  activeDataLevel: MapLayerGroup = DataLevels[0];
  activeDataHighlight: MapDataAttribute = this.choroplethAttributes[0];
  activeBubbleHighlight: MapDataAttribute = this.bubbleAttributes[0];
  activeGraphType = 'line';
  activeLineYearStart = environment.minYear;
  activeLineYearEnd = environment.maxYear;
  activeShowGraphAvg = true;
  embed = false;
  activeMapView;
  mapConfig;
  usAverage;

  get choroplethAttributes() {
    return this.dataAttributes.filter(d => d.type === 'choropleth');
  }
  get bubbleAttributes() {
    return this.dataAttributes.filter(d => d.type === 'bubble');
  }
  get cardAttributes() {
    return this.dataAttributes.filter(d => d.id !== 'none');
  }
  private mercator = new SphericalMercator({ size: 256 });
  private tileBase = environment.tileBaseUrl;
  private tilePrefix = 'evictions-';
  private tilesetYears = ['00', '10'];
  private queryZoom = 10;

  constructor(
    private http: HttpClient,
    private translate: TranslateService,
    private analytics: AnalyticsService,
    private platform: PlatformService
  ) {
    this.updateLanguage(translate.translations);
    translate.onLangChange.subscribe((lang) => {
      this.updateLanguage(lang.translations);
    });
  }

  updateLanguage(translations) {
    // translate census attribute names
    if (translations.hasOwnProperty('STATS')) {
      const stats = translations['STATS'];
      this.dataAttributes = this.dataAttributes.map((a) => {
        if (a.langKey) { a.name = stats[ a.langKey.split('.')[1] ]; }
        return a;
      });
    }
    // translate geography layers
    if (translations.hasOwnProperty('LAYERS')) {
      const layers = translations['LAYERS'];
      this.dataLevels = this.dataLevels.map((l) => {
        if (l.langKey) { l.name = layers[ l.langKey.split('.')[1] ]; }
        return l;
      });
    }
  }

  /**
   * Sets the choropleth layer based on the provided `DataAttributes` ID
   * @param id string corresponding to the `MapDataAttribute` in `DataAttributes`
   */
  setChoroplethHighlight(id: string) {
    const dataAttr = this.choroplethAttributes.find((attr) => attr.id === id);
    if (dataAttr) {
      this.activeDataHighlight = dataAttr;
    }
  }

  /**
   * Sets the bubble layer based on the provided `BubbleAttributes` ID
   * @param id string corresponding to the `MapDataAttribute` in `BubbleAttributes`
   */
  setBubbleHighlight(id: string) {
    const bubbleAttr = this.bubbleAttributes.find((attr) => attr.id === id);
    if (bubbleAttr) {
      this.activeBubbleHighlight = bubbleAttr;
    }
  }

  /**
   * Sets the layer geography based on the provided `DataLevels` ID
   * @param id string of the MapLayerGroup in `DataLevels`
   */
  setGeographyLevel(id: string) {
    const geoLevel = this.dataLevels.find((level) => level.id === id);
    if (geoLevel) {
      this.activeDataLevel = geoLevel;
    }
  }

  /** Sets the type of graph to show in the data panel */
  setGraphType(type: string) {
    this.activeGraphType = type;
  }

  /** */
  setLocations(locations) {
    locations.forEach(l => {
      this.getTileData(l.layer, l.lonLat, null, true)
        .subscribe((data) => { this.addLocation(data); });
    });
  }

  /**
   * Sets the bounding box for the map to focus to
   * @param mapBounds an array with four coordinates representing west, south, east, north
   */
  setMapBounds(mapBounds: Array<any>) {
    this.activeMapView = mapBounds.map(b => +b);
    this.mapConfig = {
      ...this.mapConfig,
      ...geoViewport.viewport(this.activeMapView,
        [this.platform.viewportWidth, this.platform.viewportHeight])
    };
  }

  /**
   * Configures the data service based on any route parameters
   */
  setCurrentData(data: Object) {
    this.translate.use(data['lang'] || 'en');
    if (data['year']) { this.activeYear = data['year']; }
    if (data['geography']) {
      const geo = data['geography'];
      if (geo !== 'auto') { this.setGeographyLevel(geo); }
    }
    if (data['bounds']) {
      const b = data['bounds'].split(',');
      if (b.length === 4) { this.setMapBounds(b); }
    }
    if (data['choropleth']) { this.setChoroplethHighlight(data['choropleth']); }
    if (data['type']) { this.setBubbleHighlight(data['type']); }
    if (data['locations']) {
      const locations = this.getLocationsFromString(data['locations']);
      this.setLocations(locations);
    }
    if (data['graph']) { this.setGraphType(data['graph']); }
  }

  getCurrentData() {
    const locations = this.activeFeatures.map((f, i, arr) => {
      const lonLat = this.getFeatureLonLat(f).map(v => Math.round(v * 1000) / 1000);
      return f.properties['layerId'] + ',' + lonLat[0] + ',' + lonLat[1];
    }).join('+');
    return {
      year: this.activeYear,
      geography: this.activeDataLevel.id,
      bounds: this.activeMapView ? this.activeMapView.join() : null,
      lang: this.translate.currentLang,
      type: this.stripYearFromAttr(this.activeBubbleHighlight.id),
      choropleth: this.stripYearFromAttr(this.activeDataHighlight.id),
      locations: locations,
      graph: this.activeGraphType
    };
  }

  /**
   * Gets a string representing the current state for analytics tracking. String
   * is formatted as:
   *    <Map OR Rankings>|<evictionDataType>|<censusDataSelected>|<locationSelectedLevel>|
   *    <First Location Selected>|<number of locations selected>
   */
  getCurrentDataString() {
    const numSelected = this.activeFeatures.length;
    const firstSelected = numSelected > 0 ?
      this.getFullLocationName(this.activeFeatures[0]) : 'none';
    const data = [
      'map-tool',
      this.activeBubbleHighlight.langKey,
      this.activeDataHighlight.langKey,
      this.activeDataLevel.langKey,
      firstSelected,
      numSelected
    ];
    return data.join('|');
  }

  /**
   * Removes a location from the cards and data panel
   */
  removeLocation(feature) {
    const featuresCopy = this.activeFeatures.slice();
    const i = featuresCopy.findIndex((f) => _isEqual(f, feature));
    if (i > -1) {
      featuresCopy.splice(i, 1);
      this.activeFeatures = featuresCopy;
    }
  }

  /**
   * Adds or updates a location to the cards and data panel
   * @param feature the feature for the corresponding location to add
   * @returns boolean based on if the max number of locations is reached or not
   */
  addLocation(feature): boolean {
    const exists = this.activeFeatures
      .find(f => f.properties.GEOID === feature.properties.GEOID);
    if (exists) { return null; }
    // Process feature if bbox and layerId not included based on current data level
    if (!(feature.bbox && feature.properties.layerId)) {
      feature = this.processMapFeature(feature);
    }
    const maxLocations = (this.activeFeatures.length >= 3);
    if (!maxLocations) {
      this.activeFeatures = [...this.activeFeatures, feature];
      // track comparissons added
      if (this.activeFeatures.length === 2) {
        this.analytics.trackEvent('secondaryLocationSelection', {
          secondaryLocation: this.getFullLocationName(this.activeFeatures[1]),
          locationSelectedLevel: this.activeFeatures[1].properties.layerId,
          combinedSelections: this.getCurrentDataString()
        });
      }
      if (this.activeFeatures.length === 3) {
        this.analytics.trackEvent('tertiaryLocationSelection', {
          tertiaryLocationSelection: this.getFullLocationName(this.activeFeatures[2]),
          locationSelectedLevel: this.activeFeatures[2].properties.layerId,
          combinedSelections: this.getCurrentDataString()
        });
      }
    }
    return maxLocations;
  }

  /**
   * Updates an active feature with updated geometry and properties
   * @param feature the active feature to update
   */
  updateLocation(feature: MapFeature) {
    // Process feature if bbox and layerId not included based on current data level
    if (!(feature.bbox && feature.properties.layerId)) {
      feature = this.processMapFeature(feature);
    }
    this.activeFeatures = this.activeFeatures.map(f => {
      if (feature.properties.GEOID === f.properties.GEOID) {
        f.properties = feature.properties;
        f.geometry = feature.geometry;
      }
      return f;
    });
  }

  /**
   * Gets a LonLat value for the center of the feature
   * @param feature
   */
  getFeatureLonLat(feature): Array<number> {
    const coords = feature.geometry['type'] === 'MultiPolygon' ?
      feature.geometry['coordinates'][0] : feature.geometry['coordinates'];
    return polylabel(coords, 1.0);
  }

  /**
   * Takes the layer to be queried and coordinates for an object,
   * determines which tile to request, parses it, and then returns
   * the first feature that the includes the coordinate point
   *
   * @param layerId ID of layer to query for tile data
   * @param lonLat array of [lon, lat]
   * @param featName feature name to check as fallback
   * @param multiYear specifies whether to merge multiple year tiles
   */
  getTileData(
    layerId: string, lonLat: number[], featName: string | null, multiYear = false
  ): Observable<MapFeature> {
    const coords = this.getXYFromLonLat(lonLat);
    const parseTile = this.getParser(layerId, lonLat, featName);
    if (multiYear) {
      const tileRequests = this.tilesetYears.map((y) => {
        return this.requestTile(layerId, coords, y).map(parseTile);
      });
      return Observable.forkJoin(tileRequests).map(this.mergeFeatureProperties.bind(this));
    } else {
      return this.requestTile(layerId, coords).map(parseTile);
    }
  }

  /**
   * Get the X/Y coords based on lonLat
   * @param lonLat
   */
  getXYFromLonLat(lonLat) {
    const xyzCoords = this.mercator.xyz(
      [lonLat[0], lonLat[1], lonLat[0], lonLat[1]], this.queryZoom
    );
    return { x: xyzCoords.maxX, y: xyzCoords.maxY };
  }

  /**
   * Gets the longitude and latitude from x, y, and z values.
   */
  getLonLatFromXYZ(x: number, y: number, z: number = this.queryZoom) {
    const bbox = this.mercator.bbox(x, y, z);
    return [ ((bbox[0] + bbox[2]) / 2), ((bbox[1] + bbox[3]) / 2) ];
  }


  /**
   * Processes the bounding box and properties of a feature returned
   * from the
   * @param layerId
   * @param feature
   */
  processMapFeature(feature: MapFeature, layerId?: string): MapFeature {
    // Add layer if specified or included on feature (usually on click)
    if (layerId) {
      feature.properties.layerId = layerId;
    } else if (feature['layer']) {
      feature.properties.layerId = feature['layer']['id'];
    }
    feature.bbox = [
      +feature.properties['west'],
      +feature.properties['south'],
      +feature.properties['east'],
      +feature.properties['north']
    ];
    // Add evictions-per-day property
    Object.keys(feature.properties)
      .filter(p => p.startsWith('e-'))
      .forEach(p => {
        const evictions = +feature.properties[p];
        const yearSuffix = p.split('-').slice(1)[0];
        const daysInYear = +yearSuffix % 4 === 0 ? 366 : 365;
        const evictionsPerDay = evictions > 0 ? +(evictions / daysInYear).toFixed(2) : -1;
        feature.properties[`epd-${yearSuffix}`] = evictionsPerDay;
      });
    return feature;
  }

  loadUSAverage() {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    this.http.get(environment.usAverageDataUrl, { headers: headers })
      .subscribe(data => this.usAverage = data);
  }

  /** Gets a location string for a feature, including its parent location */
  getFullLocationName(feature: MapFeature) {
    return feature.properties.n + ', ' + feature.properties.pl;
  }

  /** Gets a string with all of the active locations, separated by a semicolon */
  getActiveLocationNames() {
    return this.activeFeatures.map(f => this.getFullLocationName(f)).join(';');
  }

  private stripYearFromAttr(attr: string) {
    return attr.split('-')[0];
  }

  /**
   * Returns a function to parse the tile response from the tile HTTP request
   * @param layerId
   * @param lonLat
   */
  private getParser(layerId, lonLat, featName) {
    const point = this.getPoint(lonLat);
    const coords = this.getXYFromLonLat(lonLat);
    return (res: ArrayBuffer): MapFeature => {
      const tile = new vt.VectorTile(new Protobuf(res));
      const layer = tile.layers[layerId];
      const features = [...Array(layer.length)].fill(null).map((d, i) => {
        return layer.feature(i).toGeoJSON(coords.x, coords.y, 10);
      });

      let matchFeat;
      const containsPoint = features.filter(feat => inside(point, feat));
      if (containsPoint.length) {
        matchFeat = containsPoint[0];
      } else {
        // Check if featName is non-null, filter featurues by it if exists
        const matchesName = featName ? features.filter(feat =>
          feat.properties.n.toLowerCase().startsWith(featName.toLowerCase())) : features;
        matchFeat = matchesName.length ? matchesName[0] : false;
      }

      if (matchFeat) {
        return this.processMapFeature(matchFeat, layerId);
      }

      return {} as MapFeature;
    };
  }

  /**
   * Gets a GeoJSON feature for a point at the given `lonLat`
   * @param lonLat
   */
  private getPoint(lonLat): GeoJSON.Feature<GeoJSON.Point> {
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: lonLat },
      properties: {}
    } as GeoJSON.Feature<GeoJSON.Point>;
  }

  /**
   * Merges the properties in an array of features
   * @param features an array of features
   */
  private mergeFeatureProperties(features: any[]) {
    const feat = features[0];
    for (let i = 1; i < this.tilesetYears.length; ++i) {
      feat['properties'] = { ...feat['properties'], ...features[i]['properties']};
    }
    return feat as MapFeature;
  }

  /**
   * Requests a tile based on the provided layer, coordinates, and year
   * @param layerId
   * @param coords
   * @param year
   */
  private requestTile(layerId: string, coords: any, year = null) {
    const tilesetUrl = year ?
      this.tileBase + this.tilePrefix + layerId + '-' + year :
      this.tileBase + this.tilePrefix + layerId;
    return this.http.get(
      `${tilesetUrl}/${this.queryZoom}/${coords.x}/${coords.y}.pbf`,
      { responseType: 'arraybuffer' }
    );
  }

  /**
   * Gets an array of objects containing the layer type and
   * longitude / latitude coordinates for the locations in the string.
   * @param locations string that represents locations
   */
  private getLocationsFromString(locations: string) {
    return locations.split('+').map(loc => {
      const locArray = loc.split(',');
      if (locArray.length !== 3) { return null; } // invalid location
      return {
        layer: locArray[0],
        lonLat: [ parseFloat(locArray[1]), parseFloat(locArray[2]) ]
      };
    }).filter(loc => loc); // filter null values
  }

}
