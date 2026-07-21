const Listing = require("../models/listing");
const aiService = require("../utils/aiService");
const { parseQuery } = require("../utils/queryParser");
const crypto = require("crypto");

// Import modular prompt templates
const chatPrompt = require("../utils/prompts/chat");
const tripPlannerPrompt = require("../utils/prompts/tripPlanner");
const searchPrompt = require("../utils/prompts/search");
const propertyDescriptionPrompt = require("../utils/prompts/propertyDescription");
const reviewSummaryPrompt = require("../utils/prompts/reviewSummary");
const priceSuggestionPrompt = require("../utils/prompts/priceSuggestion");

/**
 * AI Trip Planner controller
 */
module.exports.renderTripPlanner = async (req, res) => {
    res.render("ai/tripPlanner.ejs", { itinerary: null, query: "", matchedStays: [] });
};

module.exports.planTrip = async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) {
            req.flash("error", "Please specify what you want to plan.");
            return res.redirect("/ai/trip-planner");
        }

        // Initialize cache in session
        if (!req.session.aiCache) {
            req.session.aiCache = {};
        }

        const cacheKey = crypto.createHash("md5").update(query.trim().toLowerCase()).digest("hex");
        
        // Return from cache if query matches
        if (req.session.aiCache[cacheKey]) {
            const cached = req.session.aiCache[cacheKey];
            return res.render("ai/tripPlanner.ejs", {
                itinerary: cached.itinerary,
                query,
                matchedStays: cached.matchedStays
            });
        }

        // Parse query details
        const parsed = parseQuery(query);

        // Fetch matched stays from database using recommendation indexing fields
        let matchedStays = [];
        if (parsed.city) {
            const cityFilter = {
                $or: [
                    { location: { $regex: new RegExp(parsed.city, "i") } },
                    { country: { $regex: new RegExp(parsed.city, "i") } }
                ]
            };
            if (parsed.listingType === "pg") {
                cityFilter.listingType = "pg";
            }
            
            matchedStays = await Listing.find(cityFilter)
                .select("title price location country images amenities rating listingType pgDetails")
                .limit(4)
                .lean();
        }

        // Fallback to general popular stays if location yields empty results
        if (matchedStays.length === 0) {
            matchedStays = await Listing.find({})
                .select("title price location country images amenities rating listingType pgDetails")
                .sort({ rating: -1 })
                .limit(4)
                .lean();
        }

        // Build Gemini prompt and generate content
        const prompt = tripPlannerPrompt(query, matchedStays, parsed);
        const itinerary = await aiService.generateContent(prompt, "tripPlanner");

        // Save results to session cache
        req.session.aiCache[cacheKey] = { itinerary, matchedStays };

        res.render("ai/tripPlanner.ejs", { itinerary, query, matchedStays });
    } catch (err) {
        console.error("AI Trip Planner Controller failure:", err.message);
        req.flash("error", "AI Trip Planner is temporarily busy. Running in Offline Mode.");
        res.redirect("/ai/trip-planner");
    }
};

/**
 * Natural Language Search parsing
 */
module.exports.naturalSearch = async (req, res) => {
    try {
        const { prompt } = req.query;
        if (!prompt) {
            return res.redirect("/listings");
        }

        // Parse query attributes
        const parsed = parseQuery(prompt);

        // Map parsed criteria directly into search queries
        const params = [];
        if (parsed.city) {
            params.push(`q=${encodeURIComponent(parsed.city)}`);
        }
        if (parsed.budget) {
            params.push(`maxPrice=${parsed.budget}`);
        }
        if (parsed.amenities && parsed.amenities.length > 0) {
            parsed.amenities.forEach(a => {
                params.push(`amenities[]=${encodeURIComponent(a)}`);
            });
        }
        if (parsed.listingType === "pg") {
            const loc = parsed.city ? `location=${encodeURIComponent(parsed.city)}` : "";
            return res.redirect(`/listings/pg?${loc}`);
        }

        if (params.length > 0) {
            return res.redirect(`/search?${params.join("&")}`);
        }

        // Fallback to text query
        res.redirect(`/search?q=${encodeURIComponent(prompt)}`);
    } catch (err) {
        console.error("AI Search parsing failure:", err.message);
        res.redirect(`/search?q=${encodeURIComponent(req.query.prompt)}`);
    }
};

/**
 * AI Guest Assistant Chat endpoint with conversational memory
 */
