document.addEventListener("DOMContentLoaded", () => {
    const ordersList = document.getElementById("ordersList");
    const statusFilter = document.getElementById("statusFilter");
    const emptyOrders = document.getElementById("emptyOrders");

    function getOrders() {
        try {
            const orders = JSON.parse(
                localStorage.getItem("garnetOrders")
            );

            return Array.isArray(orders) ? orders : [];
        } catch (error) {
            console.error("Cannot load orders:", error);
            return [];
        }
    }

    function formatPrice(price) {
        return new Intl.NumberFormat("th-TH", {
            style: "currency",
            currency: "THB",
            maximumFractionDigits: 2
        }).format(Number(price) || 0);
    }

    function formatDate(date) {
        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return "Date unavailable";
        }

        return parsedDate.toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function getStatus(status) {
        const statuses = {
            pending: "Pending",
            preparing: "Preparing",
            ready: "Ready to Serve",
            completed: "Completed",
            cancelled: "Cancelled"
        };

        return statuses[status] || "Pending";
    }

    function calculateTotal(order) {
        if (typeof order.total === "number" &&
            Number.isFinite(order.total)) {
            return order.total;
        }

        return (order.items || []).reduce((sum, item) => {
            return sum +
                (Number(item.price) || 0) *
                (Number(item.quantity) || 0);
        }, 0);
    }

    function createOrderCard(order, index) {
        const card = document.createElement("article");
        card.className = "order-card";

        const status = String(order.status || "pending").toLowerCase();
        const allowedStatuses = [
            "pending",
            "preparing",
            "ready",
            "completed",
            "cancelled"
        ];

        const safeStatus = allowedStatuses.includes(status)
            ? status
            : "pending";

        const orderNumber = order.orderNumber || `GH-${1000 + index}`;
        const items = Array.isArray(order.items) ? order.items : [];

        const header = document.createElement("div");
        header.className = "order-card-header";

        const orderInfo = document.createElement("div");

        const number = document.createElement("h2");
        number.className = "order-number";
        number.textContent = orderNumber;

        const date = document.createElement("p");
        date.className = "order-date";
        date.textContent = formatDate(order.date);

        orderInfo.append(number, date);

        const badge = document.createElement("span");
        badge.className = `status-badge status-${safeStatus}`;
        badge.textContent = getStatus(safeStatus);

        header.append(orderInfo, badge);

        const itemsContainer = document.createElement("div");
        itemsContainer.className = "order-items";

        items.forEach(item => {
            const itemRow = document.createElement("div");
            itemRow.className = "ordered-item";

            const itemName = document.createElement("span");
            itemName.className = "ordered-item-name";
            itemName.textContent = item.name || "Menu item";

            const quantity = document.createElement("span");
            quantity.className = "ordered-item-quantity";
            quantity.textContent = `× ${Number(item.quantity) || 1}`;

            const price = document.createElement("span");
            price.className = "ordered-item-price";
            price.textContent = formatPrice(
                (Number(item.price) || 0) *
                (Number(item.quantity) || 1)
            );

            itemRow.append(itemName, quantity, price);
            itemsContainer.appendChild(itemRow);
        });

        const footer = document.createElement("div");
        footer.className = "order-card-footer";

        const totalWrapper = document.createElement("div");

        const totalLabel = document.createElement("span");
        totalLabel.className = "order-total-label";
        totalLabel.textContent = "Total";

        const total = document.createElement("strong");
        total.className = "order-total";
        total.textContent = formatPrice(calculateTotal(order));

        totalWrapper.append(totalLabel, total);

        const detailsButton = document.createElement("button");
        detailsButton.className = "view-details-btn";
        detailsButton.type = "button";
        detailsButton.textContent = "View Details";
        detailsButton.setAttribute("aria-expanded", "false");

        footer.append(totalWrapper, detailsButton);

        const details = document.createElement("div");
        details.className = "order-details";
        details.hidden = true;

        const table = document.createElement("p");
        table.textContent = `Table: ${order.tableNumber || "Not specified"}`;

        const note = document.createElement("p");
        note.textContent = `Note: ${order.note || "No special requests"}`;

        details.append(table, note);

        detailsButton.addEventListener("click", () => {
            const isHidden = details.hidden;
            details.hidden = !isHidden;

            detailsButton.textContent = isHidden
                ? "Hide Details"
                : "View Details";

            detailsButton.setAttribute(
                "aria-expanded",
                String(isHidden)
            );
        });

        card.append(header, itemsContainer, footer, details);

        return card;
    }

    function renderOrders() {
        const orders = getOrders();
        const selectedStatus = statusFilter
            ? statusFilter.value
            : "all";

        const filteredOrders = orders.filter(order => {
            if (selectedStatus === "all") {
                return true;
            }

            return String(order.status || "pending").toLowerCase()
                === selectedStatus;
        });

        ordersList.replaceChildren();

        if (filteredOrders.length === 0) {
            if (emptyOrders) {
                emptyOrders.hidden = false;
                emptyOrders.querySelector("p")?.replaceChildren(
                    document.createTextNode(
                        orders.length === 0
                            ? "You haven't placed any orders yet."
                            : "No orders found for this status."
                    )
                );
            }

            return;
        }

        if (emptyOrders) {
            emptyOrders.hidden = true;
        }

        filteredOrders
            .slice()
            .reverse()
            .forEach(order => {
                const originalIndex = orders.indexOf(order);
                ordersList.appendChild(
                    createOrderCard(order, originalIndex)
                );
            });
    }

    if (statusFilter) {
        statusFilter.addEventListener("change", renderOrders);
    }

    renderOrders();

    window.addEventListener("storage", event => {
        if (event.key === "garnetOrders") {
            renderOrders();
        }
    });
});