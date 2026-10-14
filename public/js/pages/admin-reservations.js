document.addEventListener('DOMContentLoaded', () => {
    const body = document.getElementById('reservationTableBody');
    const search = document.getElementById('guestSearchInput');
    const dateFilter = document.getElementById('reservationDateFilter');
    const clear = document.getElementById('clearReservationFilters');
    const refresh = document.getElementById('refreshReservations');
    const count = document.getElementById('reservationCount');
    const status = document.getElementById('reservationListStatus');
    const add = document.getElementById('addReservation');
    let reservations = [];
    let shows = [];
    let loaded = false;
    let loading = false;
    let saving = false;
    let editingId = null;
    let deletingId = null;
    let creating = false;
    const editDialog = document.getElementById('editReservationDialog');
    const deleteDialog = document.getElementById('deleteReservationDialog');
    const editForm = document.getElementById('editReservationForm');
    const editError = document.getElementById('editReservationError');
    const deleteError = document.getElementById('deleteReservationError');
    const editFields = {
        guest_name: document.getElementById('editGuestName'),
        phone_number: document.getElementById('editPhoneNumber'),
        show_id: document.getElementById('editShow'),
        date: document.getElementById('editDate'),
        time: document.getElementById('editTime'),
        zone: document.getElementById('editZone'),
        table_number: document.getElementById('editTable'),
    };

    function updateCount(value) {
        if (count) count.textContent = String(value);
    }

    function showLabel(show) {
        return `${show.artist_name} · ${show.performance_date} · ${show.start_time}`;
    }

    function fillShows() {
        editFields.show_id.replaceChildren(...shows.map(show => {
            const option = document.createElement('option');
            option.value = show.show_id;
            option.textContent = showLabel(show);
            return option;
        }));
    }

    function applySelectedShow() {
        const show = shows.find(item => item.show_id === Number(editFields.show_id.value));
        if (!show) return;
        editFields.date.value = show.performance_date;
        editFields.time.value = show.start_time;
    }
    const tablesByZone = {
        'Front Stage': ['F01', 'F02', 'F03', 'F04'], 'Main Floor': ['M01', 'M02', 'M03'],
        'VIP Lounge': ['VIP-1', 'VIP-2'], 'Bar Counter': ['B01', 'B02', 'B03', 'B04'],
    };

    function setSaving(value) {
        saving = value;
        for (const id of ['editReservationFields', 'cancelReservationEdit', 'saveReservationEdit', 'cancelReservationDelete', 'confirmReservationDelete']) {
            document.getElementById(id).disabled = value;
        }
    }

    function fillTables() {
        const codes = tablesByZone[editFields.zone.value] || [];
        editFields.table_number.replaceChildren(...codes.map(code => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = code;
            return option;
        }));
        editFields.table_number.value = codes[0] || '';
    }

    function openEdit(reservation) {
        if (loading || saving) return;
        creating = false;
        editingId = reservation.id;
        document.getElementById('editReservationTitle').textContent = `Edit reservation R-${editingId}`;
        document.getElementById('saveReservationEdit').textContent = 'Save changes';
        editFields.zone.value = reservation.zone;
        fillTables();
        for (const [field, input] of Object.entries(editFields)) input.value = reservation[field];
        applySelectedShow();
        editError.hidden = true;
        editDialog.showModal();
    }

    function openAdd() {
        if (loading || saving || editDialog.open || deleteDialog.open) return;
        creating = true;
        editingId = null;
        document.getElementById('editReservationTitle').textContent = 'Add reservation';
        document.getElementById('saveReservationEdit').textContent = 'Add reservation';
        for (const input of Object.values(editFields)) input.value = '';
        if (shows[0]) editFields.show_id.value = shows[0].show_id;
        applySelectedShow();
        editFields.zone.value = 'Front Stage';
        fillTables();
        editError.hidden = true;
        editDialog.showModal();
    }

    function openDelete(reservation) {
        if (loading || saving) return;
        deletingId = reservation.id;
        document.getElementById('deleteReservationSummary').textContent =
            `R-${reservation.id}: ${reservation.guest_name} — ${reservation.table_number}, ${reservation.date} at ${reservation.time}`;
        deleteError.hidden = true;
        deleteDialog.showModal();
    }

    async function writeReservation(method, id, payload) {
        const url = method === 'POST' ? '/api/reservations' : `/api/reservations/${id}`;
        const response = await fetch(url, {
            method,
            ...(payload ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) } : {}),
        });
        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error?.message || 'Unable to save this change. Please try again.');
        }
        return method === 'DELETE' ? null : (await response.json()).data;
    }

    editFields.zone.addEventListener('change', fillTables);
    editFields.show_id.addEventListener('change', applySelectedShow);
    add.addEventListener('click', openAdd);
    document.getElementById('cancelReservationEdit').addEventListener('click', () => {
        if (!saving) editDialog.close();
    });
    document.getElementById('cancelReservationDelete').addEventListener('click', () => {
        if (!saving) deleteDialog.close();
    });
    editDialog.addEventListener('close', () => { editingId = null; creating = false; });
    deleteDialog.addEventListener('close', () => { deletingId = null; });
    for (const dialog of [editDialog, deleteDialog]) {
        dialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
    }
    editForm.addEventListener('submit', async event => {
        event.preventDefault();
        if (saving || (!creating && editingId === null)) return;
        setSaving(true);
        editError.hidden = true;
        let success = false;
        try {
            const payload = Object.fromEntries(Object.entries(editFields).map(([field, input]) => [field, input.value.trim()]));
            const updated = await writeReservation(creating ? 'POST' : 'PUT', editingId, payload);
            if (creating) {
                reservations = [...reservations, updated];
                // Show the new booking even when the previous search hid this guest.
                search.value = '';
                dateFilter.value = updated.date;
            } else {
                reservations = reservations.map(row => row.id === editingId ? updated : row);
            }
            editingId = null;
            creating = false;
            editDialog.close();
            success = true;
        } catch (error) {
            editError.textContent = error.message;
            editError.hidden = false;
        } finally { setSaving(false); }
        if (success) { render(); await loadReservations(); }
    });
    document.getElementById('confirmReservationDelete').addEventListener('click', async () => {
        if (saving || deletingId === null) return;
        setSaving(true);
        deleteError.hidden = true;
        let success = false;
        try {
            await writeReservation('DELETE', deletingId);
            reservations = reservations.filter(row => row.id !== deletingId);
            deletingId = null;
            deleteDialog.close();
            success = true;
        } catch (error) {
            deleteError.textContent = error.message;
            deleteError.hidden = false;
        } finally { setSaving(false); }
        if (success) { render(); await loadReservations(); }
    });

    function cell(text, className = '') {
        const element = document.createElement('td');
        element.textContent = String(text);
        element.className = className;
        return element;
    }

    function emptyRow(message) {
        const row = document.createElement('tr');
        const messageCell = cell(message);
        messageCell.colSpan = 8;
        row.appendChild(messageCell);
        body.replaceChildren(row);
    }

    function render() {
        if (!loaded || loading) return;
        const query = search.value.trim().toLocaleLowerCase();
        const filtered = reservations.filter(reservation => {
            const searchable = [reservation.guest_name, reservation.phone_number, reservation.zone,
                reservation.table_number, `R-${reservation.id}`].join(' ').toLocaleLowerCase();
            return (!dateFilter.value || reservation.date === dateFilter.value) && searchable.includes(query);
        });
        const rows = filtered.map(reservation => {
            const row = document.createElement('tr');
            const guest = cell('');
            const name = document.createElement('div');
            name.className = 'guest-name';
            name.textContent = reservation.guest_name;
            const id = document.createElement('div');
            id.className = 'res-id';
            id.textContent = `R-${reservation.id}`;
            guest.appendChild(name);
            guest.appendChild(id);
            const [year, month, day] = reservation.date.split('-');
            [guest, cell(reservation.artist_name), cell(reservation.phone_number), cell(`${day}/${month}/${year}`), cell(reservation.time),
                cell(reservation.zone), cell(reservation.table_number, 'reservation-table-code')]
                .forEach(column => row.appendChild(column));
            const actions = cell('', 'reservation-row-actions');
            for (const [label, handler] of [['Edit', openEdit], ['Delete', openDelete]]) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = label === 'Delete' ? 'reservation-delete' : 'tab-btn';
                button.textContent = label;
                button.setAttribute('aria-label', `${label} reservation R-${reservation.id}`);
                button.addEventListener('click', () => handler(reservation));
                actions.appendChild(button);
            }
            row.appendChild(actions);
            return row;
        });
        body.replaceChildren(...rows);
        if (!rows.length) emptyRow(reservations.length ? 'No reservations match your filters.' : 'No reservations yet.');
        updateCount(reservations.length);
        status.textContent = `Showing ${filtered.length} of ${reservations.length} reservations`;
    }

    async function loadReservations() {
        if (loading || saving || creating || editingId !== null || deletingId !== null) return;
        loading = true;
        refresh.disabled = true;
        body.setAttribute('aria-busy', 'true');
        status.textContent = loaded ? 'Refreshing reservations...' : 'Loading reservations...';
        if (!loaded) {
            updateCount('—');
            emptyRow('Loading reservations...');
        }
        try {
            const [reservationResponse, showResponse] = await Promise.all([
                fetch('/api/reservations', { cache: 'no-store' }),
                fetch('/api/shows', { cache: 'no-store' }),
            ]);
            if (!reservationResponse.ok || !showResponse.ok) throw new Error('Unable to load reservations');
            const [reservationResult, showResult] = await Promise.all([reservationResponse.json(), showResponse.json()]);
            if (!Array.isArray(reservationResult.data) || !Array.isArray(showResult.data)) throw new Error('Invalid reservation list');
            reservations = reservationResult.data;
            shows = showResult.data;
            fillShows();
            loaded = true;
        } catch {
            loaded = false;
            reservations = [];
            updateCount('—');
            status.textContent = 'Unable to load reservations. Please click Refresh to try again.';
            emptyRow('Reservations could not be loaded.');
        } finally {
            loading = false;
            refresh.disabled = false;
            body.setAttribute('aria-busy', 'false');
        }
        render();
    }

    search.addEventListener('input', render);
    dateFilter.addEventListener('change', render);
    clear.addEventListener('click', () => {
        search.value = '';
        dateFilter.value = '';
        render();
    });
    refresh.addEventListener('click', loadReservations);
    // Both admin pages reload the same DB-backed list when returning from booking.
    window.addEventListener('focus', loadReservations);
    window.addEventListener('pageshow', event => {
        if (event.persisted) loadReservations();
    });
    window.setInterval(() => {
        if (!document.hidden) loadReservations();
    }, 10000);
    return loadReservations();
});
