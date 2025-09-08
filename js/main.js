// Load data when page loads
loadTokyoData();
document.addEventListener('DOMContentLoaded', () => {
	// Dynamically populate AREA_NAME dropdown from geojson
	fetch('data/salsa.geojson')
		.then(response => response.json())
		.then(data => {
		const areaDropdown = document.getElementById('area-dropdown');
		if (!areaDropdown) return;
		const areaNames = Array.from(new Set(data.features.map(f => f.properties.AREA_NAME))).sort();
		areaNames.forEach(name => {
			const option = document.createElement('option');
			option.value = name;
			option.textContent = name;
			areaDropdown.appendChild(option);
		});
		});
	// Function to select mesh polygons by array of KEY_CODEs
	window.selectMeshPolygonsByIds = function(ids) {
	// Make selection sticky immediately
	window.isSticky = true;
	// Convert all requested KEY_CODEs to numbers for type match
	const numericIds = ids.map(id => typeof id === 'number' ? id : Number(id));
	// Query features from map source
	const features = window.map.querySourceFeatures('tokyo-data', {
		sourceLayer: undefined,
		filter: ['in', 'KEY_CODE', ...numericIds]
	});
	// Highlight polygons
	window.map.setFilter('tokyo-layer-highlight', ['in', 'KEY_CODE', ...numericIds]);
	// Check what filter is set
	const filter = window.map.getFilter('tokyo-layer-highlight');
	// Update selectedFeatures
	if (window.selectedFeatures) {
		window.selectedFeatures.clear();
	} else {
		window.selectedFeatures = new Map();
	}
	features.forEach(f => window.selectedFeatures.set(f.properties.KEY_CODE, f));
	// Show summary info panel and make selection sticky
	if (window.updateSidePanelMultiple) {
		window.updateSidePanelMultiple(window.selectedFeatures);
	}
	// Make summary panel visible and sticky
	if (window.sidePanel) {
		window.sidePanel.classList.add('open', 'sticky');
		const header = document.querySelector('.side-panel-header');
		if (header) header.classList.add('sticky');
	}
	// Zoom to selected polygons
	if (features.length > 0) {
		const bounds = new mapboxgl.LngLatBounds();
		features.forEach(f => {
		if (f.geometry.type === 'Polygon') {
			f.geometry.coordinates[0].forEach(coord => bounds.extend(coord));
		} else if (f.geometry.type === 'MultiPolygon') {
			f.geometry.coordinates.forEach(poly => {
			poly[0].forEach(coord => bounds.extend(coord));
			});
		}
		});
		window.map.fitBounds(bounds, { padding: 200, duration: 1000 });
	}
	// Log the full tokyo-data GeoJSON source for debugging
	if (window.map && window.map.getSource('tokyo-data')) {
		const tokyoData = window.map.getSource('tokyo-data')._data;
	}
	}
	const optionsToggle = document.getElementById('options-toggle');
	const optionsPanel = document.getElementById('options-panel');
	if (optionsToggle && optionsPanel) {
	optionsToggle.addEventListener('click', () => {
		optionsPanel.classList.toggle('open');
	});
	}
	// Add event listener for AREA_NAME dropdown
	const areaDropdown = document.getElementById('area-dropdown');
	if (areaDropdown) {
		areaDropdown.addEventListener('change', async (e) => {
		const selectedArea = e.target.value;
		if (!selectedArea) return;
		// Load salsa.geojson and tokyo_mesh.geojson
		const [salsaRes, meshRes] = await Promise.all([
			fetch('data/salsa.geojson'),
			fetch('data/tokyo_mesh.geojson')
		]);
		const salsaData = await salsaRes.json();
		const meshData = await meshRes.json();
		// Find selected AREA_NAME polygon
		const areaFeature = salsaData.features.find(f => f.properties.AREA_NAME === selectedArea);
		if (!areaFeature) {
			return;
		}
		// Find intersecting mesh polygons
		const turfPoly = areaFeature.geometry;
		// Use turf.js for intersection
		const intersectingMeshes = meshData.features.filter(meshFeature => {
			try {
			return turf.booleanIntersects(
				meshFeature.geometry,
				turfPoly
			);
			} catch (err) {
			return false;
			}
		});
		if (intersectingMeshes.length > 0) {
			// Feed selectMeshPolygonsByIds with the selected polygon array
			const keyCodes = intersectingMeshes.map(f => f.properties.KEY_CODE);
			window.selectMeshPolygonsByIds(keyCodes);
			// Update info panel title to show area and count
			const panelTitle = document.getElementById('panel-title');
			if (panelTitle) {
				panelTitle.textContent = `${selectedArea} (${keyCodes.length})`;
			}

			// Draw outline for selected polygon (add a new layer if not exists), use orange for visibility
			const orange = '#ff9800';
			if (!window.map.getLayer('area-outline')) {
				window.map.addLayer({
					id: 'area-outline',
					type: 'line',
					source: {
						type: 'geojson',
						data: areaFeature
					},
					paint: {
						'line-color': orange,
						'line-width': 4
					}
				});
			} else {
				window.map.getSource('area-outline').setData(areaFeature);
				window.map.setPaintProperty('area-outline', 'line-color', orange);
			}

			// Zoom to the extent of all selected mesh polygons (handles multipolygons correctly)
			if (intersectingMeshes.length > 0) {
				const bounds = new mapboxgl.LngLatBounds();
				intersectingMeshes.forEach(f => {
					if (f.geometry.type === 'Polygon') {
						f.geometry.coordinates[0].forEach(coord => bounds.extend(coord));
					} else if (f.geometry.type === 'MultiPolygon') {
						f.geometry.coordinates.forEach(poly => {
							poly[0].forEach(coord => bounds.extend(coord));
						});
					}
				});
				window.map.fitBounds(bounds, { padding: 200, duration: 1000 });
			}

			// Set mesh transparency to 10%
			if (window.xymax && typeof window.xymax.updateTransparency === 'function') {
				window.xymax.updateTransparency(0.1);
			}
		}
		});
	}

	// Add event listener for labels toggle in options panel
	const labelsToggle = document.getElementById('labels-toggle');
	if (labelsToggle) {
	labelsToggle.addEventListener('click', () => {
		if (xymax.toggleLabels) {
		xymax.toggleLabels();
		}
	});
	}

	// Initialize basemap buttons to show correct default
	document.querySelectorAll('.basemap-button').forEach(btn => {
	btn.classList.remove('active');
	});
	const defaultButton = document.querySelector(`[data-basemap="${xymax.defaults.defaultBasemap}"]`);
	if (defaultButton) {
	defaultButton.classList.add('active');
	}

	// Initialize labels toggle to show correct default
	if (labelsToggle) {
	if (xymax.defaults.defaultLabelsVisible) {
		labelsToggle.classList.add('active');
	} else {
		labelsToggle.classList.remove('active');
	}
	}

	// Add event listener for transparency slider
	const transparencySlider = document.getElementById('transparency-slider');
	if (transparencySlider) {
	// Set initial value
	transparencySlider.value = xymax.defaults.defaultTransparency;
	// Add event listener
	transparencySlider.addEventListener('input', (e) => {
		const opacity = parseFloat(e.target.value);
		if (xymax.updateTransparency) {
		xymax.updateTransparency(opacity);
		}
	});
	}
});
// Function to load and display GeoJSON data
async function loadTokyoData() {
	try {
	const response = await fetch(xymax.defaults.geojsonFile);
	const data = await response.json();

	// Initialize map with the fetched data
	window.map = initMap(data);

	} catch (error) {
	console.error('Error loading Tokyo data:', error);
	}
}
// Globalize currentStartYear and currentEndYear
window.currentStartYear = window.currentStartYear || 1996;
window.currentEndYear = window.currentEndYear || 2023;
// Function to update side panel for a single polygon (hover)
window.updateSidePanelSingle = function(keycodes) {
	if (!Array.isArray(keycodes) || keycodes.length === 0) return;
	// Look up features by keycodes from the map source
	let features = [];
	if (window.map && window.map.getSource && window.map.getSource('tokyo-data')) {
		// Use querySourceFeatures to get all features with matching KEY_CODEs
		features = window.map.querySourceFeatures('tokyo-data', {
			filter: ['in', 'KEY_CODE', ...keycodes]
		});
	}
	if (features.length === 0) return;
	// Log all hovered keycodes
	console.log('[HOVER] KEY_CODES:', keycodes);
	// Aggregate values
	const startYear = window.currentStartYear;
	const endYear = window.currentEndYear;
	const categories = ['office','housing','other'];
	let population = 0, households = 0, foreign = 0;
	let officeStart = 0, officeEnd = 0, housingStart = 0, housingEnd = 0;
	let areaName = '';
	features.forEach(f => {
		population += Math.round(Number(f.properties.population) || 0);
		households += Math.round(Number(f.properties.households) || 0);
		foreign += Math.round(Number(f.properties.foreign) || 0);
		officeStart += Math.round(Number(f.properties[`${startYear}_office_total_use_area`]) || 0);
		officeEnd += Math.round(Number(f.properties[`${endYear}_office_total_use_area`]) || 0);
		housingStart += Math.round(Number(f.properties[`${startYear}_housing_total_use_area`]) || 0);
		housingEnd += Math.round(Number(f.properties[`${endYear}_housing_total_use_area`]) || 0);
		if (!areaName && f.properties.AREA_NAME) areaName = f.properties.AREA_NAME;
	});
// Listen for slider year changes and update global years, polygons, and infopanel
window.onSliderYearChange = function(startYear, endYear) {
	window.currentStartYear = startYear;
	window.currentEndYear = endYear;
	// Re-extrude polygons for new years
	if (window.extrudePolygons) {
		window.extrudePolygons(startYear, endYear, window.currentCategory || 'office');
	}
	// Always update infopanel if there are selected features
	if (window.selectedFeatures && typeof window.selectedFeatures.keys === 'function' && window.selectedFeatures.size > 0) {
		if (window.updateSidePanelSingle) {
			window.updateSidePanelSingle(Array.from(window.selectedFeatures.keys()));
		}
	}
};
	// Set panel title with number of polygons selected (always show count)
	const panelTitle = document.getElementById('panel-title');
	if (panelTitle) {
		let titleText = '';
		if (areaName) {
			titleText = `${areaName} (${keycodes.length})`;
		} else if (keycodes.length === 1) {
			titleText = `Selected Area (1)`;
		} else {
			titleText = `Selected Areas (${keycodes.length})`;
		}
		panelTitle.textContent = titleText;
	}
	// Remove previous population/household/foreign info
	const prevPop = document.querySelector('.panel-population');
	if (prevPop) prevPop.remove();
	// Add population, households, and Foreign numbers under the title
	let popHtml = '';
	popHtml = `<div style="font-size:0.85em;color:#444;margin:2px 0 6px 0;">
		<span>人口: ${population ? Math.round(population).toLocaleString() : '-'}人</span> &nbsp;|
		<span>世帯: ${households ? Math.round(households).toLocaleString() : '-'}世帯</span> &nbsp;|
		<span>外国人: ${foreign ? Math.round(foreign).toLocaleString() : '-'}人</span>
	</div>`;
	// Summary statement for office/housing change and distribution
	const officeDiff = Math.round(officeEnd - officeStart);
	const housingDiff = Math.round(housingEnd - housingStart);
	const officePctStart = (officeStart + housingStart) ? Math.round((officeStart / (officeStart + housingStart)) * 100) : 0;
	const officePctEnd = (officeEnd + housingEnd) ? Math.round((officeEnd / (officeEnd + housingEnd)) * 100) : 0;
	let summaryText = '';
	if (officeStart || officeEnd || housingStart || housingEnd) {
		   const officeChange = officeDiff > 0
			   ? `<b style='color:#00e676;'>increase</b>`
			   : `<b style='color:#e53935;'>decrease</b>`;
		   const housingChange = housingDiff > 0
			   ? `<b style='color:#00e676;'>increase</b>`
			   : `<b style='color:#e53935;'>decrease</b>`;
		   summaryText = `<div style='font-size:1em;color:#fff;margin-bottom:6px;'>
			   In this area, there is a ${officeChange} of office space from ${startYear} to ${endYear} by ${Math.abs(officeDiff).toLocaleString()} square meters, and a ${housingChange} of housing space by ${Math.abs(housingDiff).toLocaleString()} square meters.
		   </div>`;
	}
	// Insert after title
	if (panelTitle && panelTitle.parentElement) {
		if (popHtml) {
			panelTitle.insertAdjacentHTML('afterend', `<div class="panel-population">${popHtml}</div>`);
		}
		// Remove previous summary if exists
		const prevSummary = document.querySelector('.panel-summary-statement');
		if (prevSummary) prevSummary.remove();
		if (summaryText) {
			panelTitle.insertAdjacentHTML('afterend', `<div class="panel-summary-statement">${summaryText}</div>`);
		}
	}
	// Set panel description (optional)
	const panelDescription = document.getElementById('panel-description');
	if (panelDescription) {
		panelDescription.textContent = areaName ? `エリア: ${areaName}` : '';
	}
	// Dynamically get the correct fields for the selected category and years
	const summary = {};
	categories.forEach(cat => {
		const startField = `${startYear}_${cat}_total_use_area`;
		const endField = `${endYear}_${cat}_total_use_area`;
		summary[cat+'Start'] = Math.round(features.reduce((sum, f) => sum + (Number(f.properties[startField]) || 0), 0));
		summary[cat+'End'] = Math.round(features.reduce((sum, f) => sum + (Number(f.properties[endField]) || 0), 0));
	});
	// Update the category summary UI
	categories.forEach(cat => {
		const item = document.querySelector(`.category-summary-item[data-category="${cat}"]`);
		if (item) {
			// Arrow direction
			const start = summary[cat+'Start'] || 0;
			const end = summary[cat+'End'] || 0;
			const diff = end - start;
			const arrow = item.querySelector('.category-arrow');
			if (arrow) {
				arrow.textContent = diff > 0 ? '⬆︎' : (diff < 0 ? '⬇︎' : '→');
				arrow.style.color = diff > 0 ? '#43a047' : (diff < 0 ? '#e53935' : '#888');
			}
			// Main value
			const value = item.querySelector('.category-value');
			if (value) {
				value.textContent = `${diff.toLocaleString()} m²`;
			}
			// Start/end years
			const years = item.querySelector('.category-years');
			if (years) {
				const startEl = years.querySelector('.year-value.start');
				const endEl = years.querySelector('.year-value.end');
				if (startEl) {
					startEl.textContent = `${startYear}: ${start.toLocaleString()} m²`;
				}
				if (endEl) {
					endEl.textContent = `${endYear}: ${end.toLocaleString()} m²`;
				}
			}
		}
	});
	// Update the waffle chart for these features using the correct fields
	if (typeof window.updateWaffleChartSingle === 'function') {
		// Prepare a minimal feature with only the relevant year/category fields, sum values
		const waffleFeature = {
			properties: {
				office: summary['officeEnd'],
				housing: summary['housingEnd'],
				other: summary['otherEnd'],
				[`${startYear}_office_total_use_area`]: summary['officeStart'],
				[`${startYear}_housing_total_use_area`]: summary['housingStart'],
				[`${startYear}_other_total_use_area`]: summary['otherStart'],
				[`${endYear}_office_total_use_area`]: summary['officeEnd'],
				[`${endYear}_housing_total_use_area`]: summary['housingEnd'],
				[`${endYear}_other_total_use_area`]: summary['otherEnd']
			}
		};
		window.updateWaffleChartSingle(waffleFeature);
	} else {
		// Clear or show placeholder in waffle container
		const waffle = document.getElementById('panel-waffle-container');
		if (waffle) waffle.innerHTML = '<div style="color:#e53935;text-align:center;">No waffle chart function found</div>';
	}
	// Open side panel if not already open
	if (window.sidePanel) {
		window.sidePanel.classList.add('open');
	}
}

