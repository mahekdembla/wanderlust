const express=require("express");
const router=express.Router();
const Listing=require("../models/listing");
const User=require("../models/user");

router.get("/", async (req, res) => {
  try {
    const { q, minPrice, maxPrice, sort } = req.query;

    // 1. Record search history
    if (q && q.trim().length > 0) {
      const searchHistoryEntry = {
        query: q.trim(),
        city: q.trim(),
        category: "",
        timestamp: new Date()
      };

      const categoriesList = ["Rooms", "Iconic Cities", "Mountains", "Castles", "Amazing pools", "Camping", "Farms", "Arctic", "Domes", "Boats"];
      const matchedCat = categoriesList.find(cat => cat.toLowerCase() === q.toLowerCase().trim());
      if (matchedCat) {
        searchHistoryEntry.category = matchedCat;
      }

      if (req.user) {
        try {
          const user = await User.findById(req.user._id);
          if (user) {
            user.searchHistory.push(searchHistoryEntry);
            if (user.searchHistory.length > 50) user.searchHistory.shift();

            // Save preferences
            if (matchedCat) {
              if (!user.preferredCategories.includes(matchedCat)) {
                user.preferredCategories.push(matchedCat);
              }
            } else {
              if (!user.preferredCities.includes(q.trim())) {
                user.preferredCities.push(q.trim());
              }
            }

            if (minPrice || maxPrice) {
              const min = Number(minPrice) || 0;
              const max = Number(maxPrice) || 100000;
              user.preferredPriceRange = {
                min: Math.min(min, user.preferredPriceRange?.min || min),
                max: Math.max(max, user.preferredPriceRange?.max || max)
              };
            }
            await user.save();
          }
        } catch (err) {
          console.error("Failed to save search history:", err);
        }
      } else {
        if (!req.session.searchHistory) {
          req.session.searchHistory = [];
        }
        req.session.searchHistory.push(searchHistoryEntry);
        if (req.session.searchHistory.length > 20) req.session.searchHistory.shift();
      }
    }

    let filter = {};

   
    if (q && q.trim().length > 0) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { location: { $regex: q, $options: "i" } },
        { country: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } }
      ];
    }

    
    if (!q || q.trim() === "") {
      return res.render("listings/searchResults", { listings: [] });
    }

   
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    let query = Listing.find(filter);

    
    if (sort === "priceLow") query = query.sort({ price: 1 });
    if (sort === "priceHigh") query = query.sort({ price: -1 });
    if (sort === "newest") query = query.sort({ _id: -1 });

    const listings = await query;

    res.render("listings/searchResults", { listings });

  } catch (err) {
    console.error(err);
    req.flash("error", "Search failed");
    res.redirect("/listings");
  }
});
module.exports=router;