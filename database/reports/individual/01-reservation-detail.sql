SELECT
  r.reservation_id,
  c.name,
  t.table_id,
  a.artist_name,
  r.date_time,
  r.status
FROM reservations r
JOIN customers c
  ON c.customer_id = r.customer_id
JOIN club_tables t
  ON t.table_id = r.table_id
JOIN shows s
  ON s.show_id = r.show_id
JOIN artists a
  ON a.artist_id = s.artist_id
ORDER BY r.date_time;
