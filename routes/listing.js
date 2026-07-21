const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const { isLoggedIn, isOwner, saveRedirectUrl, validateListing } = require("../middleware.js");
const listingController = require("../controllers/listings.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const ExpressError = require("../utils/ExpressError.js");

const fileFilter = (req, file, cb) => {
    const mimetype = (file.mimetype || "").toLowerCase();
    const isImage = mimetype.startsWith("image/") || /\.(jpg|jpeg|png|webp|avif|jfif)$/i.test(file.originalname);

    if (isImage) {
        cb(null, true);
    } else {
        cb(new ExpressError(400, "Invalid file type. Only JPG, JPEG, PNG, WEBP, and AVIF images are allowed!"), false);
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max per image
    fileFilter
});

// Middleware wrapper for graceful file upload error handling
const uploadListingImages = (req, res, next) => {
    upload.array("listing[images]", 10)(req, res, (err) => {
        if (err) {
            req.flash("error", err.message || "Failed to upload image(s). Allowed formats: JPG, JPEG, PNG, WEBP, AVIF (Max 5MB).");
            const redirectTarget = req.params.id ? `/listings/${req.params.id}/edit` : "/listings/new";
            return res.redirect(redirectTarget);
        }
        next();
    });
};

router
    .route("/")
    .get(
        wrapAsync(listingController.index)
    )
    .post(
        isLoggedIn,
        uploadListingImages,
        validateListing,
        wrapAsync(listingController.createListing)
    );

// New listing form
router.get("/new", isLoggedIn, listingController.renderNewForm);

// PG Stays route
router.get("/pg", async (req, res) => {
    try {
        let query = { listingType: "pg" };

        if (req.query.location && req.query.location.trim() !== "") {
            query.location = new RegExp(req.query.location, "i");
        }
        const pgListings = await Listing.find(query);

        res.render("listings/pgIndex.ejs", { listings: pgListings, query: req.query, page: "pg" });
    } catch (err) {
        console.log("pg search error", err);
        res.status(500).send("something went wrong");
    }
});

router
    .route("/:id")
    .get(wrapAsync(listingController.showListing))
    .put(
        isLoggedIn,
        isOwner,
        uploadListingImages,
        validateListing,
        wrapAsync(listingController.updateListing)
    )
    .delete(isLoggedIn, isOwner, wrapAsync(listingController.destroyListing));

// Edit route 
router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(listingController.renderEditForm));

module.exports = router;