const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
    receiver: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    sender: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: false
    },
    type: {
        type: String,
        enum: [
            "bookingRequest",
            "bookingApproved",
            "bookingRejected",
            "bookingCancelled",
            "newMessage",
            "newReview",
            "listingUpdated",
            "listingDeleted",
            "system"
        ],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    link: {
        type: String,
        required: false
    },
    metadata: {
        type: Schema.Types.Mixed,
        default: {}
    },
    isRead: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create optimal database indexes for fast notifications query and sorting
notificationSchema.index({ receiver: 1 });
notificationSchema.index({ receiver: 1, isRead: 1 });
notificationSchema.index({ receiver: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
