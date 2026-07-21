const { number, ref, required } = require("joi");
const mongoose=require("mongoose");
const Schema =mongoose.Schema;

const chatSchema=new Schema({
    listingId:{
        type:Schema.Types.ObjectId,
        ref:"Listing",
        required:true
    },
    sender:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    receiver:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    message:{
        type:String,
        required:true
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    seen:{
        type:Boolean,
        default:false,
    },
    lastSeen:{
        type:Date,
        default:Date.now
    }

});

chatSchema.index({ listingId: 1, createdAt: -1 });
chatSchema.index({ sender: 1, receiver: 1 });

module.exports=mongoose.model("Chat", chatSchema)