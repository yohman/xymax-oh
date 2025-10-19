// Compare mode JavaScript - Updated with fixes
console.log('★★★ Compare.js loaded - NEW VERSION with aggressive label fixes ★★★');

// Sophisticated color palette - modern areas, better grayscale sankey
const EARTH_COLORS = {
    area1: '#8b5cf6',  // Modern purple - sophisticated and vibrant
    area2: '#06b6d4',  // Cyan blue - clean and contemporary
    office: '#9ca3af', // Medium gray
    housing: '#6b7280', // Dark gray  
    other: '#4b5563'   // Darker gray
};

let map;
let area1Data = null;
let area2Data = null;
let area1Name = '';
let area2Name = '';
let mapLoaded = false;
let pendingHighlight = null;
let availableAreas = [];

// Initialize the compare mode
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize map
    await initializeCompareMap();
    
    // Load available areas and populate dropdowns
    await loadAvailableAreas();
    
    // Get URL parameters if they exist
    const urlParams = new URLSearchParams(window.location.search);
    const urlArea1 = urlParams.get('area1');
    const urlArea2 = urlParams.get('area2');
    
    if (urlArea1 && urlArea2) {
        // Set dropdown values from URL
        document.getElementById('area1-select').value = urlArea1;
        document.getElementById('area2-select').value = urlArea2;
        area1Name = urlArea1;
        area2Name = urlArea2;
        
        // Update navigation links
        updateNavigationLinks(urlArea1, urlArea2);
        
        // Load and compare data
        await loadAndCompareAreas();
    }
    
    // Set up dropdown event listeners
    setupDropdownListeners();
    
    // Set up chart toggle listeners
    setupChartToggle();

    // Basemap toggle
    const basemapSelect = document.getElementById('basemap-select');
    if (basemapSelect) {
        basemapSelect.addEventListener('change', (e) => {
            setBasemapStyle(e.target.value);
        });
    }
});

// Setup dropdown listeners for area selection
function setupDropdownListeners() {
    const area1Select = document.getElementById('area1-select');
    const area2Select = document.getElementById('area2-select');
    if (area1Select) {
        area1Select.addEventListener('change', async (e) => {
            area1Name = e.target.value;
            updateNavigationLinks(area1Name, area2Name);
            if (area1Name && area2Name) {
                await loadAndCompareAreas();
            }
        });
    }
    if (area2Select) {
        area2Select.addEventListener('change', async (e) => {
            area2Name = e.target.value;
            updateNavigationLinks(area1Name, area2Name);
            if (area1Name && area2Name) {
                await loadAndCompareAreas();
            }
        });
    }
}

