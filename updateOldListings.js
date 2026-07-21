const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const Review = require("./models/review.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

async function main() {
    await mongoose.connect(MONGO_URL);
    console.log("MongoDB connected");

    const listings = await Listing.find({}).populate("reviews");
    console.log(`Found ${listings.length} listings to update.`);

    const categoriesList = ["Rooms", "Iconic Cities", "Mountains", "Castles", "Amazing pools", "Camping", "Farms", "Arctic", "Domes", "Boats"];
    const standardAmenities = ["Wifi", "Air conditioning", "Kitchen", "Free parking", "Pool", "Gym", "Washing machine", "Pet friendly", "TV"];

    for (let listing of listings) {
        try {
            // Determine category
            let category = "Rooms";
            const title = (listing.title || "").toLowerCase();
            const desc = (listing.description || "").toLowerCase();

            if (title.includes("beach") || title.includes("ocean") || title.includes("lake") || title.includes("water") || title.includes("pool") || desc.includes("pool") || desc.includes("beach")) {
                category = "Amazing pools";
            } else if (title.includes("cabin") || title.includes("camping") || title.includes("camp") || title.includes("treehouse") || title.includes("wood")) {
                category = "Camping";
            } else if (title.includes("mountain") || title.includes("ski") || title.includes("alp") || title.includes("hill") || title.includes("peak")) {
                category = "Mountains";
            } else if (title.includes("castle") || title.includes("historic") || title.includes("palace") || title.includes("chateau")) {
                category = "Castles";
            } else if (title.includes("dome") || title.includes("igloo") || title.includes("tent") || title.includes("yurt")) {
                category = "Domes";
            } else if (title.includes("boat") || title.includes("yacht") || title.includes("ship") || title.includes("canal")) {
                category = "Boats";
            } else if (title.includes("farm") || title.includes("ranch") || title.includes("rustic") || title.includes("barn")) {
                category = "Farms";
            } else if (title.includes("city") || title.includes("town") || title.includes("loft") || title.includes("apartment") || title.includes("penthouse") || title.includes("studio") || title.includes("condo")) {
                category = "Iconic Cities";
            }

            // Assign amenities based on category and random distribution
            let amenities = ["Wifi", "Kitchen"];
            if (category === "Amazing pools") amenities.push("Pool");
            if (category === "Mountains") amenities.push("Air conditioning");
            if (category === "Camping") amenities.push("Pet friendly");
            if (category === "Iconic Cities") amenities.push("TV", "Gym");
            
            // Add a few more random ones
            standardAmenities.forEach(a => {
                if (!amenities.includes(a) && Math.random() > 0.6) {
                    amenities.push(a);
                }
            });

            // Calculate rating from reviews
            let avgRating = 0;
            if (listing.reviews && listing.reviews.length > 0) {
                const totalRating = listing.reviews.reduce((sum, r) => sum + r.rating, 0);
                avgRating = parseFloat((totalRating / listing.reviews.length).toFixed(2));
            } else {
                avgRating = parseFloat((3.5 + Math.random() * 1.5).toFixed(2)); // Default random high ratings
            }

            // Assign random viewCount for realism
            const viewCount = Math.floor(50 + Math.random() * 450);

            // Compute trendingScore
            // Formula: viewCount * 0.3 + bookingsCount * 0.25 + rating * 2 * 0.1
            const trendingScore = viewCount * 0.3 + (listing.reviews.length * 2) * 0.25 + avgRating * 2;

            listing.category = category;
            listing.amenities = amenities;
            listing.viewCount = viewCount;
            listing.rating = avgRating;
            listing.trendingScore = trendingScore;

            await listing.save();
            console.log(`Updated: "${listing.title}" | Category: ${category} | Rating: ${avgRating} | Views: ${viewCount}`);
        } catch (err) {
            console.error(`Error updating listing ${listing._id}: ${err.message}`);
        }
    }

    console.log("All listings initialized successfully!");
    mongoose.connection.close();
}

main();
