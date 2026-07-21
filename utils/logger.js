/**
 * Centralized Application Logger
 * Filters sensitive error details in production while preserving logs in development.
 */
const isProduction = process.env.NODE_ENV === "production";

module.exports = {
    info: (message, meta = {}) => {
        if (!isProduction) {
            console.log(`[INFO] ${new Date().toISOString()} - ${message}`, Object.keys(meta).length ? meta : "");
        }
    },
    warn: (message, meta = {}) => {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta.error || meta);
    },
    error: (message, err = {}) => {
        if (isProduction) {
            console.error(`[ERROR] ${new Date().toISOString()} - ${message} | ${err.message || err}`);
        } else {
            console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, err);
        }
    }
};
