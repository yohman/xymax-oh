# XYMAX Architecture Documentation

## Overview

The XYMAX project uses a **global namespace pattern** to eliminate code duplication and create a scalable, maintainable codebase. All shared functionality, configurations, and data are centralized in the `XYMAX` global object.

## File Structure

```
xymax-oh/
├── js/
│   ├── xymax.js           # Global namespace (load FIRST)
│   ├── settings.js        # Mapbox token configuration
│   ├── main.js           # (future) Additional utilities
│   ├── map.js            # (future) Map-specific functions
│   ├── slider.js         # (future) Slider functionality
│   └── waffle.js         # (future) Waffle chart functions
├── discovery.html        # Discovery/Glide mode
├── single.html           # Single area analysis mode
├── compare.html          # Two-area comparison mode
└── index.html            # Landing page

```

## Global Namespace: XYMAX

### Loading Order

**CRITICAL**: Load scripts in this order in ALL HTML files:

```html
<!-- 1. External libraries -->
<script src="https://d3js.org/d3.v7.min.js"></script>
<script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@turf/turf@6.5.0/turf.min.js"></script>

<!-- 2. Global namespace (MUST be first internal script) -->
<script src="js/xymax.js"></script>

<!-- 3. Settings -->
<script src="js/settings.js"></script>

<!-- 4. Page-specific code -->
<script>
    // Your page code here
</script>
```

### Available APIs

#### Configuration Access

```javascript
// Years
const years = XYMAX.config.availableYears;  // [1996, 2001, 2006, 2011, 2016, 2023]

// Colors
const areaColors = XYMAX.config.colors.area1;  // '#8b5cf6'
const officeColor = XYMAX.config.colors.office;  // '#9ca3af'

// Data paths
const tokyoPath = XYMAX.config.dataPaths.tokyoSlimPop;

// Basemaps
const satelliteMap = XYMAX.config.basemaps.satellite;
const gsiMap = XYMAX.config.basemaps.gsi;

// Sankey configuration
const sankeyMargin = XYMAX.config.sankeyConfig.margin;
```

#### Data Loading

```javascript
// Load and cache GeoJSON data
const tokyoData = await XYMAX.loadData('tokyoData');
const salsaData = await XYMAX.loadData('salsaData');
const meshData = await XYMAX.loadData('meshData');

// Data is automatically cached - subsequent calls return cached version
```

#### Sankey Diagrams

##### Temporal Sankey (6-year timeline)

Used by: Discovery mode, Single mode

```javascript
XYMAX.drawTemporalSankey(
    'sankey-container',           // Container ID
    featuresArray,                // Array of GeoJSON features
    'absolute',                   // 'absolute' or 'percent'
    XYMAX.config.availableYears   // Optional: custom year array
);
```

##### Comparison Sankey (side-by-side)

Used by: Compare mode

```javascript
// Land use comparison
XYMAX.drawComparisonSankey(
    'landuse-sankey-container',   // Container ID
    [office1, housing1, other1],  // Area 1 data array
    [office2, housing2, other2],  // Area 2 data array
    'Shibuya',                    // Area 1 name
    'Shinjuku',                   // Area 2 name
    'absolute',                   // 'absolute' or 'percent'
    'landuse'                     // 'landuse' or 'age'
);

// Age comparison
XYMAX.drawComparisonSankey(
    'age-sankey-container',
    [age0_14_1, age15_64_1, age65plus_1],
    [age0_14_2, age15_64_2, age65plus_2],
    'Shibuya',
    'Shinjuku',
    'absolute',
    'age'
);
```

#### Utilities

```javascript
// Clear all tooltips
XYMAX.clearTooltips();

// Get responsive node width
const nodeWidth = XYMAX.getResponsiveNodeWidth(500);  // Returns 30 for width 500
```

## Migration Guide

### Before (Duplicated Code)

**discovery.html** and **single.html** each had:
- ~300 lines of identical `drawTemporalSankey()` function
- Duplicate color definitions
- Duplicate year arrays
- Duplicate configuration objects

### After (Using XYMAX)

**discovery.html**:
```javascript
// Before: 300+ lines
function drawTemporalSankey(containerId, features, viewMode, availableYears) {
    // ... 300 lines of code ...
}

// After: 1 line
XYMAX.drawTemporalSankey('sankey-container', features, viewMode);
```

**single.html**:
```javascript
// Same transformation
XYMAX.drawTemporalSankey('sankey-container', featuresArray, viewMode);
```

