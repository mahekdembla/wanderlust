const User = require("../models/user");
const Listing = require("../models/listing");
const Booking = require("../models/booking");
const Review = require("../models/review");
const Notification = require("../models/Notification");

// View private profile
module.exports.showProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).lean();

        // Initialize statistics
        let hostStats = {
            totalListings: 0,
            approvedBookings: 0,
            pendingBookings: 0,
            rejectedBookings: 0,
            totalRevenue: 0,
            avgRating: 0,
            guestsHosted: 0
        };

        let guestStats = {
            tripsCompleted: 0,
            wishlistCount: user.savedListings ? user.savedListings.length : 0,
            reviewsWritten: 0,
            citiesVisited: 0,
            totalNightsStayed: 0
        };

        // 1. Calculate Host Statistics (if they own listings)
        const hostListings = await Listing.find({ owner: user._id }).lean();
        hostStats.totalListings = hostListings.length;

        if (hostListings.length > 0) {
            const hostListingIds = hostListings.map(l => l._id);
            const hostBookings = await Booking.find({ listing: { $in: hostListingIds } }).lean();

            const uniqueGuests = new Set();
            hostBookings.forEach(booking => {
                if (booking.status === "approved") {
                    hostStats.approvedBookings++;
                    hostStats.totalRevenue += booking.totalPrice || 0;
                    uniqueGuests.add(booking.guest.toString());
                } else if (booking.status === "pending") {
                    hostStats.pendingBookings++;
                } else if (booking.status === "rejected") {
                    hostStats.rejectedBookings++;
                }
            });
            hostStats.guestsHosted = uniqueGuests.size;

            // Average rating of owned listings
            let reviewIds = [];
            hostListings.forEach(l => {
                if (l.reviews && l.reviews.length > 0) {
                    reviewIds.push(...l.reviews);
                }
            });
            if (reviewIds.length > 0) {
                const reviews = await Review.find({ _id: { $in: reviewIds } }).lean();
                let ratingSum = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
                hostStats.avgRating = (ratingSum / reviews.length).toFixed(1);
            }
        }

        // 2. Calculate Guest Statistics
        const guestBookings = await Booking.find({ guest: user._id })
            .populate("listing", "location city")
            .lean();

        guestStats.reviewsWritten = await Review.countDocuments({ author: user._id });

        const uniqueCities = new Set();
        guestBookings.forEach(booking => {
            if (booking.status === "approved") {
                const oneDay = 1000 * 60 * 60 * 24;
                const nights = Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / oneDay);
                guestStats.totalNightsStayed += Math.max(0, nights);

                if (new Date(booking.checkOut) <= new Date()) {
                    guestStats.tripsCompleted++;
                }

                if (booking.listing) {
                    // Extract city or fallback to location
                    const city = booking.listing.city || booking.listing.location;
                    if (city) {
                        uniqueCities.add(city.trim().toLowerCase());
                    }
                }
            }
        });
        guestStats.citiesVisited = uniqueCities.size;

        // 3. Recent Activities
        let recentBookings = await Booking.find({ guest: user._id })
            .populate("listing", "title image")
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();
        recentBookings = recentBookings.filter(b => b.listing !== null).slice(0, 5);

        const recentReviews = await Review.find({ author: user._id })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        const recentNotifications = await Notification.find({ receiver: user._id, isDeleted: false })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        res.render("profile/index", {
            user,
            hostStats,
            guestStats,
            recentBookings,
            recentReviews,
            recentNotifications
        });
    } catch (err) {
        console.error("Private profile load error:", err);
        req.flash("error", "Failed to load profile.");
        res.redirect("/listings");
    }
};

// Show Profile Edit Form
module.exports.showEditForm = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).lean();
        res.render("profile/edit", { user });
    } catch (err) {
        console.error("Edit profile form error:", err);
        req.flash("error", "Something went wrong.");
        res.redirect("/profile");
    }
};

