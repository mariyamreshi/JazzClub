-- Reservation form data. Date and time use the club's local time (Asia/Bangkok).
CREATE TABLE IF NOT EXISTS reservations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  guest_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(25) NOT NULL,
  zone VARCHAR(50) NOT NULL,
  table_number VARCHAR(10) NOT NULL,
  `date` DATE NOT NULL,
  `time` TIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY reservations_date_table_unique (`date`, table_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
