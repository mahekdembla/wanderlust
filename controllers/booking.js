const Booking = require("../models/booking");
const Listing = require("../models/listing");

module.exports.createBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const listing = await Listing.findById(id);

        if (!listing) {
            req.flash("error", "Listing not found.");
            return res.redirect("/listings");
        }

        if (listing.owner.equals(req.user._id)) {
            req.flash("error", "You cannot book your own listing.");
            return res.redirect(`/listings/${id}`);
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const checkIn = new Date(req.body.checkIn);
        const checkOut = new Date(req.body.checkOut);

        if (checkIn < today) {
            req.flash("error", "Check-in date cannot be in the past.");
            return res.redirect(`/listings/${id}`);
        }

        if (checkOut <= checkIn) {
            req.flash("error", "Check-out date must be after check-in date.");
            return res.redirect(`/listings/${id}`);
        }

        const existingBooking = await Booking.findOne({
            listing: listing._id,
            status: "approved",
            checkIn: { $lt: checkOut },
            checkOut: { $gt: checkIn }
        });

        if (existingBooking) {
            req.flash("error", "Selected dates are unavailable.");
            return res.redirect(`/listings/${id}`);
        }

        let totalPrice;
        if (listing.listingType === "pg") {
            totalPrice = listing.pgDetails.monthlyRent;
        } else {
            const oneDay = 1000 * 60 * 60 * 24;
            const nights = Math.ceil((checkOut - checkIn) / oneDay);
            totalPrice = nights * listing.price;
        }

        const booking = new Booking({
            listing: listing._id,
            guest: req.user._id,
            checkIn,
            checkOut,
            guests: req.body.guests,
            totalPrice
        });

        await booking.save();

        // Create persistent and real-time notification for owner
        const createNotification = require("../utils/createNotification");
        await createNotification({
            receiver: listing.owner,
            sender: req.user._id,
            type: "bookingRequest",
            message: `New booking request from @${req.user.username} for ${listing.title}.`,
            link: "/owner/bookings",
            metadata: {
                bookingId: booking._id,
                listingId: listing._id,
                listingTitle: listing.title
            }
        });

        req.flash("success", "Booking request sent successfully.");
        res.redirect("/bookings");

    } catch (err) {
        console.error(err);
        req.flash("error", "Booking failed: " + err.message);
        res.redirect(`/listings/${req.params.id}`);
    }
};

module.exports.myBookings = async (req, res) => {
    try {
        let bookings = await Booking.find({ guest: req.user._id })
            .populate("listing")
            .sort({ createdAt: -1 });
        bookings = bookings.filter(b => b.listing !== null);

        res.render("bookings/index", { bookings });
    } catch (err) {
        console.error(err);
        req.flash("error", "Could not load bookings.");
        res.redirect("/listings");
    }
};

module.exports.bookingRequests = async (req, res) => {
    try {
        const listings = await Listing.find({ owner: req.user._id }).select("_id");
        const listingIds = listings.map(l => l._id);

        let bookings = await Booking.find({ listing: { $in: listingIds } })
            .populate("listing")
            .populate("guest")
            .sort({ createdAt: -1 });
        bookings = bookings.filter(b => b.listing !== null && b.guest !== null);

        res.render("bookings/requests", { bookings });
    } catch (err) {
        console.error(err);
        req.flash("error", "Could not load booking requests.");
        res.redirect("/listings");
    }
};

module.exports.approveBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const booking = await Booking.findById(bookingId).populate("listing");

        if (!booking) {
            req.flash("error", "Booking not found.");
            return res.redirect("/owner/bookings");
        }

        if (booking.status !== "pending") {
            req.flash("error", "Booking already processed.");
            return res.redirect("/owner/bookings");
        }

        booking.status = "approved";
        booking.approvedAt = new Date();
        await booking.save();

        // Create persistent and real-time notification for guest
        const createNotification = require("../utils/createNotification");
        await createNotification({
            receiver: booking.guest,
            sender: req.user._id,
            type: "bookingApproved",
            message: `Your booking for ${booking.listing.title} has been approved.`,
            link: "/bookings",
            metadata: {
                bookingId: booking._id,
                listingId: booking.listing._id,
                listingTitle: booking.listing.title
            }
        });

        // Automatically reject all overlapping pending bookings
        await Booking.updateMany(
            {
                listing: booking.listing,
                status: "pending",
                _id: { $ne: booking._id },
                checkIn: { $lt: booking.checkOut },
                checkOut: { $gt: booking.checkIn }
            },
            {
                $set: { status: "rejected" }
            }
        );

        req.flash("success", "Booking approved successfully.");
        res.redirect("/owner/bookings");

    } catch (err) {
        console.error(err);
        req.flash("error", "Something went wrong.");
        res.redirect("/owner/bookings");
    }
};

module.exports.rejectBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const booking = await Booking.findById(bookingId).populate("listing");

        if (!booking) {
            req.flash("error", "Booking not found.");
            return res.redirect("/owner/bookings");
        }

        if (booking.status !== "pending") {
            req.flash("error", "Booking already processed.");
            return res.redirect("/owner/bookings");
        }

        booking.status = "rejected";
        await booking.save();

        // Create persistent and real-time notification for guest
        const createNotification = require("../utils/createNotification");
        await createNotification({
            receiver: booking.guest,
            sender: req.user._id,
            type: "bookingRejected",
            message: `Your booking request for ${booking.listing.title} was rejected.`,
            link: "/bookings",
            metadata: {
                bookingId: booking._id,
                listingId: booking.listing._id,
                listingTitle: booking.listing.title
            }
        });

        req.flash("success", "Booking rejected successfully.");
        res.redirect("/owner/bookings");

    } catch (err) {
        console.error(err);
        req.flash("error", "Something went wrong.");
        res.redirect("/owner/bookings");
    }
};