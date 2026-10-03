let isSubmitting = false;

document.addEventListener('DOMContentLoaded', () => {
    const tables = document.querySelectorAll('.table-card, .node-item');
    tables.forEach(table => {
        table.addEventListener('click', () => {
            if (isSubmitting || table.classList.contains('booked')) return;

            tables.forEach(t => t.classList.remove('selected'));
            table.classList.add('selected');
            document.getElementById('selectedTableTitle').textContent = `Table ${table.dataset.code}`;
            document.getElementById('selectedTableSub').textContent = `${table.dataset.zone} · ${table.dataset.seats} seats`;
        });
    });

    const form = document.getElementById('reservationForm');
    const errorMessage = document.getElementById('reservationError');
    const confirmation = document.getElementById('confirmationCard');
    const submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (isSubmitting || !confirmation.classList.contains('hidden')) return;

        errorMessage.hidden = true;
        errorMessage.textContent = '';
        const selected = document.querySelector('.table-card.selected, .node-item.selected');
        if (!selected) {
            errorMessage.textContent = 'Please pick a table on the floor plan.';
            errorMessage.hidden = false;
            return;
        }

        const payload = {
            guest_name: document.getElementById('guestName').value.trim(),
            phone_number: document.getElementById('phoneNumber').value.trim(),
            zone: selected.dataset.zone,
            table_number: selected.dataset.code,
            date: document.getElementById('resDate').value,
            time: document.getElementById('resTime').value,
        };

        isSubmitting = true;
        submitButton.disabled = true;
        const originalLabel = submitButton.textContent;
        submitButton.textContent = 'Saving reservation...';

        try {
            const response = await fetch('/api/reservations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error?.message || 'Unable to save your reservation. Please try again.');
            }
            const saved = result.data;
            if (!saved?.id) throw new Error('The server did not confirm the reservation.');

            document.getElementById('confirmName').textContent = saved.guest_name;
            document.getElementById('confirmDate').textContent = saved.date;
            document.getElementById('confirmTime').textContent = saved.time;
            document.getElementById('confirmTable').textContent = `${saved.table_number} (${saved.zone})`;
            confirmation.classList.remove('hidden');
        } catch (error) {
            errorMessage.textContent = error instanceof TypeError || error instanceof SyntaxError
                ? 'Unable to connect to the server. Please check your connection and try again.'
                : error.message;
            errorMessage.hidden = false;
        } finally {
            isSubmitting = false;
            submitButton.disabled = false;
            submitButton.textContent = originalLabel;
        }
    });
});

function closeConfirmation() {
    document.getElementById('confirmationCard').classList.add('hidden');
    document.getElementById('reservationForm').reset();
    document.getElementById('reservationError').hidden = true;
    document.querySelectorAll('.table-card.selected, .node-item.selected').forEach(table => {
        table.classList.remove('selected');
    });
    document.getElementById('selectedTableTitle').textContent = 'Select a Table';
    document.getElementById('selectedTableSub').textContent = 'Click on any available table on the floor plan above';
}
