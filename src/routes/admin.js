document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('guestSearchInput');
    const filterTabs = document.querySelectorAll('.tab-btn');
    const tableRows = document.querySelectorAll('#reservationTableBody tr');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();

            tableRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(query) ? '' : 'none';
            });
        });
    }

    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const filter = tab.dataset.filter;

            tableRows.forEach(row => {
                const statusPill = row.querySelector('.status-pill');
                if (!statusPill) return;

                const status = statusPill.textContent.toLowerCase();

                if (filter === 'all' || status === filter) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    });
    document.addEventListener('DOMContentLoaded', () => {
        const addShowBtn = document.querySelector('.btn-add-show');
        const modal = document.getElementById('addShowModal');
        const closeModalBtn = document.getElementById('closeModalBtn');
        const cancelModalBtn = document.getElementById('cancelModalBtn');
        const addShowForm = document.getElementById('addShowForm');
        const showsList = document.querySelector('.shows-list');

        if (addShowBtn && modal) {
            addShowBtn.addEventListener('click', () => {
                modal.classList.add('open');
            });
        }

        const closeModal = () => modal.classList.remove('open');

        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);

        if (addShowForm) {
            addShowForm.addEventListener('submit', (e) => {
                e.preventDefault();

                const title = document.getElementById('artistName').value;
                const genre = document.getElementById('showGenre').value.toUpperCase();
                const dateVal = document.getElementById('showDate').value;
                const time = document.getElementById('showTime').value;
                const capacity = document.getElementById('maxCapacity').value;
                const status = document.getElementById('showStatus').value;

                const parsedDate = new Date(dateVal);
                const dayNum = isNaN(parsedDate.getDate()) ? '15' : parsedDate.getDate();
                const monthStr = isNaN(parsedDate.getDate())
                    ? 'Sep'
                    : parsedDate.toLocaleString('default', { month: 'short' });

                const statusText = status === 'tonight' ? 'Tonight' : 'On sale';
                const isHighlighted = status === 'tonight' ? 'highlighted' : '';

                const newShowCard = document.createElement('div');
                newShowCard.className = `show-item-card ${isHighlighted}`;
                newShowCard.innerHTML = `
                <div class="show-date-badge">
                    <span class="date-num">${dayNum}</span>
                    <span class="date-month">${monthStr}</span>
                </div>
                <div class="show-details">
                    <div class="show-genre">${genre}</div>
                    <h2 class="show-title">${title}</h2>
                    <div class="show-meta">
                        <span>🕒 ${time}</span>
                        <span>👥 0 / ${capacity} booked</span>
                    </div>
                </div>
                <div class="show-actions">
                    <span class="status-badge ${status}">${statusText}</span>
                    <button class="btn-dots">•••</button>
                </div>
            `;

                showsList.prepend(newShowCard);
                addShowForm.reset();
                closeModal();
            });
        }
    });
});