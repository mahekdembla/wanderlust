const Listing = require("../models/listing");
const Review = require("../models/review");
const Booking = require("../models/booking");
const { cloudinary } = require("../cloudConfig");

// Helper to update average rating and trending score
const updateListingRating = async (listingId) => {
    try {
        const listing = await Listing.findById(listingId).populate("reviews");
        if (!listing) return;
        let avgRating = 0;
        if (listing.reviews && listing.reviews.length > 0) {
            const totalRating = listing.reviews.reduce((sum, r) => sum + r.rating, 0);
            avgRating = parseFloat((totalRating / listing.reviews.length).toFixed(2));
        }
        listing.rating = avgRating;
        listing.trendingScore = (listing.viewCount || 0) * 0.3 + (listing.reviews?.length || 0) * 0.25 + avgRating * 2;
        await listing.save();
    } catch (err) {
        console.error("Error updating listing rating:", err);
    }
};

// Create Review (Guest only, verified stays matching)
module.exports.createReview = async (req, res) => {
    try {
        const { id } = req.params;
        const listing = await Listing.findById(id);

        if (!listing) {
            req.flash("error", "Listing not found.");
            return res.redirect("/listings");
        }

        // 1. Owner restriction
        if (listing.owner.equals(req.user._id)) {
            req.flash("error", "Owners cannot review their own listings.");
            return res.redirect(`/listings/${id}`);
        }

        // 2. Verified stay validation (check if guest has an approved booking)
        const approvedBooking = await Booking.findOne({
            listing: id,
            guest: req.user._id,
            status: "approved"
        });

        if (!approvedBooking) {
            req.flash("error", "Only verified guests with approved bookings can review this stay.");
            return res.redirect(`/listings/${id}`);
        }

        // 3. Double-review prevention
        const existingReview = await Review.findOne({ listing: id, author: req.user._id });
        if (existingReview) {
            req.flash("error", "You have already reviewed this listing.");
            return res.redirect(`/listings/${id}`);
        }

        // Create new review
        const newReview = new Review(req.body.review);
        newReview.author = req.user._id;
        newReview.listing = listing._id;
        newReview.verifiedStay = true;
        newReview.stayDate = approvedBooking.checkIn;

        // Process uploaded images
        if (req.files && req.files.length > 0) {
            newReview.images = req.files.map(file => ({
                url: file.path,
                filename: file.filename
            }));
        }

        await newReview.save();
        listing.reviews.push(newReview._id);
        await listing.save();
        await updateListingRating(id);

        req.flash("success", "Review created successfully!");
        res.redirect(`/listings/${id}`);
    } catch (err) {
        console.error("Create review failure:", err);
        req.flash("error", "Failed to submit review.");
        res.redirect(`/listings/${req.params.id}`);
    }
};

// Edit Review
module.exports.editReview = async (req, res) => {
    try {
        const { id, reviewId } = req.params;
        const review = await Review.findById(reviewId);

        if (!review) {
            req.flash("error", "Review not found.");
            return res.redirect(`/listings/${id}`);
        }

        // Author validation check
        if (!review.author.equals(req.user._id)) {
            req.flash("error", "You are not authorized to edit this review.");
            return res.redirect(`/listings/${id}`);
        }

        review.comment = req.body.review.comment;
        review.rating = req.body.review.rating;
        review.edited = true;
        review.editedAt = new Date();

        // Process new uploaded images
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => ({
                url: file.path,
                filename: file.filename
            }));
            review.images.push(...newImages);
        }

        await review.save();
        await updateListingRating(id);
        req.flash("success", "Review updated successfully.");
        res.redirect(`/listings/${id}`);
    } catch (err) {
        console.error("Edit review error:", err);
        req.flash("error", "Failed to update review.");
        res.redirect(`/listings/${req.params.id}`);
    }
};

// Destroy Review (Clean up DB and Cloudinary assets)
module.exports.destroyReview = async (req, res) => {
    try {
        const { id, reviewId } = req.params;

        const review = await Review.findById(reviewId);
        if (!review) {
            req.flash("error", "Review not found.");
            return res.redirect(`/listings/${id}`);
        }

        // Author validation
        if (!review.author.equals(req.user._id)) {
            req.flash("error", "You are not authorized to delete this review.");
            return res.redirect(`/listings/${id}`);
        }

        // Delete from Cloudinary
        if (review.images && review.images.length > 0) {
            for (const img of review.images) {
                if (img.filename && img.filename !== "default_avatar" && img.filename !== "listingimage") {
                    await cloudinary.uploader.destroy(img.filename).catch(err => {
                        console.error("Cloudinary image deletion failed:", err.message);
                    });
                }
            }
        }

        await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
        await Review.findByIdAndDelete(reviewId);
        await updateListingRating(id);

        // Audit log review deletion
        const AuditLog = require("../models/AuditLog");
        await AuditLog.create({
            event: "delete_review",
            user: req.user ? req.user._id : null,
            ip: req.ip,
            details: `Review (ID: ${reviewId}) for listing ID: ${id} was deleted.`
        });

        req.flash("success", "Review deleted successfully.");
        res.redirect(`/listings/${id}`);
    } catch (err) {
        console.error("Destroy review failure:", err);
        req.flash("error", "Failed to delete review.");
        res.redirect(`/listings/${req.params.id}`);
    }
};