// Basemap style switching logic
function setBasemapStyle(styleKey) {
    if (!map) {
        console.error('Map not initialized');
        return;
    }
    
    console.log('Switching basemap to:', styleKey);
    
    // Get the style from xymax.basemaps
    let styleObj = xymax.basemaps[styleKey] || xymax.basemaps.satellite;
    console.log('Using style object:', styleObj);
    
    // Save current filters/highlights before style change
    let area1Filter = null;
    let area2Filter = null;
    try {
        if (map.getLayer('area1-highlight')) {
            area1Filter = map.getFilter('area1-highlight');
        }
        if (map.getLayer('area2-highlight')) {
            area2Filter = map.getFilter('area2-highlight');
        }
    } catch (e) {
        console.log('Could not get filters:', e);
    }
    
    console.log('Saved filters:', area1Filter, area2Filter);
    
    // Set the new style
    console.log('Setting new style...');
    try {
        map.setStyle(styleObj);
        console.log('setStyle called successfully');
    } catch (e) {
        console.error('Error calling setStyle:', e);
        return;
    }
    
    // Function to re-add layers
    const readdLayers = () => {
        console.log('Re-adding layers...');
        
        // Re-add Tokyo data source and layers
        fetch(xymax.defaults.geojsonFile)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch geojson');
                return res.json();
            })
            .then(data => {
                console.log('GeoJSON loaded, adding source and layers...');
                
                // Add source if it doesn't exist
                if (!map.getSource('tokyo-data')) {
                    map.addSource('tokyo-data', {
                        type: 'geojson',
                        data: data
                    });
                    console.log('Added tokyo-data source');
                }
                
                // Add base layer if it doesn't exist
                if (!map.getLayer('tokyo-layer')) {
                    map.addLayer({
                        id: 'tokyo-layer',
                        type: 'fill',
                        source: 'tokyo-data',
                        paint: {
                            'fill-color': '#666666',
                            'fill-opacity': 0.1
                        }
                    });
                    console.log('Added tokyo-layer');
                }
                
                // Add area1 highlight layer if it doesn't exist
                if (!map.getLayer('area1-highlight')) {
                    map.addLayer({
                        id: 'area1-highlight',
                        type: 'fill',
                        source: 'tokyo-data',
                        paint: {
                            'fill-color': EARTH_COLORS.area1,
                            'fill-opacity': 0.7
                        },
                        filter: area1Filter || ['==', 'KEY_CODE', '']
                    });
                    console.log('Added area1-highlight layer');
                }
                
                // Add area2 highlight layer if it doesn't exist
                if (!map.getLayer('area2-highlight')) {
                    map.addLayer({
                        id: 'area2-highlight',
                        type: 'fill',
                        source: 'tokyo-data',
                        paint: {
                            'fill-color': EARTH_COLORS.area2,
                            'fill-opacity': 0.7
                        },
                        filter: area2Filter || ['==', 'KEY_CODE', '']
                    });
                    console.log('Added area2-highlight layer');
                }
                
                console.log('All layers re-added successfully');
            })
            .catch(error => {
                console.error('Error re-adding layers:', error);
            });
    };
    
    // Try multiple event approaches
    let styleLoaded = false;
    
    // Approach 1: Use styledata event
    map.once('styledata', () => {
        if (styleLoaded) return;
        styleLoaded = true;
        console.log('Style data event fired');
        
        // Wait a bit for the map to be fully ready
        setTimeout(() => {
            if (map.isStyleLoaded()) {
                console.log('Style is loaded, re-adding layers');
                readdLayers();
            } else {
                console.log('Style not fully loaded yet, waiting...');
                map.once('idle', () => {
                    console.log('Map idle, re-adding layers');
                    readdLayers();
                });
            }
        }, 100);
    });
    
    // Approach 2: Polling as backup
    let checkCount = 0;
    const checkInterval = setInterval(() => {
        checkCount++;
        console.log(`Checking if style is loaded... (attempt ${checkCount})`);
        
        if (map.isStyleLoaded()) {
            clearInterval(checkInterval);
            if (!styleLoaded) {
                styleLoaded = true;
                console.log('Style loaded via polling, re-adding layers');
                readdLayers();
            }
        } else if (checkCount > 20) {
            clearInterval(checkInterval);
            console.error('Style failed to load after 20 attempts');
        }
    }, 200);
}

// Initialize the map for compare mode
async function initializeCompareMap() {
    mapboxgl.accessToken = xymax.basemaps ? 
        'pk.eyJ1IjoieW9obWFuIiwiYSI6IkxuRThfNFkifQ.u2xRJMiChx914U7mOZMiZw' : 
        'pk.eyJ1IjoieW9obWFuIiwiYSI6IkxuRThfNFkifQ.u2xRJMiChx914U7mOZMiZw';
    
    map = new mapboxgl.Map({
        container: 'map',
        style: xymax.basemaps ? xymax.basemaps.satellite : 'mapbox://styles/mapbox/satellite-v9',
        center: [139.6917, 35.6895], // Centered for 50% width layout
        zoom: 9.8, // Adjusted for 50% width
        pitch: 0, // Flat view for better area comparison
        bearing: 0,
        // Enable all map interactions
        interactive: true,
        scrollZoom: true,
        boxZoom: true,
        dragRotate: true,
        dragPan: true,
        keyboard: true,
        doubleClickZoom: true,
        touchZoomRotate: true
    });
    
    map.on('load', async () => {
        // Navigation controls removed: allow only pan/zoom via mouse/trackpad

        // Load Tokyo data
        try {
            const response = await fetch(xymax.defaults.geojsonFile);
            const data = await response.json();
            // Add data source
            map.addSource('tokyo-data', {
                type: 'geojson',
                data: data
            });
            // Add base layer (semi-transparent flat polygons)
            map.addLayer({
                id: 'tokyo-layer',
                type: 'fill',
                source: 'tokyo-data',
                paint: {
                    'fill-color': '#666666',
                    'fill-opacity': 0.1
                }
            });
            map.addLayer({
                id: 'area1-highlight',
                type: 'fill',
                source: 'tokyo-data',
                paint: {
                    'fill-color': EARTH_COLORS.area1,
                    'fill-opacity': 0.7
                },
                filter: ['==', 'KEY_CODE', '']
            });
            // Add area2 highlight layer (vibrant blue)
            map.addLayer({
                id: 'area2-highlight',
                type: 'fill',
                source: 'tokyo-data',
                paint: {
                    'fill-color': EARTH_COLORS.area2,
                    'fill-opacity': 0.7
                },
                filter: ['==', 'KEY_CODE', '']
            });
        } catch (error) {
            console.error('Error loading Tokyo data:', error);
        }
        mapLoaded = true;
    });
}