**compare.html**:
```javascript
// Before: Custom drawComparisonSankey
// After: 
XYMAX.drawComparisonSankey(
    'landuse-sankey-container',
    area1Data,
    area2Data,
    area1Name,
    area2Name,
    viewMode,
    'landuse'
);
```

## Adding New Features

### Adding a New Year

1. Edit `js/xymax.js`:
```javascript
availableYears: [1996, 2001, 2006, 2011, 2016, 2023, 2028],  // Add 2028
```

2. That's it! All diagrams automatically update.

### Adding a New Basemap

1. Edit `js/xymax.js`:
```javascript
basemaps: {
    satellite: { /* ... */ },
    gsi: { /* ... */ },
    // Add new basemap
    openstreetmap: {
        version: 8,
        sources: {
            'osm': {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '© OpenStreetMap contributors'
            }
        },
        layers: [{
            id: 'osm-layer',
            type: 'raster',
            source: 'osm'
        }]
    }
}
```

2. Use in any page:
```javascript
const osmBasemap = XYMAX.config.basemaps.openstreetmap;
map.setStyle(osmBasemap);
```

### Adding a New Color Scheme

```javascript
colors: {
    area1: '#8b5cf6',
    area2: '#06b6d4',
    area3: '#10b981',  // Add new area color
    
    // Add new category colors
    retail: '#f59e0b',
    industrial: '#ef4444'
}
```

### Adding a New Data Source

1. Add path to config:
```javascript
dataPaths: {
    tokyoSlimPop: 'data/tokyo_slim_pop.geojson',
    salsa: 'data/salsa.geojson',
    tokyoMesh: 'data/tokyo_mesh.geojson',
    // Add new data source
    tokyoTraffic: 'data/tokyo_traffic.geojson'
}
```

2. Load it:
```javascript
const trafficData = await XYMAX.loadData('tokyoTraffic');
```

### Adding a New Diagram Type

1. Add function to `js/xymax.js`:
```javascript
function drawBarChart(containerId, data, options) {
    // Your D3 code here
    // Use XYMAX.config for colors, dimensions, etc.
}
```

2. Export in public API:
```javascript
return {
    config: config,
    state: state,
    loadData: loadData,
    drawTemporalSankey: drawTemporalSankey,
    drawComparisonSankey: drawComparisonSankey,
    drawBarChart: drawBarChart,  // Add here
    clearTooltips: clearTooltips
};
```

3. Use anywhere:
```javascript
XYMAX.drawBarChart('chart-container', myData, { color: XYMAX.config.colors.area1 });
```

## Benefits

### 1. **Zero Duplication**
- Shared functions exist in ONE place
- Changes apply everywhere automatically
- Reduced file sizes

### 2. **Easy Maintenance**
- Update colors in one place → affects all pages
- Fix a bug once → fixed everywhere
- Add features once → available everywhere

### 3. **Scalability**
- Easy to add new pages
- Easy to add new visualizations
- Easy to add new data sources

### 4. **Consistency**
- All diagrams use same styling
- All pages use same colors
- All modes behave identically

### 5. **Performance**
- Data caching prevents duplicate fetches
- Smaller page file sizes
- Faster load times

## Best Practices

### DO:
✅ Use `XYMAX.config` for all constants  
✅ Use `XYMAX.loadData()` for data loading  
✅ Use `XYMAX.draw*()` functions for visualizations  
✅ Add new shared code to `js/xymax.js`  
✅ Document new public API functions  

### DON'T:
❌ Duplicate code across pages  
❌ Hard-code colors in individual files  
❌ Create page-specific versions of shared functions  
❌ Load data multiple times  
❌ Bypass the namespace for shared functionality  

## Future Enhancements

Planned additions to XYMAX namespace:

1. **Map utilities** (`XYMAX.map.*`)
   - `createMap()`
   - `addLayer()`
   - `highlightFeatures()`

2. **Data utilities** (`XYMAX.data.*`)
   - `filterByYear()`
   - `aggregateByArea()`
   - `calculateChange()`

3. **UI utilities** (`XYMAX.ui.*`)
   - `createToggle()`
   - `createSlider()`
   - `showLoading()`

4. **Animation utilities** (`XYMAX.animate.*`)
   - `transitionDiagram()`
   - `morphShapes()`
   - `fadeElements()`

## Questions?

See examples in:
- `discovery.html` - Temporal sankey usage
- `single.html` - Temporal sankey with Map
- `compare.html` - Comparison sankey usage
