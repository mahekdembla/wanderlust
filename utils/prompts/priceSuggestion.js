/**
 * Prompt template for property pricing suggestion.
 */
module.exports = (targetListing, similarListings = []) => {
    const similarStr = similarListings.map(l => 
        `- ${l.title} in ${l.location} | Price: ₹${l.price || l.pgDetails?.monthlyRent} | Rating: ${l.rating || 'N/A'} | Amenities: ${(l.amenities || []).join(", ")}`
    ).join("\n");

    const targetPrice = targetListing.listingType === "pg" ? targetListing.pgDetails?.monthlyRent : targetListing.price;

    return `You are an expert hospitality pricing analyst for Wanderlust.
Suggest the optimal price for the following property:
- Title: "${targetListing.title}"
- Location: "${targetListing.location}, ${targetListing.country}"
- Amenities: ${(targetListing.amenities || []).join(", ") || "None listed"}
- Rating: ${targetListing.rating || "New property (no reviews)"}
- Current Price: ₹${targetPrice || "Not set"}

Competitor Stays in location:
${similarStr || "No direct competitor stays found."}

Provide a short pricing analysis (200 words max) including:
1. Suggested optimal nightly/monthly price range (e.g. ₹X - ₹Y).
2. Rationale based on location, amenities, rating, and competitor prices.
3. Tips to maximize bookings (e.g. weekend premiums, discount for long stays).

Respond in markdown format.`;
};
