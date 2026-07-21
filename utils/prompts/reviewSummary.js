/**
 * Prompt template for Review Summarization.
 */
module.exports = (reviews = []) => {
    const reviewsStr = reviews.map((r, idx) => `Review ${idx + 1} (Rating: ${r.rating} stars): ${r.comment}`).join("\n");

    return `You are an AI assistant that summarizes property reviews on the Wanderlust platform.
Please analyze the following guest reviews:
${reviewsStr || "No reviews available yet."}

Summarize them into three clean sections in markdown format:
### Pros
- [List key positive points mentioned by multiple guests]

### Cons
- [List key negative points or issues mentioned by multiple guests]

### Overall Opinion
[Provide a 2-3 sentence overall summary of what guests think of this stay]`;
};
