USE jazzclub;

CREATE TABLE IF NOT EXISTS customers (
  customer_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(25) NOT NULL,
  address VARCHAR(255) NULL,
  membership_status VARCHAR(30) NOT NULL DEFAULT 'non-member',
  PRIMARY KEY (customer_id),
  UNIQUE KEY customers_phone_unique (phone),
  CONSTRAINT customers_membership_valid CHECK (membership_status IN ('non-member', 'member', 'vip'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS club_tables (
  table_id VARCHAR(10) NOT NULL,
  capacity SMALLINT UNSIGNED NOT NULL,
  zone VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'available',
  PRIMARY KEY (table_id),
  KEY club_tables_zone_status (zone, status),
  CONSTRAINT club_tables_capacity_positive CHECK (capacity > 0),
  CONSTRAINT club_tables_status_valid CHECK (status IN ('available', 'unavailable', 'maintenance'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS artists (
  artist_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  artist_name VARCHAR(150) NOT NULL,
  artist_type VARCHAR(50) NOT NULL DEFAULT 'guest',
  genre VARCHAR(100) NOT NULL,
  PRIMARY KEY (artist_id),
  UNIQUE KEY artists_name_unique (artist_name),
  CONSTRAINT artists_type_valid CHECK (artist_type IN ('solo', 'duo', 'group', 'resident', 'guest'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The club has one stage, so two shows cannot start in the same slot.
CREATE TABLE IF NOT EXISTS shows (
  show_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  artist_id INT UNSIGNED NOT NULL,
  performance_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  PRIMARY KEY (show_id),
  UNIQUE KEY shows_slot_unique (performance_date, start_time),
  KEY shows_artist (artist_id),
  CONSTRAINT shows_artist_fk FOREIGN KEY (artist_id)
    REFERENCES artists (artist_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT shows_time_order CHECK (end_time > start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reservations (
  reservation_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id INT UNSIGNED NOT NULL,
  table_id VARCHAR(10) NOT NULL,
  show_id INT UNSIGNED NOT NULL,
  date_time DATETIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
  PRIMARY KEY (reservation_id),
  UNIQUE KEY reservations_table_datetime_unique (table_id, date_time),
  KEY reservations_customer (customer_id),
  KEY reservations_show_status (show_id, status),
  CONSTRAINT reservations_customer_fk FOREIGN KEY (customer_id)
    REFERENCES customers (customer_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT reservations_table_fk FOREIGN KEY (table_id)
    REFERENCES club_tables (table_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT reservations_show_fk FOREIGN KEY (show_id)
    REFERENCES shows (show_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT reservations_status_valid CHECK (status IN ('confirmed', 'completed', 'cancelled', 'no-show'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_schedules (
  schedule_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id INT UNSIGNED NOT NULL,
  day_of_week ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  PRIMARY KEY (schedule_id),
  UNIQUE KEY employee_schedules_unique_slot (employee_id, day_of_week, start_time, end_time),
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
  UNIQUE KEY employee_shifts_unique_assignment (employee_id, show_id, role),
  KEY employee_shifts_employee_date (employee_id, shift_date),
  KEY employee_shifts_show (show_id),
  CONSTRAINT employee_shifts_employee_fk FOREIGN KEY (employee_id)
    REFERENCES employees (employee_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT employee_shifts_show_fk FOREIGN KEY (show_id)
    REFERENCES shows (show_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT employee_shifts_time_order CHECK (end_time > start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS menu_items (
  item_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_name VARCHAR(120) NOT NULL,
  category VARCHAR(20) NOT NULL,
  price DECIMAL(10,2) UNSIGNED NOT NULL,
  stock_quantity INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id),
  UNIQUE KEY menu_items_name_unique (item_name),
  KEY menu_items_category_stock (category, stock_quantity),
  CONSTRAINT menu_items_price_positive CHECK (price > 0),
  CONSTRAINT menu_items_category_valid CHECK (category IN ('recommended', 'seasonal', 'cocktail', 'liquor', 'dessert', 'appetizer'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ORDER follows the proposal: it belongs to exactly one reservation. The table
-- is reached through orders -> reservations -> club_tables.
CREATE TABLE IF NOT EXISTS orders (
  order_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reservation_id INT UNSIGNED NOT NULL,
  order_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_amount DECIMAL(10,2) UNSIGNED NOT NULL DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  PRIMARY KEY (order_id),
  KEY orders_reservation_time (reservation_id, order_time),
  CONSTRAINT orders_reservation_fk FOREIGN KEY (reservation_id)
    REFERENCES reservations (reservation_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT orders_status_valid CHECK (status IN ('pending', 'preparing', 'served', 'paid', 'cancelled')),
  CONSTRAINT orders_total_valid CHECK (total_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_items (
  order_id INT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  price_at_time DECIMAL(10,2) UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  PRIMARY KEY (order_id, item_id),
  KEY order_items_item (item_id),
  CONSTRAINT order_items_order_fk FOREIGN KEY (order_id)
    REFERENCES orders (order_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT order_items_menu_item_fk FOREIGN KEY (item_id)
    REFERENCES menu_items (item_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT order_items_price_positive CHECK (price_at_time > 0),
  CONSTRAINT order_items_quantity_positive CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payments (
  payment_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id INT UNSIGNED NOT NULL,
  payment_method VARCHAR(30) NOT NULL,
  amount DECIMAL(10,2) UNSIGNED NOT NULL,
  payment_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_id),
  UNIQUE KEY payments_order_unique (order_id),
  CONSTRAINT payments_order_fk FOREIGN KEY (order_id)
    REFERENCES orders (order_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT payments_method_valid CHECK (payment_method IN ('Cash', 'Credit Card', 'PromptPay')),
  CONSTRAINT payments_amount_positive CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Keep total_amount correct even when ORDER_ITEM is changed in Workbench.
DROP TRIGGER IF EXISTS order_items_total_after_insert;
CREATE TRIGGER order_items_total_after_insert
AFTER INSERT ON order_items FOR EACH ROW
UPDATE orders SET total_amount = total_amount + (NEW.price_at_time * NEW.quantity)
WHERE order_id = NEW.order_id;

DROP TRIGGER IF EXISTS order_items_total_after_update;
CREATE TRIGGER order_items_total_after_update
AFTER UPDATE ON order_items FOR EACH ROW
UPDATE orders
SET total_amount = total_amount - (OLD.price_at_time * OLD.quantity) + (NEW.price_at_time * NEW.quantity)
WHERE order_id = NEW.order_id;

DROP TRIGGER IF EXISTS order_items_total_after_delete;
CREATE TRIGGER order_items_total_after_delete
AFTER DELETE ON order_items FOR EACH ROW
UPDATE orders SET total_amount = total_amount - (OLD.price_at_time * OLD.quantity)
WHERE order_id = OLD.order_id;
