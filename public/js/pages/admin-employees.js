(() => {
    const employees = [
        {
            id: 'E001',
            name: 'Mali Prasert',
            phone: '081-555-0142',
            status: 'Active',
            type: 'Full-time',
            avatar: 'MP',
            tone: 'green',
            shift: {
                id: 'S018',
                showId: 'SH004',
                role: 'Floor server',
                date: 'FRI, SEP 18',
                start: '5:00 PM',
                end: '12:00 AM'
            }
        },
        {
            id: 'E002',
            name: 'Niran Chaiyasit',
            phone: '081-555-0188',
            status: 'Active',
            type: 'Full-time',
            avatar: 'NC',
            tone: 'gold',
            shift: {
                id: 'S019',
                showId: 'SH004',
                role: 'Bartender',
                date: 'FRI, SEP 18',
                start: '5:00 PM',
                end: '12:00 AM'
            }
        }
    ];

    const getElement = id => document.getElementById(id);

    const rows = getElement('employeeRows');
    const search = getElement('employeeSearch');
    const typeFilter = getElement('typeFilter');
    const statusFilter = getElement('statusFilter');
    const roleFilter = getElement('roleFilter');
    const dialog = getElement('employeeDialog');
    const form = getElement('employeeForm');

    let editingIndex = -1;

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[character]));
    }

    function getNextEmployeeId() {
        let number = employees.length + 1;
        let id = `E${String(number).padStart(3, '0')}`;

        while (employees.some(employee => employee.id === id)) {
            number += 1;
            id = `E${String(number).padStart(3, '0')}`;
        }

        return id;
    }

    function renderEmployees() {
        const query = search.value.trim().toLowerCase();

        const filteredEmployees = employees
            .map((employee, index) => ({ employee, index }))
            .filter(({ employee }) => {
                const matchesSearch =
                    !query ||
                    [employee.id, employee.name, employee.phone]
                        .some(value => value.toLowerCase().includes(query));

                const matchesType =
                    typeFilter.value === 'all' ||
                    employee.type === typeFilter.value;

                const matchesStatus =
                    statusFilter.value === 'all' ||
                    employee.status === statusFilter.value;

                const matchesRole =
                    roleFilter.value === 'all' ||
                    (employee.shift &&
                        employee.shift.role === roleFilter.value);

                return matchesSearch &&
                    matchesType &&
                    matchesStatus &&
                    matchesRole;
            });

        rows.innerHTML = filteredEmployees.map(({ employee, index }) => {
            const shift = employee.shift;
            const shiftTime = shift
                ? `${escapeHtml(shift.start)}–${escapeHtml(shift.end)}`
                : 'No upcoming shift';

            const shiftDateAndTime = shift
                ? `${escapeHtml(shift.date)} · ${shiftTime}`
                : shiftTime;

            const shiftDetails = shift
                ? `${escapeHtml(shift.role)} · Show ${escapeHtml(shift.showId)} · Shift ${escapeHtml(shift.id)}`
                : 'No shift assigned';

            const statusClass =
                employee.status === 'On leave' ? 'leave' : '';

            return `
                <tr data-index="${index}">
                    <td>
                        <div class="employee-person">
                            <span class="employee-avatar ${escapeHtml(employee.tone)}">
                                ${escapeHtml(employee.avatar)}
                            </span>
                            <span>
                                <strong>${escapeHtml(employee.name)}</strong>
                                <small>
                                    Employee ID: ${escapeHtml(employee.id)}
                                    · ${escapeHtml(employee.phone)}
                                </small>
                            </span>
                        </div>
                    </td>
                    <td>
                        <span class="type-pill">${escapeHtml(employee.type)}</span>
                    </td>
                    <td>
                        <span class="employee-status ${statusClass}">
                            ${escapeHtml(employee.status)}
                        </span>
                    </td>
                    <td>
                        <div class="upcoming-shift">
                            <strong>${shiftDateAndTime}</strong>
                            <small>${shiftDetails}</small>
                        </div>
                    </td>
                    <td>
                        <button
                            class="row-open"
                            type="button"
                            aria-label="Edit ${escapeHtml(employee.name)}">
                            ›
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        getElement('resultCount').textContent =
            `${filteredEmployees.length} ` +
            `${filteredEmployees.length === 1 ? 'employee' : 'employees'}`;

        getElement('emptyState').hidden = filteredEmployees.length > 0;

        getElement('allCount').textContent = employees.length;
        getElement('fullCount').textContent =
            employees.filter(employee => employee.type === 'Full-time').length;
        getElement('partCount').textContent =
            employees.filter(employee => employee.type === 'Part-time').length;
        getElement('leaveCount').textContent =
            employees.filter(employee => employee.status === 'On leave').length;
    }

    function openEmployeeModal(index = -1) {
        editingIndex = index;

        const employee = index >= 0
            ? employees[index]
            : {
                id: getNextEmployeeId(),
                name: '',
                phone: '',
                status: 'Active',
                type: 'Full-time'
            };

        form.reset();

        getElement('employeeId').value = employee.id;
        getElement('employeeName').value = employee.name;
        getElement('employeePhone').value = employee.phone;
        getElement('employeeStatus').value = employee.status;
        getElement('employmentType').value = employee.type;

        dialog.showModal();
    }

    [search, typeFilter, statusFilter, roleFilter].forEach(element => {
        element.addEventListener('input', renderEmployees);
        element.addEventListener('change', renderEmployees);
    });

    rows.addEventListener('click', event => {
        const row = event.target.closest('tr[data-index]');

        if (row) {
            openEmployeeModal(Number(row.dataset.index));
        }
    });

    getElement('addEmployee').addEventListener('click', () => {
        openEmployeeModal();
    });

    getElement('closeEmployee').addEventListener('click', () => {
        dialog.close();
    });

    getElement('cancelEmployee').addEventListener('click', () => {
        dialog.close();
    });

    form.addEventListener('submit', event => {
        event.preventDefault();

        const name = getElement('employeeName').value.trim();

        if (!name) {
            getElement('employeeName').focus();
            return;
        }

        const existingEmployee =
            editingIndex >= 0 ? employees[editingIndex] : null;

        const employee = {
            id: getElement('employeeId').value,
            name,
            phone: getElement('employeePhone').value.trim(),
            status: getElement('employeeStatus').value,
            type: getElement('employmentType').value,
            avatar: name
                .split(/\s+/)
                .slice(0, 2)
                .map(part => part.charAt(0))
                .join('')
                .toUpperCase(),
            tone: existingEmployee
                ? existingEmployee.tone
                : ['green', 'gold', 'rose', 'blue'][employees.length % 4],
            shift: existingEmployee ? existingEmployee.shift : null
        };

        if (editingIndex >= 0) {
            employees[editingIndex] = employee;
        } else {
            employees.push(employee);
        }

        dialog.close();
        renderEmployees();
    });

    renderEmployees();
})();