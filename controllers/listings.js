const Listing = require("../models/listing");
const Booking = require("../models/booking");
const User = require("../models/user");
const { cloudinary } = require("../cloudConfig");
const {
    getRecommendedListings,
    getTrendingListings,
    getRecentlyViewedListings,
    getPopularNearbyListings,
    getBudgetFriendlyListings,
    getLuxuryStaysListings,
    getHighestRatedListings,
    getNewestListings,
    getSimilarListings
} = require("./recommendation");

// Backward compatibility helper to retrieve listings images array safely
const getListingImages = (listing) => {
    if (listing.images && listing.images.length > 0) {
        return listing.images;
    }
    if (listing.image && listing.image.url) {
        return [listing.image];
    }
    return [{
        url: "https://media.cntraveler.com/photos/5d112d50c4d7bd806dbc00a4/16:9/w_2239,h_1259,c_limit/airbnb%20luxe.jpg",
        filename: "listingimage"
    }];
};

module.exports.index = async (req, res) => {
    const { category } = req.query;

    if (category) {
        let query = {};
        if (category.toLowerCase() === "trending") {
            const listings = await getTrendingListings(24);
            return res.render("listings/index.ejs", {
                allListings: listings,
                category,
                recommended: [],
                trending: [],
                recentlyViewed: [],
                popularNearby: [],
                highestRated: [],
                budgetFriendly: [],
                luxuryStays: [],
                newestListings: []
            });
        }

        let categoryMatch = category;
        if (category.toLowerCase() === "room") categoryMatch = "Rooms";
        query.category = new RegExp(`^${categoryMatch}$`, "i");

        const allListings = await Listing.find(query).populate("owner").lean();
        return res.render("listings/index.ejs", {
            allListings,
            category,
            recommended: [],
            trending: [],
            recentlyViewed: [],
            popularNearby: [],
            highestRated: [],
            budgetFriendly: [],
            luxuryStays: [],
            newestListings: []
        });
    }

    // Default homepage layout with recommendations sections
    const recommended = await getRecommendedListings(req, 8);
    const trending = await getTrendingListings(8);
    const recentlyViewed = await getRecentlyViewedListings(req, 8);
    const popularNearby = await getPopularNearbyListings(req, 8);
    const highestRated = await getHighestRatedListings(8);
    const budgetFriendly = await getBudgetFriendlyListings(8);
    const luxuryStays = await getLuxuryStaysListings(8);
    const newestListings = await getNewestListings(8);

    res.render("listings/index.ejs", {
        allListings: newestListings,
        recommended,
        trending,
        recentlyViewed,
        popularNearby,
        highestRated,
        budgetFriendly,
        luxuryStays,
        newestListings,
        category: ""
    });
};

module.exports.showListing = async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: { path: "author", select: "username avatar" }
        })
        .populate("owner");

    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }

    // 1. Increment views and update listing trending score
    listing.viewCount = (listing.viewCount || 0) + 1;
    const reviewsCount = listing.reviews ? listing.reviews.length : 0;
    const avgRating = listing.rating || 0;
    listing.trendingScore = (listing.viewCount * 0.3) + (reviewsCount * 0.25) + (avgRating * 2);
    await listing.save();

    // 2. Track recently viewed & preferences
    if (req.user) {
        try {
            const user = await User.findById(req.user._id);
            if (user) {
                // Limit to 20, prevent duplicates
                user.recentlyViewed = (user.recentlyViewed || []).filter(lid => lid.toString() !== id.toString());
                user.recentlyViewed.unshift(id);
                if (user.recentlyViewed.length > 20) {
                    user.recentlyViewed = user.recentlyViewed.slice(0, 20);
                }

                // Update category preference
                if (listing.category && !user.preferredCategories.includes(listing.category)) {
                    user.preferredCategories.push(listing.category);
                }
                // Update city preference
                if (listing.location && !user.preferredCities.includes(listing.location)) {
                    user.preferredCities.push(listing.location);
                }
                // Update listing type preference
                if (listing.listingType) {
                    if (!user.preferredListingType) {
                        user.preferredListingType = listing.listingType;
                    } else if (user.preferredListingType !== listing.listingType) {
                        user.preferredListingType = "both";
                    }
                }
                // Update price range preference
                const lPrice = listing.listingType === "pg" ? (listing.pgDetails?.monthlyRent || 0) : (listing.price || 0);
                if (lPrice > 0) {
                    const min = user.preferredPriceRange && user.preferredPriceRange.min !== undefined ? user.preferredPriceRange.min : lPrice;
                    const max = user.preferredPriceRange && user.preferredPriceRange.max !== undefined ? user.preferredPriceRange.max : lPrice;
                    user.preferredPriceRange = {
                        min: Math.min(lPrice * 0.7, min),
                        max: Math.max(lPrice * 1.3, max)
                    };
                }

                await user.save();
            }
        } catch (err) {
            console.error("Failed to update user recently viewed/preferences:", err);
        }
    } else {
        // Session recently viewed
        if (!req.session.recentlyViewed) {
            req.session.recentlyViewed = [];
        }
        req.session.recentlyViewed = req.session.recentlyViewed.filter(lid => lid !== id);
        req.session.recentlyViewed.unshift(id);
        if (req.session.recentlyViewed.length > 20) {
            req.session.recentlyViewed = req.session.recentlyViewed.slice(0, 20);
        }
    }

    // 3. Similar Listings
    const similarListings = await getSimilarListings(listing, 4);

    const bookings = await Booking.find({ listing: id, status: "approved" }).lean();
    res.render("listings/show.ejs", { listing, bookings, getListingImages, similarListings });
};

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
};

