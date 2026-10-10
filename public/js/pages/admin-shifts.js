document.addEventListener('DOMContentLoaded', () => {
    const roles = ['Floor server', 'Bartender', 'Kitchen staff', 'Reservations staff', 'Stock keeper', 'Artist coordinator'];
    const get = id => document.getElementById(id);
    const grid = get('scheduleGrid');
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
    let requestedDate = null;
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
        const { from } = weekRange();
        const days = Array.from({ length: 7 }, (_, index) => {
            const date = new Date(`${from}T12:00:00`);
            date.setDate(date.getDate() + index);
            return date;
        });
        const visible = shifts.filter(shift => {
            const searchable = [displayId(shift.shift_id), shift.employee_name, shift.artist_name, shift.role, shift.shift_date].join(' ').toLocaleLowerCase();
            return searchable.includes(query) && (roleFilter.value === 'all' || shift.role === roleFilter.value);
        });
        const header = document.createElement('div');
        header.className = 'schedule-corner';
        header.textContent = 'ROLE / TARGET';
        const children = [header];
        for (const day of days) {
            const cell = document.createElement('div');
            cell.className = 'schedule-day';
            const weekday = document.createElement('span');
            weekday.textContent = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(day).toUpperCase();
            const number = document.createElement('strong');
            number.textContent = String(day.getDate());
            const note = document.createElement('small');
            const dayKey = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
            const dayShows = shows.filter(show => show.performance_date === dayKey);
            note.textContent = dayShows.length ? dayShows.map(show => `${show.artist_name} · ${show.start_time}`).join(' / ') : 'No show listed';
            cell.append(weekday, number, note);
            children.push(cell);
        }
        const tones = ['green', 'gold', 'rose', 'blue', 'olive', 'green'];
        roles.forEach((role, roleIndex) => {
            if (roleFilter.value !== 'all' && roleFilter.value !== role) return;
            const roleCell = document.createElement('div');
            roleCell.className = 'schedule-role';
            roleCell.dataset.tone = tones[roleIndex];
            const title = document.createElement('strong');
            title.textContent = role;
            const subtitle = document.createElement('small');
            subtitle.textContent = 'Daily coverage';
            roleCell.append(title, subtitle);
            children.push(roleCell);

            days.forEach(day => {
                const date = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
                const cell = document.createElement('div');
                cell.className = 'schedule-cell';
                const assignments = visible.filter(shift => shift.role === role && shift.shift_date === date);
                const target = role === 'Floor server' && date === '2026-10-05' ? 5 : null;
                const summary = document.createElement('div');
                summary.className = 'schedule-summary';
                summary.append(document.createTextNode(target === null ? `${assignments.length} assigned · target not set` : `${assignments.length} / ${target} assigned`));
                if (target !== null && assignments.length < target) {
                    const open = document.createElement('span');
                    open.className = 'schedule-open-count';
                    open.textContent = `${target - assignments.length} open`;
                    summary.append(open);
                }
                const sub = document.createElement('small');
                sub.textContent = target === null ? 'Set a target' : `${target} person target`;
                summary.append(sub);
                const settings = document.createElement('button');
                settings.className = 'schedule-settings';
                settings.type = 'button';
                settings.textContent = '⚙';
                settings.setAttribute('aria-label', `Set ${role} target for ${date}`);
                settings.addEventListener('click', () => {
                    const value = window.prompt(`Daily target for ${role}`, target ?? '');
                    if (value !== null && (value === '' || /^\d+$/.test(value))) {
                        settings.title = value ? `${value} person target` : 'Target not set';
                        if (value) sub.textContent = `${value} person target`;
                    }
                });
                cell.append(summary, settings);

                assignments.forEach(shift => {
                    const chip = document.createElement('div');
                    chip.className = 'schedule-assignment';
                    const avatar = document.createElement('span');
                    avatar.className = 'schedule-avatar';
                    avatar.textContent = initials(shift.employee_name);
                    const info = document.createElement('span');
                    info.className = 'schedule-person';
                    const name = document.createElement('strong');
                    name.textContent = shift.employee_name;
                    const time = document.createElement('small');
                    time.textContent = `${shift.start_time}–${shift.end_time}`;
                    info.append(name, time);
                    const edit = makeButton('✎', 'schedule-edit', shift, openEdit);
                    edit.setAttribute('aria-label', `Edit shift ${displayId(shift.shift_id)}`);
                    const remove = makeButton('×', 'schedule-remove', shift, openDelete);
                    remove.setAttribute('aria-label', `Remove shift ${displayId(shift.shift_id)}`);
                    chip.append(avatar, info, edit, remove);
                    cell.append(chip);
                });
                const assign = document.createElement('button');
                assign.className = 'schedule-assign';
                assign.type = 'button';
                assign.textContent = '＋ Assign';
                assign.addEventListener('click', () => openAdd({ role, date }));
                cell.append(assign);
                children.push(cell);
            });
        });
        grid.replaceChildren(...children);
        grid.setAttribute('aria-busy', loading ? 'true' : 'false');
        get('shiftCount').textContent = String(shifts.length);
        get('scheduledEmployees').textContent = String(new Set(shifts.map(shift => shift.employee_id)).size);
        get('coveredShows').textContent = String(new Set(shifts.map(shift => shift.show_id)).size);
        get('shiftResultCount').textContent = loading ? 'Loading shifts…' : `${visible.length} of ${shifts.length} shift assignments`;
        get('shiftEmpty').hidden = visible.length > 0 || loading;
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
        grid.setAttribute('aria-busy', 'true');
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
            grid.setAttribute('aria-busy', 'false');
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

    function openAdd(prefill = {}) {
        if (saving) return;
        editingId = null;
        requestedDate = prefill.date || null;
        form.reset();
        get('shiftId').value = '';
        get('shiftDialogTitle').textContent = 'Add shift';
        formError.hidden = true;
        const { from, to } = weekRange();
        const defaultShow = shows.find(show => show.performance_date >= from && show.performance_date <= to) || shows[0];
        const matchingShow = prefill.date ? shows.find(show => show.performance_date === prefill.date) : null;
        const chosenShow = prefill.date ? matchingShow : defaultShow;
        if (chosenShow) showSelect.value = String(chosenShow.show_id);
        setShowFields({ updateTimes: true });
        if (prefill.role) fields.role.value = prefill.role;
        if (prefill.date && !matchingShow) {
            formError.textContent = `There is no show scheduled on ${formatDate(prefill.date, { month: 'long', day: 'numeric', year: 'numeric' })}. Shifts must be linked to a show, so choose a show to use its date or add a show for this day first.`;
            formError.hidden = false;
        }
        dialog.showModal();
    }

    function openEdit(shift) {
        if (saving) return;
        requestedDate = null;
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

    showSelect.addEventListener('change', () => {
        setShowFields({ updateTimes: true });
        const chosen = selectedShow();
        if (requestedDate && chosen && chosen.performance_date !== requestedDate) {
            formError.textContent = `This show is on ${formatDate(chosen.performance_date, { month: 'long', day: 'numeric', year: 'numeric' })}, so the shift date will be ${formatDate(chosen.performance_date)} instead of the day you clicked.`;
            formError.hidden = false;
        } else {
            formError.hidden = true;
        }
    });
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
