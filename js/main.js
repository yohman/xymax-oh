// Load data when page loads
loadTokyoData();

// Initialize basemap controls when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners for basemap buttons
    document.querySelectorAll('.basemap-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const basemapId = e.target.dataset.basemap;
            xymax.toggleBasemap(basemapId);
        });
    });
    
    // Add event listener for options panel toggle
    const optionsToggle = document.getElementById('options-toggle');
    const optionsPanel = document.getElementById('options-panel');
    if (optionsToggle && optionsPanel) {
        optionsToggle.addEventListener('click', () => {
            optionsPanel.classList.toggle('open');
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
		const map = initMap(data);

	} catch (error) {
		console.error('Error loading Tokyo data:', error);
	}
}
