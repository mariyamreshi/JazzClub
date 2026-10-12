document.addEventListener('DOMContentLoaded', () => {
    const ordersList = document.getElementById('ordersList');
    const emptyOrders = document.getElementById('emptyOrders');
    const searchInput = document.getElementById('orderSearch');
    const statusFilter = document.getElementById('orderStatusFilter');
    const refreshButton = document.getElementById('refreshOrders');
    const loadStatus = document.getElementById('orderLoadStatus');
    const loadError = document.getElementById('orderLoadError');
    const paymentDialog = document.getElementById('paymentDialog');
    const paymentForm = document.getElementById('paymentForm');
    const paymentMethod = document.getElementById('paymentMethod');
    const paymentAmount = document.getElementById('paidAmountInput');
    const paymentError = document.getElementById('paymentError');
    let orders = [];
    let loading = false;
    let paying = false;
    let selectedOrder = null;

    function createElement(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }

    function money(value) {
        return `$${Number(value || 0).toFixed(2)}`;
    }

    function formatDate(value) {
        if (!value) return 'Time unavailable';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value.replace('T', ' ');
        return date.toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    }

    function readableStatus(status) {
        return { pending: 'Pending', preparing: 'Preparing', served: 'Served', paid: 'Paid' }[status] || status;
    }

    function itemCount(order) {
        return order.items.reduce((sum, item) => sum + Number(item.quantity), 0);
    }

    function createOrderCard(order) {
        const card = createElement('article', 'admin-order-card');
        card.dataset.orderId = String(order.order_id);

        const top = createElement('div', 'admin-order-top');
        const info = document.createElement('div');
        info.append(
            createElement('h3', 'admin-order-number', `Table ${order.table_id}`),
            createElement('p', 'admin-order-date', `Order #${order.order_id} · Reservation R-${order.reservation_id} · ${formatDate(order.order_time)}`)
        );
        const badges = createElement('div', 'order-top-badges');
        badges.appendChild(createElement('span', `status-badge status-${order.status}`, readableStatus(order.status)));
        top.append(info, badges);

        const meta = createElement('div', 'order-meta');
        const tableMeta = createElement('div', 'order-meta-item');
        tableMeta.append(createElement('strong', '', 'Table: '), document.createTextNode(order.table_id));
        const countMeta = createElement('div', 'order-meta-item');
        countMeta.append(createElement('strong', '', 'Items: '), document.createTextNode(String(itemCount(order))));
        meta.append(tableMeta, countMeta);

        const heading = createElement('h4', 'items-heading', 'Current table order');
        const itemList = createElement('div', 'admin-order-items');
        order.items.forEach(item => {
            const quantity = Number(item.quantity);
            const row = createElement('div', 'admin-order-item');
            row.append(
                createElement('span', 'admin-item-name', item.item_name),
                createElement('span', 'admin-item-quantity', `× ${quantity}`),
                createElement('span', 'admin-item-price', money(Number(item.price_at_time) * quantity))
            );
            itemList.appendChild(row);
        });

        const footer = createElement('div', 'admin-order-footer');
        const total = document.createElement('div');
        total.append(
            createElement('span', 'order-total-label', 'Table Order Total'),
            createElement('strong', 'order-total-value', money(order.total_amount))
        );
        footer.appendChild(total);
        if (order.payment) {
            const paid = createElement(
                'p',
                'order-payment-record',
                `Paid ${money(order.payment.amount)} by ${order.payment.payment_method} · ${formatDate(order.payment.payment_time)}`
            );
            footer.appendChild(paid);
        } else {
            const actions = createElement('div', 'order-actions');
            const paymentButton = createElement('button', 'btn-payment', 'Collect payment');
            paymentButton.type = 'button';
            paymentButton.setAttribute('aria-label', `Collect payment for table ${order.table_id}`);
            paymentButton.addEventListener('click', () => openPayment(order));
            actions.appendChild(paymentButton);
            footer.appendChild(actions);
        }
        card.append(top, meta, heading, itemList, footer);
        return card;
    }

    function updateStats() {
        const openOrders = orders.filter(order => order.status !== 'paid');
        document.getElementById('totalOrders').textContent = String(openOrders.length);
        document.getElementById('totalOrderItems').textContent = String(openOrders.reduce((sum, order) => sum + itemCount(order), 0));
        document.getElementById('paidOrders').textContent = String(orders.filter(order => order.status === 'paid').length);
        document.getElementById('totalOrderValue').textContent = money(openOrders.reduce((sum, order) => sum + Number(order.total_amount), 0));
    }

    function renderOrders() {
        const query = searchInput.value.trim().toLocaleLowerCase();
        const selectedStatus = statusFilter.value;
        const filtered = orders.filter(order => {
            const itemNames = order.items.map(item => item.item_name).join(' ');
            const searchable = `${order.order_id} ${order.table_id} ${itemNames}`.toLocaleLowerCase();
            return searchable.includes(query) && (selectedStatus === 'all' || order.status === selectedStatus);
        });

        ordersList.replaceChildren(...filtered.map(createOrderCard));
        emptyOrders.hidden = filtered.length > 0;
        if (!filtered.length) {
            emptyOrders.querySelector('p').textContent = orders.length
                ? 'No orders match your search or status filter.'
                : 'Customer orders will appear here after they order from the menu.';
        }
        loadStatus.textContent = `${filtered.length} of ${orders.length} table orders · Auto-refreshes every 3 seconds`;
        updateStats();
    }

    function setPaying(value) {
        paying = value;
        paymentMethod.disabled = value;
        paymentAmount.disabled = value;
        document.getElementById('cancelPaymentBtn').disabled = value;
        document.getElementById('closePaymentModal').disabled = value;
        const confirm = document.getElementById('confirmPayment');
        confirm.disabled = value;
        confirm.textContent = value ? 'Saving payment...' : 'Confirm payment';
    }

    function openPayment(order) {
        selectedOrder = order;
        paymentForm.reset();
        paymentError.hidden = true;
        document.getElementById('paymentOrderInfo').textContent = `Settle the complete order for table ${order.table_id}.`;
        document.getElementById('paymentTable').textContent = order.table_id;
        document.getElementById('paymentOrderId').textContent = `#${order.order_id}`;
        document.getElementById('paymentTotal').textContent = money(order.total_amount);
        paymentAmount.value = Number(order.total_amount).toFixed(2);
        paymentDialog.showModal();
    }

    function closePayment() {
        if (!paying) {
            paymentDialog.close();
            selectedOrder = null;
        }
    }

    async function savePayment() {
        const response = await fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order_id: selectedOrder.order_id,
                payment_method: paymentMethod.value,
                amount: paymentAmount.value,
            }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error?.message || 'Unable to save payment.');
        return result.data;
    }

    async function loadOrders({ quiet = false } = {}) {
        if (loading || document.hidden || paymentDialog.open) return;
        loading = true;
        refreshButton.disabled = true;
        if (!quiet) loadStatus.textContent = 'Loading orders...';
        try {
            const response = await fetch('/api/orders', { cache: 'no-store' });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !Array.isArray(result.data)) throw new Error('Unable to load orders.');
            orders = result.data;
            loadError.hidden = true;
            renderOrders();
        } catch (error) {
            loadError.textContent = `${error.message} Click Refresh to try again.`;
            loadError.hidden = false;
            if (!orders.length) {
                ordersList.replaceChildren();
                emptyOrders.hidden = false;
                emptyOrders.querySelector('p').textContent = 'Orders could not be loaded from the database.';
            }
        } finally {
            loading = false;
            refreshButton.disabled = false;
        }
    }

    searchInput.addEventListener('input', renderOrders);
    statusFilter.addEventListener('change', renderOrders);
    refreshButton.addEventListener('click', () => loadOrders());
    paymentForm.addEventListener('submit', async event => {
        event.preventDefault();
        if (paying || !selectedOrder || !paymentForm.reportValidity()) return;
        paymentError.hidden = true;
        setPaying(true);
        try {
            const saved = await savePayment();
            const tableId = selectedOrder.table_id;
            paymentDialog.close();
            selectedOrder = null;
            await loadOrders({ quiet: true });
            loadStatus.textContent = `Payment #${saved.payment_id} for table ${tableId} was saved successfully.`;
        } catch (error) {
            paymentError.textContent = error.message;
            paymentError.hidden = false;
        } finally {
            setPaying(false);
        }
    });
    document.getElementById('closePaymentModal').addEventListener('click', closePayment);
    document.getElementById('cancelPaymentBtn').addEventListener('click', closePayment);
    paymentDialog.addEventListener('cancel', event => {
        if (paying) event.preventDefault();
    });
    window.addEventListener('focus', () => loadOrders({ quiet: true }));
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) loadOrders({ quiet: true });
    });
    setInterval(() => loadOrders({ quiet: true }), 3000);
    loadOrders();
});
