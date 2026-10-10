-- Adds table ownership to ORDER and the ORDER_ITEM bridge used by guest menu ordering.
CREATE TABLE IF NOT EXISTS orders (
  order_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  table_id VARCHAR(10) NOT NULL,
  order_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  total DECIMAL(10,2) UNSIGNED NOT NULL,
  PRIMARY KEY (order_id),
  KEY orders_table_date (table_id, order_date),
  CONSTRAINT orders_table_fk FOREIGN KEY (table_id)
    REFERENCES club_tables (table_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT orders_status_valid CHECK (status IN ('pending', 'preparing', 'served', 'paid', 'cancelled')),
  CONSTRAINT orders_total_valid CHECK (total >= 0)
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
