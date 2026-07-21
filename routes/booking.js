const express = require("express");
const router = express.Router();

const bookingController = require("../controllers/booking");
const { isLoggedIn } = require("../middleware");
const { actionLimiter } = require("../middleware/rateLimiter");

router.get(
    "/bookings",
    isLoggedIn,
    bookingController.myBookings
);
router.get(
    "/owner/bookings",
    isLoggedIn,
    bookingController.bookingRequests
);

// Approve booking
router.patch(
    "/bookings/:bookingId/approve",
    isLoggedIn,
    bookingController.approveBooking
);

// Reject booking
router.patch(
    "/bookings/:bookingId/reject",
    isLoggedIn,
    bookingController.rejectBooking
);
router.post(
    "/listings/:id/book",
    isLoggedIn,
    actionLimiter,
    bookingController.createBooking
);

module.exports = router;