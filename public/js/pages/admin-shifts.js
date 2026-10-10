(() => {
  const roles = [
    { name: 'Floor server', tone: 'floor' },
    { name: 'Bartender', tone: 'bar' },
    { name: 'Kitchen staff', tone: 'kitchen' },
    { name: 'Reservations staff', tone: 'reservations' },
    { name: 'Stock keeper', tone: 'stock' },
    { name: 'Artist coordinator', tone: 'artist' },
  ];
  const grid = document.getElementById('shiftGrid');
  const dialog = document.getElementById('shiftDialog');
  const targetDialog = document.getElementById('roleTargetDialog');
  const removeDialog = document.getElementById('removeShiftDialog');
  const form = document.getElementById('shiftForm');
  const targetForm = document.getElementById('roleTargetForm');
  const removeForm = document.getElementById('removeShiftForm');
  const employeeSelect = document.getElementById('shiftEmployee');
  const showSelect = document.getElementById('shiftShow');
  const roleSelect = document.getElementById('shiftRole');
  const roleFilter = document.getElementById('shiftRoleFilter');
  const dateInput = document.getElementById('shiftDate');
  const message = document.getElementById('shiftMessage');
  const targetMessage = document.getElementById('roleTargetMessage');
  let weekStart = mondayOf(new Date());
  let employees = [];
  let shows = [];
  let shifts = [];
  let roleTargets = [];
  let editingTarget = null;
  let shiftToRemove = null;

  function mondayOf(date) {
    const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
    return result;
  }
  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
  function weekRange() {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return { from: dateKey(weekStart), to: dateKey(end), end };
  }
  function showWeekTitle(end) {
    const formatter = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    const startText = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' }).format(weekStart);
    const endText = formatter.format(end);
    document.getElementById('weekTitle').textContent = `${startText}–${endText}`;
  }
  async function getJson(url) {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || 'Could not load shift data.');
    return result.data;
  }
  async function loadWeek() {
    const { from, to, end } = weekRange();
    showWeekTitle(end);
    grid.innerHTML = '<p class="shift-loading">Loading shifts…</p>';
    try {
      const [shiftData, employeeData, showData, targetData] = await Promise.all([
        getJson(`/api/employee-shifts?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
        employees.length ? Promise.resolve(employees) : getJson('/api/employees'),
        shows.length ? Promise.resolve(shows) : getJson('/api/shows'),
        getJson(`/api/employee-role-targets?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
      ]);
      shifts = shiftData;
      roleTargets = targetData;
      employees = employeeData.filter(employee => employee.status === 'Active');
      shows = showData;
      fillSelects();
      renderWeek();
    } catch (error) {
      grid.innerHTML = `<p class="shift-loading" role="alert">${escapeHtml(error.message)} Check that the database is set up and try again.</p>`;
    }
  }
  function fillSelects() {
    employeeSelect.innerHTML = '<option value="">Select employee</option>' + employees.map(employee =>
      `<option value="${employee.employee_id}">${escapeHtml(employee.employee_name)} · #${employee.employee_id}</option>`
    ).join('');
    showSelect.innerHTML = '<option value="">Select show</option>' + shows.map(show =>
      `<option value="${show.show_id}" data-date="${escapeHtml(show.performance_date)}">${escapeHtml(show.artist_name)} · ${escapeHtml(show.performance_date)} · #${show.show_id}</option>`
    ).join('');
    roleFilter.innerHTML = '<option value="all">All roles</option>' + roles.map(role =>
      `<option value="${escapeHtml(role.name)}">${escapeHtml(role.name)}</option>`
    ).join('');
  }
  function renderWeek() {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + index);
      const key = dateKey(date);
      const dayName = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date);
      const dayShows = shows.filter(show => show.performance_date === key);
      const eventLabel = dayShows.length === 0
        ? 'No show listed'
        : dayShows.length === 1
          ? dayShows[0].artist_name
          : `${dayShows.length} shows scheduled`;
      return { date, key, dayName, eventLabel, showCount: dayShows.length };
    });
    const visibleRoles = roleFilter.value === 'all'
      ? roles
      : roles.filter(role => role.name === roleFilter.value);
    const headers = days.map(day => `
      <div class="matrix-day-heading ${dateKey(new Date()) === day.key ? 'today' : ''}">
        <span>${escapeHtml(day.dayName.slice(0, 3).toUpperCase())}</span>
        <strong>${day.date.getDate()}</strong>
        <small title="${escapeHtml(day.eventLabel)}">${escapeHtml(day.eventLabel)}</small>
      </div>`).join('');

    const rows = visibleRoles.map(role => {
      const dayCells = days.map(day => {
        const dayShifts = shifts.filter(shift => shift.shift_date === day.key);
        const assigned = dayShifts.filter(shift => shift.role === role.name);
        const target = roleTargets.find(item => item.target_date === day.key && item.role === role.name);
        const targetCount = target ? Number(target.target_count) : null;
        const openCount = targetCount === null ? null : Math.max(targetCount - assigned.length, 0);
        const coverage = targetCount === null
          ? `${assigned.length} assigned · target not set`
          : targetCount === 0
            ? 'No staff needed'
            : `${assigned.length} / ${targetCount} assigned`;
        const status = openCount === null
          ? 'Set a target'
          : openCount > 0
            ? `${openCount} open`
            : assigned.length > targetCount
              ? `${assigned.length - targetCount} above target`
              : 'Covered';
        const staffChips = assigned.map(shift => `
          <article class="matrix-shift-chip ${role.tone}">
            <span class="matrix-avatar">${escapeHtml(shift.employee_name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase())}</span>
            <span class="matrix-shift-person"><strong>${escapeHtml(shift.employee_name)}</strong><small>${escapeHtml(shift.start_time)}–${escapeHtml(shift.end_time)}${day.showCount > 1 ? ` · ${escapeHtml(shift.artist_name)}` : ''}</small></span>
            <button type="button" class="matrix-remove" data-remove-shift="${shift.shift_id}" data-remove-name="${escapeHtml(shift.employee_name)}" data-remove-role="${escapeHtml(role.name)}" data-remove-date="${day.key}" aria-label="Remove ${escapeHtml(shift.employee_name)} from ${escapeHtml(role.name)} shift">×</button>
          </article>`).join('');
        return `<div class="matrix-shift-cell">
          <div class="matrix-cell-summary">
            <div><strong>${escapeHtml(coverage)}</strong><small class="${openCount > 0 ? 'needs-staff' : ''}">${escapeHtml(status)}</small></div>
            <button type="button" class="target-icon" data-target-date="${day.key}" data-target-role="${escapeHtml(role.name)}" aria-label="${target ? 'Edit' : 'Set'} ${escapeHtml(role.name)} target for ${escapeHtml(day.dayName)}">⚙</button>
          </div>
          <div class="matrix-shift-list">${staffChips}</div>
          <button type="button" class="matrix-assign" data-date="${day.key}" data-role="${escapeHtml(role.name)}">＋ Assign</button>
        </div>`;
      }).join('');
      return `<div class="matrix-role-label ${role.tone}"><strong>${escapeHtml(role.name)}</strong><small>Daily coverage</small></div>${dayCells}`;
    }).join('');
    grid.innerHTML = `<div class="shift-matrix"><div class="matrix-corner"><span>ROLE / TARGET</span></div>${headers}${rows}</div>`;
    grid.querySelectorAll('[data-date][data-role]').forEach(button => button.addEventListener('click', () => openShift(button.dataset.date, button.dataset.role)));
    grid.querySelectorAll('[data-target-date][data-target-role]').forEach(button => button.addEventListener('click', () => openRoleTarget(button.dataset.targetDate, button.dataset.targetRole)));
    grid.querySelectorAll('[data-remove-shift]').forEach(button => button.addEventListener('click', () => openRemoveShift(button.dataset)));
  }
  function openShift(date, role) {
    form.reset();
    document.getElementById('shiftId').value = 'Generated on save';
    dateInput.value = date;
    roleSelect.value = role;
    document.getElementById('shiftStart').value = '17:00';
    document.getElementById('shiftEnd').value = '23:00';
    document.getElementById('shiftDialogTitle').textContent = `Add ${role}`;
    message.textContent = '';
    const matchingShow = [...showSelect.options].find(option => option.dataset.date === date);
    if (matchingShow) showSelect.value = matchingShow.value;
    dialog.showModal();
  }
  async function saveShift(event) {
    event.preventDefault();
    const saveButton = document.getElementById('saveShift');
    saveButton.disabled = true;
    message.textContent = 'Saving shift…';
    try {
      const response = await fetch('/api/employee-shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          employee_id: employeeSelect.value,
          show_id: showSelect.value,
          role: roleSelect.value,
          shift_date: dateInput.value,
          start_time: document.getElementById('shiftStart').value,
          end_time: document.getElementById('shiftEnd').value,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'Could not save this shift.');
      document.getElementById('shiftId').value = result.data.shift_id;
      dialog.close();
      await loadWeek();
    } catch (error) {
      message.textContent = error.message;
    } finally {
      saveButton.disabled = false;
    }
  }

  function openRoleTarget(date, role) {
    editingTarget = { target_date: date, role };
    const current = roleTargets.find(item => item.target_date === date && item.role === role);
    document.getElementById('roleTargetTitle').textContent = `${role} target`;
    document.getElementById('roleTargetSummary').textContent = new Intl.DateTimeFormat(undefined, {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${date}T12:00:00Z`));
    document.getElementById('roleTargetCount').value = current ? current.target_count : 1;
    targetMessage.textContent = '';
    targetDialog.showModal();
  }

  async function saveRoleTarget(event) {
    event.preventDefault();
    if (!editingTarget) return;
    const saveButton = document.getElementById('saveRoleTarget');
    saveButton.disabled = true;
    targetMessage.textContent = 'Saving target…';
    try {
      const response = await fetch('/api/employee-role-targets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          ...editingTarget,
          target_count: Number(document.getElementById('roleTargetCount').value),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'Could not save this target.');
      targetDialog.close();
      await loadWeek();
    } catch (error) {
      targetMessage.textContent = error.message;
    } finally {
      saveButton.disabled = false;
    }
  }

  function openRemoveShift(data) {
    shiftToRemove = data.removeShift;
    document.getElementById('removeShiftSummary').textContent =
      `${data.removeName} · ${data.removeRole} · ${data.removeDate}`;
    document.getElementById('removeShiftMessage').textContent = '';
    removeDialog.showModal();
  }

  async function removeShift(event) {
    event.preventDefault();
    if (!shiftToRemove) return;
    const button = document.getElementById('confirmRemoveShift');
    button.disabled = true;
    document.getElementById('removeShiftMessage').textContent = 'Removing assignment…';
    try {
      const response = await fetch(`/api/employee-shifts/${encodeURIComponent(shiftToRemove)}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Could not remove this assignment.');
      }
      removeDialog.close();
      shiftToRemove = null;
      await loadWeek();
    } catch (error) {
      document.getElementById('removeShiftMessage').textContent = error.message;
    } finally {
      button.disabled = false;
    }
  }

  document.getElementById('createShift').addEventListener('click', () => openShift(dateKey(weekStart), roles[0].name));
  document.getElementById('previousWeek').addEventListener('click', () => { weekStart.setDate(weekStart.getDate() - 7); loadWeek(); });
  document.getElementById('nextWeek').addEventListener('click', () => { weekStart.setDate(weekStart.getDate() + 7); loadWeek(); });
  document.getElementById('currentWeek').addEventListener('click', () => { weekStart = mondayOf(new Date()); loadWeek(); });
  roleFilter.addEventListener('change', renderWeek);
  document.getElementById('closeShift').addEventListener('click', () => dialog.close());
  document.getElementById('cancelShift').addEventListener('click', () => dialog.close());
  document.getElementById('closeRoleTarget').addEventListener('click', () => targetDialog.close());
  document.getElementById('cancelRoleTarget').addEventListener('click', () => targetDialog.close());
  document.getElementById('closeRemoveShift').addEventListener('click', () => removeDialog.close());
  document.getElementById('cancelRemoveShift').addEventListener('click', () => removeDialog.close());
  form.addEventListener('submit', saveShift);
  targetForm.addEventListener('submit', saveRoleTarget);
  removeForm.addEventListener('submit', removeShift);
  loadWeek();
})();
