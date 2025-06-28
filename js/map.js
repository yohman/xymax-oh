let map;
let data;
let currentCategory = 'office';
let currentStartYear = xymax.defaults.defaultStartYear;
let currentEndYear = xymax.defaults.defaultEndYear;
let selectedFeature = null;
let isSticky = false;
let currentMapMode = xymax.defaults.mapMode;

function extrudePolygons(startYear = 1996, endYear = 2023, category = 'office') {
	console.log(`Animating polygons for ${startYear} to ${endYear} with category: ${category}`);
	if (data.type === 'FeatureCollection') {
		const startField = `${startYear}_${category}_total_use_area`;
		const endField = `${endYear}_${category}_total_use_area`;
		console.log(`Using fields: ${startField}, ${endField}`);
		
		// Ensure fields exist in the data
		if (!data.features || !data.features.length || 
			!data.features[0].properties || 
			!(startField in data.features[0].properties) || 
			!(endField in data.features[0].properties)) {
			console.error('Invalid data structure or fields not found');
			return;
		}
		
		// First pass: find the maximum absolute value for normalization
		let maxValue = 0;
		data.features.forEach(feature => {
			if (feature.properties && 
				feature.properties[startField] !== undefined && 
				feature.properties[endField] !== undefined) {
				const startValue = feature.properties[startField] || 0;
				const endValue = feature.properties[endField] || 0;
				const difference = endValue - startValue;
				const value = Math.abs(difference);
				if (value > maxValue) {
					maxValue = value;
				}
			}
		});
		
		// Define maximum extrusion height for viewable extent
		const maxExtrusionHeight = xymax.defaults.maxExtrusionHeight;
		
		// Second pass: normalize and set extrusion heights and colors
		data.features.forEach(feature => {
			if (feature.properties && 
				feature.properties[startField] !== undefined && 
				feature.properties[endField] !== undefined) {
				const startValue = feature.properties[startField] || 0;
				const endValue = feature.properties[endField] || 0;
				const rawValue = endValue - startValue;
				
				// Store values for popup display
				feature.properties.startValue = startValue;
				feature.properties.endValue = endValue;
				feature.properties.startYear = startYear;
				feature.properties.endYear = endYear;
				feature.properties.category = category;
				feature.properties.difference = rawValue;
				
				// Set height based on map mode
				if (currentMapMode === '3d') {
					const normalizedHeight = maxValue > 0 ? 
						(Math.abs(rawValue) / maxValue) * maxExtrusionHeight : 0;
					feature.properties.extrusionHeight = Math.max(0, normalizedHeight);
				} else {
					feature.properties.extrusionHeight = 0; // 2D mode
				}
				
				// Set color based on value with new color scheme
				if (rawValue === 0) {
					feature.properties.extrusionColor = xymax.colors.neutral;
				} else if (rawValue > 0) {
					// Green gradient for positive values
					const intensity = Math.abs(rawValue) / maxValue;
					const startColor = xymax.colors.positive.start;
					const endColor = xymax.colors.positive.end;
					const r = Math.round(startColor[0] + (endColor[0] - startColor[0]) * intensity);
					const g = Math.round(startColor[1] + (endColor[1] - startColor[1]) * intensity);
					const b = Math.round(startColor[2] + (endColor[2] - startColor[2]) * intensity);
					feature.properties.extrusionColor = `rgb(${r}, ${g}, ${b})`;
				} else {
					// Red gradient for negative values
					const intensity = Math.abs(rawValue) / maxValue;
					const startColor = xymax.colors.negative.start;
					const endColor = xymax.colors.negative.end;
					const r = Math.round(startColor[0] + (endColor[0] - startColor[0]) * intensity);
					const g = Math.round(startColor[1] + (endColor[1] - startColor[1]) * intensity);
					const b = Math.round(startColor[2] + (endColor[2] - startColor[2]) * intensity);
					feature.properties.extrusionColor = `rgb(${r}, ${g}, ${b})`;
				}
			} else {
				feature.properties.extrusionHeight = 0;
				feature.properties.extrusionColor = '#cccccc';
				feature.properties.difference = 0;
			}
		});
		
		// Update the source data - this will trigger the animation
		if (map.getSource('tokyo-data')) {
			map.getSource('tokyo-data').setData(data);
		}
	}
}

