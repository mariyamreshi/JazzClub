SELECT
  s.show_id,
  a.artist_name,
  s.performance_date
FROM shows s
JOIN artists a
  ON a.artist_id = s.artist_id
LEFT JOIN employee_shifts es
  ON es.show_id = s.show_id
WHERE es.shift_id IS NULL;
