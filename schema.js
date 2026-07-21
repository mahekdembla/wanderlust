const joi = require("joi");

module.exports.listingSchema = joi.object({
    _csrf: joi.string().optional(),
    listing: joi.object({
        title: joi.string().required(),
        description: joi.string().required(),
        listingType: joi.string().valid("stay", "pg").required(),
        price: joi.number().when("listingType", {
            is: "stay",
            then: joi.required(),
            otherwise: joi.forbidden()
        }),
        pgDetails: joi.when("listingType", {
            is: "pg",
            then: joi.object({
                monthlyRent: joi.number().required(),
                deposit: joi.number().optional(),
                sharingType: joi.string().valid("single", "double", "triple").required(),
                genderAllowed: joi.string().valid("boys", "girls", "both").required(),
                foodIncluded: joi.boolean().optional()
            }).required(),
            otherwise: joi.forbidden()
        }),
        location: joi.string().required(),
        country: joi.string().required(),
        image: joi.string().allow("", null),
        images: joi.array().items(
            joi.object({
                url: joi.string().allow(""),
                filename: joi.string().allow("")
            })
        ).optional()
    }).required()
}).unknown(true);

module.exports.reviewSchema = joi.object({
    _csrf: joi.string().optional(),
    review: joi.object({
        rating: joi.number().required().min(1).max(5),
        comment: joi.string().required(),
        images: joi.array().items(
            joi.object({
                url: joi.string().allow(""),
                filename: joi.string().allow("")
            })
        ).optional()
    }).required()
}).unknown(true);

module.exports.profileSchema = joi.object({
    _csrf: joi.string().optional(),
    profile: joi.object({
        bio: joi.string().allow("").max(500),
        phone: joi.string().allow("").pattern(/^[0-9+\s-]{10,15}$/).messages({
            "string.pattern.base": "Phone number must be between 10 to 15 digits."
        }),
        gender: joi.string().valid("Male", "Female", "Other", ""),
        dob: joi.date().allow(null, "").max("now").messages({
            "date.max": "Date of Birth cannot be in the future."
        }),
        city: joi.string().allow("").max(100),
        country: joi.string().allow("").max(100),
        languages: joi.string().allow("").max(200),
        profession: joi.string().allow("").max(100),
        college: joi.string().allow("").max(150),
        github: joi.string().allow("").max(200),
        linkedin: joi.string().allow("").max(200),
        portfolio: joi.string().allow("").max(200),
        instagram: joi.string().allow("").max(200)
    }).required()
}).unknown(true);

module.exports.replySchema = joi.object({
    _csrf: joi.string().optional(),
    reply: joi.object({
        comment: joi.string().required().max(500).messages({
            "string.max": "Reply comment cannot exceed 500 characters."
        })
    }).required()
}).unknown(true);