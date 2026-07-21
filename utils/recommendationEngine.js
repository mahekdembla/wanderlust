const Listing = require("../models/listing");
const Booking = require("../models/booking");

/**
 * Calculates a recommendation score for all listings based on the user's profile and session.
 * Returns listings sorted by their recommendation score in descending order.
 */
async function getRecommendedListings(req, limit = 12) {
    try {
        const user = req.user;
        const session = req.session;

        // Fetch all listings. Optimize query using lean.
        const listings = await Listing.find({}).populate("owner").lean();

        // Fallback if no user and no session interactions exist
        const hasSessionRecent = session.recentlyViewed && session.recentlyViewed.length > 0;
        const hasSessionSearch = session.searchHistory && session.searchHistory.length > 0;

        if (!user && !hasSessionRecent && !hasSessionSearch) {
            // Sort by trendingScore desc, then rating desc
            const fallbackListings = [...listings];
            fallbackListings.sort((a, b) => {
                if (b.trendingScore !== a.trendingScore) return b.trendingScore - a.trendingScore;
                return (b.rating || 0) - (a.rating || 0);
            });
            return fallbackListings.slice(0, limit);
        }

        // Gather preferences
        let prefCities = [];
        let prefCategories = [];
        let prefPriceMin = 0;
        let prefPriceMax = Infinity;
        let wishlistedIds = [];
        let wishlistedCategoryCities = [];
        let bookedCategoryCities = [];
        let searchQueries = [];

        // If authenticated user
        if (user) {
            prefCities = [...(user.preferredCities || [])];
            prefCategories = [...(user.preferredCategories || [])];
            if (user.preferredPriceRange) {
                prefPriceMin = user.preferredPriceRange.min || 0;
                prefPriceMax = user.preferredPriceRange.max || Infinity;
            }
            wishlistedIds = (user.savedListings || []).map(id => id.toString());

            // Get full categories/cities from wishlisted items for similarity match
            if (wishlistedIds.length > 0) {
                const wishlistedListings = await Listing.find({ _id: { $in: user.savedListings } }).select("category location").lean();
                wishlistedListings.forEach(item => {
                    wishlistedCategoryCities.push({
                        category: item.category,
                        location: item.location
                    });
                });
            }

            // Fetch user's bookings
            const bookings = await Booking.find({ guest: user._id }).populate("listing").lean();
            bookings.forEach(b => {
                if (b.listing) {
                    bookedCategoryCities.push({
                        category: b.listing.category,
                        location: b.listing.location
                    });
                }
            });

            // User search history
            (user.searchHistory || []).forEach(sh => {
                if (sh.city) prefCities.push(sh.city);
                if (sh.category) prefCategories.push(sh.category);
                if (sh.query) searchQueries.push(sh.query.toLowerCase());
            });
        }

        // Add session-based interactions
        const sessionRecentIds = (session.recentlyViewed || []).map(id => id.toString());
        const userRecentIds = user ? (user.recentlyViewed || []).map(id => id.toString()) : [];
        const allRecentIds = [...new Set([...sessionRecentIds, ...userRecentIds])];

        (session.searchHistory || []).forEach(sh => {
            if (sh.city) prefCities.push(sh.city);
            if (sh.category) prefCategories.push(sh.category);
            if (sh.query) searchQueries.push(sh.query.toLowerCase());
        });

        // Normalize lists
        prefCities = [...new Set(prefCities.filter(Boolean).map(c => c.toLowerCase().trim()))];
        prefCategories = [...new Set(prefCategories.filter(Boolean).map(c => c.toLowerCase().trim()))];
        searchQueries = [...new Set(searchQueries.filter(Boolean))];

        // Score each listing
        const scoredListings = listings.map(listing => {
            let score = 0;
            const listingIdStr = listing._id.toString();
            const location = (listing.location || "").toLowerCase();
            const country = (listing.country || "").toLowerCase();
            const category = (listing.category || "").toLowerCase();
            const title = (listing.title || "").toLowerCase();
            const description = (listing.description || "").toLowerCase();
            
            const price = listing.listingType === "pg" 
                ? (listing.pgDetails?.monthlyRent || 0) 
                : (listing.price || 0);

            // 1. Location Matching (25%)
            let locationMatch = false;
            for (const city of prefCities) {
                if (location.includes(city) || country.includes(city)) {
                    locationMatch = true;
                    break;
                }
            }
            if (locationMatch) score += 25;

            // 2. Category Matching (20%)
            if (prefCategories.includes(category)) {
                score += 20;
            }

            // 3. Price Matching (20%)
            if (price >= prefPriceMin && price <= prefPriceMax) {
                score += 20;
            } else if (prefPriceMax !== Infinity && prefPriceMax > 0) {
                // If it is within 25% of the boundary, give partial score
                const bufferMin = prefPriceMin * 0.75;
                const bufferMax = prefPriceMax * 1.25;
                if (price >= bufferMin && price <= bufferMax) {
                    score += 10;
                }
            }

            // 4. Wishlist Signal (15%)
            if (wishlistedIds.includes(listingIdStr)) {
                score += 15;
            } else {
                // Check if this shares category or city with any wishlisted item
                const sharesWishlistAttrs = wishlistedCategoryCities.some(
                    w => w.category === listing.category || w.location.toLowerCase().includes(listing.location.toLowerCase())
                );
                if (sharesWishlistAttrs) {
                    score += 10;
                }
            }

            // 5. Booking Signal (10%)
            const bookedSameListing = user && bookedCategoryCities.some(
                b => b.category === listing.category && b.location === listing.location
            );
            if (bookedSameListing) {
                score += 10;
            }

            // 6. Search History matching keywords (10%)
            let textMatch = false;
            for (const query of searchQueries) {
                if (title.includes(query) || description.includes(query) || location.includes(query) || category.includes(query)) {
                    textMatch = true;
                    break;
                }
            }
            if (textMatch) score += 10;

            // Tie breaker weight (up to 1-2 points) based on views & reviews count
            score += Math.min((listing.viewCount || 0) / 1000, 2);
            score += Math.min((listing.reviews?.length || 0) / 50, 1);

            return { ...listing, recommendationScore: parseFloat(score.toFixed(2)) };
        });

        // Sort by recommendationScore desc
        scoredListings.sort((a, b) => b.recommendationScore - a.recommendationScore);

        return scoredListings.slice(0, limit);
    } catch (err) {
        console.error("Error in recommendation engine:", err);
        return [];
    }
}

module.exports = {
    getRecommendedListings
};