// Setup chart toggle listeners
// Load available areas and populate dropdowns
async function loadAvailableAreas() {
    try {
        const response = await fetch('data/salsa.geojson');
        const data = await response.json();
        availableAreas = data.features.map(f => f.properties.AREA_NAME).sort();

        // Populate both dropdowns
        const area1Select = document.getElementById('area1-select');
        const area2Select = document.getElementById('area2-select');

        availableAreas.forEach(areaName => {
            const option1 = document.createElement('option');
            option1.value = areaName;
            option1.textContent = areaName;
            area1Select.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = areaName;
            option2.textContent = areaName;
            area2Select.appendChild(option2);
        });
    } catch (error) {
        console.error('Error loading available areas:', error);
    }
}
function setupChartToggle() {
    const radioButtons = document.querySelectorAll('input[name="chart-mode"]');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', () => {
            if (area1Data && area2Data) {
                updateSankeyDiagram();
            }
        });
    });
}

// Load and compare area data
async function loadAndCompareAreas() {
    try {
        // Load salsa.geojson and tokyo_mesh.geojson
        const [salsaRes, meshRes, tokyoRes] = await Promise.all([
            fetch('data/salsa.geojson'),
            fetch('data/tokyo_mesh.geojson'),
            fetch(xymax.defaults.geojsonFile)
        ]);
        
        const salsaData = await salsaRes.json();
        const meshData = await meshRes.json();
        const tokyoData = await tokyoRes.json();
        
        // Find area features
        const area1Feature = salsaData.features.find(f => f.properties.AREA_NAME === area1Name);
        const area2Feature = salsaData.features.find(f => f.properties.AREA_NAME === area2Name);
        
        console.log('Area1 feature found:', !!area1Feature, area1Name);
        console.log('Area2 feature found:', !!area2Feature, area2Name);
        
        if (!area1Feature || !area2Feature) {
            console.error('Available areas:', salsaData.features.map(f => f.properties.AREA_NAME));
            alert('Could not find one or both areas. Redirecting to mode selection.');
            window.location.href = 'index.html';
            return;
        }
        
        // Find intersecting mesh polygons for each area
        const area1Meshes = findIntersectingMeshes(area1Feature, meshData);
        const area2Meshes = findIntersectingMeshes(area2Feature, meshData);
        
        console.log(`Area1 (${area1Name}) intersecting meshes:`, area1Meshes.length);
        console.log(`Area2 (${area2Name}) intersecting meshes:`, area2Meshes.length);
        
        // Get detailed data for each area
        area1Data = getAreaData(area1Meshes, tokyoData);
        area2Data = getAreaData(area2Meshes, tokyoData);
        
        console.log('Area1 data:', area1Data);
        console.log('Area2 data:', area2Data);
        
        // Highlight areas on map
        highlightAreas(area1Meshes, area2Meshes);
        
        // Add area labels to map (with delay and using mesh data)
        setTimeout(() => addAreaLabelsToMap(area1Meshes, area2Meshes), 500);
        // Also try immediate execution
        addAreaLabelsToMap(area1Meshes, area2Meshes);
        
        // Update comparison UI
        updateComparisonUI();
        
        // Zoom to show both areas
        zoomToAreas(area1Feature, area2Feature);
        
    } catch (error) {
        console.error('Error loading and comparing areas:', error);
    }
}

// Find intersecting mesh polygons
function findIntersectingMeshes(areaFeature, meshData) {
    const turfPoly = areaFeature.geometry;
    return meshData.features.filter(meshFeature => {
        try {
            return turf.booleanIntersects(meshFeature.geometry, turfPoly);
        } catch (err) {
            return false;
        }
    });
}