// Update Profile
module.exports.updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const { bio, phone, gender, dob, city, country, profession, college, github, linkedin, portfolio, instagram } = req.body.profile;

        // Update fields
        user.bio = bio || "";
        user.phone = phone || "";
        user.gender = gender || "";
        user.dob = dob ? new Date(dob) : undefined;
        user.city = city || "";
        user.country = country || "";
        user.profession = profession || "";
        user.college = college || "";
        user.github = github || "";
        user.linkedin = linkedin || "";
        user.portfolio = portfolio || "";
        user.instagram = instagram || "";

        // Parse comma-separated languages list into array of strings
        if (req.body.profile.languages) {
            user.languages = req.body.profile.languages.split(",")
                .map(lang => lang.trim())
                .filter(lang => lang.length > 0);
        } else {
            user.languages = [];
        }

        // Handle profile photo upload (Cloudinary or local storage)
        if (req.file) {
            // Delete previous avatar from storage if custom photo exists
            if (user.avatar && user.avatar.filename && user.avatar.filename !== "default_avatar") {
                try {
                    const { cloudinary, hasCloudinary } = require("../cloudConfig");
                    if (hasCloudinary && cloudinary) {
                        await cloudinary.uploader.destroy(user.avatar.filename);
                    } else {
                        const fs = require("fs");
                        const path = require("path");
                        const localPath = path.join(__dirname, "../public/uploads/profile", user.avatar.filename);
                        if (fs.existsSync(localPath)) {
                            fs.unlinkSync(localPath);
                        }
                    }
                } catch (destroyErr) {
                    console.error("Failed to delete previous avatar from storage:", destroyErr.message);
                }
            }

            const avatarUrl = req.file.path || `/uploads/profile/${req.file.filename}`;
            user.avatar = {
                url: avatarUrl,
                filename: req.file.filename
            };
        }

        await user.save();
        req.flash("success", "Profile updated successfully!");
        res.redirect("/profile");
    } catch (err) {
        console.error("Profile update logic error:", err);
        req.flash("error", "Failed to update profile: " + err.message);
        res.redirect("/profile/edit");
    }
};

// View Public Profile
module.exports.showPublicProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).lean();

        if (!user) {
            req.flash("error", "User not found.");
            return res.redirect("/listings");
        }

        // Initialize public statistics
        let hostStats = {
            totalListings: 0,
            approvedBookings: 0,
            avgRating: 0,
            guestsHosted: 0
        };

        // 1. Fetch public listings of the user
        const publicListings = await Listing.find({ owner: user._id }).lean();
        hostStats.totalListings = publicListings.length;

        let reviewsReceived = [];

        if (publicListings.length > 0) {
            const listingIds = publicListings.map(l => l._id);
            const hostBookings = await Booking.find({ listing: { $in: listingIds }, status: "approved" }).lean();
            hostStats.approvedBookings = hostBookings.length;

            const uniqueGuests = new Set(hostBookings.map(b => b.guest.toString()));
            hostStats.guestsHosted = uniqueGuests.size;

            let reviewIds = [];
            publicListings.forEach(l => {
                if (l.reviews && l.reviews.length > 0) {
                    reviewIds.push(...l.reviews);
                }
            });

            if (reviewIds.length > 0) {
                reviewsReceived = await Review.find({ _id: { $in: reviewIds } })
                    .populate("author", "username avatar")
                    .sort({ createdAt: -1 })
                    .lean();

                let ratingSum = reviewsReceived.reduce((sum, r) => sum + (r.rating || 0), 0);
                hostStats.avgRating = (ratingSum / reviewsReceived.length).toFixed(1);
            }
        }

        res.render("profile/public", {
            user,
            publicListings,
            reviewsReceived,
            hostStats
        });
    } catch (err) {
        console.error("Public profile load error:", err);
        req.flash("error", "Failed to load public profile.");
        res.redirect("/listings");
    }
};
