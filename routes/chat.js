const express=require("express");
const router=express.Router();
const Chat=require("../models/chat.js");
const wrapAsync=require("../utils/wrapAsync.js");
const { isLoggedIn } = require("../middleware");

router.get("/:listingId/:otherUserId", isLoggedIn, wrapAsync(async (req, res) => {
    const { listingId, otherUserId } = req.params;

    const messages = await Chat.find({
        listingId,
        $or: [
            { sender: req.user._id, receiver: otherUserId },
            { sender: otherUserId, receiver: req.user._id }
        ]
    }).populate("sender receiver");


    res.render("chat/chat", {
        messages,
        listingId,
        receiverId: otherUserId,
        receiverUsername:otherUserId.username
    });
    await Chat.updateMany(
    { receiver: req.user._id, listingId },
    { $set: { seen: true } }
    );

}));

router.post("/send", isLoggedIn, wrapAsync(async (req, res) => {
    console.log("BODY RECEIVED:", req.body);   

    const { listingId, sender, receiver, message } = req.body;

    const chat = new Chat({
        listingId,
        sender,
        receiver,
        message
    });

    await chat.save();

    res.json({ success: true });
}));

module.exports=router;