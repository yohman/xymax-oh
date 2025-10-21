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
                // Update URL parameters
                const url = new URL(window.location);
                url.searchParams.set('area1', area1Name);
                url.searchParams.set('area2', area2Name);
                window.history.pushState({}, '', url);
            }
        });
    }
    if (area2Select) {
        area2Select.addEventListener('change', async (e) => {
            area2Name = e.target.value;
            updateNavigationLinks(area1Name, area2Name);
            if (area1Name && area2Name) {
                await loadAndCompareAreas();
                // Update URL parameters
                const url = new URL(window.location);
                url.searchParams.set('area1', area1Name);
                url.searchParams.set('area2', area2Name);
                window.history.pushState({}, '', url);
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
    let age_0_14 = 0, age_15_64 = 0, age_65_plus = 0;
    
    relevantFeatures.forEach(f => {
        const props = f.properties;
        population += Number(props.population) || 0;
        households += Number(props.households) || 0;
        foreign += Number(props.pop_foreign) || 0;
        office2023 += Number(props['2023_office_total_use_area']) || 0;
        housing2023 += Number(props['2023_housing_total_use_area']) || 0;
        other2023 += Number(props['2023_other_total_use_area']) || 0;
        age_0_14 += Number(props.pop_0_14) || 0;
        age_15_64 += Number(props.pop_15_64) || 0;
        age_65_plus += Number(props.pop_65_plus) || 0;
    });
    
    const result = {
        population: Math.round(population),
        households: Math.round(households),
        foreign: Math.round(foreign),
        office: Math.round(office2023),
        housing: Math.round(housing2023),
        other: Math.round(other2023),
        age_0_14: Math.round(age_0_14),
        age_15_64: Math.round(age_15_64),
        age_65_plus: Math.round(age_65_plus),
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
    
    // Draw age comparison sankey
    drawAgeComparisonSankey();
    
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

// Unified function to draw comparison sankey (2 columns for area comparison)
function drawComparisonSankey(containerId, config) {
    // config: { area1Data, area2Data, colors, area1Label, area2Label, categoryLabels, showValues, maxValue }
    const container = d3.select(containerId);
    container.selectAll('*').remove();
    
    const containerWidth = container.node().getBoundingClientRect().width;
    const width = Math.min(containerWidth - 40, 500);
    const height = 280;
    const margin = { top: 20, right: 100, bottom: 20, left: 100 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('display', 'block')
        .style('margin', '0 auto');
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Unified dimensions
    const nodeWidth = 80;
    const nodeGap = 5;
    
    // Height scale
    const heightScale = d3.scaleLinear()
        .domain([0, config.maxValue])
        .range([0, chartHeight * 0.8]);
    
    // Calculate y positions for stacked layout with gaps
    const totalLeftHeight = config.area1Data.reduce((sum, node) => sum + heightScale(node.value), 0) + (config.area1Data.length - 1) * nodeGap;
    const totalRightHeight = config.area2Data.reduce((sum, node) => sum + heightScale(node.value), 0) + (config.area2Data.length - 1) * nodeGap;
    
    let leftY = (chartHeight - totalLeftHeight) / 2;
    let rightY = (chartHeight - totalRightHeight) / 2;
    
    // Position nodes
    let currentLeftY = leftY;
    let currentRightY = rightY;
    
    const leftPositions = [];
    const rightPositions = [];
    
    config.area1Data.forEach((node, i) => {
        const nodeHeight = Math.max(2, heightScale(node.value));
        leftPositions.push({ ...node, y: currentLeftY, height: nodeHeight });
        currentLeftY += nodeHeight + nodeGap;
    });
    
    config.area2Data.forEach((node, i) => {
        const nodeHeight = Math.max(2, heightScale(node.value));
        rightPositions.push({ ...node, y: currentRightY, height: nodeHeight });
        currentRightY += nodeHeight + nodeGap;
    });
    
    // Draw connections
    leftPositions.forEach((leftNode, i) => {
        const rightNode = rightPositions[i];
        
        const linkData = {
            source: { x: nodeWidth, y: leftNode.y + leftNode.height / 2 },
            target: { x: chartWidth - nodeWidth, y: rightNode.y + rightNode.height / 2 }
        };
        
        const minValue = Math.min(leftNode.value, rightNode.value);
        const flowThickness = Math.max(2, heightScale(minValue) * 0.8);
        
        const gradientId = `gradient-${leftNode.category}`;
        const gradient = g.append('defs').append('linearGradient')
            .attr('id', gradientId)
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', linkData.source.x)
            .attr('x2', linkData.target.x);
        
        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', config.colors[leftNode.category])
            .attr('stop-opacity', 0.7);
            
        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', config.colors[rightNode.category])
            .attr('stop-opacity', 0.7);
        
        const linkPath = d3.linkHorizontal()
            .x(d => d.x)
            .y(d => d.y);
        
        g.append('path')
            .attr('d', linkPath(linkData))
            .attr('stroke', `url(#${gradientId})`)
            .attr('stroke-width', flowThickness)
            .attr('fill', 'none')
            .attr('opacity', 0.6);
    });
    
    // Draw left nodes
    leftPositions.forEach(node => {
        g.append('rect')
            .attr('x', 0)
            .attr('y', node.y)
            .attr('width', nodeWidth)
            .attr('height', node.height)
            .attr('fill', config.colors[node.category])
            .attr('rx', 0);
        
        if (config.showValues && node.height > 15) {
            g.append('text')
                .attr('class', 'sankey-value-text')
                .attr('x', nodeWidth / 2)
                .attr('y', node.y + node.height / 2)
                .text(node.displayValue || node.value.toLocaleString());
        }
    });
    
    // Draw right nodes
    rightPositions.forEach(node => {
        g.append('rect')
            .attr('x', chartWidth - nodeWidth)
            .attr('y', node.y)
            .attr('width', nodeWidth)
            .attr('height', node.height)
            .attr('fill', config.colors[node.category])
            .attr('rx', 0);
        
        if (config.showValues && node.height > 15) {
            g.append('text')
                .attr('class', 'sankey-value-text')
                .attr('x', chartWidth - nodeWidth / 2)
                .attr('y', node.y + node.height / 2)
                .text(node.displayValue || node.value.toLocaleString());
        }
    });
    
    // Add area labels - with colored text
    g.append('text')
        .attr('x', nodeWidth / 2)
        .attr('y', -7)
        .attr('text-anchor', 'middle')
        .attr('fill', EARTH_COLORS.area1)
        .style('font-weight', '600')
        .style('font-size', '13px')
        .text(config.area1Label);
    
    g.append('text')
        .attr('x', chartWidth - nodeWidth / 2)
        .attr('y', -7)
        .attr('text-anchor', 'middle')
        .attr('fill', EARTH_COLORS.area2)
        .style('font-weight', '600')
        .style('font-size', '13px')
        .text(config.area2Label);
    
    // Add category labels if enabled
    if (config.showCategoryLabels && config.categoryLabels) {
        leftPositions.forEach((node, i) => {
            // Left side labels
            g.append('text')
                .attr('x', -10)
                .attr('y', node.y + node.height / 2)
                .attr('text-anchor', 'end')
                .attr('dominant-baseline', 'middle')
                .attr('fill', '#999')
                .style('font-size', '11px')
                .style('font-weight', '500')
                .text(config.categoryLabels[i]);
        });
        
        rightPositions.forEach((node, i) => {
            // Right side labels
            g.append('text')
                .attr('x', chartWidth + 10)
                .attr('y', node.y + node.height / 2)
                .attr('text-anchor', 'start')
                .attr('dominant-baseline', 'middle')
                .attr('fill', '#999')
                .style('font-size', '11px')
                .style('font-weight', '500')
                .text(config.categoryLabels[i]);
        });
    }
}

// Update sankey diagram with curved connections between areas
function updateSankeyDiagram() {
    if (!area1Data || !area2Data) return;
    
    const chartMode = document.querySelector('input[name="chart-mode"]:checked').value;
    
    // Calculate totals for each area
    const area1Total = area1Data.office + area1Data.housing + area1Data.other;
    const area2Total = area2Data.office + area2Data.housing + area2Data.other;
    
    // Prepare data based on mode
    let area1Nodes, area2Nodes, maxValue;
    
    if (chartMode === 'percentage') {
        area1Nodes = [
            { category: 'office', value: area1Data.office / area1Total, displayValue: `${Math.round((area1Data.office / area1Total) * 100)}%`, label: 'Office' },
            { category: 'housing', value: area1Data.housing / area1Total, displayValue: `${Math.round((area1Data.housing / area1Total) * 100)}%`, label: 'Housing' },
            { category: 'other', value: area1Data.other / area1Total, displayValue: `${Math.round((area1Data.other / area1Total) * 100)}%`, label: 'Other' }
        ];
        area2Nodes = [
            { category: 'office', value: area2Data.office / area2Total, displayValue: `${Math.round((area2Data.office / area2Total) * 100)}%`, label: 'Office' },
            { category: 'housing', value: area2Data.housing / area2Total, displayValue: `${Math.round((area2Data.housing / area2Total) * 100)}%`, label: 'Housing' },
            { category: 'other', value: area2Data.other / area2Total, displayValue: `${Math.round((area2Data.other / area2Total) * 100)}%`, label: 'Other' }
        ];
        maxValue = 1;
    } else {
        area1Nodes = [
            { category: 'office', value: area1Data.office, displayValue: Math.round(area1Data.office).toLocaleString(), label: 'Office' },
            { category: 'housing', value: area1Data.housing, displayValue: Math.round(area1Data.housing).toLocaleString(), label: 'Housing' },
            { category: 'other', value: area1Data.other, displayValue: Math.round(area1Data.other).toLocaleString(), label: 'Other' }
        ];
        area2Nodes = [
            { category: 'office', value: area2Data.office, displayValue: Math.round(area2Data.office).toLocaleString(), label: 'Office' },
            { category: 'housing', value: area2Data.housing, displayValue: Math.round(area2Data.housing).toLocaleString(), label: 'Housing' },
            { category: 'other', value: area2Data.other, displayValue: Math.round(area2Data.other).toLocaleString(), label: 'Other' }
        ];
        maxValue = Math.max(area1Total, area2Total);
    }
    
    const colors = {
        office: EARTH_COLORS.office,
        housing: EARTH_COLORS.housing,
        other: EARTH_COLORS.other
    };
    
    drawComparisonSankey('#sankey-chart', {
        area1Data: area1Nodes,
        area2Data: area2Nodes,
        colors: colors,
        area1Label: area1Name,
        area2Label: area2Name,
        categoryLabels: ['Office', 'Housing', 'Other'],
        showValues: true,
        showCategoryLabels: true,
        maxValue: maxValue
    });
}

// Generate summary statement
function generateSummaryStatement() {
    if (!area1Data || !area2Data) return;
    
    const summaryEl = document.getElementById('comparison-summary');
    
    // Get chart mode from radio buttons
    const chartMode = document.querySelector('input[name="chart-mode"]:checked')?.value || 'actual';
    
    let officeComparison, housingComparison;
    
    if (chartMode === 'percentage') {
        // Percentage mode - compare percentages
        const area1Total = area1Data.office + area1Data.housing + area1Data.other;
        const area2Total = area2Data.office + area2Data.housing + area2Data.other;
        
        const area1OfficePct = (area1Data.office / area1Total * 100).toFixed(1);
        const area2OfficePct = (area2Data.office / area2Total * 100).toFixed(1);
        const area1HousingPct = (area1Data.housing / area1Total * 100).toFixed(1);
        const area2HousingPct = (area2Data.housing / area2Total * 100).toFixed(1);
        
        officeComparison = area1OfficePct > area2OfficePct ?
            `<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>は<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>より<b style="color:#ffffff;">${(area1OfficePct - area2OfficePct).toFixed(1)}ポイント高い</b>オフィススペースの割合（${area1OfficePct}% vs ${area2OfficePct}%）` :
            `<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>は<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>より<b style="color:#ffffff;">${(area2OfficePct - area1OfficePct).toFixed(1)}ポイント高い</b>オフィススペースの割合（${area2OfficePct}% vs ${area1OfficePct}%）`;
        
        housingComparison = area1HousingPct > area2HousingPct ?
            `<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>は<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>より<b style="color:#ffffff;">${(area1HousingPct - area2HousingPct).toFixed(1)}ポイント高い</b>住宅スペースの割合（${area1HousingPct}% vs ${area2HousingPct}%）` :
            `<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>は<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>より<b style="color:#ffffff;">${(area2HousingPct - area1HousingPct).toFixed(1)}ポイント高い</b>住宅スペースの割合（${area2HousingPct}% vs ${area1HousingPct}%）`;
    } else {
        // Actual mode - compare actual numbers
        officeComparison = area1Data.office > area2Data.office ?
            `<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>は<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>より<b style="color:#ffffff;">${Math.abs(area1Data.office - area2Data.office).toLocaleString()} m²多い</b>オフィススペース（${area1Data.office.toLocaleString()} vs ${area2Data.office.toLocaleString()}）` :
            `<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>は<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>より<b style="color:#ffffff;">${Math.abs(area2Data.office - area1Data.office).toLocaleString()} m²多い</b>オフィススペース（${area2Data.office.toLocaleString()} vs ${area1Data.office.toLocaleString()}）`;
        
        housingComparison = area1Data.housing > area2Data.housing ?
            `<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>は<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>より<b style="color:#ffffff;">${Math.abs(area1Data.housing - area2Data.housing).toLocaleString()} m²多い</b>住宅スペース（${area1Data.housing.toLocaleString()} vs ${area2Data.housing.toLocaleString()}）` :
            `<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>は<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>より<b style="color:#ffffff;">${Math.abs(area2Data.housing - area1Data.housing).toLocaleString()} m²多い</b>住宅スペース（${area2Data.housing.toLocaleString()} vs ${area1Data.housing.toLocaleString()}）`;
    }
    
    const populationComparison = area1Data.population > area2Data.population ?
        `<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>は<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>より<b style="color:#ffffff;">${Math.abs(area1Data.population - area2Data.population).toLocaleString()}人多い</b>人口（${area1Data.population.toLocaleString()} vs ${area2Data.population.toLocaleString()}）` :
        `<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>は<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>より<b style="color:#ffffff;">${Math.abs(area2Data.population - area1Data.population).toLocaleString()}人多い</b>人口（${area2Data.population.toLocaleString()} vs ${area1Data.population.toLocaleString()}）`;
    
    summaryEl.innerHTML = `
        <div style='font-size:1em;color:#ffffff;margin-bottom:6px;'>
            ${officeComparison}を持っています。${housingComparison}を持っています。人口では、${populationComparison}となっています。
        </div>
    `;
}

// Generate age comparison summary statement
function generateAgeSummaryStatement() {
    if (!area1Data || !area2Data) return;
    
    const summaryEl = document.getElementById('age-comparison-summary');
    if (!summaryEl) return;
    
    // Get view mode from radio buttons
    const viewMode = document.querySelector('input[name="age-view-mode"]:checked')?.value || 'absolute';
    
    // Calculate age group totals and percentages
    const area1Total = area1Data.age_0_14 + area1Data.age_15_64 + area1Data.age_65_plus;
    const area2Total = area2Data.age_0_14 + area2Data.age_15_64 + area2Data.age_65_plus;
    
    let childrenComparison, workingComparison, elderlyComparison;
    
    if (viewMode === 'percent') {
        // Percentage mode - compare percentages
        const area1_0_14_pct = (area1Data.age_0_14 / area1Total * 100).toFixed(1);
        const area1_15_64_pct = (area1Data.age_15_64 / area1Total * 100).toFixed(1);
        const area1_65_plus_pct = (area1Data.age_65_plus / area1Total * 100).toFixed(1);
        
        const area2_0_14_pct = (area2Data.age_0_14 / area2Total * 100).toFixed(1);
        const area2_15_64_pct = (area2Data.age_15_64 / area2Total * 100).toFixed(1);
        const area2_65_plus_pct = (area2Data.age_65_plus / area2Total * 100).toFixed(1);
        
        childrenComparison = area1_0_14_pct > area2_0_14_pct ?
            `<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>は<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>より<b style="color:#ffffff;">${(area1_0_14_pct - area2_0_14_pct).toFixed(1)}ポイント高い</b>子供（0-14歳）の割合（${area1_0_14_pct}% vs ${area2_0_14_pct}%）` :
            `<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>は<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>より<b style="color:#ffffff;">${(area2_0_14_pct - area1_0_14_pct).toFixed(1)}ポイント高い</b>子供（0-14歳）の割合（${area2_0_14_pct}% vs ${area1_0_14_pct}%）`;
        
        workingComparison = area1_15_64_pct > area2_15_64_pct ?
            `<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>は<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>より<b style="color:#ffffff;">${(area1_15_64_pct - area2_15_64_pct).toFixed(1)}ポイント高い</b>生産年齢人口（15-64歳）の割合（${area1_15_64_pct}% vs ${area2_15_64_pct}%）` :
            `<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>は<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>より<b style="color:#ffffff;">${(area2_15_64_pct - area1_15_64_pct).toFixed(1)}ポイント高い</b>生産年齢人口（15-64歳）の割合（${area2_15_64_pct}% vs ${area1_15_64_pct}%）`;
        
        elderlyComparison = area1_65_plus_pct > area2_65_plus_pct ?
            `<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>は<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>より<b style="color:#ffffff;">${(area1_65_plus_pct - area2_65_plus_pct).toFixed(1)}ポイント高い</b>高齢者（65歳以上）の割合（${area1_65_plus_pct}% vs ${area2_65_plus_pct}%）` :
            `<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>は<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>より<b style="color:#ffffff;">${(area2_65_plus_pct - area1_65_plus_pct).toFixed(1)}ポイント高い</b>高齢者（65歳以上）の割合（${area2_65_plus_pct}% vs ${area1_65_plus_pct}%）`;
    } else {
        // Absolute mode - compare actual numbers
        childrenComparison = area1Data.age_0_14 > area2Data.age_0_14 ?
            `<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>は<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>より<b style="color:#ffffff;">${Math.abs(area1Data.age_0_14 - area2Data.age_0_14).toLocaleString()}人多い</b>子供（0-14歳）の人口（${area1Data.age_0_14.toLocaleString()} vs ${area2Data.age_0_14.toLocaleString()}）` :
            `<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>は<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>より<b style="color:#ffffff;">${Math.abs(area2Data.age_0_14 - area1Data.age_0_14).toLocaleString()}人多い</b>子供（0-14歳）の人口（${area2Data.age_0_14.toLocaleString()} vs ${area1Data.age_0_14.toLocaleString()}）`;
        
        workingComparison = area1Data.age_15_64 > area2Data.age_15_64 ?
            `<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>は<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>より<b style="color:#ffffff;">${Math.abs(area1Data.age_15_64 - area2Data.age_15_64).toLocaleString()}人多い</b>生産年齢人口（15-64歳）（${area1Data.age_15_64.toLocaleString()} vs ${area2Data.age_15_64.toLocaleString()}）` :
            `<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>は<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>より<b style="color:#ffffff;">${Math.abs(area2Data.age_15_64 - area1Data.age_15_64).toLocaleString()}人多い</b>生産年齢人口（15-64歳）（${area2Data.age_15_64.toLocaleString()} vs ${area1Data.age_15_64.toLocaleString()}）`;
        
        elderlyComparison = area1Data.age_65_plus > area2Data.age_65_plus ?
            `<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>は<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>より<b style="color:#ffffff;">${Math.abs(area1Data.age_65_plus - area2Data.age_65_plus).toLocaleString()}人多い</b>高齢者（65歳以上）（${area1Data.age_65_plus.toLocaleString()} vs ${area2Data.age_65_plus.toLocaleString()}）` :
            `<span style="color:${EARTH_COLORS.area2};font-weight:500;">${area2Name}</span>は<span style="color:${EARTH_COLORS.area1};font-weight:500;">${area1Name}</span>より<b style="color:#ffffff;">${Math.abs(area2Data.age_65_plus - area1Data.age_65_plus).toLocaleString()}人多い</b>高齢者（65歳以上）（${area2Data.age_65_plus.toLocaleString()} vs ${area1Data.age_65_plus.toLocaleString()}）`;
    }
    
    summaryEl.innerHTML = `
        <div style='font-size:1em;color:#ffffff;margin-bottom:6px;'>
            ${childrenComparison}を持っています。${workingComparison}を持っています。${elderlyComparison}となっています。
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

// Draw age comparison sankey diagram
function drawAgeComparisonSankey() {
    if (!area1Data || !area2Data) return;
    
    // Get view mode from radio buttons
    const viewMode = document.querySelector('input[name="age-view-mode"]:checked')?.value || 'absolute';
    
    // Setup age data for both areas
    const area1Total = area1Data.age_0_14 + area1Data.age_15_64 + area1Data.age_65_plus;
    const area2Total = area2Data.age_0_14 + area2Data.age_15_64 + area2Data.age_65_plus;
    
    if (area1Total === 0 || area2Total === 0) {
        const container = document.getElementById('age-sankey-container');
        if (container) {
            container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #ccc;">年齢データがありません</div>';
        }
        return;
    }
    
    // Prepare data based on mode
    let area1Nodes, area2Nodes, maxValue;
    
    if (viewMode === 'percent') {
        area1Nodes = [
            { category: 'age_0_14', value: (area1Data.age_0_14 / area1Total) * 100, displayValue: `${Math.round((area1Data.age_0_14 / area1Total) * 100)}%`, label: '0-14' },
            { category: 'age_15_64', value: (area1Data.age_15_64 / area1Total) * 100, displayValue: `${Math.round((area1Data.age_15_64 / area1Total) * 100)}%`, label: '15-64' },
            { category: 'age_65_plus', value: (area1Data.age_65_plus / area1Total) * 100, displayValue: `${Math.round((area1Data.age_65_plus / area1Total) * 100)}%`, label: '65+' }
        ];
        area2Nodes = [
            { category: 'age_0_14', value: (area2Data.age_0_14 / area2Total) * 100, displayValue: `${Math.round((area2Data.age_0_14 / area2Total) * 100)}%`, label: '0-14' },
            { category: 'age_15_64', value: (area2Data.age_15_64 / area2Total) * 100, displayValue: `${Math.round((area2Data.age_15_64 / area2Total) * 100)}%`, label: '15-64' },
            { category: 'age_65_plus', value: (area2Data.age_65_plus / area2Total) * 100, displayValue: `${Math.round((area2Data.age_65_plus / area2Total) * 100)}%`, label: '65+' }
        ];
        maxValue = 100;
    } else {
        area1Nodes = [
            { category: 'age_0_14', value: area1Data.age_0_14, displayValue: Math.round(area1Data.age_0_14).toLocaleString(), label: '0-14' },
            { category: 'age_15_64', value: area1Data.age_15_64, displayValue: Math.round(area1Data.age_15_64).toLocaleString(), label: '15-64' },
            { category: 'age_65_plus', value: area1Data.age_65_plus, displayValue: Math.round(area1Data.age_65_plus).toLocaleString(), label: '65+' }
        ];
        area2Nodes = [
            { category: 'age_0_14', value: area2Data.age_0_14, displayValue: Math.round(area2Data.age_0_14).toLocaleString(), label: '0-14' },
            { category: 'age_15_64', value: area2Data.age_15_64, displayValue: Math.round(area2Data.age_15_64).toLocaleString(), label: '15-64' },
            { category: 'age_65_plus', value: area2Data.age_65_plus, displayValue: Math.round(area2Data.age_65_plus).toLocaleString(), label: '65+' }
        ];
        maxValue = Math.max(area1Total, area2Total);
    }
    
    const colors = {
        age_0_14: '#9ca3af',     // Light gray - children
        age_15_64: '#6b7280',    // Medium gray - working age
        age_65_plus: '#4b5563'   // Dark gray - elderly
    };
    
    drawComparisonSankey('#age-sankey-container', {
        area1Data: area1Nodes,
        area2Data: area2Nodes,
        colors: colors,
        area1Label: area1Name,
        area2Label: area2Name,
        categoryLabels: ['0-14', '15-64', '65+'],
        showValues: true,
        showCategoryLabels: true,
        maxValue: maxValue
    });
    
    // Generate age summary statement
    generateAgeSummaryStatement();
}

// Listen for view mode changes
document.addEventListener('DOMContentLoaded', () => {
    const ageViewModeInputs = document.querySelectorAll('input[name="age-view-mode"]');
    ageViewModeInputs.forEach(input => {
        input.addEventListener('change', () => {
            if (area1Data && area2Data) {
                drawAgeComparisonSankey();
            }
        });
    });
});