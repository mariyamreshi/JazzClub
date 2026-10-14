SELECT
  o.order_id,
  o.total_amount,
  SUM(oi.quantity * oi.price_at_time) AS calculated_total,
  o.total_amount - SUM(oi.quantity * oi.price_at_time) AS difference
FROM orders o
JOIN order_items oi
  ON oi.order_id = o.order_id
GROUP BY
  o.order_id,
  o.total_amount;
