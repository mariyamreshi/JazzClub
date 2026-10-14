SELECT
  s.show_id,
  a.artist_name,
  s.performance_date,
  s.start_time,
  COALESCE(r.reservation_count, 0) reservation_count,
  COALESCE(r.reserved_seats, 0) reserved_seats,
  COALESCE(es.shift_count, 0) shift_count,
  CASE
    WHEN COALESCE(es.shift_count, 0) = 0 THEN 'NO STAFF ASSIGNED'
    ELSE 'STAFF ASSIGNED'
  END staffing_status,
  stock.out_of_stock_items,
  CASE
    WHEN stock.out_of_stock_items = 0 THEN 'MENU AVAILABLE'
    ELSE 'CHECK STOCK'
  END stock_status
FROM shows s
JOIN artists a
  ON a.artist_id = s.artist_id
LEFT JOIN (
  SELECT
    r.show_id,
    COUNT(*) reservation_count,
    SUM(t.capacity) reserved_seats
  FROM reservations r
  JOIN club_tables t
    ON t.table_id = r.table_id
  WHERE r.status NOT IN ('cancelled', 'no-show')
  GROUP BY r.show_id
) r
  ON r.show_id = s.show_id
LEFT JOIN (
  SELECT
    show_id,
    COUNT(*) shift_count
  FROM employee_shifts
  GROUP BY show_id
) es
  ON es.show_id = s.show_id
CROSS JOIN (
  SELECT SUM(stock_quantity = 0) out_of_stock_items
  FROM menu_items
) stock
ORDER BY
  s.performance_date,
  s.start_time;
