if (process.env.NODE_ENV != "production") {
    require('dotenv').config();
}

console.log(process.env.SECRET);

const express = require("express");
const app = express();
app.set("trust proxy", 1);
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const { measureMemory } = require("vm");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

// Import security middlewares
const { helmetConfig } = require("./middleware/securityHeaders");
const { mongoSanitizeInput, xssSanitizeInput } = require("./middleware/sanitize");
const { csrfInit, csrfVerify, csrfAutoInject } = require("./middleware/csrf");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const chatRouter = require("./routes/chat.js");
const inboxRouter = require("./routes/inbox.js");
const searchRouter = require("./routes/search.js");
const bookingRouter = require("./routes/booking");
const notificationRouter = require("./routes/notification.js");
const hostRouter = require("./routes/host.js");
const profileRouter = require("./routes/profile.js");
const aiRouter = require("./routes/ai.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

main()
    .then(() => {
        console.log("Connected");
    }).catch((err) => {
        console.log(err);
    });

async function main() {
    await mongoose.connect(MONGO_URL);
};

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

const sessionOptions = {
    secret: process.env.SECRET || "mysecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    }
};
// Apply global security sanitization and headers
app.use(helmetConfig);
app.use(mongoSanitizeInput);
app.use(xssSanitizeInput);
// app.get("/", (req, res) => {
//     res.send("Hi");
// });
app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(csrfInit);
app.use(csrfAutoInject);
app.use(csrfVerify);

const Listing = require("./models/listing.js");

app.use(async (req, res, next) => {
    res.locals.page = "main";
    res.locals.query = {};
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    res.locals.hasListings = false;

    if (req.user) {
        try {
            const hasListings = await Listing.exists({ owner: req.user._id });
            res.locals.hasListings = !!hasListings;
        } catch (err) {
            console.error("Error in owner listing check:", err);
        }
    }
    next();
});

app.get("/", (req, res) => {
    res.redirect("/listings");
});

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);
app.use("/chat", chatRouter);
app.use("/inbox", inboxRouter);
app.use("/search", searchRouter)
app.use("/notifications", notificationRouter);
app.use("/host", hostRouter);
app.use("/", profileRouter);
app.use("/", bookingRouter);
app.use("/ai", aiRouter);

app.all(/.*/, (req, res, next) => {
    next(new ExpressError(404, "page Not Found"));
});

const logger = require("./utils/logger.js");

app.use((err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "something went wrong";

    // Log internally with stack trace
    logger.error(`[Error Handler] ${req.method} ${req.originalUrl} | Status: ${statusCode} | Message: ${message}`, err);

    // Filter sensitive info and system traces in production
    if (process.env.NODE_ENV === "production") {
        if (err.name === "MongoServerError" || err.name === "ValidationError" || err.name === "CastError") {
            statusCode = 400;
            message = "A database validation error or constraint violation occurred.";
        } else if (statusCode === 500) {
            message = "An internal server error occurred. Please try again later.";
        }
        // Redact connection URLs or key strings
        message = message.replace(/(mongodb\+srv:\/\/|mongodb:\/\/)[^@\s]+@[^\s]+/gi, "[DATABASE_URI]");
        message = message.replace(/(AIzaSy)[A-Za-z0-9_\-]{35}/gi, "[GEMINI_API_KEY]");
    }

    res.status(statusCode).render("error.ejs", { message });
});

const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const { setIO } = require("./config/socket");
setIO(io);

io.on("connection", (socket) => {
    console.log("user connected");

    socket.on("joinRoom", (roomId) => {
        socket.join(roomId);
    });

    socket.on("joinNotifications", (userId) => {
        socket.join(userId.toString());
        socket.userId = userId;
        console.log(`User socket joined notifications room: ${userId}`);
    });

    socket.on("sendMessage", (data) => {
        io.to(data.roomId).emit("receiveMessage", data);
    });
    socket.on("typing", (data) => {
        socket.to(data.roomId).emit("showTyping", data);
    });
    socket.on("stopTyping", data => {
        socket.to(data.roomId).emit("hideTyping", data);
    });

    socket.on("disconnect", async () => {
        if (socket.userId) {
            try {
                await User.findByIdAndUpdate(socket.userId, { lastSeen: new Date() });
                io.emit("userOfflineStatus", { userId: socket.userId });
            } catch (err) {
                console.error("Disconnect state save error:", err.message);
            }
        }
    });

});

server.listen(8080, () => {
    console.log("Server with Socket.io is running on port 8080");
});