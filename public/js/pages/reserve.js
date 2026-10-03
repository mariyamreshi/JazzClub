let isSubmitting = false;
let refreshAvailability;

function clearTableSelection() {
    document.querySelectorAll('.table-card.selected, .node-item.selected').forEach(table => {
        table.classList.remove('selected');
    });
    document.getElementById('selectedTableTitle').textContent = 'Select a Table';
    document.getElementById('selectedTableSub').textContent = 'Click on any available table on the floor plan above';
}

document.addEventListener('DOMContentLoaded', () => {
    const tables = document.querySelectorAll('.table-card, .node-item');
    const form = document.getElementById('reservationForm');
    const dateInput = document.getElementById('resDate');
    const timeInput = document.getElementById('resTime');
    const errorMessage = document.getElementById('reservationError');
    const confirmation = document.getElementById('confirmationCard');
    const submitButton = form.querySelector('button[type="submit"]');
    const status = document.getElementById('availabilityStatus');
    const retry = document.getElementById('retryAvailability');
    let loadedDate = null;
    let requestNumber = 0;

    function updateControls() {
        const unavailable = isSubmitting || loadedDate !== dateInput.value;
        submitButton.disabled = unavailable;
        dateInput.disabled = isSubmitting;
        timeInput.disabled = isSubmitting;
        tables.forEach(table => {
            table.setAttribute('aria-disabled', String(unavailable || table.classList.contains('booked')));
        });
    }

    refreshAvailability = async () => {
        const request = ++requestNumber;
        const date = dateInput.value;
        loadedDate = null;
        clearTableSelection();
        tables.forEach(table => table.classList.remove('booked'));
        retry.hidden = true;
        updateControls();
        if (!date) {
            status.textContent = 'Please choose a date to see available tables.';
            return;
        }
        status.textContent = 'Checking available tables...';
        try {
            const response = await fetch(`/api/reservations/availability?date=${encodeURIComponent(date)}`, { cache: 'no-store' });
            const result = await response.json();
            if (!response.ok) throw new Error('Unable to check available tables. Please try again.');
            if (result.data?.date !== date || !Array.isArray(result.data.booked_tables)) {
                throw new Error('Unable to check available tables. Please try again.');
            }
            // Ignore an old response if the user has already selected a different date.
            if (request !== requestNumber || dateInput.value !== date) return;
            const booked = new Set(result.data.booked_tables);
            tables.forEach(table => {
                if (booked.has(table.dataset.code)) table.classList.add('booked');
            });
            loadedDate = date;
            status.textContent = 'Grey tables are booked for this date. Please select an available table.';
        } catch {
            if (request !== requestNumber || dateInput.value !== date) return;
            status.textContent = 'Unable to check available tables. Please try again.';
            retry.hidden = false;
        } finally {
            if (request === requestNumber) updateControls();
        }
    };

    dateInput.addEventListener('change', () => {
        errorMessage.hidden = true;
        return refreshAvailability();
    });
    retry.addEventListener('click', () => refreshAvailability());
    tables.forEach(table => {
        table.addEventListener('click', () => {
            if (isSubmitting || loadedDate !== dateInput.value || table.classList.contains('booked')) return;
            clearTableSelection();
            table.classList.add('selected');
            document.getElementById('selectedTableTitle').textContent = `Table ${table.dataset.code}`;
            document.getElementById('selectedTableSub').textContent = `${table.dataset.zone} · ${table.dataset.seats} seats`;
        });
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (isSubmitting || loadedDate !== dateInput.value || !confirmation.classList.contains('hidden')) return;
        errorMessage.hidden = true;
        errorMessage.textContent = '';
        const selected = document.querySelector('.table-card.selected, .node-item.selected');
        if (!selected || selected.classList.contains('booked')) {
            errorMessage.textContent = 'Please pick an available table on the floor plan.';
            errorMessage.hidden = false;
            return;
        }
        const payload = {
            guest_name: document.getElementById('guestName').value.trim(),
            phone_number: document.getElementById('phoneNumber').value.trim(),
            zone: selected.dataset.zone,
            table_number: selected.dataset.code,
            date: dateInput.value,
            time: timeInput.value,
        };
        isSubmitting = true;
        updateControls();
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
                // Someone else may have booked after we loaded the floor plan.
                if (response.status === 409) await refreshAvailability();
                throw new Error(result.error?.message || 'Unable to save your reservation. Please try again.');
            }
            const saved = result.data;
            if (!saved?.id) throw new Error('The server did not confirm the reservation.');
            document.getElementById('confirmName').textContent = saved.guest_name;
            document.getElementById('confirmDate').textContent = saved.date;
            document.getElementById('confirmTime').textContent = saved.time;
            document.getElementById('confirmTable').textContent = `${saved.table_number} (${saved.zone})`;
            confirmation.classList.remove('hidden');
            clearTableSelection();
            selected.classList.add('booked');
        } catch (error) {
            errorMessage.textContent = error instanceof TypeError || error instanceof SyntaxError
                ? 'Unable to connect to the server. Please check your connection and try again.'
                : error.message;
            errorMessage.hidden = false;
        } finally {
            isSubmitting = false;
            updateControls();
            submitButton.textContent = originalLabel;
        }
    });
    return refreshAvailability();
});

function closeConfirmation() {
    document.getElementById('confirmationCard').classList.add('hidden');
    const date = document.getElementById('resDate').value;
    const time = document.getElementById('resTime').value;
    document.getElementById('reservationForm').reset();
    document.getElementById('resDate').value = date;
    document.getElementById('resTime').value = time;
    document.getElementById('reservationError').hidden = true;
    return refreshAvailability();
}
