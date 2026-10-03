let selectedTableId = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Handle table selection
    const tables = document.querySelectorAll('.table-card, .node-item');

    tables.forEach(table => {
        table.addEventListener('click', () => {
            if (table.classList.contains('booked')) return;

            // Deselect all
            tables.forEach(t => t.classList.remove('selected'));
            table.classList.add('selected');

            selectedTableId = table.dataset.id || table.dataset.code;
            const tableCode = table.dataset.code || selectedTableId;
            const seats = table.dataset.seats || '1';
            const zone = table.dataset.zone || 'Main floor';

            // Update selection banner text
            const titleEl = document.getElementById('selectedTableTitle');
            const subEl = document.getElementById('selectedTableSub');

            if (titleEl) titleEl.textContent = `Table ${tableCode}`;
            if (subEl) subEl.textContent = `${zone} · ${seats} seats`;
        });
    });

    // 2. Handle Form Submission
    const reservationForm = document.getElementById('reservationForm');
    if (reservationForm) {
        reservationForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const selectedElement = document.querySelector('.table-card.selected, .node-item.selected');
            if (!selectedElement) {
                alert('Please pick a table on the floor plan.');
                return;
            }

            const nameInput = document.getElementById('guestName');
            const phoneInput = document.getElementById('guestPhone') || document.getElementById('guestEmail');
            const dateInput = document.getElementById('resDate');
            const timeInput = document.getElementById('resTime');

            const name = nameInput ? nameInput.value : '';
            const phone = phoneInput ? phoneInput.value : '';
            const date = dateInput ? dateInput.value : '2026-12-09';
            const time = timeInput ? timeInput.value : '8:30 PM';
            const tableCode = selectedElement.dataset.code || 'B03';
            const zone = selectedElement.dataset.zone || 'Main floor';

            try {
                await fetch('/api/reservations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        phone,
                        tableId: selectedTableId,
                        date,
                        time
                    })
                });
            } catch (err) {
                console.log('Preview mode active');
            }

            // Populate confirmation modal fields
            const confirmName = document.getElementById('confirmName');
            const confirmDate = document.getElementById('confirmDate');
            const confirmTime = document.getElementById('confirmTime');
            const confirmTable = document.getElementById('confirmTable');
            const confirmationModal = document.getElementById('confirmationCard');

            if (confirmName) confirmName.textContent = name;
            if (confirmDate) confirmDate.textContent = date;
            if (confirmTime) confirmTime.textContent = time;
            if (confirmTable) confirmTable.textContent = `${tableCode} (${zone})`;

            // Show screenshot pass modal
            if (confirmationModal) {
                confirmationModal.classList.remove('hidden');
            }
        });
    }
});

// Close function: hides pass modal & clears form/selection state
function closeConfirmation() {
    const confirmationModal = document.getElementById('confirmationCard');
    if (confirmationModal) {
        confirmationModal.classList.add('hidden');
    }

    // 1. Reset input fields inside the form
    const form = document.getElementById('reservationForm');
    if (form) {
        form.reset();
    }

    // 2. Clear selected table highlight
    document.querySelectorAll('.table-card.selected, .node-item.selected').forEach(el => {
        el.classList.remove('selected');
    });

    // 3. Reset table selection state & display text
    selectedTableId = null;

    const titleEl = document.getElementById('selectedTableTitle');
    const subEl = document.getElementById('selectedTableSub');

    if (titleEl) titleEl.textContent = 'Select a Table';
    if (subEl) subEl.textContent = 'Click on any available table on the floor plan above';
}