document.addEventListener("DOMContentLoaded", () => {
    // 1. Monthly Revenue Chart (Line Chart)
    const revenueCtx = document.getElementById("revenueChart");
    if (revenueCtx) {
        const rawData = JSON.parse(revenueCtx.dataset.chartData || "[]");
        new Chart(revenueCtx, {
            type: "line",
            data: {
                labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                datasets: [{
                    label: "Monthly Revenue (₹)",
                    data: rawData,
                    borderColor: "#fe424d",
                    backgroundColor: "rgba(254, 66, 77, 0.1)",
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return "₹" + value.toLocaleString("en-IN");
                            }
                        }
                    }
                }
            }
        });
    }

    // 2. Booking Status Distribution Chart (Pie Chart)
    const statusCtx = document.getElementById("statusChart");
    if (statusCtx) {
        const rawData = JSON.parse(statusCtx.dataset.chartData || "{}");
        new Chart(statusCtx, {
            type: "pie",
            data: {
                labels: ["Pending", "Approved", "Rejected"],
                datasets: [{
                    data: [rawData.pending || 0, rawData.approved || 0, rawData.rejected || 0],
                    backgroundColor: ["#ffc107", "#198754", "#dc3545"],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "bottom"
                    }
                }
            }
        });
    }

    // 3. Bookings Per Month Chart (Bar Chart)
    const bookingsCtx = document.getElementById("bookingsChart");
    if (bookingsCtx) {
        const rawData = JSON.parse(bookingsCtx.dataset.chartData || "[]");
        new Chart(bookingsCtx, {
            type: "bar",
            data: {
                labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                datasets: [{
                    label: "Bookings Count",
                    data: rawData,
                    backgroundColor: "#0d6efd",
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }

    // 4. Ratings Distribution Chart (Horizontal Bar Chart)
    const ratingsCtx = document.getElementById("ratingsChart");
    if (ratingsCtx) {
        const rawData = JSON.parse(ratingsCtx.dataset.chartData || "[]"); // Indexes 0->1★, 4->5★
        new Chart(ratingsCtx, {
            type: "bar",
            data: {
                labels: ["1★", "2★", "3★", "4★", "5★"],
                datasets: [{
                    label: "Reviews",
                    data: rawData,
                    backgroundColor: "#ffc107",
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }
});
