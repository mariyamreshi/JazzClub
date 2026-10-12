-- Report 3: every reservation with its show, orders and payment totals.
SELECT r.reservation_id,c.name customer,t.table_id,a.artist_name,r.date_time,r.status,
 COALESCE(o.order_count,0) order_count,COALESCE(o.order_total,0) order_total,COALESCE(o.paid_total,0) paid_total,
 CASE WHEN COALESCE(o.order_total,0)=COALESCE(o.paid_total,0) AND COALESCE(o.order_count,0)>0 THEN 'PAID'
      WHEN COALESCE(o.order_count,0)=0 THEN 'NO ORDER' ELSE 'OUTSTANDING' END payment_status
FROM reservations r JOIN customers c ON c.customer_id=r.customer_id JOIN club_tables t ON t.table_id=r.table_id
JOIN shows s ON s.show_id=r.show_id JOIN artists a ON a.artist_id=s.artist_id
LEFT JOIN (SELECT o.reservation_id,COUNT(*) order_count,SUM(o.total_amount) order_total,SUM(COALESCE(p.amount,0)) paid_total FROM orders o LEFT JOIN payments p ON p.order_id=o.order_id WHERE o.status<>'cancelled' GROUP BY o.reservation_id) o ON o.reservation_id=r.reservation_id
ORDER BY r.date_time,r.reservation_id;
