const mongoose = require("mongoose");
const Review = require("./review.js");
const { ref } = require("joi");
const { text } = require("body-parser");
const Schema = mongoose.Schema;

const listingSchema = new Schema({
  title: {
    type: String,
    required:true,
  },
  description: String,
  image: {
    filename: {
      type: String,
      default: "listingimage"
    },
    url: {
      type: String,
      default: "https://media.cntraveler.com/photos/5d112d50c4d7bd806dbc00a4/16:9/w_2239,h_1259,c_limit/airbnb%20luxe.jpg"
    }
  },
  images: [{
    url: String,
    filename: String
  }],
  price: Number,
  location: String,
  country: String,

  listingType:{
    type:String,
    enum:["stay", "pg"],
    default:"stay"

  },
  pgDetails:{
    monthlyRent:Number,
    deposit:Number,
    sharingType:{
      type:String,
      enum:["single", "double", "triple"]
    },
    genderAllowed:{
      type:String,
      enum:["boys", "girls", "both"]
    },
    foodIncluded:Boolean
  },

  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review"
    }
  ],
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  geometry: {   
    type: {
      type: String,
      enum: ['Point'],
      required: false
    },
    coordinates: {
      type: [Number],
      required: false
    }
  },
  category: {
    type: String,
    default: "Rooms"
  },
  amenities: [{
    type: String
  }],
  viewCount: {
    type: Number,
    default: 0
  },
  trendingScore: {
    type: Number,
    default: 0
  },
  recommendationScore: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0
  }
});
listingSchema.post("findOneAndDelete", async (listing) => {
  if (listing) {
    await Review.deleteMany({ _id: { $in: listing.reviews } });
  }
});
listingSchema.index({title:"text", description:"text",location:"text", country:"text"});
listingSchema.index({ category: 1 });
listingSchema.index({ location: 1 });
listingSchema.index({ price: 1 });
listingSchema.index({ trendingScore: -1 });
listingSchema.index({ rating: -1 });

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;