function toggleMapMode() {
	currentMapMode = currentMapMode === '3d' ? '2d' : '3d';
	
	if (currentMapMode === '3d') {
		// Switch to 3D mode
		map.easeTo({
			pitch: xymax.defaults.pitch,
			duration: 1000
		});
	} else {
		// Switch to 2D mode
		map.easeTo({
			pitch: 0,
			duration: 1000
		});
	}
	
	// Update extrusions
	extrudePolygons(currentStartYear, currentEndYear, currentCategory);
	
	// Update toggle UI
	const toggle = document.getElementById('map-mode-toggle');
	if (currentMapMode === '3d') {
		toggle.classList.add('active');
	} else {
		toggle.classList.remove('active');
	}
}

function initMap(geoJsonData) {
	data = geoJsonData;
	
	map = new mapboxgl.Map({
		container: 'map',
		style: xymax.defaults.basemap,
		center: [xymax.defaults.lon, xymax.defaults.lat],
		zoom: xymax.defaults.zoom,
		pitch: xymax.defaults.pitch,
		projection: 'globe'
	});

	map.on('load', () => {
		// Add source
		map.addSource('tokyo-data', {
			type: 'geojson',
			data: data
		});
		
		// Add basic layer
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
		
		// Add highlight layer for selected polygons
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
		
		// Add hover highlight layer
		map.addLayer({
			id: 'tokyo-layer-hover',
			type: 'fill-extrusion',
			source: 'tokyo-data',
			paint: {
				'fill-extrusion-color': '#ffff00',
				'fill-extrusion-height': ['get', 'extrusionHeight'],
				'fill-extrusion-opacity': 0.3
			},
			filter: ['==', 'KEY_CODE', '']
		});
		
		// Fit map to bounds
		const bounds = new mapboxgl.LngLatBounds();
		
		if (data.type === 'FeatureCollection') {
			data.features.forEach(feature => {
				if (feature.geometry.type === 'Point') {
					bounds.extend(feature.geometry.coordinates);
				} else if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
					const coords = feature.geometry.type === 'Polygon' ? 
						feature.geometry.coordinates[0] : 
						feature.geometry.coordinates.flat(2);
					coords.forEach(coord => bounds.extend(coord));
				}
			});
		}
		
		map.fitBounds(bounds, { padding: xymax.defaults.padding, pitch: xymax.defaults.pitch });
		
		// Apply extrusion after map is loaded
		extrudePolygons(currentStartYear, currentEndYear, currentCategory);
		
		// Get side panel elements
		const sidePanel = document.getElementById('side-panel');
		const panelTitle = document.getElementById('panel-title');
		const panelDescription = document.getElementById('panel-description');
		const panelTable = document.getElementById('panel-table');
		const panelWaffleContainer = document.getElementById('panel-waffle-container');
		const panelLegend = document.getElementById('panel-legend');

		function updateSidePanel(feature) {
			const value = feature.properties.difference;
			
			if (value !== undefined && value !== null) {
				const intValue = Math.round(value);
				const arrow = value > 0 ? '⬆︎' : value < 0 ? '⬇︎' : '';
				const color = feature.properties.extrusionColor;
				const description = value > 0 ? 'Increase' : value < 0 ? 'Decrease' : 'No Change';
				const startValue = Math.round(feature.properties.startValue || 0);
				const endValue = Math.round(feature.properties.endValue || 0);
				const startYear = feature.properties.startYear || '';
				const endYear = feature.properties.endYear || '';
				const category = feature.properties.category || '';
				
				// Get 2020 census data
				const population = feature.properties.population || 0;
				const households = feature.properties.households || 0;
				const popForeign = feature.properties.pop_foreign || 0;
				const foreignPercent = population > 0 ? Math.round((popForeign / population) * 100) : 0;
				
				// Create waffle charts and individual legends
				const startWaffle = createWaffleChart(feature.properties, startYear);
				const endWaffle = createWaffleChart(feature.properties, endYear);
				const startLegend = createWaffleChartLegend(feature.properties, startYear);
				const endLegend = createWaffleChartLegend(feature.properties, endYear);
				
				// Create age demographics waffle chart
				const ageWaffle = createAgeWaffleChart(feature.properties);
				const ageLegend = createAgeWaffleChartLegend(feature.properties);
				
				// Create gender demographics waffle chart
				const genderWaffle = createGenderWaffleChart(feature.properties);
				const genderLegend = createGenderWaffleChartLegend(feature.properties);
				
				// Update side panel content
				panelTitle.innerHTML = `${arrow}${intValue.toLocaleString()} m²`;
				panelTitle.style.color = color;
				panelDescription.innerHTML = `${category.charAt(0).toUpperCase() + category.slice(1)} Use Area ${description}<br><small style="color: #888; font-size: 0.8em;">Population: ${population.toLocaleString()} | Households: ${households.toLocaleString()} | Foreign: ${popForeign.toLocaleString()} (${foreignPercent}%)</small>`;
				
				panelTable.innerHTML = `
					<tr>
						<td>${startYear}:</td>
						<td>${startValue.toLocaleString()} m²</td>
					</tr>
					<tr>
						<td>${endYear}:</td>
						<td>${endValue.toLocaleString()} m²</td>
					</tr>
				`;
				
				panelWaffleContainer.innerHTML = `
					<div class="side-panel-waffle-item">
						<div class="side-panel-waffle-year">${startYear}</div>
						${startWaffle}
						${startLegend}
					</div>
					<div class="side-panel-waffle-item">
						<div class="side-panel-waffle-year">${endYear}</div>
						${endWaffle}
						${endLegend}
					</div>
					<div class="side-panel-waffle-item">
						<div class="side-panel-waffle-year">Age Groups (2020)</div>
						${ageWaffle}
						${ageLegend}
					</div>
					<div class="side-panel-waffle-item">
						<div class="side-panel-waffle-year">Gender (2020)</div>
						${genderWaffle}
						${genderLegend}
					</div>
				`;
			}
		}

		// Click event for polygon selection
		map.on('click', 'tokyo-layer', (e) => {
			e.preventDefault();
			const clickedFeature = e.features[0];
			
			selectedFeature = clickedFeature;
			isSticky = true;
			
			// Highlight the selected polygon
			map.setFilter('tokyo-layer-highlight', ['==', 'KEY_CODE', clickedFeature.properties.KEY_CODE]);
			
			// Update side panel and keep it open
			updateSidePanel(clickedFeature);
			sidePanel.classList.add('open', 'sticky');
			document.querySelector('.side-panel-header').classList.add('sticky');
		});

		// Click on empty area to deselect
		map.on('click', (e) => {
			// Check if click was on a polygon
			const features = map.queryRenderedFeatures(e.point, { layers: ['tokyo-layer'] });
			
			if (features.length === 0) {
				// Clicked on empty area
				selectedFeature = null;
				isSticky = false;
				
				// Remove highlight
				map.setFilter('tokyo-layer-highlight', ['==', 'KEY_CODE', '']);
				
				// Close side panel and remove sticky state
				sidePanel.classList.remove('open', 'sticky');
				document.querySelector('.side-panel-header').classList.remove('sticky');
			}
		});

		// Hover events (always active)
		map.on('mouseenter', 'tokyo-layer', (e) => {
			map.getCanvas().style.cursor = 'pointer';
			
			const hoveredFeature = e.features[0];
			// Show hover highlight if not the selected polygon
			if (!isSticky || hoveredFeature.properties.KEY_CODE !== selectedFeature?.properties.KEY_CODE) {
				map.setFilter('tokyo-layer-hover', ['==', 'KEY_CODE', hoveredFeature.properties.KEY_CODE]);
			}
			
			if (!isSticky) {
				sidePanel.classList.add('open');
			}
		});

		map.on('mousemove', 'tokyo-layer', (e) => {
			const feature = e.features[0];
			
			// Update hover highlight if not the selected polygon
			if (!isSticky || feature.properties.KEY_CODE !== selectedFeature?.properties.KEY_CODE) {
				map.setFilter('tokyo-layer-hover', ['==', 'KEY_CODE', feature.properties.KEY_CODE]);
			}
			
			if (!isSticky) {
				updateSidePanel(feature);
			}
		});

		map.on('mouseleave', 'tokyo-layer', () => {
			map.getCanvas().style.cursor = '';
			
			// Always remove hover highlight
			map.setFilter('tokyo-layer-hover', ['==', 'KEY_CODE', '']);
			
			if (!isSticky) {
				sidePanel.classList.remove('open');
			}
		});
		
		// Add category button event handlers
		const categoryButtons = document.querySelectorAll('.category-button');
		categoryButtons.forEach(button => {
			button.addEventListener('click', (e) => {
				const category = e.target.dataset.category;
				
				// Update active button
				categoryButtons.forEach(btn => btn.classList.remove('active'));
				e.target.classList.add('active');
				
				// Update current category and refresh extrusion
				currentCategory = category;
				extrudePolygons(currentStartYear, currentEndYear, currentCategory);
				
				// Update side panel if there's a selected feature - do this immediately after data update
				if (selectedFeature && isSticky) {
					// Find the updated feature with the new calculated properties
					const updatedFeature = data.features.find(f => 
						f.properties.KEY_CODE === selectedFeature.properties.KEY_CODE
					);
					if (updatedFeature) {
						selectedFeature = updatedFeature;
						updateSidePanel(selectedFeature);
					}
				}
			});
		});
		
		// Set up slider year change callback
		window.onSliderYearChange = (startYear, endYear) => {
			currentStartYear = startYear;
			currentEndYear = endYear;
			extrudePolygons(currentStartYear, currentEndYear, currentCategory);
			
			// Update side panel if there's a selected feature - do this immediately after data update
			if (selectedFeature && isSticky) {
				// Find the updated feature with the new calculated properties
				const updatedFeature = data.features.find(f => 
					f.properties.KEY_CODE === selectedFeature.properties.KEY_CODE
				);
				if (updatedFeature) {
					selectedFeature = updatedFeature;
					updateSidePanel(selectedFeature);
				}
			}
		};
		
		// Set up map mode toggle
		const mapModeToggle = document.getElementById('map-mode-toggle');
		mapModeToggle.addEventListener('click', toggleMapMode);
		
		// Mobile-friendly touch events
		let touchStartTime = 0;
		
		map.on('touchstart', (e) => {
			touchStartTime = Date.now();
		});
		
		map.on('touchend', (e) => {
			const touchDuration = Date.now() - touchStartTime;
			
			// Only treat as click if touch was brief (not a pan/zoom)
			if (touchDuration < 300) {
				const features = map.queryRenderedFeatures(e.point, { layers: ['tokyo-layer'] });
				
				if (features.length > 0) {
					// Polygon was touched
					const clickedFeature = features[0];
					selectedFeature = clickedFeature;
					isSticky = true;
					
					map.setFilter('tokyo-layer-highlight', ['==', 'KEY_CODE', clickedFeature.properties.KEY_CODE]);
					updateSidePanel(clickedFeature);
					sidePanel.classList.add('open', 'sticky');
					document.querySelector('.side-panel-header').classList.add('sticky');
				} else {
					// Empty area touched
					selectedFeature = null;
					isSticky = false;
					
					map.setFilter('tokyo-layer-highlight', ['==', 'KEY_CODE', '']);
					sidePanel.classList.remove('open', 'sticky');
					document.querySelector('.side-panel-header').classList.remove('sticky');
				}
			}
		});
	});

	return map;
}