// Get aggregated data for an area
function getAreaData(meshes, tokyoData) {
    const keyCodes = meshes.map(m => m.properties.KEY_CODE);
    console.log('Mesh keycodes:', keyCodes);
    
    // Filter relevant features - handle both string and number KEY_CODE types
    const relevantFeatures = tokyoData.features.filter(f => {
        const fKeyCode = f.properties.KEY_CODE;
        return keyCodes.includes(fKeyCode) || 
               keyCodes.includes(String(fKeyCode)) || 
               keyCodes.includes(Number(fKeyCode));
    });
    
    console.log('Found relevant features:', relevantFeatures.length);
    
    let population = 0, households = 0, foreign = 0;
    let office2023 = 0, housing2023 = 0, other2023 = 0;
    
    relevantFeatures.forEach(f => {
        const props = f.properties;
        population += Number(props.population) || 0;
        households += Number(props.households) || 0;
        foreign += Number(props.pop_foreign) || 0; // Updated property name
        office2023 += Number(props['2023_office_total_use_area']) || 0;
        housing2023 += Number(props['2023_housing_total_use_area']) || 0;
        other2023 += Number(props['2023_other_total_use_area']) || 0;
    });
    
    const result = {
        population: Math.round(population),
        households: Math.round(households),
        foreign: Math.round(foreign),
        office: Math.round(office2023),
        housing: Math.round(housing2023),
        other: Math.round(other2023),
        meshCount: meshes.length
    };
    
    console.log('Area data result:', result);
    return result;
}

// Highlight areas on map
function highlightAreas(area1Meshes, area2Meshes) {
    // If map isn't loaded yet, store the data for later
    if (!mapLoaded) {
        pendingHighlight = { area1Meshes, area2Meshes };
        return;
    }
    
    // Check if layers exist before setting filters
    if (!map.getLayer('area1-highlight') || !map.getLayer('area2-highlight')) {
        console.warn('Highlight layers not yet available, storing for later');
        pendingHighlight = { area1Meshes, area2Meshes };
        return;
    }
    
    const area1KeyCodes = area1Meshes.map(m => String(m.properties.KEY_CODE));
    const area2KeyCodes = area2Meshes.map(m => String(m.properties.KEY_CODE));
    
    console.log('Highlighting area1 keycodes:', area1KeyCodes);
    console.log('Highlighting area2 keycodes:', area2KeyCodes);
    
    // Set filters to highlight the areas - ensure KEY_CODE is treated as string
    try {
        map.setFilter('area1-highlight', ['in', ['to-string', ['get', 'KEY_CODE']], ['literal', area1KeyCodes]]);
        map.setFilter('area2-highlight', ['in', ['to-string', ['get', 'KEY_CODE']], ['literal', area2KeyCodes]]);
        console.log('Map filters applied successfully');
    } catch (error) {
        console.error('Error setting highlight filters:', error);
    }
}

// Store current area markers so we can remove them when selection changes
let currentAreaMarkers = [];

// Add area labels to map using HTML markers
function addAreaLabelsToMap(area1Meshes, area2Meshes) {
    console.log('🔥 Adding area labels using HTML markers...');
    
    if (!map) {
        console.log('❌ Map not available');
        return;
    }
    
    // Remove existing markers first
    currentAreaMarkers.forEach(marker => marker.remove());
    currentAreaMarkers = [];
    
    try {
        // Calculate centroids
        const area1Centroid = calculateMeshCentroid(area1Meshes);
        const area2Centroid = calculateMeshCentroid(area2Meshes);
        
        console.log('Area centroids:', area1Centroid, area2Centroid);
        
        // Create area 1 marker - flat minimal design
        const area1Marker = document.createElement('div');
        area1Marker.innerHTML = area1Name;
        area1Marker.style.cssText = `
            background: ${EARTH_COLORS.area1};
            color: white;
            padding: 6px 10px;
            font-weight: 500;
            font-size: 13px;
            border-radius: 2px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        `;
        
        // Create area 2 marker - flat minimal design
        const area2Marker = document.createElement('div');
        area2Marker.innerHTML = area2Name;
        area2Marker.style.cssText = `
            background: ${EARTH_COLORS.area2};
            color: white;
            padding: 6px 10px;
            font-weight: 500;
            font-size: 13px;
            border-radius: 2px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        `;
        
        // Add markers to map and store them for cleanup
        const marker1 = new mapboxgl.Marker(area1Marker)
            .setLngLat(area1Centroid)
            .addTo(map);
            
        const marker2 = new mapboxgl.Marker(area2Marker)
            .setLngLat(area2Centroid)
            .addTo(map);
            
        // Store markers so we can remove them later
        currentAreaMarkers = [marker1, marker2];
        
        console.log('✅ Area HTML markers added successfully');
    } catch (error) {
        console.error('❌ Error adding area HTML markers:', error);
    }
}

