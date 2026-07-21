const rateLimit = require("express-rate-limit");
const AuditLog = require("../models/AuditLog");

/**
 * Audit-log rate limit block events.
 */
const logLimitViolation = async (req, limitType) => {
    try {
        await AuditLog.create({
            event: "rate_limit_violated",
            user: req.user ? req.user._id : null,
            ip: req.ip,
            details: `${limitType} rate limit exceeded on ${req.method} ${req.originalUrl}`
        });
    } catch (err) {
        console.error("Failed to write rate limit audit log:", err);
    }
};

// 1. Auth routes rate limiting (Login/Signup): Max 20 requests per 15 minutes
module.exports.authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: "Too many authentication attempts. Please try again after 15 minutes.",
    handler: async (req, res, next, options) => {
        await logLimitViolation(req, "auth");
        if (typeof req.flash === "function") {
            req.flash("error", options.message);
        }
        res.status(429).redirect("/listings");
    },
    standardHeaders: true,
    legacyHeaders: false
});

// 2. Action endpoints rate limiting (Bookings, Reviews, Chat, AI): Max 30 requests per minute
module.exports.actionLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 30,
    message: "Action rate limit exceeded. Please wait a moment before trying again.",
    handler: async (req, res, next, options) => {
        await logLimitViolation(req, "action");
        const isAjax = req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest" || (req.headers.accept && req.headers.accept.includes("application/json"));
        if (isAjax) {
            return res.status(429).json({ success: false, error: options.message });
        }
        if (typeof req.flash === "function") {
            req.flash("error", options.message);
        }
        res.status(429).redirect("back");
    },
    standardHeaders: true,
    legacyHeaders: false
});
