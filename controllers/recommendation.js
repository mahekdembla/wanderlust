const Listing = require("../models/listing");
const User = require("../models/user");
const { getRecommendedListings } = require("../utils/recommendationEngine");

// Simple in-memory cache for trending listings
let cachedTrending = null;
let lastTrendingCacheTime = 0;
const CACHE_DURATION_MS = 60000; // 1 minute cache

/**
 * Get trending listings, using an in-memory cache for performance.
 */
async function getTrendingListings(limit = 12) {
    const now = Date.now();
    if (cachedTrending && (now - lastTrendingCacheTime < CACHE_DURATION_MS)) {
        return cachedTrending.slice(0, limit);
    }

    try {
        // Fetch and sort by trendingScore descending, lean queries for performance
        const listings = await Listing.find({})
            .sort({ trendingScore: -1 })
            .populate("owner")
            .limit(30)
            .lean();

        cachedTrending = listings;
        lastTrendingCacheTime = now;
        return listings.slice(0, limit);
    } catch (err) {
        console.error("Error fetching trending listings:", err);
        return [];
    }
}

/**
 * Get recently viewed listings for the user or session.
 */
async function getRecentlyViewedListings(req, limit = 12) {
    try {
        let listingIds = [];
        if (req.user) {
            // Fetch from user record
            const user = await User.findById(req.user._id).select("recentlyViewed").lean();
            listingIds = user.recentlyViewed || [];
        } else if (req.session.recentlyViewed) {
            // Fetch from session array
            listingIds = req.session.recentlyViewed || [];
        }

        if (listingIds.length === 0) return [];

        // Preserve recently viewed order (newest viewed first)
        const listings = await Listing.find({ _id: { $in: listingIds } })
            .populate("owner")
            .lean();

        // Sort listings according to listingIds order
        const listingsMap = new Map(listings.map(l => [l._id.toString(), l]));
        return listingIds
            .map(id => listingsMap.get(id.toString()))
            .filter(Boolean)
            .slice(0, limit);
    } catch (err) {
        console.error("Error fetching recently viewed listings:", err);
        return [];
    }
}

/**
 * Get popular listings near the user's location or searched cities.
 */
async function getPopularNearbyListings(req, limit = 12) {
    try {
        let searchCities = [];

        // Check user preferences
        if (req.user) {
            if (req.user.city) searchCities.push(req.user.city);
            if (req.user.preferredCities) searchCities.push(...req.user.preferredCities);
        }

        // Check session search history
        if (req.session.searchHistory) {
            req.session.searchHistory.forEach(sh => {
                if (sh.city) searchCities.push(sh.city);
            });
        }

        // Clean & unique
        searchCities = [...new Set(searchCities.filter(Boolean).map(c => c.toLowerCase().trim()))];

        let query = {};
        if (searchCities.length > 0) {
            // Match any search city in listing location or title
            const regexes = searchCities.map(city => new RegExp(city, "i"));
            query = { location: { $in: regexes } };
        }

        // Query popular listings
        let listings = await Listing.find(query)
            .sort({ viewCount: -1 })
            .populate("owner")
            .limit(limit)
            .lean();

        // Fallback if no location-based listings found or no location preferences exist
        if (listings.length === 0) {
            listings = await Listing.find({})
                .sort({ viewCount: -1 })
                .populate("owner")
                .limit(limit)
                .lean();
        }

        return listings;
    } catch (err) {
        console.error("Error fetching popular nearby listings:", err);
        return [];
    }
}

/**
 * Get similar listings (You May Also Like) on the details page.
 * Uses city, category, rating, amenities, and price.
 */
async function getSimilarListings(listing, limit = 4) {
    try {
        const query = {
            _id: { $ne: listing._id }
        };

        // Pricing boundary: ±25% of current listing price
        const price = listing.listingType === "pg" 
            ? (listing.pgDetails?.monthlyRent || 0) 
            : (listing.price || 0);

        const priceField = listing.listingType === "pg" 
            ? "pgDetails.monthlyRent" 
            : "price";

        const minPrice = price * 0.75;
        const maxPrice = price * 1.25;

        // Fetch candidate similar listings in the same city or category
        const candidates = await Listing.find({
            _id: { $ne: listing._id },
            $or: [
                { location: { $regex: new RegExp(listing.location, "i") } },
                { category: listing.category }
            ]
        }).populate("owner").lean();

        // Calculate similarity score for candidates
        const scoredCandidates = candidates.map(candidate => {
            let simScore = 0;
            const cPrice = candidate.listingType === "pg" 
                ? (candidate.pgDetails?.monthlyRent || 0) 
                : (candidate.price || 0);

            // Same City match (3 points)
            if (candidate.location.toLowerCase() === listing.location.toLowerCase()) {
                simScore += 3;
            }

            // Same Category match (3 points)
            if (candidate.category === listing.category) {
                simScore += 3;
            }

            // Price match (within ±25% buffer) (2 points)
            if (cPrice >= minPrice && cPrice <= maxPrice) {
                simScore += 2;
            }

            // Similar Rating (within 1 star diff) (1 point)
            if (Math.abs((candidate.rating || 0) - (listing.rating || 0)) <= 1) {
                simScore += 1;
            }

            // Common Amenities match (up to 2 points)
            if (listing.amenities && candidate.amenities) {
                const common = listing.amenities.filter(a => candidate.amenities.includes(a));
                if (common.length > 0) {
                    simScore += Math.min(common.length * 0.5, 2);
                }
            }

            return { ...candidate, similarityScore: simScore };
        });

        // Sort descending by similarityScore, then rating descending
        scoredCandidates.sort((a, b) => {
            if (b.similarityScore !== a.similarityScore) return b.similarityScore - a.similarityScore;
            return (b.rating || 0) - (a.rating || 0);
        });

        return scoredCandidates.slice(0, limit);
    } catch (err) {
        console.error("Error fetching similar listings:", err);
        return [];
    }
}

/**
 * Budget friendly picks (lowest price stays/PGs).
 */
async function getBudgetFriendlyListings(limit = 12) {
    try {
        return await Listing.find({})
            .sort({ price: 1, "pgDetails.monthlyRent": 1 })
            .populate("owner")
            .limit(limit)
            .lean();
    } catch (err) {
        console.error("Error fetching budget friendly listings:", err);
        return [];
    }
}

/**
 * Luxury picks (highest price stays/PGs).
 */
async function getLuxuryStaysListings(limit = 12) {
    try {
        return await Listing.find({})
            .sort({ price: -1, "pgDetails.monthlyRent": -1 })
            .populate("owner")
            .limit(limit)
            .lean();
    } catch (err) {
        console.error("Error fetching luxury listings:", err);
        return [];
    }
}

/**
 * Highest rated listings.
 */
async function getHighestRatedListings(limit = 12) {
    try {
        return await Listing.find({})
            .sort({ rating: -1 })
            .populate("owner")
            .limit(limit)
            .lean();
    } catch (err) {
        console.error("Error fetching highest rated listings:", err);
        return [];
    }
}

/**
 * Newest listings.
 */
async function getNewestListings(limit = 12) {
    try {
        return await Listing.find({})
            .sort({ _id: -1 })
            .populate("owner")
            .limit(limit)
            .lean();
    } catch (err) {
        console.error("Error fetching newest listings:", err);
        return [];
    }
}

module.exports = {
    getRecommendedListings,
    getTrendingListings,
    getRecentlyViewedListings,
    getPopularNearbyListings,
    getSimilarListings,
    getBudgetFriendlyListings,
    getLuxuryStaysListings,
    getHighestRatedListings,
    getNewestListings
};
