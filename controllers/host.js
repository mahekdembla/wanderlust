const Listing = require("../models/listing");
const Booking = require("../models/booking");
const Review = require("../models/review");
const Notification = require("../models/Notification");

module.exports.dashboard = async (req, res) => {
    try {
        // 1. Fetch listings owned by current user
        const listings = await Listing.find({ owner: req.user._id }).lean();
        const listingIds = listings.map(l => l._id);

        let kpis = {
            totalListings: listings.length,
            activeListings: listings.length, // All listings are treated as active
            totalBookings: 0,
            pendingBookings: 0,
            approvedBookings: 0,
            rejectedBookings: 0,
            totalRevenue: 0,
            avgRevenue: 0,
            occupancyRate: 0,
            avgRating: 0,
            totalReviews: 0
        };

        let chartsData = {
            monthlyRevenue: Array(12).fill(0),
            bookingStatus: { pending: 0, approved: 0, rejected: 0 },
            bookingsPerMonth: Array(12).fill(0),
            ratingsDistribution: Array(5).fill(0)
        };

        let recentRequests = [];
        let recentReviews = [];
        let recentNotifications = [];

        if (listingIds.length > 0) {
            // 2. Fetch all bookings for these listings
            const bookings = await Booking.find({ listing: { $in: listingIds } })
                .populate("guest", "username")
                .populate("listing", "title image")
                .sort({ createdAt: -1 })
                .lean();

            kpis.totalBookings = bookings.length;
            recentRequests = bookings.slice(0, 5);

            let totalBookedNights = 0;
            let approvedCount = 0;

            bookings.forEach(booking => {
                // Booking status counts
                if (booking.status === "pending") {
                    kpis.pendingBookings++;
                    chartsData.bookingStatus.pending++;
                } else if (booking.status === "approved") {
                    kpis.approvedBookings++;
                    chartsData.bookingStatus.approved++;
                    approvedCount++;

                    // Add to revenue
                    kpis.totalRevenue += booking.totalPrice || 0;

                    // Calculate booked nights
                    if (booking.checkIn && booking.checkOut) {
                        const oneDay = 1000 * 60 * 60 * 24;
                        const nights = Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / oneDay);
                        totalBookedNights += Math.max(0, nights);
                    }
                } else if (booking.status === "rejected") {
                    kpis.rejectedBookings++;
                    chartsData.bookingStatus.rejected++;
                }

                // Bookings count per month of check-in
                if (booking.checkIn) {
                    const month = new Date(booking.checkIn).getMonth();
                    chartsData.bookingsPerMonth[month]++;

                    // Monthly revenue distribution (only for approved bookings)
                    if (booking.status === "approved") {
                        chartsData.monthlyRevenue[month] += booking.totalPrice || 0;
                    }
                }
            });

            kpis.avgRevenue = approvedCount > 0 ? Math.round(kpis.totalRevenue / approvedCount) : 0;

            // Occupancy rate calculation (total nights booked / total nights available annually)
            const annualAvailableNights = listings.length * 365;
            kpis.occupancyRate = annualAvailableNights > 0 
                ? ((totalBookedNights / annualAvailableNights) * 100).toFixed(1) 
                : 0;

            // 3. Fetch reviews belonging to these listings
            let reviewIds = [];
            listings.forEach(l => {
                if (l.reviews && l.reviews.length > 0) {
                    reviewIds.push(...l.reviews);
                }
            });

            if (reviewIds.length > 0) {
                const reviews = await Review.find({ _id: { $in: reviewIds } })
                    .populate("author", "username")
                    .sort({ createdAt: -1 })
                    .lean();

                kpis.totalReviews = reviews.length;
                recentReviews = reviews.slice(0, 5);

                let ratingSum = 0;
                reviews.forEach(review => {
                    ratingSum += review.rating || 0;
                    const ratingBin = Math.round(review.rating);
                    if (ratingBin >= 1 && ratingBin <= 5) {
                        chartsData.ratingsDistribution[ratingBin - 1]++;
                    }
                });

                kpis.avgRating = reviews.length > 0 ? (ratingSum / reviews.length).toFixed(1) : 0;
            }
        }

        // 4. Fetch recent notifications
        recentNotifications = await Notification.find({ receiver: req.user._id, isDeleted: false })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        res.render("host/dashboard", {
            listings,
            kpis,
            chartsData,
            recentRequests,
            recentReviews,
            recentNotifications
        });

    } catch (err) {
        console.error("Host dashboard logic failure:", err);
        req.flash("error", "Failed to load dashboard metrics.");
        res.redirect("/listings");
    }
};
