CREATE TABLE IF NOT EXISTS employee_role_targets (
  target_date DATE NOT NULL,
  role VARCHAR(60) NOT NULL,
  target_count SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (target_date, role),
  CONSTRAINT employee_role_targets_count_valid CHECK (target_count <= 999)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
