const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
    comment: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    listing: {
        type: Schema.Types.ObjectId,
        ref: "Listing"
    },
    verifiedStay: {
        type: Boolean,
        default: false
    },
    stayDate: {
        type: Date
    },
    images: [{
        url: String,
        filename: String
    }],
    hostReply: {
        comment: {
            type: String,
            default: ""
        },
        createdAt: {
            type: Date
        }
    },
    helpfulUsers: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }],
    helpfulCount: {
        type: Number,
        default: 0
    },
    edited: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date
    }
});

// Create recommended database indexes
reviewSchema.index({ listing: 1, createdAt: -1 });
reviewSchema.index({ listing: 1, rating: -1 });
reviewSchema.index({ helpfulCount: -1 });
reviewSchema.index({ author: 1 });

module.exports = mongoose.model("Review", reviewSchema);