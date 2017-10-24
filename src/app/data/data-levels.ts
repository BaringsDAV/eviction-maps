import { MapLayerGroup } from '../map/map-layer-group';

export const DataLevels: Array<MapLayerGroup> = [
    {
        'id': 'states',
        'name': 'States',
        'layerIds': [
            'states',
            'states_stroke',
            'states_bubbles',
            'states_text'
        ],
        'zoom': [0, 7]
    },
    {
        'id': 'counties',
        'name': 'Counties',
        'layerIds': [
            'counties',
            'counties_stroke',
            'counties_bubbles',
            'counties_text'
        ],
        'zoom': [7, 9]
    },
    {
        'id': 'zip-codes',
        'name': 'Zip Codes',
        'layerIds': [
            'zip-codes',
            'zip-codes_stroke',
            'zip-codes_bubbles',
            'zip-codes_text'
        ],
        'zoom': [9, 11]
    },
    {
        'id': 'cities',
        'name': ' Cities',
        'layerIds': [
            'cities',
            'cities_stroke',
            'cities_bubbles',
            'cities_text'
        ]
    },
    {
        'id': 'tracts',
        'name': 'Tracts',
        'layerIds': [
            'tracts',
            'tracts_stroke',
            'tracts_bubbles',
            'tracts_text'
        ],
        'zoom': [11, 13]
    },
    {
       'id': 'block-groups',
       'name': 'Block Groups',
       'layerIds': [
          'block-groups',
          'block-groups_stroke',
          'block-groups_bubbles',
          'block-groups_text'
       ],
       'zoom': [ 13, 16 ]
    }
 ];
