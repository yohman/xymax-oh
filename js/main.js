// Load data when page loads
loadTokyoData();

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