// Calculate centroid from mesh polygons
function calculateMeshCentroid(meshes) {
    if (!meshes || meshes.length === 0) return [139.6917, 35.6895]; // Default Tokyo center
    
    let totalLat = 0, totalLon = 0, pointCount = 0;
    
    meshes.forEach(mesh => {
        if (mesh.geometry && mesh.geometry.coordinates) {
            if (mesh.geometry.type === 'Polygon') {
                // For each coordinate in the polygon exterior ring
                mesh.geometry.coordinates[0].forEach(coord => {
                    totalLon += coord[0]; // longitude
                    totalLat += coord[1]; // latitude
                    pointCount++;
                });
            } else if (mesh.geometry.type === 'MultiPolygon') {
                // For each polygon in the multipolygon
                mesh.geometry.coordinates.forEach(polygon => {
                    polygon[0].forEach(coord => {
                        totalLon += coord[0]; // longitude
                        totalLat += coord[1]; // latitude
                        pointCount++;
                    });
                });
            }
        }
    });
    
    if (pointCount === 0) return [139.6917, 35.6895]; // Default Tokyo center
    
    const avgLon = totalLon / pointCount;
    const avgLat = totalLat / pointCount;
    
    console.log(`Calculated centroid from ${pointCount} points: [${avgLon}, ${avgLat}]`);
    return [avgLon, avgLat];
}

// Update comparison UI
function updateComparisonUI() {
    if (!area1Data || !area2Data) return;
    
    // Population comparison
    document.getElementById('area1-population').textContent = area1Data.population.toLocaleString();
    document.getElementById('area2-population').textContent = area2Data.population.toLocaleString();
    
    const popDiff = area1Data.population - area2Data.population;
    const popDiffEl = document.getElementById('population-diff');
    popDiffEl.textContent = `${popDiff > 0 ? '+' : ''}${popDiff.toLocaleString()}`;
    popDiffEl.className = 'comparison-difference ' + (popDiff > 0 ? 'difference-positive' : 'difference-negative');
    
    // Office space comparison
    document.getElementById('area1-office').textContent = `${area1Data.office.toLocaleString()} m²`;
    document.getElementById('area2-office').textContent = `${area2Data.office.toLocaleString()} m²`;
    
    const officeDiff = area1Data.office - area2Data.office;
    const officeDiffEl = document.getElementById('office-diff');
    officeDiffEl.textContent = `${officeDiff > 0 ? '+' : ''}${officeDiff.toLocaleString()} m²`;
    officeDiffEl.className = 'comparison-difference ' + (officeDiff > 0 ? 'difference-positive' : 'difference-negative');
    
    // Housing space comparison
    document.getElementById('area1-housing').textContent = `${area1Data.housing.toLocaleString()} m²`;
    document.getElementById('area2-housing').textContent = `${area2Data.housing.toLocaleString()} m²`;
    
    const housingDiff = area1Data.housing - area2Data.housing;
    const housingDiffEl = document.getElementById('housing-diff');
    housingDiffEl.textContent = `${housingDiff > 0 ? '+' : ''}${housingDiff.toLocaleString()} m²`;
    housingDiffEl.className = 'comparison-difference ' + (housingDiff > 0 ? 'difference-positive' : 'difference-negative');
    
    // Other space comparison
    document.getElementById('area1-other').textContent = `${area1Data.other.toLocaleString()} m²`;
    document.getElementById('area2-other').textContent = `${area2Data.other.toLocaleString()} m²`;
    
    const otherDiff = area1Data.other - area2Data.other;
    const otherDiffEl = document.getElementById('other-diff');
    otherDiffEl.textContent = `${otherDiff > 0 ? '+' : ''}${otherDiff.toLocaleString()} m²`;
    otherDiffEl.className = 'comparison-difference ' + (otherDiff > 0 ? 'difference-positive' : 'difference-negative');
    
    // Show and update sankey diagram
    document.getElementById('sankey-section').style.display = 'block';
    updateSankeyDiagram();
    
    // Generate summary statement
    generateSummaryStatement();
}

