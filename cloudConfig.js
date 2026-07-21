const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const fs = require("fs");
const path = require("path");

const hasCloudinary = !!(process.env.CLOUD_NAME && process.env.CLOUD_API_KEY && process.env.CLOUD_API_SECRET);

let storage;

if (hasCloudinary) {
    cloudinary.config({
        cloud_name: process.env.CLOUD_NAME,
        api_key: process.env.CLOUD_API_KEY,
        api_secret: process.env.CLOUD_API_SECRET
    });

    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: "wanderlust_DEV",
            allowedFormats: ["png", "jpg", "jpeg", "webp", "avif", "jfif"]
        }
    });
} else {
    // Fallback disk storage in public/uploads/profile
    const uploadDir = path.join(__dirname, "public/uploads/profile");
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const multer = require("multer");
    storage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => {
            const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
            cb(null, uniqueName);
        }
    });
}

module.exports = {
    cloudinary: hasCloudinary ? cloudinary : null,
    storage,
    hasCloudinary
};