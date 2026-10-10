document.addEventListener('DOMContentLoaded', () => {
    const getElement = id => document.getElementById(id);
    const rows = getElement('employeeRows');
    const search = getElement('employeeSearch');
    const typeFilter = getElement('typeFilter');
    const statusFilter = getElement('statusFilter');
    const refresh = getElement('refreshEmployees');
    const emptyState = getElement('emptyState');
    const loadError = getElement('employeeLoadError');
    const dialog = getElement('employeeDialog');
    const deleteDialog = getElement('deleteEmployeeDialog');
    const form = getElement('employeeForm');
    const formError = getElement('employeeFormError');
    const deleteError = getElement('deleteEmployeeError');
    const fields = {
        employee_name: getElement('employeeName'),
        phone: getElement('employeePhone'),
        status: getElement('employeeStatus'),
        employment_type: getElement('employmentType'),
    };
    let employees = [];
    let editingId = null;
    let deletingId = null;
    let loading = false;
    let saving = false;

    const displayId = id => `E${String(id).padStart(3, '0')}`;
    const initials = name => name.split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase();
    const statusClass = status => status === 'On leave' ? 'leave' : status === 'Inactive' ? 'inactive' : '';

    function makeButton(label, className, employee, handler) {
        const element = document.createElement('button');
        element.type = 'button';
        element.className = className;
        element.textContent = label;
        element.setAttribute('aria-label', `${label} ${employee.employee_name}`);
        element.addEventListener('click', () => handler(employee));
        return element;
    }

    function render() {
        const query = search.value.trim().toLocaleLowerCase();
        const filtered = employees.filter(employee => {
            const searchable = [displayId(employee.employee_id), employee.employee_name, employee.phone].join(' ').toLocaleLowerCase();
            return searchable.includes(query)
                && (typeFilter.value === 'all' || employee.employment_type === typeFilter.value)
                && (statusFilter.value === 'all' || employee.status === statusFilter.value);
        });
        rows.replaceChildren(...filtered.map(employee => {
            const row = document.createElement('tr');
            const personCell = document.createElement('td');
            const person = document.createElement('div');
            person.className = 'employee-person';
            const avatar = document.createElement('span');
            avatar.className = `employee-avatar tone-${employee.employee_id % 4}`;
            avatar.textContent = initials(employee.employee_name);
            const identity = document.createElement('span');
            const name = document.createElement('strong');
            name.textContent = employee.employee_name;
            const id = document.createElement('small');
            id.textContent = `Employee ID: ${displayId(employee.employee_id)}`;
            identity.append(name, id);
            person.append(avatar, identity);
            personCell.appendChild(person);
            const phone = document.createElement('td');
            phone.textContent = employee.phone;
            const type = document.createElement('td');
            const typePill = document.createElement('span');
            typePill.className = 'type-pill';
            typePill.textContent = employee.employment_type;
            type.appendChild(typePill);
            const status = document.createElement('td');
            const statusPill = document.createElement('span');
            statusPill.className = `employee-status ${statusClass(employee.status)}`.trim();
            statusPill.textContent = employee.status;
            status.appendChild(statusPill);
            const actions = document.createElement('td');
            actions.className = 'employee-row-actions';
            actions.append(
                makeButton('Edit', 'employee-secondary employee-row-button', employee, openEdit),
                makeButton('Delete', 'employee-delete employee-row-button', employee, openDelete)
            );
            row.append(personCell, phone, type, status, actions);
            return row;
        }));
        emptyState.hidden = filtered.length > 0 || loading;
        getElement('resultCount').textContent = loading
            ? 'Loading employees…'
            : `${filtered.length} of ${employees.length} ${employees.length === 1 ? 'employee' : 'employees'}`;
    }

    function setSaving(value) {
        saving = value;
        for (const id of ['saveEmployee', 'cancelEmployee', 'closeEmployee', 'cancelEmployeeDelete', 'confirmEmployeeDelete']) {
            getElement(id).disabled = value;
        }
        for (const input of Object.values(fields)) input.disabled = value;
    }

    function openAdd() {
        if (saving) return;
        editingId = null;
        form.reset();
        getElement('employeeId').value = '';
        getElement('dialogTitle').textContent = 'Add employee';
        formError.hidden = true;
        dialog.showModal();
    }

    function openEdit(employee) {
        if (saving) return;
        editingId = employee.employee_id;
        getElement('employeeId').value = displayId(employee.employee_id);
        getElement('dialogTitle').textContent = `Edit employee ${displayId(employee.employee_id)}`;
        for (const [field, input] of Object.entries(fields)) input.value = employee[field];
        formError.hidden = true;
        dialog.showModal();
    }

    function openDelete(employee) {
        if (saving) return;
        deletingId = employee.employee_id;
        getElement('deleteEmployeeSummary').textContent = `${displayId(employee.employee_id)} — ${employee.employee_name}`;
        deleteError.hidden = true;
        deleteDialog.showModal();
    }

    async function request(path, options = {}) {
        const response = await fetch(path, options);
        if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            throw new Error(result.error?.message || 'Unable to complete this request.');
        }
        return response.status === 204 ? null : (await response.json()).data;
    }

    async function loadEmployees() {
        if (loading || saving) return;
        loading = true;
        refresh.disabled = true;
        rows.setAttribute('aria-busy', 'true');
        loadError.hidden = true;
        render();
        try {
            employees = await request('/api/employees', { cache: 'no-store' });
        } catch (error) {
            employees = [];
            loadError.textContent = error.message;
            loadError.hidden = false;
        } finally {
            loading = false;
            refresh.disabled = false;
            rows.setAttribute('aria-busy', 'false');
            render();
        }
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (saving) return;
        setSaving(true);
        formError.hidden = true;
        try {
            const employee = Object.fromEntries(Object.entries(fields).map(([field, input]) => [field, input.value.trim()]));
            const method = editingId === null ? 'POST' : 'PUT';
            const path = editingId === null ? '/api/employees' : `/api/employees/${editingId}`;
            await request(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(employee) });
            dialog.close();
            setSaving(false);
            await loadEmployees();
        } catch (error) {
            formError.textContent = error.message;
            formError.hidden = false;
        } finally {
            setSaving(false);
        }
    });

    getElement('confirmEmployeeDelete').addEventListener('click', async () => {
        if (saving || deletingId === null) return;
        setSaving(true);
        deleteError.hidden = true;
        try {
            await request(`/api/employees/${deletingId}`, { method: 'DELETE' });
            deleteDialog.close();
            setSaving(false);
            await loadEmployees();
        } catch (error) {
            deleteError.textContent = error.message;
            deleteError.hidden = false;
        } finally {
            setSaving(false);
        }
    });

    for (const element of [search, typeFilter, statusFilter]) {
        element.addEventListener('input', render);
        element.addEventListener('change', render);
    }
    getElement('addEmployee').addEventListener('click', openAdd);
    refresh.addEventListener('click', loadEmployees);
    getElement('closeEmployee').addEventListener('click', () => { if (!saving) dialog.close(); });
    getElement('cancelEmployee').addEventListener('click', () => { if (!saving) dialog.close(); });
    getElement('cancelEmployeeDelete').addEventListener('click', () => { if (!saving) deleteDialog.close(); });
    dialog.addEventListener('close', () => { editingId = null; });
    deleteDialog.addEventListener('close', () => { deletingId = null; });
    for (const modal of [dialog, deleteDialog]) modal.addEventListener('cancel', event => { if (saving) event.preventDefault(); });

    loadEmployees();
});
