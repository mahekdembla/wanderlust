document.addEventListener("DOMContentLoaded", () => {
    // Check if the user is authenticated (variable must be exposed in boilerplate.ejs)
    if (typeof currentUserId === "undefined" || !currentUserId) {
        return;
    }

    // Reuse existing socket or connect globally
    const socket = window.socket || io();
    window.socket = socket;

    // Join room designated for this user's notifications
    socket.emit("joinNotifications", currentUserId);

    // Initial setup of navbar bell contents
    fetchNotifications();

    // Listen for real-time notifications
    socket.on("newNotification", (notification) => {
        updateNavbarBadge(1);
        addNotificationToDropdown(notification, true);
        
        // If the user is on the dedicated /notifications page, inject it dynamically
        if (typeof appendNotificationToPage === "function") {
            appendNotificationToPage(notification);
        }
    });
});

/**
 * Fetch latest notifications and unread count to populate the navbar
 */
async function fetchNotifications() {
    try {
        // Fetch unread count
        const unreadRes = await fetch("/notifications/unread");
        const unreadData = await unreadRes.json();
        if (unreadData.success) {
            setNavbarBadge(unreadData.count);
        }

        // Fetch latest 8 notifications
        const latestRes = await fetch("/notifications/latest?limit=8");
        const latestData = await latestRes.json();
        if (latestData.success) {
            populateDropdown(latestData.notifications);
        }
    } catch (err) {
        console.error("Error fetching notifications:", err);
    }
}

/**
 * Set the navbar badge to a specific unread count
 */
function setNavbarBadge(count) {
    const badge = document.getElementById("notification-badge");
    if (!badge) return;

    if (count > 0) {
        badge.innerText = count;
        badge.classList.remove("d-none");
    } else {
        badge.innerText = "0";
        badge.classList.add("d-none");
    }
}

/**
 * Increment or decrement the navbar badge count
 */
function updateNavbarBadge(change) {
    const badge = document.getElementById("notification-badge");
    if (!badge) return;

    let count = parseInt(badge.innerText) || 0;
    count = Math.max(0, count + change);
    setNavbarBadge(count);
}

/**
 * Maps the notification type to the appropriate FontAwesome icon
 */
function getNotificationIcon(type) {
    switch (type) {
        case "bookingRequest":
            return '<i class="fa-solid fa-calendar-plus text-primary"></i>';
        case "bookingApproved":
            return '<i class="fa-solid fa-circle-check text-success"></i>';
        case "bookingRejected":
            return '<i class="fa-solid fa-circle-xmark text-danger"></i>';
        case "bookingCancelled":
            return '<i class="fa-solid fa-calendar-xmark text-warning"></i>';
        case "newMessage":
            return '<i class="fa-solid fa-comment-dots text-info"></i>';
        case "newReview":
            return '<i class="fa-solid fa-star text-warning"></i>';
        case "listingUpdated":
            return '<i class="fa-solid fa-pen-to-square text-info"></i>';
        case "listingDeleted":
            return '<i class="fa-solid fa-trash-can text-danger"></i>';
        default:
            return '<i class="fa-solid fa-bell text-secondary"></i>';
    }
}

/**
 * Populates the navbar bell dropdown items list
 */
function populateDropdown(notifications) {
    const dropdownList = document.getElementById("notification-dropdown-list");
    if (!dropdownList) return;

    // Retain only header and divider options if they exist
    const itemsToDelete = dropdownList.querySelectorAll(".dropdown-notification-item, .no-notifs");
    itemsToDelete.forEach(item => item.remove());

    if (notifications.length === 0) {
        const noNotifs = document.createElement("li");
        noNotifs.className = "dropdown-item text-center text-muted no-notifs py-3 small";
        noNotifs.innerHTML = "No new notifications";
        dropdownList.appendChild(noNotifs);
        return;
    }

    notifications.forEach(notification => {
        addNotificationToDropdown(notification, false);
    });
}

/**
 * Prepends or appends a notification into the dropdown
 */
function addNotificationToDropdown(notification, isNew = false) {
    const dropdownList = document.getElementById("notification-dropdown-list");
    if (!dropdownList) return;

    const noNotifs = dropdownList.querySelector(".no-notifs");
    if (noNotifs) noNotifs.remove();

    const li = document.createElement("li");
    li.className = `dropdown-item dropdown-notification-item border-bottom ${notification.isRead ? "" : "bg-light-unread"}`;
    li.id = `dropdown-notification-${notification._id}`;
    
    // Formatting relative time with dayjs (expects dayjs loaded globally)
    const relativeTime = typeof dayjs !== "undefined" 
        ? dayjs(notification.createdAt).fromNow() 
        : new Date(notification.createdAt).toLocaleDateString();

    const redirectLink = notification.link || "#";

    li.innerHTML = `
        <div class="d-flex align-items-center py-2" onclick="handleNotificationClick('${notification._id}', '${redirectLink}')">
            <div class="notification-icon-container me-3 fs-5">
                ${getNotificationIcon(notification.type)}
            </div>
            <div class="flex-grow-1 text-wrap" style="min-width: 200px;">
                <p class="mb-0 small text-dark ${notification.isRead ? "" : "fw-semibold"}">${notification.message}</p>
                <small class="text-muted" style="font-size: 0.75rem;">${relativeTime}</small>
            </div>
            ${notification.isRead ? "" : '<div class="unread-dot-indicator bg-primary rounded-circle ms-2" style="width: 8px; height: 8px;"></div>'}
        </div>
    `;

    // Dropdown list has headers, we insert before the last "View All" link
    const viewAllLink = document.getElementById("notification-view-all");
    if (isNew) {
        dropdownList.insertBefore(li, dropdownList.querySelector(".dropdown-notification-item") || viewAllLink);
    } else {
        dropdownList.insertBefore(li, viewAllLink);
    }

    // Keep dropdown items maxed at 8
    const dropdownItems = dropdownList.querySelectorAll(".dropdown-notification-item");
    if (dropdownItems.length > 8) {
        dropdownItems[dropdownItems.length - 1].remove();
    }
}

/**
 * Handle user clicking a notification: mark read and redirect
 */
async function handleNotificationClick(id, link) {
    try {
        await fetch(`/notifications/${id}/read`, { method: "PATCH" });
    } catch (err) {
        console.error("Failed to mark read:", err);
    }
    if (link && link !== "#") {
        window.location.href = link;
    }
}

/**
 * Marks all notifications for the user as read from the navbar dropdown
 */
async function markAllNotificationsAsRead(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    try {
        const res = await fetch("/notifications/read-all", { method: "PATCH" });
        const data = await res.json();
        if (data.success) {
            // Update dropdown UI list items
            document.querySelectorAll(".dropdown-notification-item").forEach(item => {
                item.classList.remove("bg-light-unread");
                const dot = item.querySelector(".unread-dot-indicator");
                if (dot) dot.remove();
            });

            // Update page cards if on notifications page
            const container = document.getElementById("notifications-container");
            if (container) {
                document.querySelectorAll(".notification-card").forEach(card => {
                    card.classList.remove("bg-light-unread");
                    const p = card.querySelector("p");
                    if (p) p.classList.remove("fw-semibold");
                });
                document.querySelectorAll("[id^='read-btn-']").forEach(btn => btn.remove());
            }

            setNavbarBadge(0);
        }
    } catch (err) {
        console.error("Error marking all read:", err);
    }
}
