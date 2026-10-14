SELECT
  mi.item_id,
  mi.item_name,
  SUM(oi.quantity) AS units_sold,
  SUM(oi.quantity * oi.price_at_time) AS revenue
FROM menu_items mi
JOIN order_items oi
  ON oi.item_id = mi.item_id
GROUP BY
  mi.item_id,
  mi.item_name
ORDER BY
  units_sold DESC,
  revenue DESC;
