const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification");
const { isLoggedIn } = require("../middleware");

// All notification routes require authentication
router.use(isLoggedIn);

router.route("/")
    .get(notificationController.index)
    .delete(notificationController.destroyAll);

router.get("/latest", notificationController.getLatest);
router.get("/unread", notificationController.getUnread);

router.patch("/read-all", notificationController.markAllAsRead);
router.patch("/:id/read", notificationController.markAsRead);
router.delete("/:id", notificationController.destroy);

module.exports = router;