// Update sankey diagram with curved connections between areas
function updateSankeyDiagram() {
    if (!area1Data || !area2Data) return;
    
    const chartMode = document.querySelector('input[name="chart-mode"]:checked').value;
    const container = d3.select('#sankey-chart');
    
    // Clear previous diagram
    container.selectAll('*').remove();
    
    // Calculate totals for each area
    const area1Total = area1Data.office + area1Data.housing + area1Data.other;
    const area2Total = area2Data.office + area2Data.housing + area2Data.other;
    
    // Setup dimensions - adjusted for 50% width layout
    const containerWidth = container.node().getBoundingClientRect().width;
    const width = Math.min(containerWidth - 40, 500); // Max 500px, with some padding
    const height = 280;
    const margin = { top: 20, right: 100, bottom: 20, left: 100 }; // Adequate space for external labels
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('display', 'block')
        .style('margin', '0 auto'); // Center the SVG
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Calculate node positions and sizes
    const nodeWidth = 80;
    const nodeSpacing = chartWidth - 2 * nodeWidth;
    const nodeGap = 3; // Gap between node segments
    
    // Prepare data based on mode
    let area1Values, area2Values, maxValue;
    
    if (chartMode === 'percentage') {
        // In percentage mode, all values are proportional to their own totals
        area1Values = {
            office: area1Data.office / area1Total,
            housing: area1Data.housing / area1Total,
            other: area1Data.other / area1Total
        };
        area2Values = {
            office: area2Data.office / area2Total,
            housing: area2Data.housing / area2Total,
            other: area2Data.other / area2Total
        };
        maxValue = 1; // Since we're dealing with proportions
    } else {
        // In actual mode, values are absolute
        area1Values = {
            office: area1Data.office,
            housing: area1Data.housing,
            other: area1Data.other
        };
        area2Values = {
            office: area2Data.office,
            housing: area2Data.housing,
            other: area2Data.other
        };
        maxValue = Math.max(area1Total, area2Total);
    }
    
    // Scale for node heights
    const heightScale = d3.scaleLinear()
        .domain([0, maxValue])
        .range([0, chartHeight * 0.8]);
    
    // Colors for categories - ocean theme color scheme
    const colors = {
        office: EARTH_COLORS.office,    // Dark Ocean Blue - deep navy
        housing: EARTH_COLORS.housing,  // Sandy Brown - warm sand
        other: EARTH_COLORS.other       // Slate Gray - ocean complement
    };
    
    // Create nodes for left side (area1)
    const leftNodes = [
        { category: 'office', value: area1Values.office, y: 0 },
        { category: 'housing', value: area1Values.housing, y: 0 },
        { category: 'other', value: area1Values.other, y: 0 }
    ];
    
    // Create nodes for right side (area2)
    const rightNodes = [
        { category: 'office', value: area2Values.office, y: 0 },
        { category: 'housing', value: area2Values.housing, y: 0 },
        { category: 'other', value: area2Values.other, y: 0 }
    ];
    
    // Calculate y positions for stacked layout with gaps
    const totalLeftHeight = leftNodes.reduce((sum, node) => sum + heightScale(node.value), 0) + (leftNodes.length - 1) * nodeGap;
    const totalRightHeight = rightNodes.reduce((sum, node) => sum + heightScale(node.value), 0) + (rightNodes.length - 1) * nodeGap;
    
    let leftY = (chartHeight - totalLeftHeight) / 2;
    let rightY = (chartHeight - totalRightHeight) / 2;
    
    // Position left nodes (stacked with gaps)
    leftNodes.forEach(node => {
        node.y = leftY;
        leftY += heightScale(node.value) + nodeGap;
    });
    
    // Position right nodes (stacked with gaps)
    rightNodes.forEach(node => {
        node.y = rightY;
        rightY += heightScale(node.value) + nodeGap;
    });
    
    // Create curved path generator
    const linkPath = d3.linkHorizontal()
        .x(d => d.x)
        .y(d => d.y);
    
    // Draw connections (sankey flows)
    leftNodes.forEach((leftNode, i) => {
        const rightNode = rightNodes[i]; // Same category
        
        const linkData = {
            source: { x: nodeWidth, y: leftNode.y + heightScale(leftNode.value) / 2 },
            target: { x: chartWidth - nodeWidth, y: rightNode.y + heightScale(rightNode.value) / 2 }
        };
        
        // Calculate flow thickness based on minimum value
        const minValue = Math.min(leftNode.value, rightNode.value);
        const flowThickness = Math.max(2, heightScale(minValue) * 0.8);
        
        // Create gradient for the flow
        const gradientId = `gradient-${leftNode.category}`;
        const gradient = g.append('defs').append('linearGradient')
            .attr('id', gradientId)
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', linkData.source.x)
            .attr('x2', linkData.target.x);
        
        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', colors[leftNode.category])
            .attr('stop-opacity', 0.7);
            
        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', colors[rightNode.category])
            .attr('stop-opacity', 0.7);
        
        // Draw the curved flow
        g.append('path')
            .attr('d', linkPath(linkData))
            .attr('stroke', `url(#${gradientId})`)
            .attr('stroke-width', flowThickness)
            .attr('fill', 'none')
            .attr('opacity', 0.6)
            .style('cursor', 'pointer')
            .on('mouseover', function() {
                d3.select(this).attr('opacity', 0.9);
            })
            .on('mouseout', function() {
                d3.select(this).attr('opacity', 0.6);
            });
    });
    
    // Draw left nodes (area1)
    const leftNodeGroups = g.selectAll('.left-node')
        .data(leftNodes)
        .enter().append('g')
        .attr('class', 'left-node');
    
    leftNodeGroups.append('rect')
        .attr('x', 0)
        .attr('y', d => d.y)
        .attr('width', nodeWidth)
        .attr('height', d => Math.max(2, heightScale(d.value)))
        .attr('fill', d => colors[d.category])
        .attr('rx', 0); // No rounded corners
    
    // Add value labels on left nodes
    leftNodeGroups.append('text')
        .attr('class', 'sankey-value-text')
        .attr('x', nodeWidth / 2)
        .attr('y', d => d.y + heightScale(d.value) / 2)
        .text(d => {
            if (chartMode === 'percentage') {
                return `${Math.round(d.value * 100)}%`;
            } else {
                return `${Math.round(d.value).toLocaleString()}`;
            }
        })
        .style('display', d => heightScale(d.value) > 15 ? 'block' : 'none');
    
    // Draw right nodes (area2)
    const rightNodeGroups = g.selectAll('.right-node')
        .data(rightNodes)
        .enter().append('g')
        .attr('class', 'right-node');
    
    rightNodeGroups.append('rect')
        .attr('x', chartWidth - nodeWidth)
        .attr('y', d => d.y)
        .attr('width', nodeWidth)
        .attr('height', d => Math.max(2, heightScale(d.value)))
        .attr('fill', d => colors[d.category])
        .attr('rx', 0); // No rounded corners
    
    // Add value labels on right nodes
    rightNodeGroups.append('text')
        .attr('class', 'sankey-value-text')
        .attr('x', chartWidth - nodeWidth / 2)
        .attr('y', d => d.y + heightScale(d.value) / 2)
        .text(d => {
            if (chartMode === 'percentage') {
                return `${Math.round(d.value * 100)}%`;
            } else {
                return `${Math.round(d.value).toLocaleString()}`;
            }
        })
        .style('display', d => heightScale(d.value) > 15 ? 'block' : 'none');
    
    // Add area labels with colored text circles (simple and clean)
    // Area 1 label with colored circle
    const area1Label = g.append('text')
        .attr('class', 'sankey-node-text')
        .attr('x', nodeWidth / 2)
        .attr('y', -7)
        .attr('fill', '#333')
        .attr('text-anchor', 'middle')
        .style('font-weight', '500')
        .style('font-size', '12px')
        .html(`<tspan fill="${EARTH_COLORS.area1}">● </tspan>${area1Name}`);
    
    // Area 2 label with colored circle
    const area2Label = g.append('text')
        .attr('class', 'sankey-node-text')
        .attr('x', chartWidth - nodeWidth / 2)
        .attr('y', -7)
        .attr('fill', '#333')
        .attr('text-anchor', 'middle')
        .style('font-weight', '500')
        .style('font-size', '12px')
        .html(`<tspan fill="${EARTH_COLORS.area2}">● </tspan>${area2Name}`);
    
    // Add category labels on the sides (positioned to avoid overlap)
    const categories = ['Office', 'Housing', 'Other'];
    
    // Left side category labels (positioned with larger gap from bars)
    leftNodes.forEach((node, i) => {
        g.append('text')
            .attr('class', 'sankey-node-text')
            .attr('x', -35) // Even larger gap from left bars
            .attr('y', node.y + heightScale(node.value) / 2)
            .attr('text-anchor', 'end') 
            .attr('dominant-baseline', 'middle')
            .style('font-size', '0.75em')
            .style('fill', colors[node.category])
            .style('font-weight', '600')
            .text(categories[i]);
    });
    
    // Right side category labels (positioned with larger gap from bars)  
    rightNodes.forEach((node, i) => {
        g.append('text')
            .attr('class', 'sankey-node-text')
            .attr('x', chartWidth + 35) // Even larger gap from right bars
            .attr('y', node.y + heightScale(node.value) / 2)
            .attr('text-anchor', 'start')
            .attr('dominant-baseline', 'middle')
            .style('font-size', '0.75em')
            .style('fill', colors[node.category])
            .style('font-weight', '600')
            .text(categories[i]);
    });
}

