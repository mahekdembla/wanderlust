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
  }
  ,
  price: Number,
  location: String,
  country: String,
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
  }
});
listingSchema.post("findOneAndDelete", async (listing) => {
  if (listing) {
    await Review.deleteMany({ reviews: { $in: listing.reviews } });
  }

});
listingSchema.index({title:"text", description:"text",location:"text", country:"text"});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;