const sanitizeHtml = require("sanitize-html");

/**
 * Deep sanitization function that cleans HTML tags from nested properties recursively.
 */
const sanitizeValue = (val) => {
    if (typeof val === "string") {
        return sanitizeHtml(val, {
            allowedTags: [], // Clean all HTML elements for maximum safety
            allowedAttributes: {}
        });
    }
    if (Array.isArray(val)) {
        return val.map(item => sanitizeValue(item));
    }
    if (val !== null && typeof val === "object") {
        const cleanedObj = {};
        for (const k in val) {
            cleanedObj[k] = sanitizeValue(val[k]);
        }
        return cleanedObj;
    }
    return val;
};

/**
 * Deep sanitization function that cleans MongoDB operators (keys starting with $) recursively in-place.
 */
const sanitizeMongo = (val) => {
    if (Array.isArray(val)) {
        val.forEach(item => sanitizeMongo(item));
    } else if (val !== null && typeof val === "object") {
        for (const key in val) {
            let processedKey = key;
            if (key.startsWith("$")) {
                processedKey = "_" + key.substring(1);
                val[processedKey] = val[key];
                delete val[key];
            }
            sanitizeMongo(val[processedKey]);
        }
    }
};

/**
 * Custom middleware to sanitize inputs against MongoDB Operator Injection in-place.
 */
module.exports.mongoSanitizeInput = (req, res, next) => {
    if (req.body) sanitizeMongo(req.body);
    if (req.query) sanitizeMongo(req.query);
    if (req.params) sanitizeMongo(req.params);
    next();
};

/**
 * Middleware that cleans inputs in req.body, req.query, and req.params to prevent XSS.
 */
module.exports.xssSanitizeInput = (req, res, next) => {
    if (req.body) {
        req.body = sanitizeValue(req.body);
    }
    if (req.query) {
        const sanitized = sanitizeValue(req.query);
        Object.defineProperty(req, 'query', {
            value: sanitized,
            writable: true,
            configurable: true,
            enumerable: true
        });
    }
    if (req.params) {
        const sanitized = sanitizeValue(req.params);
        Object.defineProperty(req, 'params', {
            value: sanitized,
            writable: true,
            configurable: true,
            enumerable: true
        });
    }
    next();
};
