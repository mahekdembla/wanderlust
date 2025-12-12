document.addEventListener("DOMContentLoaded", () => {
  if (typeof L === "undefined") return;

  const mapDiv = document.getElementById("map");
  if (!mapDiv) return;

  let coords = mapDiv.dataset.coordinates;

  
  if (!coords || coords === "" || coords === "null") {
      coords = "[77.2090, 28.6139]"; 
  }

  let [lng, lat] = JSON.parse(coords);

 
  const map = L.map("map").setView([lat, lng], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19
  }).addTo(map);

  L.marker([lat, lng])
      .addTo(map)
      .bindPopup(mapDiv.dataset.popup || "")
      .openPopup();
});
