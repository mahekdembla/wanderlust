const express=require("express");
const router=express.Router();
const Listing=require("../models/listing");

router.get("/", async (req, res) => {
  try {
    const { q, minPrice, maxPrice, sort } = req.query;

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