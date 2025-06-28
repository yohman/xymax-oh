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
