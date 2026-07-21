/**
 * Centralized AI Service & Gemini Configuration
 */
module.exports = {
    PRIMARY_MODEL: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    FALLBACK_MODELS: ["gemini-flash-latest", "gemini-2.5-flash"],
    TEMPERATURE: 0.7,
    MAX_TOKENS: 1024,
    TIMEOUT: 10000, // 10 seconds timeout
    RETRY_COUNT: 2,
    OFFLINE_SETTINGS: {
        enabled: true,
        fallbackMessage: "AI service temporarily offline. Using Smart Offline Assistant."
    }
};
