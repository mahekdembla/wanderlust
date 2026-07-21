const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn } = require("../middleware");
const profileController = require("../controllers/profile");
const { profileSchema } = require("../schema");
const ExpressError = require("../utils/ExpressError");

const multer = require("multer");
const { storage } = require("../cloudConfig");
const upload = multer({ storage });

// Profile fields validation middleware
const validateProfile = (req, res, next) => {
    // Parse DOB string to Date object for validation if present
    if (req.body.profile && req.body.profile.dob === "") {
        req.body.profile.dob = null;
    }
    const { error } = profileSchema.validate(req.body, { allowUnknown: true });
    if (error) {
        const errMsg = error.details.map(el => el.message).join(",");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
};

router.route("/profile")
    .get(isLoggedIn, wrapAsync(profileController.showProfile))
    .put(isLoggedIn, upload.single("profile[avatar]"), validateProfile, wrapAsync(profileController.updateProfile));

router.get("/profile/edit", isLoggedIn, wrapAsync(profileController.showEditForm));

router.get("/users/:id", wrapAsync(profileController.showPublicProfile));

module.exports = router;
