import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import mapboxgl from 'mapbox-gl';

import { MapLayer } from '../map-ui/map-layer';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  mapConfig: Object;
  map: any;

  constructor() {
    this.mapConfig = {
      style: '/assets/style.json',
      center: [-77.99, 41.041480],
      zoom: 6.5,
      pitch: 0,
      bearing: 0,
      container: 'map'
    };
  }

  /**
   * Set the visibility for a mapbox layer
   * @param layerId layer id of the mapbox layer
   * @param visible sets the layer visible if true, or hides if false
   */
  setLayerVisibility(layerId: string, visible: boolean) {
    const visibility = visible ? 'visible' : 'none';
    if (this.map.style.getLayer(layerId)) {
      this.map.setLayoutProperty(layerId, 'visibility', visibility);
    }
  }

  /**
   * Set the visibility for a layer group
   * @param layerGroup the group of layers
   * @param visible sets the group visible if true, or hides if false
   */
  setLayerGroupVisibility(layerGroup: MapLayer, visible: boolean) {
    layerGroup['layerIds'].forEach((layerId: string) => {
      this.setLayerVisibility(layerId, visible);
    });
  }

  addPopup(e) {
    new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`<h1>${e.features[0].properties.NAME}</h1>
          <ul>
            <li>Poverty Rate: ${e.features[0].properties.poverty} </li>
            <li>Evictions: ${e.features[0].properties.evictions} </li>
            <li>Renters: ${e.features[0].properties.renters} </li>
            <li>Eviction Rate: ${e.features[0].properties.rate} </li>
          </ul>
        `)
        .addTo(this.map);
  }

  onMouseEnterFeature() {
    this.map.getCanvas().style.cursor = 'pointer';
  }

  onMouseLeaveFeature() {
    this.map.getCanvas().style.cursor = '';
  }

  onMapInstance(e) {
    console.log('setting map instance', e);
    this.map = e;
    this.map.on('click', 'states', this.addPopup.bind(this));
    this.map.on('click', 'counties', this.addPopup.bind(this));
    this.map.on('click', 'blockgroups', this.addPopup.bind(this));

    // Change the cursor to a pointer when the mouse is over the places layer.
    this.map.on('mouseenter', 'states', this.onMouseEnterFeature.bind(this));
    this.map.on('mouseenter', 'counties', this.onMouseEnterFeature.bind(this));
    this.map.on('mouseenter', 'blockgroups', this.onMouseEnterFeature.bind(this));

    // Change it back to a pointer when it leaves.
    this.map.on('mouseleave', 'states', this.onMouseLeaveFeature.bind(this));
    this.map.on('mouseleave', 'counties', this.onMouseLeaveFeature.bind(this));
    this.map.on('mouseleave', 'blockgroups', this.onMouseLeaveFeature.bind(this));

  }

  ngOnInit() {
  }

}
