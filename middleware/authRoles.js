/**
 * Role-Based Access Control (RBAC) middleware
 */
module.exports.requireRole = (allowedRoles = []) => {
    return (req, res, next) => {
        if (!req.isAuthenticated()) {
            req.flash("error", "You must be logged in first.");
            return res.redirect("/login");
        }

        const userRole = req.user.role || "User";

        if (!allowedRoles.includes(userRole)) {
            req.flash("error", "Access Denied: You do not have the required permissions for this action.");
            return res.redirect("/listings");
        }

        next();
    };
};
