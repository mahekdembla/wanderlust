const crypto = require("crypto");
const User = require("../models/user");
const AuditLog = require("../models/AuditLog");
const { generateVerificationToken, sendVerificationEmail } = require("../middleware/emailVerification");

// Strong password regex helper: 8+ chars, upper, lower, number, special char
const validatePassword = (password) => {
    const minLength = 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);
    return password.length >= minLength && hasUppercase && hasLowercase && hasNumber && hasSymbol;
};

module.exports.renderSignupForm = (req, res) => {
    res.render("users/signup.ejs");
};

module.exports.signup = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;

        if (!validatePassword(password)) {
            req.flash("error", "Password does not meet strong criteria: minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.");
            return res.redirect("/signup");
        }

        const { token, expires } = generateVerificationToken();

        const newUser = new User({
            email,
            username,
            emailVerificationToken: token,
            emailVerificationExpires: expires,
            verification: { emailVerified: true }
        });

        const registeredUser = await User.register(newUser, password);

        // Output verification details to system console log
        sendVerificationEmail(registeredUser, token);

        req.flash("success", "Welcome to Wanderlust! Account created successfully. You can now log in.");
        res.redirect("/login");
    } catch (err) {
        req.flash("error", err.message);
        res.redirect("/signup");
    }
};

module.exports.renderLoginForm = (req, res) => {
    res.render("users/login.ejs");
};

module.exports.login = async (req, res) => {
    // Log successful login to Audit Logs
    try {
        await AuditLog.create({
            event: "successful_login",
            user: req.user._id,
            ip: req.ip,
            details: `User "${req.user.username}" authenticated successfully.`
        });
    } catch (err) {
        console.error("Failed to log successful login:", err);
    }

    req.flash("success", "Welcome back to Wanderlust!");
    const redirectUrl = res.locals.redirectUrl || "/listings";
    delete req.session.redirectUrl;
    res.redirect(redirectUrl);
};

module.exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        req.flash("success", "Logged out successfully!");
        res.redirect("/listings");
    });
};

// Forgot Password Flow
module.exports.renderForgotPasswordForm = (req, res) => {
    res.render("users/forgotPassword.ejs");
};

module.exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (user) {
            const token = crypto.randomBytes(32).toString("hex");
            user.passwordResetToken = token;
            user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour expiration
            await user.save();

            // Output simulated reset link to system console
            console.log("\n==================================================");
            console.log("🔑 WANDERLUST PASSWORD RESET SIMULATOR");
            console.log(`To: ${user.email}`);
            console.log(`Reset URL: http://localhost:8080/reset-password/${token}`);
            console.log("==================================================\n");
        }

        // Always report success flash to prevent user email disclosure
        req.flash("success", "If that email is registered, a password reset link has been printed to the system console.");
        res.redirect("/login");
    } catch (err) {
        console.error("Forgot password failure:", err);
        req.flash("error", "Failed to process password recovery request.");
        res.redirect("/forgot-password");
    }
};

// Reset Password Flow
module.exports.renderResetPasswordForm = async (req, res) => {
    try {
        const { token } = req.params;
        const user = await User.findOne({
            passwordResetToken: token,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            req.flash("error", "Password reset token is invalid or has expired.");
            return res.redirect("/forgot-password");
        }

        res.render("users/resetPassword.ejs", { token });
    } catch (err) {
        console.error("Render reset password form failure:", err);
        res.redirect("/forgot-password");
    }
};

module.exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const user = await User.findOne({
            passwordResetToken: token,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            req.flash("error", "Password reset token is invalid or has expired.");
            return res.redirect("/forgot-password");
        }

        if (!validatePassword(password)) {
            req.flash("error", "Password does not meet strong criteria: minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.");
            return res.redirect(`/reset-password/${token}`);
        }

        // Apply new password through Passport methods
        await user.setPassword(password);
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        // Audit password reset event
        await AuditLog.create({
            event: "password_reset",
            user: user._id,
            ip: req.ip,
            details: `User ${user.username} successfully reset their password.`
        });

        req.flash("success", "Password has been reset successfully! You can now log in.");
        res.redirect("/login");
    } catch (err) {
        console.error("Password reset failure:", err);
        req.flash("error", "Failed to reset password.");
        res.redirect("/forgot-password");
    }
};