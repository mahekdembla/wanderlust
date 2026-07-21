const helmet = require("helmet");

/**
 * Configure Helmet with secure defaults and custom Content Security Policy.
 */
module.exports.helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'", // Allowed for inline scripts (like maps & filters redirection)
                "https://cdn.jsdelivr.net",
                "https://kit.fontawesome.com",
                "https://unpkg.com",
                "https://code.jquery.com",
                "https://cdnjs.cloudflare.com"
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'", // Allowed for inline styles (like maps leaflet positioning)
                "https://cdn.jsdelivr.net",
                "https://fonts.googleapis.com",
                "https://ka-f.fontawesome.com",
                "https://unpkg.com",
                "https://cdnjs.cloudflare.com"
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",
                "https://ka-f.fontawesome.com",
                "https://cdnjs.cloudflare.com",
                "https://cdn.jsdelivr.net"
            ],
            imgSrc: [
                "'self'",
                "data:",
                "blob:",
                "https://res.cloudinary.com",
                "https://images.unsplash.com",
                "https://media.cntraveler.com",
                "https://*.tile.openstreetmap.org",
                "https://unpkg.com"
            ],
            connectSrc: [
                "'self'",
                "ws://localhost:8080",
                "wss://localhost:8080",
                "http://localhost:8080",
                "ws://127.0.0.1:8080",
                "wss://127.0.0.1:8080",
                "http://127.0.0.1:8080",
                "https://ka-f.fontawesome.com"
            ],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false, // Ensure image loading is not blocked by CORS checks
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "cross-origin" }
});
