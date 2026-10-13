document.addEventListener('DOMContentLoaded', () => {
    const get = id => document.getElementById(id);
    const rows = get('scheduleRows');
    const dialog = get('scheduleDialog');
    const form = get('scheduleForm');
    const fields = { employee_id: get('scheduleEmployee'), day_of_week: get('scheduleDay'), start_time: get('scheduleStart'), end_time: get('scheduleEnd') };
    let schedules = [], employees = [], editingId = null, saving = false;

    async function request(path, options = {}) {
        const response = await fetch(path, options); const result = response.status === 204 ? null : await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result?.error?.message || 'Unable to complete this request.');
        return result?.data ?? null;
    }
    function fillEmployees() {
        fields.employee_id.replaceChildren(...employees.map(employee => { const option=document.createElement('option'); option.value=employee.employee_id; option.textContent=employee.employee_name; return option; }));
    }
    function render() {
        const query=get('scheduleSearch').value.trim().toLowerCase();
        const visible=schedules.filter(item=>`${item.employee_name} ${item.day_of_week} ${item.schedule_id}`.toLowerCase().includes(query));
        rows.replaceChildren(...visible.map(item=>{const row=document.createElement('tr'); for(const value of [`SC-${item.schedule_id}`,item.employee_name,item.day_of_week,item.start_time,item.end_time]){const cell=document.createElement('td');cell.textContent=value;row.appendChild(cell);} const actions=document.createElement('td'); for(const [label,handler,className] of [['Edit',openEdit,'employee-secondary'],['Delete',remove,'employee-delete']]){const button=document.createElement('button');button.type='button';button.className=className;button.textContent=label;button.addEventListener('click',()=>handler(item));actions.appendChild(button);} row.appendChild(actions);return row;}));
        get('scheduleCount').textContent=`Showing ${visible.length} of ${schedules.length} schedules`; get('scheduleEmpty').hidden=visible.length>0;
    }
    async function load(){get('scheduleLoadError').hidden=true;try{[schedules,employees]=await Promise.all([request('/api/employee-schedules',{cache:'no-store'}),request('/api/employees',{cache:'no-store'})]);fillEmployees();render();}catch(error){get('scheduleLoadError').textContent=error.message;get('scheduleLoadError').hidden=false;}finally{rows.setAttribute('aria-busy','false');}}
    function openAdd(){editingId=null;form.reset();get('scheduleDialogTitle').textContent='Add schedule';fields.start_time.value='17:00';fields.end_time.value='23:00';dialog.showModal();}
    function openEdit(item){editingId=item.schedule_id;get('scheduleDialogTitle').textContent=`Edit schedule SC-${item.schedule_id}`;for(const [name,input] of Object.entries(fields))input.value=item[name];dialog.showModal();}
    async function remove(item){if(!window.confirm(`Delete ${item.employee_name}'s ${item.day_of_week} schedule?`))return;await request(`/api/employee-schedules/${item.schedule_id}`,{method:'DELETE'});await load();}
    form.addEventListener('submit',async event=>{event.preventDefault();if(saving||!form.reportValidity())return;saving=true;get('scheduleFormError').hidden=true;try{const payload=Object.fromEntries(Object.entries(fields).map(([key,input])=>[key,input.value]));await request(editingId===null?'/api/employee-schedules':`/api/employee-schedules/${editingId}`,{method:editingId===null?'POST':'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});dialog.close();await load();}catch(error){get('scheduleFormError').textContent=error.message;get('scheduleFormError').hidden=false;}finally{saving=false;}});
    get('scheduleSearch').addEventListener('input',render);get('addSchedule').addEventListener('click',openAdd);get('refreshSchedules').addEventListener('click',load);get('closeSchedule').addEventListener('click',()=>dialog.close());get('cancelSchedule').addEventListener('click',()=>dialog.close());return load();
});
