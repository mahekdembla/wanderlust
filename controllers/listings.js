const Listing=require("../models/listing.js")
const fetch = require("node-fetch"); 
module.exports.index=async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
};

module.exports.renderNewForm=(req, res) => {
     
    res.render("listings/new.ejs");
};

module.exports.showListing=async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id).populate({path:"reviews", populate:{path:"author"}}).populate("owner");
    if(!listing){
        req.flash("error", "Listing you requested for does not exist!");
        res.redirect("/listings")
    }
    console.log(listing);
    res.render("listings/show.ejs", { listing })
};

module.exports.createListing = async (req, res, next) => {
    try {
        let url = req.file.path;
        let filename = req.file.filename;

        // Get user input location
        const locationName = req.body.listing.location;

        // Fetch coordinates from Nominatim API
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${locationName}`);
        const data = await response.json();

        let geometry = {
            type: "Point",
            coordinates: [77.2090, 28.6139] // Default: New Delhi (in case API fails)
        };

        if (data.length > 0) {
            geometry.coordinates = [parseFloat(data[0].lon), parseFloat(data[0].lat)];
        }

        // Create new listing
        const newListing = new Listing(req.body.listing);
        newListing.owner = req.user._id;
        newListing.image = { url, filename };
        newListing.geometry = geometry;

        await newListing.save();
        req.flash("success", "New Listing created");
        res.redirect("/listings");
    } catch (err) {
        console.error(err);
        req.flash("error", "Could not create listing");
        res.redirect("/listings/new");
    }
};

module.exports.renderEditForm=async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
     if(!listing){
        req.flash("error", "Listing you requested for does not exist!");
        res.redirect("/listings")
    }
    let originalImageUrl=listing.image.url;
    originalImageUrl=originalImageUrl.replace("/uploads", "/upload/w_400,h_300,q_60/");
    res.render("listings/edit.ejs", { listing , originalImageUrl});
};
module.exports.updateListing=async (req, res) => {

    let { id } = req.params;

    let listing=await Listing.findByIdAndUpdate(id, {...req.body.listing});
    if(typeof req.file !== "undefined"){
        let url=req.file.path;
        let filename=req.file.filename;
        listing.image={url, filename};
        await listing.save();
    }

    
    req.flash("success", "listing is updated");
    res.redirect(`/listings/${id}`);
};

module.exports.destroyListing=async (req, res) => {
    let { id } = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    req.flash("success", "listing is deleted");
    res.redirect("/listings");

};