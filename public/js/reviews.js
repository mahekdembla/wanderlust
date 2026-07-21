/**
 * Advanced Reviews Client Coordinator Script
 */

// Toggle Helpful Likes via AJAX PATCH
async function toggleHelpfulVote(reviewId) {
    try {
        const listingId = window.location.pathname.split("/")[2];
        const response = await fetch(`/listings/${listingId}/reviews/${reviewId}/helpful`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            const errData = await response.json();
            alert(errData.error || "Failed to update vote.");
            return;
        }

        const data = await response.json();
        const countSpan = document.getElementById(`helpful-val-${reviewId}`);
        const btn = countSpan.closest(".helpful-btn");

        if (countSpan && btn) {
            countSpan.textContent = data.helpfulCount;
            if (data.isHelpful) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        }
    } catch (err) {
        console.error("Helpful vote error:", err);
        alert("Something went wrong. Please try again.");
    }
}

// Delete single review image via AJAX
async function deleteSingleReviewImage(reviewId, imageId) {
    if (!confirm("Are you sure you want to delete this photo?")) return;

    try {
        const response = await fetch(`/listings/reviews/${reviewId}/image/${imageId}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            alert("Failed to delete photo.");
            return;
        }

        const wrapper = document.getElementById(`review-img-wrapper-${imageId}`);
        if (wrapper) {
            wrapper.style.transition = "opacity 0.3s, transform 0.3s";
            wrapper.style.opacity = "0";
            wrapper.style.transform = "scale(0.8)";
            setTimeout(() => wrapper.remove(), 300);
        }
    } catch (err) {
        console.error("Delete review photo error:", err);
    }
}

// Open Edit Review Modal and populate fields
function openEditReviewModal(reviewId, rating, comment) {
    const listingId = window.location.pathname.split("/")[2];
    const modalEl = document.getElementById("editReviewModal");
    const form = document.getElementById("editReviewForm");
    const commentText = document.getElementById("editReviewCommentText");
    const ratingSelect = document.getElementById("editReviewRatingSelect");

    if (form && commentText && ratingSelect) {
        form.action = `/listings/${listingId}/reviews/${reviewId}?_method=PUT`;
        commentText.value = comment;
        ratingSelect.value = rating;

        const bootstrapModal = new bootstrap.Modal(modalEl);
        bootstrapModal.show();
    }
}

// Toggle Inline Host Reply Form
function toggleReplyForm(reviewId) {
    const container = document.getElementById(`reply-form-container-${reviewId}`);
    if (container) {
        container.classList.toggle("d-none");
        const textarea = container.querySelector("textarea");
        if (textarea) textarea.focus();
    }
}

// Toggle Host Reply Edit Form
function toggleEditReplyForm(reviewId, currentComment) {
    const container = document.getElementById(`reply-form-container-${reviewId}`);
    if (container) {
        container.classList.toggle("d-none");
        const form = document.getElementById(`reply-action-form-${reviewId}`);
        const textarea = container.querySelector("textarea");
        if (form && textarea) {
            const listingId = window.location.pathname.split("/")[2];
            form.action = `/listings/${listingId}/reviews/${reviewId}/reply?_method=PUT`;
            textarea.value = currentComment;
            textarea.focus();
        }
    }
}

// Client Side Review Image Lightbox
function openReviewImageLightbox(url) {
    const lightboxModal = document.getElementById("lightboxModal");
    const slideImg = document.getElementById("lightboxSlideImage");
    const caption = document.getElementById("lightboxCaption");

    if (lightboxModal && slideImg) {
        slideImg.src = url;
        if (caption) caption.textContent = "Review photo submission";
        lightboxModal.style.display = "block";
    }
}

// Client Side Sorting
function sortReviews() {
    const container = document.getElementById("reviews-list-container");
    if (!container) return;

    const cards = Array.from(container.children);
    const sortVal = document.getElementById("reviewSortSelect").value;

    cards.sort((a, b) => {
        if (sortVal === "newest") {
            return new Date(b.dataset.date) - new Date(a.dataset.date);
        } else if (sortVal === "oldest") {
            return new Date(a.dataset.date) - new Date(b.dataset.date);
        } else if (sortVal === "highest") {
            return parseInt(b.dataset.rating) - parseInt(a.dataset.rating);
        } else if (sortVal === "lowest") {
            return parseInt(a.dataset.rating) - parseInt(b.dataset.rating);
        } else if (sortVal === "helpful") {
            return parseInt(b.dataset.helpful) - parseInt(a.dataset.helpful);
        }
        return 0;
    });

    // Re-append sorted elements
    container.innerHTML = "";
    cards.forEach(card => container.appendChild(card));
}

// Client Side Filtering
function filterReviews() {
    const container = document.getElementById("reviews-list-container");
    if (!container) return;

    const cards = Array.from(container.children);
    const filterVal = document.getElementById("reviewFilterSelect").value;

    cards.forEach(card => {
        if (filterVal === "all") {
            card.style.display = "block";
        } else if (filterVal === "verified") {
            card.style.display = card.dataset.verified === "true" ? "block" : "none";
        } else if (filterVal === "photos") {
            card.style.display = card.dataset.photos === "true" ? "block" : "none";
        } else {
            // Numeric rating filter (e.g. 5, 4, 3, 2, 1)
            card.style.display = card.dataset.rating === filterVal ? "block" : "none";
        }
    });
}
