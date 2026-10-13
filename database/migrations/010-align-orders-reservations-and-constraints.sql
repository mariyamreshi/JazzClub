-- This migration intentionally replaces legacy table-based order history.
-- The old rows cannot satisfy BR7 because they have no reservation_id.
USE jazzclub;

DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;

ALTER TABLE reservations
  ADD COLUMN show_id INT UNSIGNED NULL AFTER table_id;

UPDATE reservations r
JOIN shows s
  ON s.performance_date = DATE(r.date_time)
 AND s.start_time = TIME(r.date_time)
SET r.show_id = s.show_id;

-- Legacy reservations without an exact show cannot be represented by the new
-- mandatory relationship. seed.sql adds complete replacement sample rows.
DELETE FROM reservations WHERE show_id IS NULL;

ALTER TABLE reservations
  MODIFY show_id INT UNSIGNED NOT NULL,
  ADD KEY reservations_show_status (show_id, status),
  ADD CONSTRAINT reservations_show_fk FOREIGN KEY (show_id)
    REFERENCES shows (show_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT reservations_status_valid
    CHECK (status IN ('confirmed', 'completed', 'cancelled', 'no-show'));

ALTER TABLE customers
  ADD CONSTRAINT customers_membership_valid
    CHECK (membership_status IN ('non-member', 'member', 'vip'));

ALTER TABLE club_tables
  ADD KEY club_tables_zone_status (zone, status),
  ADD CONSTRAINT club_tables_status_valid
    CHECK (status IN ('available', 'unavailable', 'maintenance'));

ALTER TABLE artists
  ADD CONSTRAINT artists_type_valid
    CHECK (artist_type IN ('solo', 'duo', 'group', 'resident', 'guest'));

ALTER TABLE shows
  ADD UNIQUE KEY shows_slot_unique (performance_date, start_time);

ALTER TABLE employee_schedules
  ADD UNIQUE KEY employee_schedules_unique_slot (employee_id, day_of_week, start_time, end_time);

ALTER TABLE employee_shifts
  ADD UNIQUE KEY employee_shifts_unique_assignment (employee_id, show_id, role);

ALTER TABLE menu_items
  ADD CONSTRAINT menu_items_category_valid
    CHECK (category IN ('recommended', 'seasonal', 'cocktail', 'liquor', 'dessert', 'appetizer'));

CREATE TABLE orders (
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

CREATE TABLE order_items (
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

CREATE TABLE payments (
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

CREATE TRIGGER order_items_total_after_insert
AFTER INSERT ON order_items FOR EACH ROW
UPDATE orders SET total_amount = total_amount + (NEW.price_at_time * NEW.quantity)
WHERE order_id = NEW.order_id;

CREATE TRIGGER order_items_total_after_update
AFTER UPDATE ON order_items FOR EACH ROW
UPDATE orders
SET total_amount = total_amount - (OLD.price_at_time * OLD.quantity) + (NEW.price_at_time * NEW.quantity)
WHERE order_id = NEW.order_id;

CREATE TRIGGER order_items_total_after_delete
AFTER DELETE ON order_items FOR EACH ROW
UPDATE orders SET total_amount = total_amount - (OLD.price_at_time * OLD.quantity)
WHERE order_id = OLD.order_id;
