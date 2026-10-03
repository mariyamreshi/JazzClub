document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('guestSearchInput');
    const filterTabs = document.querySelectorAll('.tab-btn');
    const tableRows = document.querySelectorAll('#reservationTableBody tr');

    // 1. Table Search Filtering
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();

            tableRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(query) ? '' : 'none';
            });
        });
    }

    // 2. Status Tab Filtering
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
});