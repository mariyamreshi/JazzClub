CREATE TABLE IF NOT EXISTS employee_schedules (
  schedule_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id INT UNSIGNED NOT NULL,
  day_of_week ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  PRIMARY KEY (schedule_id),
  KEY employee_schedules_employee_day (employee_id, day_of_week),
  CONSTRAINT employee_schedules_employee_fk FOREIGN KEY (employee_id)
    REFERENCES employees (employee_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT employee_schedules_time_order CHECK (end_time > start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_shifts (
  shift_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id INT UNSIGNED NOT NULL,
  show_id INT UNSIGNED NOT NULL,
  role VARCHAR(60) NOT NULL,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  PRIMARY KEY (shift_id),
  KEY employee_shifts_employee_date (employee_id, shift_date),
  KEY employee_shifts_show (show_id),
  CONSTRAINT employee_shifts_employee_fk FOREIGN KEY (employee_id)
    REFERENCES employees (employee_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT employee_shifts_show_fk FOREIGN KEY (show_id)
    REFERENCES shows (show_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT employee_shifts_time_order CHECK (end_time > start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
