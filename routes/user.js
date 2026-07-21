const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const AuditLog = require("../models/AuditLog");
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");
const { saveRedirectUrl, isLoggedIn } = require("../middleware.js");
const userController = require("../controllers/users.js");
const { verifyEmail } = require("../middleware/emailVerification");
const { authLimiter } = require("../middleware/rateLimiter");

// Signup
router
    .route("/signup")
    .get(userController.renderSignupForm)
    .post(authLimiter, wrapAsync(userController.signup));

// Verify Email
router.get("/verify-email", wrapAsync(verifyEmail));

// Login
router
    .route("/login")
    .get(userController.renderLoginForm)
    .post(
        authLimiter,
        saveRedirectUrl,
        passport.authenticate("local", {
            failureRedirect: "/login",
            failureFlash: true
        }),
        userController.login
    );

// Logout 
router.get("/logout", userController.logout);

// Forgot Password
router
    .route("/forgot-password")
    .get(userController.renderForgotPasswordForm)
    .post(authLimiter, wrapAsync(userController.forgotPassword));

// Reset Password
router
    .route("/reset-password/:token")
    .get(userController.renderResetPasswordForm)
    .post(authLimiter, wrapAsync(userController.resetPassword));

// Saved listings (Wishlist toggle)
router.post("/wishlist/toggle/:id", isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const listingId = req.params.id;
        const index = user.savedListings.indexOf(listingId);

        if (index === -1) {
            user.savedListings.push(listingId);
        } else {
            user.savedListings.splice(index, 1);
        }

        await user.save();
        return res.json({ success: true });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Something went wrong" });
    }
});

router.get("/wishlist", isLoggedIn, async (req, res) => {
    const user = await User.findById(req.user._id).populate("savedListings");
    const listings = (user.savedListings || []).filter(l => l !== null);
    res.render("users/wishlist.ejs", { listings });
});

module.exports = router;