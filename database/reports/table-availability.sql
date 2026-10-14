SET @show_id = (
  SELECT show_id
  FROM shows
  WHERE performance_date = '2026-10-12'
  LIMIT 1
);

SELECT
  t.table_id,
  t.capacity,
  t.zone,
  t.status
FROM club_tables t
WHERE t.status = 'available'
  AND NOT EXISTS (
    SELECT 1
    FROM reservations r
    WHERE r.table_id = t.table_id
      AND r.show_id = @show_id
      AND r.status NOT IN ('cancelled', 'no-show')
  )
ORDER BY
  t.zone,
  t.table_id;
