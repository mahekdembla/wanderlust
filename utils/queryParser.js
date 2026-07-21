/**
 * Advanced Natural Language Query Parser for AI Trip Planner 2.0.
 * Extracts structured travel parameters from freeform text prompts.
 */
function parseQuery(prompt) {
    if (!prompt) return {};

    const text = prompt.trim();
    const textLower = text.toLowerCase();

    // 1. Extract duration (days)
    let days = null;
    if (textLower.includes("weekend")) {
        days = 2;
    } else {
        const weekMatch = textLower.match(/(\d+)?\s*(?:week|weeks|wk|wks)/i);
        if (weekMatch) {
            const count = weekMatch[1] ? parseInt(weekMatch[1]) : 1;
            days = count * 7;
        } else {
            const daysMatch = textLower.match(/(\d+)\s*(?:day|days|night|nights)/i);
            if (daysMatch) {
                days = parseInt(daysMatch[1]);
            }
        }
    }

    // 2. Extract budget
    let budget = null;
    const cleanBudgetStr = textLower.replace(/,/g, "");
    
    // Match patterns like "under 15000", "below ₹25000", "25k", "rs 10000"
    const budgetMatch = cleanBudgetStr.match(/(?:under|below|budget|of|rs\.?|₹|max|limit)\s*(\d+)\s*(k|thousand|lakh)?/i) ||
                        cleanBudgetStr.match(/(\d+)\s*(k|thousand|lakh)/i);

    if (budgetMatch) {
        let val = parseInt(budgetMatch[1]);
        const multiplier = budgetMatch[2] ? budgetMatch[2].toLowerCase() : "";
        if (multiplier === "k" || multiplier === "thousand") {
            val = val * 1000;
        } else if (multiplier === "lakh") {
            val = val * 100000;
        }
        budget = val;
    }

    // 3. Extract guests & group composition
    let travellers = null;
    let travelStyle = null;

    if (textLower.includes("solo") || textLower.includes("myself") || textLower.includes("alone")) {
        travellers = 1;
        travelStyle = "Solo";
    }

    const coupleMatch = textLower.match(/(\d+)\s*couple(?:s)?/i);
    if (coupleMatch) {
        travellers = parseInt(coupleMatch[1]) * 2;
        travelStyle = "Couples";
    }

    const familyMatch = textLower.match(/family\s*(?:of)?\s*(\d+)/i);
    if (familyMatch) {
        travellers = parseInt(familyMatch[1]);
        travelStyle = "Family";
    }

    const groupMatch = textLower.match(/group\s*(?:of)?\s*(\d+)/i);
    if (groupMatch) {
        travellers = parseInt(groupMatch[1]);
        travelStyle = "Friends";
    }

    if (!travellers) {
        const guestsMatch = textLower.match(/(\d+)\s*(?:people|person|guest|guests|traveller|travellers|traveler|travelers|member|members|friends)/i);
        if (guestsMatch) {
            travellers = parseInt(guestsMatch[1]);
        }
    }

    if (!travelStyle) {
        if (textLower.includes("honeymoon") || textLower.includes("romantic")) {
            travelStyle = "Honeymoon";
        } else if (textLower.includes("family") || textLower.includes("kids") || textLower.includes("parents")) {
            travelStyle = "Family";
        } else if (textLower.includes("friends") || textLower.includes("group") || textLower.includes("gang")) {
            travelStyle = "Friends";
        } else if (textLower.includes("adventure") || textLower.includes("trek") || textLower.includes("hiking")) {
            travelStyle = "Adventure";
        } else if (textLower.includes("workation") || textLower.includes("remote work")) {
            travelStyle = "Workation";
        }
    }

    // 4. Extract destination/city (Case-insensitive & strip leading preposition noise)
    let city = null;
    
    // Prioritize multi-word preposition phrases first
    const prepMatch = text.match(/(?:trip to|stay in|plan a trip to|plan trip to|visit|explore|near|in|at|to)\s+([a-zA-Z\s]+?)(?:\s+for|\s+under|\s+below|\s+with|\s+budget|\s*$)/i);
    if (prepMatch && prepMatch[1]) {
        let extracted = prepMatch[1].trim();
        // Remove trailing or leading noise
        extracted = extracted.replace(/^(to|in|near|at|visit|plan|trip|a|an|the|vacation|tour|holiday|stay)\s+/i, "").trim();
        const fillerStopWords = ["my", "our", "a", "an", "the", "trip", "vacation", "holiday", "itinerary", "stay", "somewhere", "here", "there"];
        if (extracted.length > 1 && !fillerStopWords.includes(extracted.toLowerCase())) {
            city = extracted.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        }
    }

    if (!city) {
        const knownCities = [
            "goa", "alibaug", "new york", "mumbai", "delhi", "bangalore", "pune", "kasol", "shimla",
            "jaipur", "udaipur", "kerala", "agra", "rishikesh", "varanasi", "ladakh", "coorg", "ooty",
            "wayanad", "munnar", "darjeeling", "gangtok", "gokarna", "paris", "london", "dubai", "tokyo", "singapore", "bali"
        ];
        const foundCity = knownCities.find(c => textLower.includes(c));
        if (foundCity) {
            city = foundCity.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        }
    }

    // 5. Property/Listing Type
    let listingType = null;
    if (textLower.includes("pg") || textLower.includes("hostel") || textLower.includes("paying guest")) {
        listingType = "pg";
    } else if (textLower.includes("villa") || textLower.includes("house") || textLower.includes("bungalow")) {
        listingType = "villa";
    } else if (textLower.includes("resort") || textLower.includes("hotel")) {
        listingType = "resort";
    } else if (textLower.includes("cabin") || textLower.includes("cottage")) {
        listingType = "cabin";
    }

    // 6. Amenities & Preferences
    const amenities = [];
    if (textLower.includes("pet") || textLower.includes("dog")) amenities.push("Pet Friendly");
    if (textLower.includes("wifi") || textLower.includes("internet") || textLower.includes("workation")) amenities.push("Wifi");
    if (textLower.includes("pool") || textLower.includes("swimming")) amenities.push("Amazing pools");
    if (textLower.includes("mountain") || textLower.includes("hill")) amenities.push("Mountains");
    if (textLower.includes("beach") || textLower.includes("sea")) amenities.push("Beach View");
    if (textLower.includes("kitchen")) amenities.push("Kitchen");
    if (textLower.includes("nightlife") || textLower.includes("club")) amenities.push("Nightlife");
    if (textLower.includes("veg") || textLower.includes("vegetarian")) amenities.push("Veg Dining");

    // 7. Luxury vs Budget
    let luxuryLevel = null;
    if (textLower.includes("luxury") || textLower.includes("premium") || textLower.includes("5 star")) {
        luxuryLevel = "Luxury";
    } else if (textLower.includes("budget") || textLower.includes("cheap") || textLower.includes("low cost")) {
        luxuryLevel = "Budget";
    }

    return {
        city,
        days,
        budget,
        travellers,
        travelStyle,
        listingType,
        amenities,
        luxuryLevel
    };
}

module.exports = {
    parseQuery
};
