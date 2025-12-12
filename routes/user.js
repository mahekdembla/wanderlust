const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");
const { saveRedirectUrl, isLoggedIn } = require("../middleware.js");
const userController = require("../controllers/users.js");

router
    .route("/signup")
    .get(userController.renderSignupForm)
    .post(

        wrapAsync(userController.signup)
    );

router
    .route("/login")
    .get(userController.renderLoginForm)
    .post(
        saveRedirectUrl,
        passport.authenticate("local", {
            failureRedirect: "/login",
            failureFlash: true
        }), userController.login
    );

//logout 
router.get("/logout", userController.logout);

//savedlisting
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
    res.render("users/wishlist.ejs", { listings: user.savedListings });
});




module.exports = router;