// Delete single review image
module.exports.deleteReviewImage = async (req, res) => {
    try {
        const { reviewId, imageId } = req.params;
        const review = await Review.findById(reviewId);

        if (!review) {
            return res.status(404).json({ error: "Review not found." });
        }

        // Verify author
        if (!review.author.equals(req.user._id)) {
            return res.status(403).json({ error: "Unauthorized operation." });
        }

        const image = review.images.id(imageId);
        if (!image) {
            return res.status(404).json({ error: "Image not found." });
        }

        // Remove from Cloudinary
        if (image.filename && image.filename !== "listingimage" && image.filename !== "default_avatar") {
            await cloudinary.uploader.destroy(image.filename).catch(err => {
                console.error("Cloudinary image deletion failed:", err.message);
            });
        }

        // Pull from schema array
        review.images.pull(imageId);
        await review.save();

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete image." });
    }
};

// Toggle Helpful review likes
module.exports.toggleHelpful = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const review = await Review.findById(reviewId);

        if (!review) {
            return res.status(404).json({ error: "Review not found." });
        }

        // Users cannot like their own reviews
        if (review.author.equals(req.user._id)) {
            return res.status(400).json({ error: "You cannot mark your own review as helpful." });
        }

        const index = review.helpfulUsers.indexOf(req.user._id);
        let isHelpful = false;

        if (index === -1) {
            review.helpfulUsers.push(req.user._id);
            review.helpfulCount++;
            isHelpful = true;
        } else {
            review.helpfulUsers.splice(index, 1);
            review.helpfulCount--;
            isHelpful = false;
        }

        await review.save();
        res.json({ success: true, helpfulCount: review.helpfulCount, isHelpful });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update helpful status." });
    }
};

// Create Host Reply (Listing owner only)
module.exports.createHostReply = async (req, res) => {
    try {
        const { id, reviewId } = req.params;
        const listing = await Listing.findById(id);

        if (!listing) {
            req.flash("error", "Listing not found.");
            return res.redirect("/listings");
        }

        // Verify that the user is the listing host
        if (!listing.owner.equals(req.user._id)) {
            req.flash("error", "Only the listing host can reply to reviews.");
            return res.redirect(`/listings/${id}`);
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            req.flash("error", "Review not found.");
            return res.redirect(`/listings/${id}`);
        }

        review.hostReply = {
            comment: req.body.reply.comment,
            createdAt: new Date()
        };

        await review.save();
        req.flash("success", "Reply posted successfully!");
        res.redirect(`/listings/${id}`);
    } catch (err) {
        console.error("Create host reply failure:", err);
        req.flash("error", "Failed to submit host reply.");
        res.redirect(`/listings/${req.params.id}`);
    }
};

// Update Host Reply (Listing owner only)
module.exports.updateHostReply = async (req, res) => {
    try {
        const { id, reviewId } = req.params;
        const listing = await Listing.findById(id);

        if (!listing.owner.equals(req.user._id)) {
            req.flash("error", "Only the listing host can edit replies.");
            return res.redirect(`/listings/${id}`);
        }

        const review = await Review.findById(reviewId);
        if (review.hostReply) {
            review.hostReply.comment = req.body.reply.comment;
            review.hostReply.createdAt = new Date();
            await review.save();
            req.flash("success", "Reply updated successfully.");
        }

        res.redirect(`/listings/${id}`);
    } catch (err) {
        console.error(err);
        req.flash("error", "Failed to update reply.");
        res.redirect(`/listings/${req.params.id}`);
    }
};

// Delete Host Reply
module.exports.deleteHostReply = async (req, res) => {
    try {
        const { id, reviewId } = req.params;
        const listing = await Listing.findById(id);

        if (!listing.owner.equals(req.user._id)) {
            req.flash("error", "Only the listing host can delete replies.");
            return res.redirect(`/listings/${id}`);
        }

        const review = await Review.findById(reviewId);
        review.hostReply = {
            comment: "",
            createdAt: undefined
        };

        await review.save();
        req.flash("success", "Reply deleted successfully.");
        res.redirect(`/listings/${id}`);
    } catch (err) {
        console.error(err);
        req.flash("error", "Failed to delete reply.");
        res.redirect(`/listings/${req.params.id}`);
    }
};