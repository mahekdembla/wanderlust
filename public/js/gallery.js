/**
 * Multiple Listing Images Gallery and Fullscreen Lightbox Client Script
 */

let currentSlideIndex = 0;
let galleryUrls = [];

// Initialize gallery arrays on DOM content load
document.addEventListener("DOMContentLoaded", () => {
    // Collect all image URLs from thumbnails or the main wrapper
    const thumbnails = document.querySelectorAll(".gallery-thumbnail-img");
    if (thumbnails.length > 0) {
        thumbnails.forEach(thumb => {
            galleryUrls.push(thumb.src);
        });
    } else {
        const mainImg = document.getElementById("mainGalleryImage");
        if (mainImg) {
            galleryUrls.push(mainImg.src);
        }
    }

    // Bind Keyboard event listeners for lightbox navigation
    document.addEventListener("keydown", (e) => {
        const lightbox = document.getElementById("lightboxModal");
        if (lightbox && lightbox.style.display === "block") {
            if (e.key === "Escape") {
                closeLightbox();
            } else if (e.key === "ArrowLeft") {
                changeLightboxSlide(-1);
            } else if (e.key === "ArrowRight") {
                changeLightboxSlide(1);
            }
        }
    });
});

// Update main listing hero image on thumbnail click
function changeMainImage(url, index) {
    const mainImg = document.getElementById("mainGalleryImage");
    if (mainImg) {
        mainImg.src = url;
    }

    // Manage active state on thumbnail strip
    const thumbnails = document.querySelectorAll(".gallery-thumbnail-img");
    thumbnails.forEach((thumb, idx) => {
        if (idx === index) {
            thumb.classList.add("active");
        } else {
            thumb.classList.remove("active");
        }
    });

    currentSlideIndex = index;
}

// Open Lightbox slideshow
function openLightbox(index) {
    const lightbox = document.getElementById("lightboxModal");
    const slideImg = document.getElementById("lightboxSlideImage");
    const caption = document.getElementById("lightboxCaption");

    if (lightbox && slideImg) {
        currentSlideIndex = index || 0;
        slideImg.src = galleryUrls[currentSlideIndex];
        if (caption) {
            caption.textContent = `Photo ${currentSlideIndex + 1} of ${galleryUrls.length}`;
        }
        lightbox.style.display = "block";
        document.body.style.overflow = "hidden"; // Disable background scrolling
    }
}

// Close Lightbox slideshow
function closeLightbox() {
    const lightbox = document.getElementById("lightboxModal");
    if (lightbox) {
        lightbox.style.display = "none";
        document.body.style.overflow = "auto"; // Re-enable background scrolling
    }
}

// Slide control (direction: -1 for previous, 1 for next)
function changeLightboxSlide(direction) {
    if (galleryUrls.length <= 1) return;

    currentSlideIndex += direction;
    
    // Circular bounds check
    if (currentSlideIndex >= galleryUrls.length) {
        currentSlideIndex = 0;
    } else if (currentSlideIndex < 0) {
        currentSlideIndex = galleryUrls.length - 1;
    }

    const slideImg = document.getElementById("lightboxSlideImage");
    const caption = document.getElementById("lightboxCaption");
    if (slideImg) {
        slideImg.src = galleryUrls[currentSlideIndex];
        if (caption) {
            caption.textContent = `Photo ${currentSlideIndex + 1} of ${galleryUrls.length}`;
        }
    }
}
