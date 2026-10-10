document.addEventListener('DOMContentLoaded', () => {
    const roles = ['Floor server', 'Bartender', 'Kitchen staff', 'Reservations staff', 'Stock keeper', 'Artist coordinator'];
    const get = id => document.getElementById(id);
    const rows = get('shiftRows');
    const search = get('shiftSearch');
    const roleFilter = get('shiftRoleFilter');
    const dialog = get('shiftDialog');
    const deleteDialog = get('deleteShiftDialog');
    const form = get('shiftForm');
    const formError = get('shiftFormError');
    const deleteError = get('deleteShiftError');
    const employeeSelect = get('shiftEmployee');
    const showSelect = get('shiftShow');
    const fields = {
        employee_id: employeeSelect,
        show_id: showSelect,
        role: get('shiftRole'),
        shift_date: get('shiftDate'),
        start_time: get('shiftStart'),
        end_time: get('shiftEnd'),
    };
    let weekStart = mondayOf(new Date());
    let shifts = [];
    let employees = [];
    let shows = [];
    let editingId = null;
    let deletingId = null;
    let loading = false;
    let saving = false;

    function mondayOf(date) {
        const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
        return result;
    }

    function dateKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function weekRange() {
        const end = new Date(weekStart);
        end.setDate(end.getDate() + 6);
        return { from: dateKey(weekStart), to: dateKey(end), end };
    }

    function formatDate(value, options = { weekday: 'short', day: 'numeric', month: 'short' }) {
        return new Intl.DateTimeFormat(undefined, { ...options, timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
    }

    const displayId = id => `S${String(id).padStart(3, '0')}`;
    const initials = name => name.split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase();

    async function request(path, options = {}) {
        const response = await fetch(path, options);
        if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            throw new Error(result.error?.message || 'Unable to complete this request.');
        }
        return response.status === 204 ? null : (await response.json()).data;
    }

    function fillSelects() {
        const activeEmployees = employees.filter(employee => employee.status === 'Active');
        const option = (value, label) => {
            const element = document.createElement('option');
            element.value = value;
            element.textContent = label;
            return element;
        };
        employeeSelect.replaceChildren(
            option('', 'Select employee'),
            ...activeEmployees.map(employee => option(employee.employee_id, `${employee.employee_name} · E${String(employee.employee_id).padStart(3, '0')}`))
        );
        showSelect.replaceChildren(
            option('', 'Select show'),
            ...shows.map(show => option(show.show_id, `${show.artist_name} · ${show.performance_date} · ${show.start_time}`))
        );
        roleFilter.replaceChildren(option('all', 'All roles'), ...roles.map(role => option(role, role)));
    }

    function makeButton(label, className, shift, handler) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.textContent = label;
        button.setAttribute('aria-label', `${label} shift ${displayId(shift.shift_id)}`);
        button.addEventListener('click', () => handler(shift));
        return button;
    }

    function render() {
        const query = search.value.trim().toLocaleLowerCase();
        const filtered = shifts.filter(shift => {
            const searchable = [displayId(shift.shift_id), shift.employee_name, shift.artist_name, shift.role, shift.shift_date].join(' ').toLocaleLowerCase();
            return searchable.includes(query) && (roleFilter.value === 'all' || shift.role === roleFilter.value);
        });

        rows.replaceChildren(...filtered.map(shift => {
            const row = document.createElement('tr');
            const id = document.createElement('td');
            id.className = 'shift-id';
            id.textContent = displayId(shift.shift_id);

            const employee = document.createElement('td');
            const person = document.createElement('div');
            person.className = 'employee-person';
            const avatar = document.createElement('span');
            avatar.className = `employee-avatar tone-${shift.employee_id % 4}`;
            avatar.textContent = initials(shift.employee_name);
            const personText = document.createElement('span');
            personText.className = 'shift-person';
            const employeeName = document.createElement('strong');
            employeeName.textContent = shift.employee_name;
            const employeeId = document.createElement('small');
            employeeId.textContent = `Employee E${String(shift.employee_id).padStart(3, '0')}`;
            personText.append(employeeName, employeeId);
            person.append(avatar, personText);
            employee.appendChild(person);

            const show = document.createElement('td');
            const showText = document.createElement('div');
            showText.className = 'shift-show';
            const artist = document.createElement('strong');
            artist.textContent = shift.artist_name;
            const showMeta = document.createElement('small');
            showMeta.textContent = `Show #${shift.show_id} · ${shift.show_start_time}–${shift.show_end_time}`;
            showText.append(artist, showMeta);
            show.appendChild(showText);

            const role = document.createElement('td');
            const rolePill = document.createElement('span');
            rolePill.className = 'shift-role-pill';
            rolePill.textContent = shift.role;
            role.appendChild(rolePill);

            const when = document.createElement('td');
            const whenText = document.createElement('div');
            whenText.className = 'shift-when';
            const date = document.createElement('strong');
            date.textContent = formatDate(shift.shift_date);
            const time = document.createElement('small');
            time.textContent = `${shift.start_time}–${shift.end_time}`;
            whenText.append(date, time);
            when.appendChild(whenText);

            const actions = document.createElement('td');
            actions.className = 'employee-row-actions';
            actions.append(
                makeButton('Edit', 'employee-secondary employee-row-button', shift, openEdit),
                makeButton('Delete', 'employee-delete employee-row-button', shift, openDelete)
            );
            row.append(id, employee, show, role, when, actions);
            return row;
        }));

        get('shiftCount').textContent = String(shifts.length);
        get('scheduledEmployees').textContent = String(new Set(shifts.map(shift => shift.employee_id)).size);
        get('coveredShows').textContent = String(new Set(shifts.map(shift => shift.show_id)).size);
        get('shiftResultCount').textContent = loading ? 'Loading shifts…' : `${filtered.length} of ${shifts.length} shift assignments`;
        get('shiftEmpty').hidden = filtered.length > 0 || loading;
    }

    function showWeekTitle(end) {
        const startText = formatDate(dateKey(weekStart), { month: 'long', day: 'numeric' });
        const endText = formatDate(dateKey(end), { month: 'long', day: 'numeric', year: 'numeric' });
        get('weekTitle').textContent = `${startText}–${endText}`;
    }

    async function loadShifts() {
        if (loading || saving) return;
        loading = true;
        get('refreshShifts').disabled = true;
        get('shiftLoadError').hidden = true;
        rows.setAttribute('aria-busy', 'true');
        const { from, to, end } = weekRange();
        showWeekTitle(end);
        render();
        try {
            [shifts, employees, shows] = await Promise.all([
                request(`/api/employee-shifts?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { cache: 'no-store' }),
                request('/api/employees', { cache: 'no-store' }),
                request('/api/shows', { cache: 'no-store' }),
            ]);
            fillSelects();
        } catch (error) {
            shifts = [];
            get('shiftLoadError').textContent = error.message;
            get('shiftLoadError').hidden = false;
        } finally {
            loading = false;
            get('refreshShifts').disabled = false;
            rows.setAttribute('aria-busy', 'false');
            render();
        }
    }

    function selectedShow() {
        const id = Number(showSelect.value);
        return shows.find(show => show.show_id === id);
    }

    function setShowFields({ updateTimes = false } = {}) {
        const show = selectedShow();
        fields.shift_date.value = show?.performance_date || '';
        if (show && updateTimes) {
            fields.start_time.value = show.start_time;
            fields.end_time.value = show.end_time;
        }
    }

    function openAdd() {
        if (saving) return;
        editingId = null;
        form.reset();
        get('shiftId').value = '';
        get('shiftDialogTitle').textContent = 'Add shift';
        formError.hidden = true;
        const { from, to } = weekRange();
        const defaultShow = shows.find(show => show.performance_date >= from && show.performance_date <= to) || shows[0];
        if (defaultShow) showSelect.value = String(defaultShow.show_id);
        setShowFields({ updateTimes: true });
        dialog.showModal();
    }

    function openEdit(shift) {
        if (saving) return;
        editingId = shift.shift_id;
        get('shiftId').value = displayId(shift.shift_id);
        get('shiftDialogTitle').textContent = `Edit shift ${displayId(shift.shift_id)}`;
        for (const [name, input] of Object.entries(fields)) input.value = shift[name];
        formError.hidden = true;
        dialog.showModal();
    }

    function openDelete(shift) {
        if (saving) return;
        deletingId = shift.shift_id;
        get('deleteShiftSummary').textContent = `${displayId(shift.shift_id)} · ${shift.employee_name} · ${shift.role} · ${shift.shift_date}`;
        deleteError.hidden = true;
        deleteDialog.showModal();
    }

    function setSaving(value) {
        saving = value;
        for (const id of ['saveShift', 'cancelShift', 'closeShift', 'cancelShiftDelete', 'confirmShiftDelete']) get(id).disabled = value;
        for (const input of Object.values(fields)) input.disabled = value;
        get('saveShift').textContent = value ? 'Saving…' : 'Save shift';
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (saving || !form.reportValidity()) return;
        setSaving(true);
        formError.hidden = true;
        try {
            const payload = Object.fromEntries(Object.entries(fields).map(([name, input]) => [name, input.value]));
            const method = editingId === null ? 'POST' : 'PUT';
            const path = editingId === null ? '/api/employee-shifts' : `/api/employee-shifts/${editingId}`;
            await request(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            dialog.close();
            setSaving(false);
            await loadShifts();
        } catch (error) {
            formError.textContent = error.message;
            formError.hidden = false;
        } finally {
            setSaving(false);
        }
    });

    get('confirmShiftDelete').addEventListener('click', async () => {
        if (saving || deletingId === null) return;
        setSaving(true);
        deleteError.hidden = true;
        try {
            await request(`/api/employee-shifts/${deletingId}`, { method: 'DELETE' });
            deleteDialog.close();
            setSaving(false);
            await loadShifts();
        } catch (error) {
            deleteError.textContent = error.message;
            deleteError.hidden = false;
        } finally {
            setSaving(false);
        }
    });

    showSelect.addEventListener('change', () => setShowFields());
    for (const input of [search, roleFilter]) {
        input.addEventListener('input', render);
        input.addEventListener('change', render);
    }
    get('addShift').addEventListener('click', openAdd);
    get('refreshShifts').addEventListener('click', loadShifts);
    get('previousWeek').addEventListener('click', () => { weekStart.setDate(weekStart.getDate() - 7); loadShifts(); });
    get('nextWeek').addEventListener('click', () => { weekStart.setDate(weekStart.getDate() + 7); loadShifts(); });
    get('currentWeek').addEventListener('click', () => { weekStart = mondayOf(new Date()); loadShifts(); });
    get('closeShift').addEventListener('click', () => { if (!saving) dialog.close(); });
    get('cancelShift').addEventListener('click', () => { if (!saving) dialog.close(); });
    get('cancelShiftDelete').addEventListener('click', () => { if (!saving) deleteDialog.close(); });
    dialog.addEventListener('close', () => { editingId = null; });
    deleteDialog.addEventListener('close', () => { deletingId = null; });
    for (const modal of [dialog, deleteDialog]) modal.addEventListener('cancel', event => { if (saving) event.preventDefault(); });

    loadShifts();
});
