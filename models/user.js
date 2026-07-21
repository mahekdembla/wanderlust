const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new Schema({
    email: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["User", "Host", "Admin"],
        default: "User"
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    savedListings: [{
        type: Schema.Types.ObjectId,
        ref: "Listing"
    }],
    avatar: {
        url: {
            type: String,
            default: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80"
        },
        filename: {
            type: String,
            default: "default_avatar"
        }
    },
    bio: {
        type: String,
        default: ""
    },
    phone: {
        type: String,
        default: ""
    },
    gender: {
        type: String,
        enum: ["Male", "Female", "Other", ""],
        default: ""
    },
    dob: {
        type: Date
    },
    city: {
        type: String,
        default: ""
    },
    country: {
        type: String,
        default: ""
    },
    languages: [{
        type: String
    }],
    profession: {
        type: String,
        default: ""
    },
    college: {
        type: String,
        default: ""
    },
    github: {
        type: String,
        default: ""
    },
    linkedin: {
        type: String,
        default: ""
    },
    portfolio: {
        type: String,
        default: ""
    },
    instagram: {
        type: String,
        default: ""
    },
    verification: {
        emailVerified: {
            type: Boolean,
            default: false
        },
        phoneVerified: {
            type: Boolean,
            default: false
        },
        idVerified: {
            type: Boolean,
            default: false
        },
        superhost: {
            type: Boolean,
            default: false
        }
    },
    joinedDate: {
        type: Date,
        default: Date.now
    },
    recentlyViewed: [{
        type: Schema.Types.ObjectId,
        ref: "Listing"
    }],
    searchHistory: [{
        query: String,
        city: String,
        category: String,
        timestamp: { type: Date, default: Date.now }
    }],
    preferredCities: [{
        type: String
    }],
    preferredCategories: [{
        type: String
    }],
    preferredPriceRange: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 100000 }
    },
    preferredListingType: {
        type: String,
        enum: ["stay", "pg", "both", ""],
        default: ""
    }
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);