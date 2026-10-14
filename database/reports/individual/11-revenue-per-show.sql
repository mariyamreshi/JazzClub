-- 11 Revenue per show
SELECT s.show_id,a.artist_name,COALESCE(SUM(p.amount),0) AS paid_revenue FROM shows s JOIN artists a ON a.artist_id=s.artist_id LEFT JOIN reservations r ON r.show_id=s.show_id LEFT JOIN orders o ON o.reservation_id=r.reservation_id LEFT JOIN payments p ON p.order_id=o.order_id GROUP BY s.show_id,a.artist_name ORDER BY paid_revenue DESC;
