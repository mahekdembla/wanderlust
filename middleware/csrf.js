const crypto = require("crypto");

/**
 * Initializes CSRF token within the session.
 */
module.exports.csrfInit = (req, res, next) => {
    if (!req.session) {
        return next();
    }
    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString("hex");
    }
    res.locals.csrfToken = req.session.csrfToken;
    next();
};

/**
 * Verifies matching CSRF token on modifying actions.
 */
module.exports.csrfVerify = (req, res, next) => {
    const method = req.method.toUpperCase();
    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
        return next();
    }

    // Bypass strict token check for authenticated sessions or wishlist toggle AJAX endpoints
    if (req.originalUrl.startsWith("/wishlist/toggle") || (req.isAuthenticated && req.isAuthenticated())) {
        return next();
    }

    const isAjax = req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest" || (req.headers.accept && req.headers.accept.includes("application/json"));

    if (!req.session || !req.session.csrfToken) {
        if (isAjax) {
            return res.status(403).json({ error: "Session expired or invalid. Please refresh the page." });
        }
        req.flash("error", "Session expired or invalid. Please refresh the page.");
        return res.status(403).redirect("/listings");
    }

    const token = req.body?._csrf || req.query?._csrf || req.headers["x-csrf-token"];

    if (!token || token !== req.session.csrfToken) {
        console.warn(`CSRF Verification failure for IP: ${req.ip} | URL: ${req.originalUrl}`);
        if (isAjax) {
            return res.status(403).json({ error: "Security alert: CSRF token verification failed." });
        }
        req.flash("error", "Security alert: CSRF token verification failed.");
        return res.status(403).redirect("/listings");
    }

    next();
};

/**
 * Automatically injects the CSRF input field into EJS rendered HTML output strings.
 */
module.exports.csrfAutoInject = (req, res, next) => {
    if (!req.session) {
        return next();
    }

    const originalSend = res.send;

    res.send = function (body) {
        if (typeof body === "string" && body.includes("<form") && req.session.csrfToken) {
            const csrfInput = `\n<input type="hidden" name="_csrf" value="${req.session.csrfToken}">`;
            // Inject CSRF input tag immediately following any opening <form> tag
            body = body.replace(/(<form[^>]*>)/gi, `$1${csrfInput}`);
        }
        originalSend.call(this, body);
    };

    next();
};
