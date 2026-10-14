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
    const params = new URLSearchParams(window.location.search);
    const requestedShowId = params.get('show_id');
    const showStatus = document.getElementById('showStatus');
    const retryShow = document.getElementById('retryShow');
    let showReady = false;
    let selectedShow = null;
    let loadingShow = false;
    let loadedSlot = null;
    let requestNumber = 0;

    function updateControls() {
        const unavailable = !showReady || isSubmitting || loadedSlot !== `${dateInput.value}|${timeInput.value}`;
        submitButton.disabled = unavailable;
        dateInput.disabled = isSubmitting || !showReady;
        dateInput.readOnly = true;
        timeInput.disabled = Boolean(selectedShow) || isSubmitting || !showReady;
        tables.forEach(table => {
            table.setAttribute('aria-disabled', String(unavailable || table.classList.contains('booked')));
        });
    }

    refreshAvailability = async () => {
        const request = ++requestNumber;
        const date = dateInput.value;
        const time = timeInput.value;
        loadedSlot = null;
        clearTableSelection();
        tables.forEach(table => table.classList.remove('booked'));
        retry.hidden = true;
        updateControls();
        if (!showReady) {
            status.textContent = 'Select a valid show before choosing a table.';
            return;
        }
        if (!date || !time) {
            status.textContent = 'Please choose a date and time to see available tables.';
            return;
        }
        status.textContent = 'Checking available tables...';
        try {
            const response = await fetch(`/api/reservations/availability?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`, { cache: 'no-store' });
            const result = await response.json();
            if (!response.ok) throw new Error('Unable to check available tables. Please try again.');
            if (result.data?.date !== date || result.data?.time !== time || !Array.isArray(result.data.booked_tables)) {
                throw new Error('Unable to check available tables. Please try again.');
            }
            if (request !== requestNumber || dateInput.value !== date || timeInput.value !== time) return;
            const booked = new Set(result.data.booked_tables);
            tables.forEach(table => {
                if (booked.has(table.dataset.code)) table.classList.add('booked');
            });
            loadedSlot = `${date}|${time}`;
            status.textContent = 'Grey tables are booked for this date and time. Please select an available table.';
        } catch {
            if (request !== requestNumber || dateInput.value !== date || timeInput.value !== time) return;
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
    timeInput.addEventListener('change', () => {
        errorMessage.hidden = true;
        return refreshAvailability();
    });
    retry.addEventListener('click', () => refreshAvailability());
    tables.forEach(table => {
        table.addEventListener('click', () => {
            if (!showReady || isSubmitting || loadedSlot !== `${dateInput.value}|${timeInput.value}` || table.classList.contains('booked')) return;
            clearTableSelection();
            table.classList.add('selected');
            document.getElementById('selectedTableTitle').textContent = `Table ${table.dataset.code}`;
            document.getElementById('selectedTableSub').textContent = `${table.dataset.zone} · ${table.dataset.seats} seats`;
        });
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!showReady || isSubmitting || loadedSlot !== `${dateInput.value}|${timeInput.value}` || !confirmation.classList.contains('hidden')) return;
        errorMessage.hidden = true;
        errorMessage.textContent = '';
        const selected = document.querySelector('.table-card.selected, .node-item.selected');
        if (!selected || selected.classList.contains('booked')) {
            errorMessage.textContent = 'Please pick an available table on the floor plan.';
            errorMessage.hidden = false;
            return;
        }
        const payload = {
            show_id: selectedShow.show_id,
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
                if (response.status === 409) await refreshAvailability();
                throw new Error(result.error?.message || 'Unable to save your reservation. Please try again.');
            }
            const saved = result.data;
            if (!saved?.id) throw new Error('The server did not confirm the reservation.');
            document.getElementById('confirmName').textContent = saved.guest_name;
            document.getElementById('confirmReservationId').textContent = `R-${saved.id}`;
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
    async function loadSelectedShow() {
        if (loadingShow) return;
        loadingShow = true;
        showReady = false;
        dateInput.value = '';
        updateControls();
        showStatus.hidden = false;
        showStatus.textContent = 'Loading show details...';
        retryShow.hidden = true;
        document.getElementById('showArtist').textContent = 'Loading show...';
        status.textContent = 'Waiting for show details...';
        try {
            let show;
            if (requestedShowId) {
                if (!/^[1-9]\d*$/.test(requestedShowId) || Number(requestedShowId) > 4294967295) {
                    throw new Error('Invalid show. Please choose a show from the shows page.');
                }
                const response = await fetch(`/api/shows/${encodeURIComponent(requestedShowId)}`, { cache: 'no-store' });
                if (!response.ok) {
                    if (response.status === 404) throw new Error('This show is no longer available. Please choose another show.');
                    throw new Error('Unable to load show details. Please try again.');
                }
                ({ data: show } = await response.json());
            } else {
                const response = await fetch('/api/shows', { cache: 'no-store' });
                if (!response.ok) throw new Error('Unable to load show details. Please try again.');
                const result = await response.json();
                show = Array.isArray(result.data) ? result.data[0] : null;
                if (!show) throw new Error('No shows are available for reservation yet.');
            }
            if (!show || (requestedShowId && String(show.show_id) !== requestedShowId) || !/^\d{4}-\d{2}-\d{2}$/.test(show.performance_date)
                || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(show.start_time)
                || typeof show.artist_name !== 'string' || typeof show.genre !== 'string') {
                throw new Error('Unable to load show details. Please try again.');
            }
            selectedShow = show;
            dateInput.value = show.performance_date;
            const [hours, minutes] = show.start_time.split(':');
            const timeLabel = `${Number(hours) % 12 || 12}:${minutes} ${Number(hours) >= 12 ? 'PM' : 'AM'}`;
            if (!Array.from(timeInput.options).some(option => option.value === show.start_time)) {
                const option = document.createElement('option');
                option.value = show.start_time;
                option.textContent = timeLabel;
                timeInput.appendChild(option);
            }
            timeInput.value = show.start_time;
            const dateLabel = new Intl.DateTimeFormat('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
            }).format(new Date(`${show.performance_date}T00:00:00Z`));
            document.getElementById('showGenre').textContent = show.genre;
            document.getElementById('showArtist').textContent = show.artist_name;
            document.getElementById('showMeta').textContent = `${dateLabel} · ${timeLabel}`;
            document.getElementById('confirmShowGenre').textContent = show.genre;
            document.getElementById('confirmShowArtist').textContent = show.artist_name;
            showReady = true;
            showStatus.hidden = true;
            await refreshAvailability();
        } catch (error) {
            document.getElementById('showArtist').textContent = 'Show unavailable';
            showStatus.textContent = error instanceof TypeError || error instanceof SyntaxError
                ? 'Unable to load show details. Please check your connection and try again.' : error.message;
            retryShow.hidden = false;
            status.textContent = 'Choose another show or retry loading its details before booking.';
        } finally {
            loadingShow = false;
            updateControls();
        }
    }

    retryShow.addEventListener('click', loadSelectedShow);
    return loadSelectedShow();
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
