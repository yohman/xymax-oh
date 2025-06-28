// Create xymax namespace
const xymax = {};

// Set Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoieW9obWFuIiwiYSI6IkxuRThfNFkifQ.u2xRJMiChx914U7mOZMiZw';

// Default values for Tokyo
xymax.defaults = {
    lat: 35.6762,
    lon: 139.6503,
    zoom: 10,
    pitch: 45,
    padding: 50,
    basemap: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    extrusionOpacity: 0.8,
    maxExtrusionHeight: 10000,
    geojsonFile: 'data/tokyo_slim_pop.geojson',
    defaultCategory: 'office',
    years: [1996, 2001, 2006, 2011, 2016, 2023],
    defaultStartYear: 1996,
    defaultEndYear: 2023,
    animationDuration: 800,
    mapMode: '3d' // '3d' or '2d'
};

// Color scheme for diverging scale
xymax.colors = {
    neutral: '#ffffbf',
    positive: {
        start: [217, 239, 139], // #d9ef8b
        end: [0, 104, 55]       // #006837
    },
    negative: {
        start: [254, 224, 139], // #fee08b
        end: [165, 0, 38]       // #a50026
    },
    waffle: {
        housing: '#ff1744',  // Vibrant red #ff1744
        office: '#00e676',   // Vibrant green #00e676
        other: '#2979ff',    // Vibrant blue #2979ff
        empty: '#2a2a2a'     // Dark gray #2a2a2a
    }
};
