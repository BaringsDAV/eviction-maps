import { MapLayerGroup } from '../map/map-layer-group';

export const DataLevels: Array<MapLayerGroup> = [
    // {
    //     'id': 'states',
    //     'name': 'States',
    //     'layerIds': [
    //         'states',
    //         'states_stroke',
    //         'states_bubbles',
    //         'states_text'
    //     ],
    //     'zoom': [0, 6]
    // },
    {
        'id': 'counties',
        'name': 'Counties',
        'layerIds': [
            'counties',
            'counties_stroke',
            'counties_bubbles',
            'counties_text'
        ],
        'zoom': [4, 9]
    },
    // {
    //     'id': 'zipcodes',
    //     'name': 'Zip Codes',
    //     'layerIds': [
    //         'zipcodes',
    //         'zipcodes_stroke',
    //         'zipcodes_bubbles',
    //         'zipcodes_text'
    //     ],
    //     'zoom': [9, 10]
    // },
    // {
    //     'id': 'cities',
    //     'name': ' Cities',
    //     'layerIds': [
    //         'cities',
    //         'cities_stroke',
    //         'cities_bubbles',
    //         'cities_text'
    //     ]
    // },
    {
        'id': 'tracts',
        'name': 'Tracts',
        'layerIds': [
            'tracts',
            'tracts_stroke',
            'tracts_bubbles',
            'tracts_text'
        ],
        'zoom': [9, 14]
    }
    // {
    //    'id': 'blockgroups',
    //    'name': 'Block Groups',
    //    'layerIds': [
    //       'blockgroups',
    //       'blockgroups_stroke',
    //       'blockgroups_bubbles',
    //       'blockgroups_text'
    //    ],
    //    'zoom': [ 10, 16 ]
    // }
 ];
