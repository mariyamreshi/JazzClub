SELECT
  o.order_id,
  o.reservation_id,
  c.name,
  o.total_amount,
  o.status
FROM orders o
JOIN reservations r
  ON r.reservation_id = o.reservation_id
JOIN customers c
  ON c.customer_id = r.customer_id
LEFT JOIN payments p
  ON p.order_id = o.order_id
WHERE p.payment_id IS NULL
  AND o.status <> 'cancelled';
