const express = require("express");
const router = express.Router();
const Chat = require("../models/chat.js");
const Listing = require("../models/listing.js");
const { isLoggedIn } = require("../middleware.js");

// OWNER INBOX
router.get("/", isLoggedIn, async (req, res) => {
    const ownerId = req.user._id;

    // Get all listings owned by this user
    const listings = await Listing.find({ owner: ownerId });

    let conversations = [];

    for (let listing of listings) {
        const msgs = await Chat.find({ listingId: listing._id })
            .populate("sender receiver")
            .sort({ createdAt: -1 });

        // Group messages by users who contacted this listing
        let map = {};

        msgs.forEach(msg => {
            const otherUser = msg.sender._id.equals(ownerId) ? msg.receiver : msg.sender;

            if (!map[otherUser._id]) {
                map[otherUser._id] = {
                    user: otherUser,
                    listing,
                    lastMessage: msg.message,
                    timestamp: msg.createdAt,
                };
            }
        });

        conversations.push(...Object.values(map));
    }

    res.render("chat/inbox", { conversations });
});

module.exports = router;
