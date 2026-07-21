const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");
const { validateReview, isLoggedIn, isReviewAuthor } = require("../middleware.js");
const { replySchema } = require("../schema.js");
const reviewController = require("../controllers/reviews.js");
const { actionLimiter } = require("../middleware/rateLimiter");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");

const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only JPEG, PNG, and WEBP images are allowed!"), false);
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
    fileFilter
});

// Joi validator for host replies
const validateReply = (req, res, next) => {
    const { error } = replySchema.validate(req.body);
    if (error) {
        const errMsg = error.details.map(el => el.message).join(",");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
};

// Post reviews with multiple images
router.post(
    "/",
    isLoggedIn,
    actionLimiter,
    upload.array("review[images]", 5),
    validateReview,
    wrapAsync(reviewController.createReview)
);

// Delete review route
router.delete(
    "/:reviewId",
    isLoggedIn,
    actionLimiter,
    isReviewAuthor,
    wrapAsync(reviewController.destroyReview)
);

// Edit review route with optional image uploads
router.put(
    "/:reviewId",
    isLoggedIn,
    actionLimiter,
    isReviewAuthor,
    upload.array("review[images]", 5),
    validateReview,
    wrapAsync(reviewController.editReview)
);

// Toggle helpful reviews likes (AJAX)
router.patch(
    "/:reviewId/helpful",
    isLoggedIn,
    wrapAsync(reviewController.toggleHelpful)
);

// Delete individual review image (AJAX)
router.delete(
    "/:reviewId/image/:imageId",
    isLoggedIn,
    wrapAsync(reviewController.deleteReviewImage)
);

// Host reply routes
router.post(
    "/:reviewId/reply",
    isLoggedIn,
    validateReply,
    wrapAsync(reviewController.createHostReply)
);

router.put(
    "/:reviewId/reply",
    isLoggedIn,
    validateReply,
    wrapAsync(reviewController.updateHostReply)
);

router.delete(
    "/:reviewId/reply",
    isLoggedIn,
    wrapAsync(reviewController.deleteHostReply)
);

module.exports = router;