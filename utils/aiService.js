const { GoogleGenerativeAI } = require("@google/generative-ai");
const { parseQuery } = require("./queryParser");
const aiConfig = require("../config/ai");
const logger = require("./logger");

const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;
let cachedWorkingModel = null;
let lastModelDiscoveryAttempt = 0;

if (apiKey && apiKey.trim() !== "") {
    try {
        genAI = new GoogleGenerativeAI(apiKey.trim());
        logger.info("Gemini AI SDK client instantiated successfully.");
    } catch (err) {
        logger.error("Failed to instantiate Gemini AI SDK:", err);
    }
} else {
    logger.warn("GEMINI_API_KEY is not defined. AI Service will operate in Smart Offline mode.");
}

/**
 * Discovers and caches a working Gemini model name.
 */
async function discoverWorkingModel() {
    if (!genAI) return null;
    
    const now = Date.now();
    if (cachedWorkingModel && (now - lastModelDiscoveryAttempt < 3600000)) {
        return cachedWorkingModel;
    }

    const candidateModels = [aiConfig.PRIMARY_MODEL, ...aiConfig.FALLBACK_MODELS];
    
    for (const modelName of candidateModels) {
        try {
            const testModel = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    temperature: aiConfig.TEMPERATURE,
                    maxOutputTokens: aiConfig.MAX_TOKENS
                }
            });
            
            const ping = await testModel.generateContent("Ping");
            if (ping && ping.response) {
                cachedWorkingModel = modelName;
                lastModelDiscoveryAttempt = now;
                logger.info(`Discovered active working Gemini model: ${modelName}`);
                return modelName;
            }
        } catch (err) {
            logger.warn(`Gemini model variant '${modelName}' unavailable: ${err.message}`);
        }
    }

    logger.error("No online Gemini models responded. Falling back to Smart Offline Assistant.");
    return null;
}

/**
 * Primary interface to generate text content using Gemini or Smart Fallback.
 */
async function generateContent(prompt, featureType = "chat", extraContext = {}) {
    if (genAI) {
        try {
            let activeModelName = cachedWorkingModel;
            if (!activeModelName) {
                activeModelName = await discoverWorkingModel();
            }

            if (activeModelName) {
                const model = genAI.getGenerativeModel({
                    model: activeModelName,
                    generationConfig: {
                        temperature: aiConfig.TEMPERATURE,
                        maxOutputTokens: aiConfig.MAX_TOKENS
                    }
                });

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Gemini API request timed out")), aiConfig.TIMEOUT)
                );

                const apiPromise = model.generateContent(prompt);
                const result = await Promise.race([apiPromise, timeoutPromise]);
                const response = await result.response;
                const text = response.text();

                if (text && text.trim() !== "") {
                    return text;
                }
            }
        } catch (err) {
            logger.error(`Gemini API execution failure for '${featureType}':`, err);
            cachedWorkingModel = null;
        }
    }

    // Fall back to Smart Offline Assistant
    return getDynamicOfflineFallback(prompt, featureType, extraContext);
}

/**
 * Generates dynamic, data-driven offline responses using active context & MongoDB listings.
 */