// Simple waffle chart placeholder for single polygon
window.updateWaffleChartSingle = function(feature) {
	const waffle = document.getElementById('panel-waffle-container');
	if (!waffle || !feature || !feature.properties) return;
	const startYear = window.currentStartYear || 1996;
	const endYear = window.currentEndYear || 2023;
	// Get start and end year values for each category
	const officeStart = feature.properties[`${startYear}_office_total_use_area`] || 0;
	const housingStart = feature.properties[`${startYear}_housing_total_use_area`] || 0;
	const otherStart = feature.properties[`${startYear}_other_total_use_area`] || 0;
	const officeEnd = feature.properties[`${endYear}_office_total_use_area`] || 0;
	const housingEnd = feature.properties[`${endYear}_housing_total_use_area`] || 0;
	const otherEnd = feature.properties[`${endYear}_other_total_use_area`] || 0;
	const totalStart = officeStart + housingStart + otherStart;
	const totalEnd = officeEnd + housingEnd + otherEnd;
	if (totalStart === 0 && totalEnd === 0) {
	waffle.innerHTML = '<div style="color:#888;text-align:center;">No data for waffle chart</div>';
	return;
	}
	// Calculate percentages for each year
	const officeStartPct = totalStart ? Math.round((officeStart / totalStart) * 100) : 0;
	const housingStartPct = totalStart ? Math.round((housingStart / totalStart) * 100) : 0;
	const otherStartPct = 100 - officeStartPct - housingStartPct;
	const officeEndPct = totalEnd ? Math.round((officeEnd / totalEnd) * 100) : 0;
	const housingEndPct = totalEnd ? Math.round((housingEnd / totalEnd) * 100) : 0;
	const otherEndPct = 100 - officeEndPct - housingEndPct;
	// Bar width (wider for better visibility)
	const barWidth = 300;
	const barHeight = 36; // doubled from 18px
	// Helper for bar segment with percentage label
	function barSegment(width, color, pct) {
	return `<div style="position:relative;display:flex;align-items:center;justify-content:center;background:${color};width:${width}px;height:${barHeight}px;margin-right:1px;">
		<span style="position:absolute;left:0;right:0;top:0;bottom:0;display:flex;align-items:center;justify-content:center;font-size:0.7em;color:#fff;font-weight:bold;pointer-events:none;">${width > 24 ? pct + '%' : ''}</span>
	</div>`;
	}
	// Legend row
	const legend = `<div style="display:flex;justify-content:center;align-items:center;font-size:0.8em;margin-bottom:4px;gap:16px;">
	<span><span style="display:inline-block;width:14px;height:14px;background:#1976d2;border-radius:3px;margin-right:4px;"></span>Office</span>
	<span><span style="display:inline-block;width:14px;height:14px;background:#43a047;border-radius:3px;margin-right:4px;"></span>Housing</span>
	<span><span style="display:inline-block;width:14px;height:14px;background:#fbc02d;border-radius:3px;margin-right:4px;"></span>Other</span>
	</div>`;
	// Value row helper
	function valueRow(o, h, ot) {
	return `<div style="display:flex;justify-content:center;align-items:center;font-size:0.8em;margin:2px 0 8px 0;">
		<span style="color:#1976d2;font-weight:bold;">${Math.round(o).toLocaleString()} m²</span>
		<span style="color:#888;margin:0 8px;">|</span>
		<span style="color:#43a047;font-weight:bold;">${Math.round(h).toLocaleString()} m²</span>
		<span style="color:#888;margin:0 8px;">|</span>
		<span style="color:#fbc02d;font-weight:bold;">${Math.round(ot).toLocaleString()} m²</span>
	</div>`;
	}
	// Render two bar charts, one for each year, with value rows
	waffle.innerHTML = `
	${legend}
	<div style="display:flex;flex-direction:column;align-items:center;margin:10px 0;">
		<div style="font-size:0.85em;margin-bottom:2px;">${startYear}</div>
		<div style="display:flex;align-items:center;width:${barWidth}px;height:${barHeight}px;">
		${barSegment(Math.round(barWidth * officeStartPct/100), '#1976d2', officeStartPct)}
		${barSegment(Math.round(barWidth * housingStartPct/100), '#43a047', housingStartPct)}
		${barSegment(Math.round(barWidth * otherStartPct/100), '#fbc02d', otherStartPct)}
		</div>
		${valueRow(officeStart, housingStart, otherStart)}
		<div style="font-size:0.85em;margin-bottom:2px;">${endYear}</div>
		<div style="display:flex;align-items:center;width:${barWidth}px;height:${barHeight}px;">
		${barSegment(Math.round(barWidth * officeEndPct/100), '#1976d2', officeEndPct)}
		${barSegment(Math.round(barWidth * housingEndPct/100), '#43a047', housingEndPct)}
		${barSegment(Math.round(barWidth * otherEndPct/100), '#fbc02d', otherEndPct)}
		</div>
		${valueRow(officeEnd, housingEnd, otherEnd)}
	</div>
	`;
};
