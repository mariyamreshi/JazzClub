CREATE TABLE IF NOT EXISTS employees (
  employee_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_name VARCHAR(100) NOT NULL,
  phone VARCHAR(25) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  employment_type VARCHAR(20) NOT NULL,
  PRIMARY KEY (employee_id),
  UNIQUE KEY employees_phone_unique (phone),
  CONSTRAINT employees_status_valid CHECK (status IN ('Active', 'On leave', 'Inactive')),
  CONSTRAINT employees_type_valid CHECK (employment_type IN ('Full-time', 'Part-time'))
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
