document.addEventListener("DOMContentLoaded", () => {
  // Safety checks
  if (typeof L === "undefined") {
    console.error("Leaflet not loaded.");
    return;
  }

  const mapDiv = document.getElementById("map");
  if (!mapDiv) {
    console.error("Map container not found.");
    return;
  }

  // Get coordinates passed from EJS template
const coordinates = JSON.parse(mapDiv.dataset.coordinates || '[77.2090, 28.6139]');

  const [lng, lat] = coordinates;

  // Initialize map
  const map = L.map("map").setView([lat, lng], 12);

  // Add OpenStreetMap layer
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // Add marker
  L.marker([lat, lng])
    .addTo(map)
    .bindPopup(mapDiv.dataset.popup)
    .openPopup();
});
