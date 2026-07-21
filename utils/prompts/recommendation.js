/**
 * Prompt template for recommending and explaining matched listings.
 */
module.exports = (userPrompt, listings = []) => {
    const listStr = listings.map(l => 
        `- Title: "${l.title}" (ID: ${l._id}) | Price: ₹${l.listingType === 'pg' ? (l.pgDetails?.monthlyRent || 0) + '/mo' : (l.price || 0) + '/night'} | Rating: ${l.rating || 'N/A'} | Location: ${l.location} | Amenities: ${(l.amenities || []).join(", ")}`
    ).join("\n");

    return `You are a recommendation matching assistant for the Wanderlust travel platform.
The user's query is: "${userPrompt}"

Below are matching listings from our database:
${listStr || "No matching listings."}

Provide a short summary (1-2 sentences per listing) explaining why each matched listing is recommended for the user's travel style, price constraints, or location interests.
Respond in clear Markdown.`;
};
