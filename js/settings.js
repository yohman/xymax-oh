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

// Basemap configurations
xymax.basemaps = {
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    satellite: {
        version: 8,
        sources: {
            'esri-world-imagery': {
                type: "raster",
                tiles: [
                    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                ],
                tileSize: 256,
                attribution: "Tiles &copy; <a href=\"https://www.esri.com/\">Esri</a> — Source: Esri, Earthstar Geographics",
                maxzoom: 19
            }
        },
        layers: [
            {
                id: "esri-world-imagery-layer",
                type: "raster",
                source: "esri-world-imagery"
            }
        ]
    }
};

// Current basemap state
xymax.currentBasemap = 'dark';

// Toggle basemap function
xymax.toggleBasemap = function(basemapId) {
    if (!map) return;
    
    if (basemapId === xymax.currentBasemap) return;
    
    xymax.currentBasemap = basemapId;
    
    // Get the basemap style
    const basemapStyle = xymax.basemaps[basemapId];
    
    // Update the map style
    map.setStyle(basemapStyle);
    
    // Update UI
    document.querySelectorAll('.basemap-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-basemap="${basemapId}"]`).classList.add('active');
    
    // Re-add data layers when style loads
    map.once('styledata', () => {
        if (data) {
            // Re-add the data source
            if (!map.getSource('tokyo-data')) {
                map.addSource('tokyo-data', {
                    type: 'geojson',
                    data: data
                });
                
                // Re-add the main layer
                map.addLayer({
                    id: 'tokyo-layer',
                    type: 'fill-extrusion',
                    source: 'tokyo-data',
                    paint: {
                        'fill-extrusion-color': ['get', 'extrusionColor'],
                        'fill-extrusion-height': ['get', 'extrusionHeight'],
                        'fill-extrusion-opacity': xymax.defaults.extrusionOpacity
                    }
                });
                
                // Re-add the highlight layer
                map.addLayer({
                    id: 'tokyo-layer-highlight',
                    type: 'fill-extrusion',
                    source: 'tokyo-data',
                    paint: {
                        'fill-extrusion-color': '#ffff00',
                        'fill-extrusion-height': ['get', 'extrusionHeight'],
                        'fill-extrusion-opacity': 1.0
                    },
                    filter: ['==', 'KEY_CODE', '']
                });
                
                // Re-add the hover layer
                map.addLayer({
                    id: 'tokyo-layer-hover',
                    type: 'fill-extrusion',
                    source: 'tokyo-data',
                    paint: {
                        'fill-extrusion-color': '#ffffff',
                        'fill-extrusion-height': ['get', 'extrusionHeight'],
                        'fill-extrusion-opacity': 0.5
                    },
                    filter: ['==', 'KEY_CODE', '']
                });
                
                // Re-add click events
                map.on('click', 'tokyo-layer', (e) => {
                    e.preventDefault();
                    const clickedFeature = e.features[0];
                    
                    selectedFeature = clickedFeature;
                    isSticky = true;
                    
                    // Highlight the selected polygon
                    map.setFilter('tokyo-layer-highlight', ['==', 'KEY_CODE', clickedFeature.properties.KEY_CODE]);
                    
                    // Update side panel and keep it open
                    window.updateSidePanel(clickedFeature);
                    window.sidePanel.classList.add('open', 'sticky');
                    document.querySelector('.side-panel-header').classList.add('sticky');
                });
                
                // Re-add empty area click handler
                map.on('click', (e) => {
                    const features = map.queryRenderedFeatures(e.point, { layers: ['tokyo-layer'] });
                    
                    if (features.length === 0) {
                        selectedFeature = null;
                        isSticky = false;
                        map.setFilter('tokyo-layer-highlight', ['==', 'KEY_CODE', '']);
                        window.sidePanel.classList.remove('open', 'sticky');
                        document.querySelector('.side-panel-header').classList.remove('sticky');
                    }
                });
                
                // Re-add hover events
                map.on('mouseenter', 'tokyo-layer', () => {
                    map.getCanvas().style.cursor = 'pointer';
                });
                
                map.on('mouseleave', 'tokyo-layer', () => {
                    map.getCanvas().style.cursor = '';
                });
                
                // Re-add mouse move handler for hover effects
                map.on('mousemove', 'tokyo-layer', (e) => {
                    if (!isSticky) {
                        const hoveredFeature = e.features[0];
                        
                        map.setFilter('tokyo-layer-hover', ['==', 'KEY_CODE', hoveredFeature.properties.KEY_CODE]);
                        
                        window.updateSidePanel(hoveredFeature);
                        window.sidePanel.classList.add('open');
                    }
                });
                
                map.on('mouseleave', 'tokyo-layer', () => {
                    if (!isSticky) {
                        map.setFilter('tokyo-layer-hover', ['==', 'KEY_CODE', '']);
                        window.sidePanel.classList.remove('open');
                    }
                });
                
                // Re-apply current visualization
                extrudePolygons(currentStartYear, currentEndYear, currentCategory);
            }
        }
    });
};