module.exports.createListing = async (req, res, next) => {
    try {
        let images = [];
        if (req.files && req.files.length > 0) {
            images = req.files.map(file => ({
                url: file.path,
                filename: file.filename
            }));
        } else {
            images = [{
                url: "https://media.cntraveler.com/photos/5d112d50c4d7bd806dbc00a4/16:9/w_2239,h_1259,c_limit/airbnb%20luxe.jpg",
                filename: "listingimage"
            }];
        }

        // Get coordinates from Nominatim OpenStreetMap API
        const locationName = req.body.listing.location;
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}`,
            {
                headers: {
                    "User-Agent": "Wanderlust/1.0 (demblamahek27@gmail.com)",
                    "Accept": "application/json"
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`Geocoding API failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        let geometry = {
            type: "Point",
            coordinates: [77.2090, 28.6139] // Default: New Delhi
        };

        if (data.length > 0) {
            geometry.coordinates = [parseFloat(data[0].lon), parseFloat(data[0].lat)];
        }

        const newListing = new Listing(req.body.listing);
        newListing.owner = req.user._id;
        newListing.images = images;
        newListing.image = images[0]; // Set legacy single-image parameter for backward compatibility
        newListing.geometry = geometry;

        await newListing.save();
        req.flash("success", "New Listing created");
        res.redirect("/listings");
    } catch (err) {
        console.error("Create listing failure:", err);
        req.flash("error", "Could not create listing");
        res.redirect("/listings/new");
    }
};

module.exports.renderEditForm = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }

    const images = getListingImages(listing);
    res.render("listings/edit.ejs", { listing, images });
};

module.exports.updateListing = async (req, res) => {
    try {
        const { id } = req.params;
        const listing = await Listing.findById(id);

        if (!listing) {
            req.flash("error", "Listing not found.");
            return res.redirect("/listings");
        }

        // 1. Convert legacy listings to new format first
        if ((!listing.images || listing.images.length === 0) && listing.image && listing.image.url) {
            listing.images.push(listing.image);
        }

        // 2. Perform text parameters updates
        const updatedFields = req.body.listing;
        Object.assign(listing, updatedFields);

        // 3. Handle image deletions if submitted
        if (req.body.deleteImages && req.body.deleteImages.length > 0) {
            const deletedFilenames = req.body.deleteImages;
            const newUploadsCount = req.files ? req.files.length : 0;
            const totalRemaining = listing.images.length - deletedFilenames.length + newUploadsCount;

            // Enforce: Listing must always have at least 1 image
            if (totalRemaining <= 0) {
                req.flash("error", "A listing must have at least one image.");
                return res.redirect(`/listings/${id}/edit`);
            }

            // Remove from Cloudinary storage
            for (const filename of deletedFilenames) {
                if (filename && filename !== "listingimage") {
                    await cloudinary.uploader.destroy(filename).catch(err => {
                        console.error("Cloudinary deletion failed during update:", err.message);
                    });
                }
            }

            // Filter out deleted images from listing images array
            listing.images = listing.images.filter(img => !deletedFilenames.includes(img.filename));
        }

        // 4. Handle additional uploaded images
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => ({
                url: file.path,
                filename: file.filename
            }));
            listing.images.push(...newImages);
        }

        // Update legacy single image field for backward compatibility
        if (listing.images.length > 0) {
            listing.image = listing.images[0];
        }

        await listing.save();
        req.flash("success", "Listing updated successfully!");
        res.redirect(`/listings/${id}`);
    } catch (err) {
        console.error("Update listing failure:", err);
        req.flash("error", "Failed to update listing: " + err.message);
        res.redirect(`/listings/${req.params.id}/edit`);
    }
};

module.exports.destroyListing = async (req, res) => {
    try {
        const { id } = req.params;
        const listing = await Listing.findById(id);

        if (!listing) {
            req.flash("error", "Listing not found.");
            return res.redirect("/listings");
        }

        // Delete listing images from Cloudinary
        const images = getListingImages(listing);
        for (const img of images) {
            if (img.filename && img.filename !== "listingimage") {
                await cloudinary.uploader.destroy(img.filename).catch(err => {
                    console.error("Cloudinary asset deletion failed during listing destroy:", err.message);
                });
            }
        }

        await Listing.findByIdAndDelete(id);

        // Audit log listing deletion
        const AuditLog = require("../models/AuditLog");
        await AuditLog.create({
            event: "delete_listing",
            user: req.user ? req.user._id : null,
            ip: req.ip,
            details: `Listing "${listing.title}" (ID: ${id}) was deleted.`
        });

        req.flash("success", "Listing deleted successfully.");
        res.redirect("/listings");
    } catch (err) {
        console.error("Destroy listing error:", err);
        req.flash("error", "Failed to delete listing.");
        res.redirect("/listings");
    }
};