// Generate summary statement
function generateSummaryStatement() {
    if (!area1Data || !area2Data) return;
    
    const summaryEl = document.getElementById('comparison-summary');
    
    // Determine which area is larger for each category, and reference the other area by name
    const officeComparison = area1Data.office > area2Data.office ? 
        `<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>は<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>より<b style="color:#ffffff;">${Math.abs(area1Data.office - area2Data.office).toLocaleString()} m²多い</b>オフィススペース` :
        `<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>は<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>より<b style="color:#ffffff;">${Math.abs(area2Data.office - area1Data.office).toLocaleString()} m²多い</b>オフィススペース`;
    
    const housingComparison = area1Data.housing > area2Data.housing ? 
        `<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>は<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>より<b style="color:#ffffff;">${Math.abs(area1Data.housing - area2Data.housing).toLocaleString()} m²多い</b>住宅スペース` :
        `<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>は<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>より<b style="color:#ffffff;">${Math.abs(area2Data.housing - area1Data.housing).toLocaleString()} m²多い</b>住宅スペース`;
    
    const populationComparison = area1Data.population > area2Data.population ?
        `<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>は<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>より<b style="color:#ffffff;">${Math.abs(area1Data.population - area2Data.population).toLocaleString()}人多い</b>人口` :
        `<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>は<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>より<b style="color:#ffffff;">${Math.abs(area2Data.population - area1Data.population).toLocaleString()}人多い</b>人口`;
    
    summaryEl.innerHTML = `
        <div style='font-size:1em;color:#ffffff;margin-bottom:6px;'>
            ${officeComparison}を持っています。${housingComparison}を持っています。人口では、${populationComparison}となっています。
        </div>
    `;
}

