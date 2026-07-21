document.addEventListener("DOMContentLoaded", () => {
  if (typeof L === "undefined") return;

  const mapDiv = document.getElementById("map");
  if (!mapDiv) return;

  let coords = mapDiv.dataset.coordinates;
  if (!coords || coords === "" || coords === "null") {
      return;
  }

  try {
      let parsed = JSON.parse(coords);
      if (!Array.isArray(parsed) || parsed.length < 2 || isNaN(parsed[0]) || isNaN(parsed[1])) {
          return;
      }
      let [lng, lat] = parsed;

      const map = L.map("map").setView([lat, lng], 12);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      L.marker([lat, lng])
          .addTo(map)
          .bindPopup(mapDiv.dataset.popup || "")
          .openPopup();
  } catch (e) {
      console.warn("Invalid map coordinates:", coords);
  }
});
