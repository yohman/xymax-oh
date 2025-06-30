let map;
let data;
let currentCategory = 'office';
let currentStartYear = xymax.defaults.defaultStartYear;
let currentEndYear = xymax.defaults.defaultEndYear;
let selectedFeatures = new Map(); // Changed to Map with KEY_CODE as key to prevent duplicates
let isSticky = false;
let currentMapMode = xymax.defaults.mapMode;
let isSelectMode = false; // New variable for select mode
let isDrawingSelection = false;
let selectionStartPoint = null;
let selectionBox = null;

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
		style: xymax.basemaps[xymax.defaults.defaultBasemap],
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
				'fill-extrusion-opacity': xymax.defaults.defaultTransparency
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
				'fill-extrusion-opacity': Math.min(1.0, xymax.defaults.defaultTransparency + 0.2)
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
				'fill-extrusion-opacity': Math.min(0.5, xymax.defaults.defaultTransparency)
			},
			filter: ['==', 'KEY_CODE', '']
		});
		
		// Add labels layer
		if (xymax.labelsLayer && xymax.labelsLayer.source && xymax.labelsLayer.layer) {
			map.addSource('google-labels', xymax.labelsLayer.source['google-labels']);
			map.addLayer(xymax.labelsLayer.layer);
			// Set visibility based on default setting
			map.setLayoutProperty('google-labels-layer', 'visibility', xymax.labelsVisible ? 'visible' : 'none');
		}
		
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
		window.sidePanel = document.getElementById('side-panel');
		const panelTitle = document.getElementById('panel-title');
		const panelDescription = document.getElementById('panel-description');
		const panelCategorySummary = document.getElementById('panel-category-summary');
		const panelWaffleContainer = document.getElementById('panel-waffle-container');
		const panelLegend = document.getElementById('panel-legend');

		// Function to update category summary section
		window.updateCategorySummary = function updateCategorySummary(featuresData, startYear, endYear) {
			const summaryItems = panelCategorySummary.querySelectorAll('.category-summary-item');
			const categories = ['office', 'housing', 'other'];
			
			categories.forEach((category, index) => {
				const item = summaryItems[index];
				const arrow = item.querySelector('.category-arrow');
				const value = item.querySelector('.category-value');
				const yearValues = item.querySelectorAll('.year-value');
				const startYearElement = yearValues[0];
				const endYearElement = yearValues[1];
				
				let categoryDifference = 0;
				let totalStartValue = 0;
				let totalEndValue = 0;
				
				if (featuresData && Array.isArray(featuresData)) {
					// Multiple features aggregation
					featuresData.forEach(feature => {
						const props = feature.properties;
						const startValue = props[`${startYear}_${category}_total_use_area`] || 0;
						const endValue = props[`${endYear}_${category}_total_use_area`] || 0;
						totalStartValue += startValue;
						totalEndValue += endValue;
						categoryDifference += endValue - startValue;
					});
				} else if (featuresData && featuresData.properties) {
					// Single feature
					const props = featuresData.properties;
					totalStartValue = props[`${startYear}_${category}_total_use_area`] || 0;
					totalEndValue = props[`${endYear}_${category}_total_use_area`] || 0;
					categoryDifference = totalEndValue - totalStartValue;
				}
				
				// Update arrow and color
				const roundedDiff = Math.round(categoryDifference);
				if (categoryDifference > 0) {
					arrow.textContent = '⬆︎';
					arrow.style.color = '#00ff88';
				} else if (categoryDifference < 0) {
					arrow.textContent = '⬇︎';
					arrow.style.color = '#ff4444';
				} else {
					arrow.textContent = '→';
					arrow.style.color = '#888888';
				}
				
				// Update main value with m² label
				value.textContent = `${Math.abs(roundedDiff).toLocaleString()} m²`;
				
				// Update year values with m² labels and year prefixes
				startYearElement.setAttribute('data-year', startYear);
				endYearElement.setAttribute('data-year', endYear);
				startYearElement.textContent = `${startYear}: ${Math.round(totalStartValue).toLocaleString()} m²`;
				endYearElement.textContent = `${endYear}: ${Math.round(totalEndValue).toLocaleString()} m²`;
			});
		}
		
		// Initialize category summary with default values
		window.initializeCategorySummary = function initializeCategorySummary() {
			updateCategorySummary(null, currentStartYear, currentEndYear);
		}
		
		// Initialize the category summary on load
		initializeCategorySummary();

		window.updateSidePanel = function updateSidePanel(feature) {
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
				panelTitle.innerHTML = `Selected Area`;
				panelTitle.style.color = '#ffffff';
				panelDescription.innerHTML = `${description} across all categories<br><small style="color: #888; font-size: 0.8em;">Population: ${population.toLocaleString()} | Households: ${households.toLocaleString()} | Foreign: ${popForeign.toLocaleString()} (${foreignPercent}%)</small>`;
				
				// Update category summary
				updateCategorySummary(feature, startYear, endYear);
				
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

		// New function to update side panel with aggregated data from multiple features
		window.updateSidePanelMultiple = function updateSidePanelMultiple(featuresMap) {
			if (!featuresMap || featuresMap.size === 0) return;
			
			const featuresArray = Array.from(featuresMap.values());
			let totalDifference = 0;
			let totalStartValue = 0;
			let totalEndValue = 0;
			let totalPopulation = 0;
			let totalHouseholds = 0;
			let totalPopForeign = 0;
			
			// Aggregate demographic data for waffle charts
			let aggregatedProps = {
				population: 0,
				households: 0,
				pop_foreign: 0,
				pop_male: 0,
				pop_female: 0,
				pop_0_14: 0,
				pop_15_64: 0,
				pop_65_plus: 0
			};
			
			// Aggregate land use data for each year
			let aggregatedStartProps = {};
			let aggregatedEndProps = {};
			
			// Get the first feature to determine available properties
			const firstFeature = featuresArray[0];
			const startYear = firstFeature.properties.startYear || '';
			const endYear = firstFeature.properties.endYear || '';
			const category = firstFeature.properties.category || '';
			
			// Initialize land use aggregation objects
			const landUseCategories = ['office', 'housing', 'other'];
			landUseCategories.forEach(cat => {
				aggregatedStartProps[`${startYear}_${cat}_total_use_area`] = 0;
				aggregatedEndProps[`${endYear}_${cat}_total_use_area`] = 0;
			});
			
			// Aggregate all values
			featuresArray.forEach(feature => {
				const props = feature.properties;
				totalDifference += props.difference || 0;
				totalStartValue += props.startValue || 0;
				totalEndValue += props.endValue || 0;
				
				// Aggregate demographic data
				aggregatedProps.population += props.population || 0;
				aggregatedProps.households += props.households || 0;
				aggregatedProps.pop_foreign += props.pop_foreign || 0;
				aggregatedProps.pop_male += props.pop_male || 0;
				aggregatedProps.pop_female += props.pop_female || 0;
				aggregatedProps.pop_0_14 += props.pop_0_14 || 0;
				aggregatedProps.pop_15_64 += props.pop_15_64 || 0;
				aggregatedProps.pop_65_plus += props.pop_65_plus || 0;
				
				// Aggregate land use data
				landUseCategories.forEach(cat => {
					const startField = `${startYear}_${cat}_total_use_area`;
					const endField = `${endYear}_${cat}_total_use_area`;
					aggregatedStartProps[startField] += props[startField] || 0;
					aggregatedEndProps[endField] += props[endField] || 0;
				});
			});
			
			totalPopulation = aggregatedProps.population;
			totalHouseholds = aggregatedProps.households;
			totalPopForeign = aggregatedProps.pop_foreign;
			
			const intValue = Math.round(totalDifference);
			const arrow = totalDifference > 0 ? '⬆︎' : totalDifference < 0 ? '⬇︎' : '';
			const description = totalDifference > 0 ? 'Increase' : totalDifference < 0 ? 'Decrease' : 'No Change';
			const foreignPercent = totalPopulation > 0 ? Math.round((totalPopForeign / totalPopulation) * 100) : 0;
			const color = totalDifference > 0 ? '#00ff88' : totalDifference < 0 ? '#ff4444' : '#888888';
			
			// Create waffle charts using aggregated data
			const startWaffle = createWaffleChart(aggregatedStartProps, startYear);
			const endWaffle = createWaffleChart(aggregatedEndProps, endYear);
			const startLegend = createWaffleChartLegend(aggregatedStartProps, startYear);
			const endLegend = createWaffleChartLegend(aggregatedEndProps, endYear);
			
			// Create age demographics waffle chart with aggregated data
			const ageWaffle = createAgeWaffleChart(aggregatedProps);
			const ageLegend = createAgeWaffleChartLegend(aggregatedProps);
			
			// Create gender demographics waffle chart with aggregated data
			const genderWaffle = createGenderWaffleChart(aggregatedProps);
			const genderLegend = createGenderWaffleChartLegend(aggregatedProps);
			
			// Update side panel content
			panelTitle.innerHTML = `Selected Areas (${featuresArray.length})`;
			panelTitle.style.color = '#ffffff';
			panelDescription.innerHTML = `Aggregated data across all categories<br><small style="color: #888; font-size: 0.8em;">Population: ${totalPopulation.toLocaleString()} | Households: ${totalHouseholds.toLocaleString()} | Foreign: ${totalPopForeign.toLocaleString()} (${foreignPercent}%)</small>`;
			
			// Update category summary with aggregated data
			updateCategorySummary(featuresArray, startYear, endYear);
			
			// Show waffle charts for aggregated data
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

		// Click event for polygon selection
		map.on('click', 'tokyo-layer', (e) => {
			// Skip polygon selection if we're in select mode (rectangle selection takes priority)
			if (isSelectMode) {
				return;
			}
			
			e.preventDefault();
			const clickedFeature = e.features[0];
			const keyCode = clickedFeature.properties.KEY_CODE;
			
			// Check if this feature is already selected
			if (selectedFeatures.has(keyCode)) {
				// Remove from selection
				selectedFeatures.delete(keyCode);
			} else {
				// Add to selection
				selectedFeatures.set(keyCode, clickedFeature);
			}
			
			// Update highlight filter
			if (selectedFeatures.size > 0) {
				const selectedKeyCodes = Array.from(selectedFeatures.keys());
				map.setFilter('tokyo-layer-highlight', ['in', 'KEY_CODE', ...selectedKeyCodes]);
				
				// Update side panel
				if (selectedFeatures.size === 1) {
					updateSidePanel(Array.from(selectedFeatures.values())[0]);
				} else {
					updateSidePanelMultiple(selectedFeatures);
				}
				
				isSticky = true;
				sidePanel.classList.add('open', 'sticky');
				document.querySelector('.side-panel-header').classList.add('sticky');
			} else {
				// No features selected, clear everything
				map.setFilter('tokyo-layer-highlight', ['==', 'KEY_CODE', '']);
				isSticky = false;
				sidePanel.classList.remove('open', 'sticky');
				document.querySelector('.side-panel-header').classList.remove('sticky');
			}
		});

		// Click on empty area to deselect all
		map.on('click', (e) => {
			// Skip if we're in select mode (handled by rectangle selection logic)
			if (isSelectMode) {
				return;
			}
			
			// Check if click was on a polygon
			const features = map.queryRenderedFeatures(e.point, { layers: ['tokyo-layer'] });
			
			if (features.length === 0) {
				// Clicked on empty area - clear all selections
				selectedFeatures.clear();
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
			// Show hover highlight if not already selected
			const isSelected = selectedFeatures.has(hoveredFeature.properties.KEY_CODE);
			if (!isSelected) {
				map.setFilter('tokyo-layer-hover', ['==', 'KEY_CODE', hoveredFeature.properties.KEY_CODE]);
			}
			
			if (!isSticky) {
				sidePanel.classList.add('open');
			}
		});

		map.on('mousemove', 'tokyo-layer', (e) => {
			const feature = e.features[0];
			
			// Update hover highlight if not already selected
			const isSelected = selectedFeatures.has(feature.properties.KEY_CODE);
			if (!isSelected) {
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
		
		// Rectangle selection functionality with select mode
		function createSelectionBox() {
			const box = document.createElement('div');
			box.style.position = 'absolute';
			box.style.border = '2px dashed #00ff88';
			box.style.backgroundColor = 'rgba(0, 255, 136, 0.1)';
			box.style.pointerEvents = 'none';
			box.style.zIndex = '1000';
			box.style.display = 'none';
			document.body.appendChild(box);
			return box;
		}
		
		// Select mode button functionality
		const selectModeButton = document.getElementById('select-mode-button');
		if (selectModeButton) {
			selectModeButton.addEventListener('click', () => {
				isSelectMode = !isSelectMode;
				selectModeButton.classList.toggle('active', isSelectMode);
				
				// Update cursor and UI feedback
				if (isSelectMode) {
					map.getCanvas().style.cursor = 'crosshair';
					// Disable map interactions that conflict with selection
					map.boxZoom.disable();
				} else {
					map.getCanvas().style.cursor = '';
					map.boxZoom.enable();
					// Clean up any ongoing selection
					if (isDrawingSelection && selectionBox) {
						selectionBox.style.display = 'none';
						isDrawingSelection = false;
						selectionStartPoint = null;
					}
				}
			});
		}
		
		// Mouse click in select mode - start or complete rectangle selection
		map.on('click', (e) => {
			if (isSelectMode) {
				// Prevent default polygon click behavior
				e.preventDefault();
				
				if (!isDrawingSelection) {
					// Start rectangle selection
					console.log('Starting rectangle selection');
					isDrawingSelection = true;
					selectionStartPoint = e.point;
					
					if (!selectionBox) {
						selectionBox = createSelectionBox();
					}
					
					const rect = map.getContainer().getBoundingClientRect();
					selectionBox.style.left = (rect.left + e.point.x) + 'px';
					selectionBox.style.top = (rect.top + e.point.y) + 'px';
					selectionBox.style.width = '0px';
					selectionBox.style.height = '0px';
					selectionBox.style.display = 'block';
					
				} else {
					// Complete rectangle selection
					console.log('Completing rectangle selection');
					const currentPoint = e.point;
					
					// Define the selection rectangle
					const minX = Math.min(selectionStartPoint.x, currentPoint.x);
					const maxX = Math.max(selectionStartPoint.x, currentPoint.x);
					const minY = Math.min(selectionStartPoint.y, currentPoint.y);
					const maxY = Math.max(selectionStartPoint.y, currentPoint.y);
					
					console.log('Rectangle selection area:', { minX, minY, maxX, maxY });
					
					// Query features within the rectangle
					const featuresInBox = map.queryRenderedFeatures([
						[minX, minY],
						[maxX, maxY]
					], { layers: ['tokyo-layer'] });
					
					console.log('Features found in rectangle:', featuresInBox.length);
					
					// Add features to selection, using KEY_CODE to prevent duplicates
					featuresInBox.forEach(feature => {
						const keyCode = feature.properties.KEY_CODE;
						if (!selectedFeatures.has(keyCode)) {
							selectedFeatures.set(keyCode, feature);
						}
					});
					
					console.log('Total selected features after rectangle selection:', selectedFeatures.size);
					
					// Update highlight and side panel
					if (selectedFeatures.size > 0) {
						const selectedKeyCodes = Array.from(selectedFeatures.keys());
						map.setFilter('tokyo-layer-highlight', ['in', 'KEY_CODE', ...selectedKeyCodes]);
						
						if (selectedFeatures.size === 1) {
							updateSidePanel(Array.from(selectedFeatures.values())[0]);
						} else {
							updateSidePanelMultiple(selectedFeatures);
						}
						
						isSticky = true;
						sidePanel.classList.add('open', 'sticky');
						document.querySelector('.side-panel-header').classList.add('sticky');
					}
					
					// Clean up
					selectionBox.style.display = 'none';
					isDrawingSelection = false;
					selectionStartPoint = null;
					
					// Exit select mode
					isSelectMode = false;
					selectModeButton.classList.remove('active');
					map.getCanvas().style.cursor = '';
					map.boxZoom.enable();
				}
			}
		});
		
		// Mouse move in select mode - update rectangle
		map.on('mousemove', (e) => {
			if (isSelectMode && isDrawingSelection && selectionStartPoint && selectionBox) {
				const currentPoint = e.point;
				
				const minX = Math.min(selectionStartPoint.x, currentPoint.x);
				const maxX = Math.max(selectionStartPoint.x, currentPoint.x);
				const minY = Math.min(selectionStartPoint.y, currentPoint.y);
				const maxY = Math.max(selectionStartPoint.y, currentPoint.y);
				
				const rect = map.getContainer().getBoundingClientRect();
				selectionBox.style.left = (rect.left + minX) + 'px';
				selectionBox.style.top = (rect.top + minY) + 'px';
				selectionBox.style.width = (maxX - minX) + 'px';
				selectionBox.style.height = (maxY - minY) + 'px';
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
				
				// Update side panel if there are selected features - do this immediately after data update
				if (selectedFeatures.size > 0 && isSticky) {
					// Find the updated features with the new calculated properties
					const updatedFeatures = new Map();
					selectedFeatures.forEach((selectedFeature, keyCode) => {
						const updatedFeature = data.features.find(f => 
							f.properties.KEY_CODE === keyCode
						);
						if (updatedFeature) {
							updatedFeatures.set(keyCode, updatedFeature);
						}
					});
					
					selectedFeatures = updatedFeatures;
					
					if (selectedFeatures.size === 1) {
						updateSidePanel(Array.from(selectedFeatures.values())[0]);
					} else if (selectedFeatures.size > 1) {
						updateSidePanelMultiple(selectedFeatures);
					}
				}
			});
		});
		
		// Set up slider year change callback
		window.onSliderYearChange = (startYear, endYear) => {
			currentStartYear = startYear;
			currentEndYear = endYear;
			extrudePolygons(currentStartYear, currentEndYear, currentCategory);
			
			// Update side panel if there are selected features - do this immediately after data update
			if (selectedFeatures.size > 0 && isSticky) {
				// Find the updated features with the new calculated properties
				const updatedFeatures = new Map();
				selectedFeatures.forEach((selectedFeature, keyCode) => {
					const updatedFeature = data.features.find(f => 
						f.properties.KEY_CODE === keyCode
					);
					if (updatedFeature) {
						updatedFeatures.set(keyCode, updatedFeature);
					}
				});
				
				selectedFeatures = updatedFeatures;
				
				if (selectedFeatures.size === 1) {
					updateSidePanel(Array.from(selectedFeatures.values())[0]);
				} else if (selectedFeatures.size > 1) {
					updateSidePanelMultiple(selectedFeatures);
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
			if (touchDuration < 500) {
				const features = map.queryRenderedFeatures(e.point, { layers: ['tokyo-layer'] });
				
				if (features.length > 0) {
					// Polygon was touched
					const clickedFeature = features[0];
					const keyCode = clickedFeature.properties.KEY_CODE;
					
					// Check if this feature is already selected
					if (selectedFeatures.has(keyCode)) {
						// Remove from selection
						selectedFeatures.delete(keyCode);
					} else {
						// Add to selection
						selectedFeatures.set(keyCode, clickedFeature);
					}
					
					// Update highlight filter
					if (selectedFeatures.size > 0) {
						const selectedKeyCodes = Array.from(selectedFeatures.keys());
						map.setFilter('tokyo-layer-highlight', ['in', 'KEY_CODE', ...selectedKeyCodes]);
						
						// Update side panel
						if (selectedFeatures.size === 1) {
							updateSidePanel(Array.from(selectedFeatures.values())[0]);
						} else {
							updateSidePanelMultiple(selectedFeatures);
						}
						
						isSticky = true;
						sidePanel.classList.add('open', 'sticky');
						document.querySelector('.side-panel-header').classList.add('sticky');
					} else {
						// No features selected, clear everything
						map.setFilter('tokyo-layer-highlight', ['==', 'KEY_CODE', '']);
						isSticky = false;
						sidePanel.classList.remove('open', 'sticky');
						document.querySelector('.side-panel-header').classList.remove('sticky');
					}
				} else {
					// Empty area touched - clear all selections
					selectedFeatures.clear();
					isSticky = false;
					
					map.setFilter('tokyo-layer-highlight', ['==', 'KEY_CODE', '']);
					sidePanel.classList.remove('open', 'sticky');
					document.querySelector('.side-panel-header').classList.remove('sticky');
				}
			}
		});
		
		// Mobile side panel swipe-to-dismiss functionality
		if (window.innerWidth <= 768) {
			let startY = 0;
			let currentY = 0;
			let isDragging = false;
			let hasMoved = false;
			
			sidePanel.addEventListener('touchstart', (e) => {
				if (!sidePanel.classList.contains('open')) return;
				
				const touch = e.touches[0];
				const rect = sidePanel.getBoundingClientRect();
				const relativeY = touch.clientY - rect.top;
				
				// Only handle swipes that start from the top 60px of the panel (handle area)
				if (relativeY > 60) return;
				
				startY = touch.clientY;
				currentY = startY;
				isDragging = true;
				hasMoved = false;
				sidePanel.style.transition = 'none';
			});
			
			sidePanel.addEventListener('touchmove', (e) => {
				if (!isDragging || !sidePanel.classList.contains('open')) return;
				
				e.preventDefault();
				currentY = e.touches[0].clientY;
				const deltaY = currentY - startY;
				hasMoved = Math.abs(deltaY) > 10;
				
				// Only allow dragging down (positive deltaY)
				if (deltaY > 0) {
					const newBottom = Math.min(0, -deltaY);
					sidePanel.style.bottom = `${newBottom}px`;
				}
			});
			
			sidePanel.addEventListener('touchend', (e) => {
				if (!isDragging) return;
				
				isDragging = false;
				sidePanel.style.transition = 'bottom 0.3s ease';
				
				const deltaY = currentY - startY;
				
				// If dragged down more than 100px, close the panel
				if (deltaY > 100) {
					sidePanel.classList.remove('open', 'sticky');
					sidePanel.style.bottom = '';
					// Clear selections
					selectedFeatures.clear();
					map.setFilter('tokyo-layer-highlight', ['==', 'KEY_CODE', '']);
					isSticky = false;
				} else {
					// Snap back to open position
					sidePanel.style.bottom = '0';
				}
			});
		}
	});

	return map;
}