module.exports.chat = async (req, res) => {
    try {
        const { message, listingId } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, error: "Prompt message is required." });
        }

        // Initialize Chat History (Last 10 messages)
        if (!req.session.chatHistory) {
            req.session.chatHistory = [];
        }

        // Initialize Session Conversation Memory
        if (!req.session.aiConversation) {
            req.session.aiConversation = {
                destination: null,
                days: null,
                travellers: null,
                budget: null,
                travelStyle: null,
                listingType: null,
                amenities: []
            };
        }

        const msgLower = message.toLowerCase();
        
        // Handle interactive adjustments
        if (msgLower.includes("increase budget") || msgLower.includes("more budget")) {
            req.session.aiConversation.budget = Math.round((req.session.aiConversation.budget || 20000) * 1.5);
        } else if (msgLower.includes("reduce budget") || msgLower.includes("lower budget") || msgLower.includes("cheaper")) {
            req.session.aiConversation.budget = Math.round((req.session.aiConversation.budget || 20000) * 0.75);
        }

        // Parse incoming message and merge into session conversation memory
        const newlyParsed = parseQuery(message);
        if (newlyParsed.city) req.session.aiConversation.destination = newlyParsed.city;
        if (newlyParsed.days) req.session.aiConversation.days = newlyParsed.days;
        if (newlyParsed.travellers) req.session.aiConversation.travellers = newlyParsed.travellers;
        if (newlyParsed.budget) req.session.aiConversation.budget = newlyParsed.budget;
        if (newlyParsed.travelStyle) req.session.aiConversation.travelStyle = newlyParsed.travelStyle;
        if (newlyParsed.listingType) req.session.aiConversation.listingType = newlyParsed.listingType;
        if (newlyParsed.amenities && newlyParsed.amenities.length > 0) {
            req.session.aiConversation.amenities = Array.from(
                new Set([...(req.session.aiConversation.amenities || []), ...newlyParsed.amenities])
            );
        }

        const activeContext = {
            destination: req.session.aiConversation.destination || "Goa",
            days: req.session.aiConversation.days || 3,
            travellers: req.session.aiConversation.travellers || 2,
            budget: req.session.aiConversation.budget || 25000,
            travelStyle: req.session.aiConversation.travelStyle || "Leisure",
            listingType: req.session.aiConversation.listingType || "stay",
            amenities: req.session.aiConversation.amenities || []
        };

        // Query MongoDB listings matching active context
        let matchedStays = [];
        if (listingId) {
            matchedStays = await Listing.find({ _id: listingId })
                .select("title price location country images amenities rating maxGuests listingType pgDetails")
                .lean();
        } else if (activeContext.destination) {
            const searchRegex = new RegExp(activeContext.destination, "i");
            const filterObj = {
                $or: [
                    { location: searchRegex },
                    { country: searchRegex }
                ],
                price: { $lte: activeContext.budget * 1.3 }
            };
            if (activeContext.listingType === "pg") {
                filterObj.listingType = "pg";
            }

            matchedStays = await Listing.find(filterObj)
                .select("title price location country images amenities rating maxGuests listingType pgDetails")
                .limit(3)
                .lean();

            if (matchedStays.length === 0) {
                // Fallback to destination stays without price limit
                matchedStays = await Listing.find({
                    $or: [
                        { location: searchRegex },
                        { country: searchRegex }
                    ]
                })
                .select("title price location country images amenities rating maxGuests listingType pgDetails")
                .limit(3)
                .lean();
            }
        }

        const prompt = chatPrompt(message, matchedStays, req.session.chatHistory, activeContext);
        const reply = await aiService.generateContent(prompt, "chat", { activeContext, matchedStays });

        // Maintain Chat History limit (Last 10 messages)
        req.session.chatHistory.push({ role: "user", text: message });
        req.session.chatHistory.push({ role: "model", text: reply });
        if (req.session.chatHistory.length > 10) {
            req.session.chatHistory = req.session.chatHistory.slice(-10);
        }

        res.json({ success: true, reply });
    } catch (err) {
        console.error("AI Chatbot failure:", err.message);
        res.status(500).json({ success: false, error: "Guest Assistant is currently offline." });
    }
};

/**
 * AI Property Description Generator
 */
module.exports.generateDescription = async (req, res) => {
    try {
        const { title, amenities, location, price } = req.body;
        if (!title || !location) {
            return res.status(400).json({ error: "Missing required property parameters." });
        }

        const prompt = propertyDescriptionPrompt(title, amenities || [], location, price || 0);
        const description = await aiService.generateContent(prompt, "propertyDescription");

        res.json({ success: true, description });
    } catch (err) {
        console.error("AI Description failure:", err.message);
        res.status(500).json({ error: "Failed to generate description copy." });
    }
};

/**
 * AI Review Summarizer
 */
module.exports.summarizeReviews = async (req, res) => {
    try {
        const { listingId } = req.body;
        const listing = await Listing.findById(listingId).populate("reviews").lean();

        if (!listing) {
            return res.status(404).json({ error: "Listing not found." });
        }

        if (!listing.reviews || listing.reviews.length === 0) {
            return res.json({ success: true, summary: "No reviews exist on this property yet." });
        }

        const prompt = reviewSummaryPrompt(listing.reviews);
        const summary = await aiService.generateContent(prompt, "reviewSummary");

        res.json({ success: true, summary });
    } catch (err) {
        console.error("AI Review summary failure:", err.message);
        res.status(500).json({ error: "Failed to summarize reviews." });
    }
};

/**
 * AI Host Price Suggestions
 */
module.exports.suggestPrice = async (req, res) => {
    try {
        const { listingId } = req.body;
        const listing = await Listing.findById(listingId).lean();

        if (!listing) {
            return res.status(404).json({ error: "Listing not found." });
        }

        const competitors = await Listing.find({
            _id: { $ne: listingId },
            location: { $regex: new RegExp(listing.location, "i") }
        }).limit(5).lean();

        const prompt = priceSuggestionPrompt(listing, competitors);
        const suggestion = await aiService.generateContent(prompt, "priceSuggestion");

        res.json({ success: true, suggestion });
    } catch (err) {
        console.error("AI Pricing suggestion failure:", err.message);
        res.status(500).json({ error: "Failed to suggest pricing recommendations." });
    }
};
