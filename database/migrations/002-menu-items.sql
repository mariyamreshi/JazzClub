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
