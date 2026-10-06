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

-- Live shows, using the club's local date and start time (Asia/Bangkok).
CREATE TABLE IF NOT EXISTS shows (
  show_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  show_date DATE NOT NULL,
  artist VARCHAR(150) NOT NULL,
  genre VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  PRIMARY KEY (show_id),
  KEY shows_schedule (show_date, start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Food and drink menu shown on the guest site and managed by admin.
CREATE TABLE IF NOT EXISTS menu_items (
  item_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_name VARCHAR(120) NOT NULL,
  category VARCHAR(20) NOT NULL,
  price DECIMAL(10,2) UNSIGNED NOT NULL,
  stock_quantity INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id),
  UNIQUE KEY menu_items_name_unique (item_name),
  KEY menu_items_category_stock (category, stock_quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
