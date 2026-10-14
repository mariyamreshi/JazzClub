-- 12 Reservation status distribution
SELECT status,COUNT(*) AS reservations FROM reservations GROUP BY status ORDER BY reservations DESC;
