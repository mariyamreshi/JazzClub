-- Upgrade an installation created before MENU_ITEM was aligned with the ERD.
ALTER TABLE menu_items
  ADD COLUMN stock_quantity INT UNSIGNED NOT NULL DEFAULT 0 AFTER price;

UPDATE menu_items
SET stock_quantity = CASE WHEN is_available THEN 10 ELSE 0 END,
    category = CASE WHEN is_recommended THEN 'recommended' ELSE category END;

ALTER TABLE menu_items
  DROP INDEX menu_items_category_available,
  DROP COLUMN badge,
  DROP COLUMN image_url,
  DROP COLUMN is_recommended,
  DROP COLUMN is_available,
  DROP COLUMN created_at,
  DROP COLUMN updated_at,
  ADD KEY menu_items_category_stock (category, stock_quantity),
  ADD CONSTRAINT menu_items_price_positive CHECK (price > 0);
