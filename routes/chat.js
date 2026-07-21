const express=require("express");
const router=express.Router();
const Chat=require("../models/chat.js");
const wrapAsync=require("../utils/wrapAsync.js");
const { isLoggedIn } = require("../middleware");
const { actionLimiter } = require("../middleware/rateLimiter");

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

router.post("/send", isLoggedIn, actionLimiter, wrapAsync(async (req, res) => {
    console.log("BODY RECEIVED:", req.body);   

    const { listingId, sender, receiver, message } = req.body;

    const chat = new Chat({
        listingId,
        sender,
        receiver,
        message
    });

    await chat.save();

    // Check if the receiver is currently in the active socket chat room
    let receiverActiveInChat = false;
    try {
        const { getIO } = require("../config/socket");
        const io = getIO();
        const socketsInRoom = io.sockets.adapter.rooms.get(listingId);
        
        if (socketsInRoom) {
            for (const socketId of socketsInRoom) {
                const clientSocket = io.sockets.sockets.get(socketId);
                if (clientSocket && clientSocket.userId && clientSocket.userId.toString() === receiver.toString()) {
                    receiverActiveInChat = true;
                    break;
                }
            }
        }
    } catch (socketErr) {
        console.error("Error inspecting active socket rooms:", socketErr.message);
    }

    // Only create notification if receiver is not actively viewing the chat room
    if (!receiverActiveInChat) {
        const createNotification = require("../utils/createNotification");
        await createNotification({
            receiver,
            sender,
            type: "newMessage",
            message: `New message from @${req.user.username}.`,
            link: `/chat/${listingId}/${sender}`,
            metadata: {
                listingId,
                senderId: sender,
                receiverId: receiver
            }
        });
    }

    res.json({ success: true });
}));

module.exports=router;