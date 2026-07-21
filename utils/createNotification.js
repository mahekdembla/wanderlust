const Notification = require("../models/Notification");
const { getIO } = require("../config/socket");

/**
 * Helper utility to create a persistent notification in MongoDB
 * and emit a real-time event via Socket.io if the receiver is online.
 * 
 * @param {Object} params
 * @param {string|ObjectId} params.receiver - The User ID of the recipient.
 * @param {string|ObjectId} [params.sender] - The User ID of the sender (optional).
 * @param {string} params.type - The type of notification (e.g., bookingRequest, newMessage).
 * @param {string} params.message - Human-readable text message.
 * @param {string} [params.link] - URL to redirect the user when clicked.
 * @param {Object} [params.metadata] - Optional additional structured metadata.
 * @returns {Promise<Object>} The created Notification document.
 */
module.exports = async function createNotification({ receiver, sender, type, message, link, metadata = {} }) {
    try {
        // 1. Create and save notification to MongoDB
        const notification = new Notification({
            receiver,
            sender,
            type,
            message,
            link,
            metadata
        });

        await notification.save();

        // Populate sender details for real-time display (like username)
        const populatedNotification = await Notification.findById(notification._id)
            .populate("sender", "username");

        // 2. Emit real-time Socket.io event to the receiver's room (Room name = receiver user ID string)
        try {
            const io = getIO();
            io.to(receiver.toString()).emit("newNotification", populatedNotification);
        } catch (socketErr) {
            // Log socket errors without breaking database transactions or route execution
            console.error("Socket notification delivery failed:", socketErr.message);
        }

        return populatedNotification;
    } catch (dbErr) {
        // Log database failures and prevent application crashes
        console.error("Notification creation database error:", dbErr);
        return null;
    }
};