// Zoom to show both areas
function zoomToAreas(area1Feature, area2Feature) {
    const bounds = new mapboxgl.LngLatBounds();
    
    // Add area1 coordinates to bounds
    if (area1Feature.geometry.type === 'Polygon') {
        area1Feature.geometry.coordinates[0].forEach(coord => bounds.extend(coord));
    } else if (area1Feature.geometry.type === 'MultiPolygon') {
        area1Feature.geometry.coordinates.forEach(poly => {
            poly[0].forEach(coord => bounds.extend(coord));
        });
    }
    
    // Add area2 coordinates to bounds
    if (area2Feature.geometry.type === 'Polygon') {
        area2Feature.geometry.coordinates[0].forEach(coord => bounds.extend(coord));
    } else if (area2Feature.geometry.type === 'MultiPolygon') {
        area2Feature.geometry.coordinates.forEach(poly => {
            poly[0].forEach(coord => bounds.extend(coord));
        });
    }
    
    map.fitBounds(bounds, { 
        padding: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50 // Equal padding since map is now 50% width
        }, 
        duration: 1500 
    });
}

// Update navigation links to single mode
function updateNavigationLinks(area1, area2) {
    const area1Link = document.getElementById('area1-link');
    const area2Link = document.getElementById('area2-link');
    
    if (area1 && area1Link) {
        area1Link.href = `single.html?area=${encodeURIComponent(area1)}`;
        area1Link.style.display = 'inline';
    }
    
    if (area2 && area2Link) {
        area2Link.href = `single.html?area=${encodeURIComponent(area2)}`;
        area2Link.style.display = 'inline';
    }
}