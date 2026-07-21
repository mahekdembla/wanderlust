const express = require("express");
const router = express.Router();
const aiController = require("../controllers/ai");
const { isLoggedIn } = require("../middleware");
const { actionLimiter } = require("../middleware/rateLimiter");

// 1. Chatbot assistant
router.post("/chat", actionLimiter, aiController.chat);

// 2. Legacy Trip planner redirect
router.get("/trip-planner", (req, res) => res.redirect("/listings"));
router.post("/trip-planner", (req, res) => res.redirect("/listings"));

// 3. Natural search
router.get("/search", aiController.naturalSearch);

// 4. Listing tools (Host)
router.post("/property-description", isLoggedIn, actionLimiter, aiController.generateDescription);
router.post("/price", isLoggedIn, actionLimiter, aiController.suggestPrice);

// 5. Review Summaries (Guest/Host)
router.post("/review-summary", actionLimiter, aiController.summarizeReviews);

module.exports = router;
