const express = require("express");
const router = express.Router();
const hostController = require("../controllers/host");
const { isLoggedIn, isHost } = require("../middleware");

router.get("/dashboard", isLoggedIn, isHost, hostController.dashboard);

module.exports = router;
