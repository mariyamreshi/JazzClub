document.addEventListener("DOMContentLoaded", () => {
    const STORAGE_KEY = "garnetOrders";

    const ordersList = document.getElementById("ordersList");
    const emptyOrders = document.getElementById("emptyOrders");
    const searchInput = document.getElementById("orderSearch");
    const statusFilter = document.getElementById("orderStatusFilter");
    const paymentFilter = document.getElementById("paymentFilter");

    const paymentModal = document.getElementById("paymentModal");
    const paymentForm = document.getElementById("paymentForm");
    const paidAmountInput = document.getElementById("paidAmountInput");
    const paymentError = document.getElementById("paymentError");

    let orders = [];
    let currentOrderIndex = null;

    const validStatuses = [
        "pending",
        "preparing",
        "ready",
        "completed",
        "cancelled"
    ];

    function loadOrders() {
        try {
            const saved = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            orders = Array.isArray(saved) ? saved : [];
        } catch (error) {
            console.error("Unable to load orders:", error);
            orders = [];
        }
    }

    function saveOrders() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
            return true;
        } catch (error) {
            console.error("Unable to save orders:", error);
            alert("Could not save changes. Please try again.");
            return false;
        }
    }

    function money(value) {
        return new Intl.NumberFormat("th-TH", {
            style: "currency",
            currency: "THB",
            maximumFractionDigits: 2
        }).format(Number(value) || 0);
    }

    function formatDate(value) {
        const date = new Date(value);

        if (!value || Number.isNaN(date.getTime())) {
            return "Date unavailable";
        }

        return date.toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function getTotal(order) {
        const items = Array.isArray(order.items) ? order.items : [];

        const calculated = items.reduce((sum, item) => {
            return sum +
                (Math.max(0, Number(item.price) || 0) *
                 Math.max(0, Number(item.quantity) || 1));
        }, 0);

        // Use item totals as the fallback if total is missing.
        return order.total != null && Number.isFinite(Number(order.total))
            ? Math.max(0, Number(order.total))
            : calculated;
    }

    function getPaid(order) {
        const total = getTotal(order);
        const raw = Number(order.paidAmount);

        // Legacy orders without payment data are treated as unpaid.
        if (order.paidAmount == null || !Number.isFinite(raw)) {
            return 0;
        }

        return Math.min(total, Math.max(0, raw));
    }

    function getPaymentStatus(order) {
        const total = getTotal(order);
        const paid = getPaid(order);

        if (paid <= 0) return "unpaid";
        if (paid < total) return "partial";
        return "paid";
    }

    function getOrderStatus(order) {
        const status = String(order.status || "pending").toLowerCase();

        return validStatuses.includes(status) ? status : "pending";
    }

    function readableStatus(status) {
        const labels = {
            pending: "Pending",
            preparing: "Preparing",
            ready: "Ready",
            completed: "Completed",
            cancelled: "Cancelled"
        };

        return labels[status] || "Pending";
    }

    function readablePayment(status) {
        const labels = {
            unpaid: "Unpaid",
            partial: "Partially Paid",
            paid: "Paid"
        };

        return labels[status] || "Unpaid";
    }

    function createElement(tag, className, text) {
        const element = document.createElement(tag);

        if (className) element.className = className;
        if (text != null) element.textContent = text;

        return element;
    }

    function createOrderCard(order, index) {
        const card = createElement("article", "admin-order-card");

        const status = getOrderStatus(order);
        const paymentStatus = getPaymentStatus(order);
        const total = getTotal(order);
        const paid = getPaid(order);
        const orderNumber = order.orderNumber || `GH-${1000 + index}`;
        const items = Array.isArray(order.items) ? order.items : [];

        // Header
        const top = createElement("div", "admin-order-top");
        const info = document.createElement("div");

        info.append(
            createElement("h3", "admin-order-number", orderNumber),
            createElement("p", "admin-order-date", formatDate(order.date))
        );

        const badges = createElement("div", "order-top-badges");

        badges.append(
            createElement(
                "span",
                `status-badge status-${status}`,
                readableStatus(status)
            ),
            createElement(
                "span",
                `payment-badge ${paymentStatus}`,
                readablePayment(paymentStatus)
            )
        );

        top.append(info, badges);

        // Table number and customer details
        const meta = createElement("div", "order-meta");

        const tableNumber = order.tableNumber
            ? String(order.tableNumber)
            : "Not specified";

        const tableItem = createElement("div", "order-meta-item");
        tableItem.append(
            createElement("strong", "", "Table: "),
            document.createTextNode(tableNumber)
        );

        const itemCount = items.reduce((sum, item) => {
            return sum + Math.max(0, Number(item.quantity) || 1);
        }, 0);

        const countItem = createElement("div", "order-meta-item");
        countItem.append(
            createElement("strong", "", "Items: "),
            document.createTextNode(String(itemCount))
        );

        meta.append(tableItem, countItem);

        // Ordered items
        const itemsHeading = createElement("h4", "items-heading", "Order Items");
        const itemList = createElement("div", "admin-order-items");

        if (items.length === 0) {
            itemList.appendChild(
                createElement("p", "order-note", "No item details available.")
            );
        } else {
            items.forEach(item => {
                const row = createElement("div", "admin-order-item");

                const quantity = Math.max(0, Number(item.quantity) || 1);
                const price = Math.max(0, Number(item.price) || 0);

                row.append(
                    createElement(
                        "span",
                        "admin-item-name",
                        item.name || "Menu item"
                    ),
                    createElement(
                        "span",
                        "admin-item-quantity",
                        `× ${quantity}`
                    ),
                    createElement(
                        "span",
                        "admin-item-price",
                        money(price * quantity)
                    )
                );

                itemList.appendChild(row);
            });
        }

        const note = createElement(
            "p",
            "order-note",
            `Customer note: ${order.note || "None"}`
        );

        // Footer
        const footer = createElement("div", "admin-order-footer");
        const totalWrapper = document.createElement("div");

        totalWrapper.append(
            createElement("span", "order-total-label", "Order Total"),
            createElement("strong", "order-total-value", money(total))
        );

        const actions = createElement("div", "order-actions");

        const statusSelect = document.createElement("select");
        statusSelect.className = "order-status-select";
        statusSelect.setAttribute(
            "aria-label",
            `Change order status for ${orderNumber}`
        );

        validStatuses.forEach(value => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = readableStatus(value);
            option.selected = value === status;
            statusSelect.appendChild(option);
        });

        statusSelect.addEventListener("change", () => {
            orders[index].status = statusSelect.value;

            if (saveOrders()) {
                renderOrders();
            }
        });

        const paymentButton = createElement(
            "button",
            "btn-payment",
            "Payment Details"
        );

        paymentButton.type = "button";
        paymentButton.addEventListener("click", () => {
            openPaymentModal(index);
        });

        actions.append(statusSelect, paymentButton);
        footer.append(totalWrapper, actions);

        card.append(top, meta, itemsHeading, itemList, note, footer);

        // Payment summary in each card
        const paymentSummary = createElement(
            "p",
            "order-note",
            `Paid: ${money(paid)} · Balance: ${money(total - paid)}`
        );

        card.insertBefore(paymentSummary, footer);

        return card;
    }

    function renderOrders() {
        const query = searchInput.value.trim().toLowerCase();
        const selectedStatus = statusFilter.value;
        const selectedPayment = paymentFilter.value;

        ordersList.replaceChildren();

        const filteredOrders = orders
            .map((order, index) => ({ order, index }))
            .filter(({ order }) => {
                const orderNumber = String(order.orderNumber || "").toLowerCase();
                const table = String(order.tableNumber || "").toLowerCase();

                const matchesSearch =
                    orderNumber.includes(query) || table.includes(query);

                const matchesStatus =
                    selectedStatus === "all" ||
                    getOrderStatus(order) === selectedStatus;

                const matchesPayment =
                    selectedPayment === "all" ||
                    getPaymentStatus(order) === selectedPayment;

                return matchesSearch && matchesStatus && matchesPayment;
            })
            .reverse();

        filteredOrders.forEach(({ order, index }) => {
            ordersList.appendChild(createOrderCard(order, index));
        });

        emptyOrders.hidden = filteredOrders.length > 0;

        if (filteredOrders.length === 0) {
            const paragraph = emptyOrders.querySelector("p");

            if (paragraph) {
                paragraph.textContent = orders.length === 0
                    ? "Customer orders will appear here after they place an order."
                    : "No orders match your search or filters.";
            }
        }

        updateStats();
    }

    function updateStats() {
        document.getElementById("totalOrders").textContent = orders.length;

        const activeCount = orders.filter(order =>
            ["pending", "preparing", "ready"].includes(getOrderStatus(order))
        ).length;

        const unpaidCount = orders.filter(order =>
            getPaymentStatus(order) !== "paid"
        ).length;

        const received = orders.reduce((sum, order) => {
            return sum + getPaid(order);
        }, 0);

        document.getElementById("activeOrders").textContent = activeCount;
        document.getElementById("unpaidOrders").textContent = unpaidCount;
        document.getElementById("paymentsReceived").textContent = money(received);
    }

    function openPaymentModal(index) {
        currentOrderIndex = index;

        const order = orders[index];
        const total = getTotal(order);
        const paid = getPaid(order);
        const status = getPaymentStatus(order);

        document.getElementById("paymentOrderInfo").textContent =
            `${order.orderNumber || `GH-${1000 + index}`} · Table ${order.tableNumber || "Not specified"}`;

        document.getElementById("paymentTotal").textContent = money(total);
        document.getElementById("paymentPaid").textContent = money(paid);
        document.getElementById("paymentBalance").textContent = money(total - paid);

        const badge = document.getElementById("paymentStatusBadge");
        badge.className = `payment-badge ${status}`;
        badge.textContent = readablePayment(status);

        paidAmountInput.max = String(total);
        paidAmountInput.value = String(paid);
        paymentError.hidden = true;

        paymentModal.hidden = false;
        paidAmountInput.focus();
    }

    function closePaymentModal() {
        paymentModal.hidden = true;
        currentOrderIndex = null;
        paymentError.hidden = true;
    }

    paidAmountInput.addEventListener("input", () => {
        if (currentOrderIndex === null) return;

        const order = orders[currentOrderIndex];
        const total = getTotal(order);
        const amount = Number(paidAmountInput.value);

        if (paidAmountInput.value === "" || !Number.isFinite(amount)) {
            document.getElementById("paymentPaid").textContent = money(0);
            document.getElementById("paymentBalance").textContent = money(total);
            return;
        }

        const paid = Math.max(0, Math.min(total, amount));

        document.getElementById("paymentPaid").textContent = money(paid);
        document.getElementById("paymentBalance").textContent = money(total - paid);
    });

    paymentForm.addEventListener("submit", event => {
        event.preventDefault();

        if (currentOrderIndex === null) return;

        const order = orders[currentOrderIndex];
        const total = getTotal(order);
        const amount = Number(paidAmountInput.value);

        if (
            paidAmountInput.value.trim() === "" ||
            !Number.isFinite(amount) ||
            amount < 0 ||
            amount > total
        ) {
            paymentError.textContent =
                `Enter an amount between ฿0 and ${money(total)}.`;
            paymentError.hidden = false;
            return;
        }

        order.paidAmount = Math.round(amount * 100) / 100;
        order.paymentStatus = getPaymentStatus(order);

        if (saveOrders()) {
            closePaymentModal();
            renderOrders();
        }
    });

    document.getElementById("closePaymentModal")
        .addEventListener("click", closePaymentModal);

    document.getElementById("cancelPaymentBtn")
        .addEventListener("click", closePaymentModal);

    paymentModal.addEventListener("click", event => {
        if (event.target === paymentModal) {
            closePaymentModal();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !paymentModal.hidden) {
            closePaymentModal();
        }
    });

    searchInput.addEventListener("input", renderOrders);
    statusFilter.addEventListener("change", renderOrders);
    paymentFilter.addEventListener("change", renderOrders);

    // Refresh if another tab changes customer orders.
    window.addEventListener("storage", event => {
        if (event.key === STORAGE_KEY) {
            loadOrders();
            renderOrders();
        }
    });

    loadOrders();
    renderOrders();
});