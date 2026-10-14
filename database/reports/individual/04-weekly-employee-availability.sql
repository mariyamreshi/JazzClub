-- 4 Weekly employee availability
SELECT e.employee_id,e.employee_name,es.day_of_week,es.start_time,es.end_time FROM employees e LEFT JOIN employee_schedules es ON es.employee_id=e.employee_id ORDER BY e.employee_name,FIELD(es.day_of_week,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday');
