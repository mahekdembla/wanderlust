/**
 * Prompt template for the structured Day-wise AI Trip Planner.
 */
module.exports = (promptText, availableListings = [], parsed = {}) => {
    const listingsStr = availableListings.map(l => 
        `- ID: ${l._id} | Title: "${l.title}" in ${l.location}, ${l.country} | Price: ₹${l.listingType === 'pg' ? (l.pgDetails?.monthlyRent || 0) + '/mo' : (l.price || 0) + '/night'} | Rating: ${l.rating || 'N/A'} | Amenities: ${(l.amenities || []).join(", ")}`
    ).join("\n");

    return `You are a professional travel planner on the Wanderlust platform.
The guest is planning a trip and has input the following query:
"${promptText}"

Parsed details:
- Target City/Destination: ${parsed.city || "Not specified"}
- Number of Days: ${parsed.days || 3}
- Budget Limit: ${parsed.budget ? '₹' + parsed.budget : "Not specified"}
- Guests count: ${parsed.travellers || 2}
- Style: ${parsed.travelStyle || "Leisure"}

Stays available on our database:
${listingsStr || "None available."}

Generate a comprehensive travel itinerary response in structured Markdown. You MUST structure the response EXACTLY like this:

# Trip Overview
- **Destination**: [Destination Name]
- **Duration**: [Number of Days]
- **Budget**: [Budget Limit]
- **Travellers**: [Number of Guests]
- **Weather**: [Expected weather info]
- **Best Time to Visit**: [Months/Seasons]

---

## Day 1
- **Morning**: [Activities]
- **Afternoon**: [Lunch/Activities]
- **Evening**: [Sunset/Dinner/Activities]

---

## Day 2
- **Morning**: [Activities]
- **Afternoon**: [Lunch/Activities]
- **Evening**: [Sunset/Dinner/Activities]

[Repeat daily structure for each of the planned days]

---

### Food Recommendations
[Local dishes and dining ideas]

### Shopping
[Places to shop, local specialties]

### Nearby Attractions
[List of tourist attractions]

### Transportation
[Best local transit methods]

### Packing Checklist
[List of clothes, gear, or docs]

### Emergency Tips
[Emergency contact suggestions or safety info]

### Travel Tips
[Cultural rules or helpful notes]

### Budget Saving Suggestions
[If the user's budget is unrealistic or tight, explain how to save or suggest cheaper alternatives (e.g. staying in PGs/homestays, visiting during shoulder season)]

### Recommended Listings
[Recommend at least 1 or 2 matching stays from the available listings list above, with markdown links in format [Title](/listings/ID) and briefly explain why they match].

Respond directly and professionally in markdown format. do not output surrounding conversational text.`;
};
