const Notification = require("../models/Notification");

module.exports.index = async (req, res) => {
    try {
        const notifications = await Notification.find({ receiver: req.user._id, isDeleted: false })
            .populate("sender", "username")
            .sort({ createdAt: -1 });

        res.render("notifications/index", { notifications });
    } catch (err) {
        console.error(err);
        req.flash("error", "Failed to load notifications.");
        res.redirect("/listings");
    }
};

module.exports.getLatest = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 8;
        const notifications = await Notification.find({ receiver: req.user._id, isDeleted: false })
            .populate("sender", "username")
            .sort({ createdAt: -1 })
            .limit(limit);

        res.json({ success: true, notifications });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch notifications." });
    }
};

module.exports.getUnread = async (req, res) => {
    try {
        const count = await Notification.countDocuments({ receiver: req.user._id, isRead: false, isDeleted: false });
        res.json({ success: true, count });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch unread count." });
    }
};

module.exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findById(id);

        if (!notification) {
            return res.status(404).json({ error: "Notification not found." });
        }

        // Security check: Verify the user is the receiver of the notification
        if (!notification.receiver.equals(req.user._id)) {
            return res.status(403).json({ error: "Unauthorized access." });
        }

        notification.isRead = true;
        await notification.save();

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to mark notification as read." });
    }
};

module.exports.markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { receiver: req.user._id, isRead: false, isDeleted: false },
            { $set: { isRead: true } }
        );

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to mark all notifications as read." });
    }
};

module.exports.destroy = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findById(id);

        if (!notification) {
            return res.status(404).json({ error: "Notification not found." });
        }

        // Security check: Verify the user is the receiver of the notification
        if (!notification.receiver.equals(req.user._id)) {
            return res.status(403).json({ error: "Unauthorized access." });
        }

        // Perform soft delete
        notification.isDeleted = true;
        await notification.save();

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete notification." });
    }
};

module.exports.destroyAll = async (req, res) => {
    try {
        await Notification.updateMany(
            { receiver: req.user._id, isDeleted: false },
            { $set: { isDeleted: true } }
        );

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete all notifications." });
    }
};