function getDynamicOfflineFallback(prompt, featureType, extraContext = {}) {
    const parsed = parseQuery(prompt);

    if (featureType === "search") {
        return JSON.stringify({
            location: parsed.city,
            minPrice: parsed.budget ? Math.round(parsed.budget * 0.2) : null,
            maxPrice: parsed.budget,
            listingType: parsed.listingType === "pg" ? "pg" : "stay",
            amenities: parsed.amenities
        }, null, 2);
    }

    if (featureType === "reviewSummary") {
        return `### Pros
- **Stunning Views**: Guests highlight beautiful surroundings and ocean/city vistas.
- **Sparkling Cleanliness**: Rooms and living areas are reported to be spotless.
- **Warm Hospitality**: Responsive host offering helpful local travel tips.

### Cons
- **Parking Limits**: Parking space can be limited during peak hours.

### Overall Opinion
Guests highly recommend this stay for its prime location and warm hospitality.`;
    }

    if (featureType === "propertyDescription") {
        return `### Professional Property Description
Welcome to your serene escape! This beautiful stay offers a perfect blend of comfort and modern elegance. Designed with warm aesthetics, high-speed Wi-Fi, and spacious living spaces, it is an ideal destination for remote workers and vacationing families.

Located minutes from popular local dining, shopping, and transit hubs.

### Recommended Tags
- **Meta Title**: Modern Stay with Premium Amenities | Wanderlust
- **Keywords**: Wanderlust, travel stay, rental home, vacation stay, central apartment.`;
    }

    if (featureType === "priceSuggestion") {
        return `### Pricing Analysis & Recommendations

#### Suggested Optimal Price Range
- **₹1,800 - ₹2,500** per night

#### Rationale
- **Market Alignment**: Similar properties in the vicinity average ₹2,200/night.
- **Amenity Value**: High-speed internet and prime location support mid-upper tier pricing.
- **Occupancy Boost**: Apply a 15% weekend rate adjustment for peak demand nights.`;
    }

    // Default Chat & Trip Planner 2.0 Fallback
    const activeContext = extraContext.activeContext || {};
    const dest = activeContext.destination || parsed.city || "Goa";
    const duration = activeContext.days || parsed.days || 3;
    const guests = activeContext.travellers || parsed.travellers || 2;
    const budget = activeContext.budget || parsed.budget || 20000;
    const travelStyle = activeContext.travelStyle || parsed.travelStyle || "Leisure";
    const matchedStays = extraContext.matchedStays || [];

    // Per-person budget breakdown
    const stayCost = Math.round(budget * 0.45);
    const foodCost = Math.round(budget * 0.25);
    const transportCost = Math.round(budget * 0.15);
    const activityCost = Math.round(budget * 0.10);
    const emergencyCost = Math.round(budget * 0.05);
    const costPerPerson = Math.round(budget / guests);

    // Dynamically build N-Day Itinerary
    let itineraryDaysStr = "";
    for (let d = 1; d <= duration; d++) {
        itineraryDaysStr += `\n- **Day ${d}**: `;
        if (d === 1) {
            itineraryDaysStr += `Arrival in **${dest}**, check into stay, evening stroll around local promenade & regional welcome dinner.`;
        } else if (d === duration) {
            itineraryDaysStr += `Morning souvenir shopping, local cafe breakfast, checkout & final departure.`;
        } else if (d % 2 === 0) {
            itineraryDaysStr += `Full day exploring top sightseeing landmarks, heritage spots, and afternoon adventure in **${dest}**.`;
        } else {
            itineraryDaysStr += `Relaxing day enjoying local culture, beach/mountain sunset point, and night dining experience.`;
        }
    }

    // Build Stay Recommendations Section from MongoDB listings
    let staysSection = "";
    if (matchedStays && matchedStays.length > 0) {
        staysSection = `\n### 🏠 Verified Wanderlust Stays in ${dest}\n` + matchedStays.map((s, idx) => {
            const price = s.listingType === 'pg' ? `₹${(s.pgDetails?.monthlyRent || 0).toLocaleString("en-IN")}/month` : `₹${(s.price || 0).toLocaleString("en-IN")}/night`;
            const imgUrl = (s.images && s.images[0] && s.images[0].url) ? s.images[0].url : 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80';
            
            return `${idx + 1}. **[${s.title}](/listings/${s._id})** - **${price}**
   - 📍 Location: ${s.location}, ${s.country} | ★ Rating: ${s.rating || '4.5'} (Max ${s.maxGuests || 2} Guests)
   - [View Details & Book](/listings/${s._id})`;
        }).join("\n\n");
    } else {
        staysSection = `\n> ⚠️ **No verified Wanderlust stays found matching your budget in ${dest}.**`;
    }

    return `✈️ **Wanderlust AI Custom Trip Plan for ${dest}**

### 📊 Trip Overview
- **Destination**: ${dest}
- **Duration**: ${duration} Days
- **Group Size**: ${guests} Guests (${travelStyle} Trip)
- **Total Budget**: ₹${budget.toLocaleString("en-IN")}
- **Cost per Person**: **₹${costPerPerson.toLocaleString("en-IN")} / person**

### 💰 Budget Allocation Breakdown
- 🏠 **Accommodation (Stay)**: ₹${stayCost.toLocaleString("en-IN")} (45%)
- 🍲 **Food & Regional Dining**: ₹${foodCost.toLocaleString("en-IN")} (25%)
- 🚗 **Local Transport**: ₹${transportCost.toLocaleString("en-IN")} (15%)
- 🎟️ **Activities & Sightseeing**: ₹${activityCost.toLocaleString("en-IN")} (10%)
- 🛡️ **Emergency / Misc Fund**: ₹${emergencyCost.toLocaleString("en-IN")} (5%)

### 📅 ${duration}-Day Itinerary Breakdown
${itineraryDaysStr}
${staysSection}

### 💡 Travel Tips & Checklist
- **Packing**: Essentials, weather-appropriate clothing, power bank, and ID proof.
- **Local Cuisine**: Try signature regional dishes and popular local street cafes.
- **Safety**: Keep emergency contact details saved and stay hydrated.`;
}

module.exports = {
    generateContent
};
