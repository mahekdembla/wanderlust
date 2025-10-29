// updateOldListings.js
const mongoose = require("mongoose");
const fetch = require("node-fetch");
const Listing = require("./models/listing.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

async function main() {
    await mongoose.connect(MONGO_URL);
    console.log("MongoDB connected");

    const listings = await Listing.find({ geometry: { $exists: false } });

    for (let listing of listings) {
        try {
            const locationName = listing.location;
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}`);
            const data = await response.json();

            if (data.length > 0) {
                listing.geometry = {
                    type: "Point",
                    coordinates: [parseFloat(data[0].lon), parseFloat(data[0].lat)]
                };
                await listing.save();
                console.log(`Updated: ${listing.title} -> ${listing.geometry.coordinates}`);
            } else {
                console.log(`No coordinates found for: ${listing.title} (${listing.location})`);
            }
        } catch (err) {
            console.log(`Error updating ${listing.title}: ${err}`);
        }
    }

    console.log("All old listings updated!");
    mongoose.connection.close();
}

main();
