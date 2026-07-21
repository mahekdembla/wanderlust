const crypto = require("crypto");
const User = require("../models/user");

/**
 * Generate a cryptographically secure hex verification token.
 */
module.exports.generateVerificationToken = () => {
    const token = crypto.randomBytes(32).toString("hex");
    const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours expiry
    return { token, expires };
};

/**
 * Console-logged email sender. Simulates transmission of confirmation links.
 */
module.exports.sendVerificationEmail = (user, token) => {
    console.log("\n==================================================");
    console.log("📨 WANDERLUST EMAIL VERIFICATION SIMULATOR");
    console.log(`To: ${user.email}`);
    console.log(`Subject: Verify Your Wanderlust Account`);
    console.log(`Verification URL: http://localhost:8080/verify-email?token=${token}`);
    console.log("==================================================\n");
};

/**
 * Handles GET verification requests.
 */
module.exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            req.flash("error", "Verification token is missing.");
            return res.redirect("/listings");
        }

        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            req.flash("error", "Verification token is invalid or has expired.");
            return res.redirect("/listings");
        }

        // Complete user verification
        user.verification.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        req.flash("success", "Your email has been verified successfully! You can now log in.");
        res.redirect("/login");
    } catch (err) {
        console.error("Email verification failure:", err);
        req.flash("error", "An error occurred during verification.");
        res.redirect("/listings");
    }
};
