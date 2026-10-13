-- Ten-plus queries required by the project milestone.
-- 1 Reservation detail
SELECT r.reservation_id,c.name,t.table_id,a.artist_name,r.date_time,r.status FROM reservations r JOIN customers c ON c.customer_id=r.customer_id JOIN club_tables t ON t.table_id=r.table_id JOIN shows s ON s.show_id=r.show_id JOIN artists a ON a.artist_id=s.artist_id ORDER BY r.date_time;
-- 2 Reservations and seats per show
SELECT s.show_id,a.artist_name,COUNT(r.reservation_id) reservations,COALESCE(SUM(t.capacity),0) reserved_seats FROM shows s JOIN artists a ON a.artist_id=s.artist_id LEFT JOIN reservations r ON r.show_id=s.show_id AND r.status NOT IN ('cancelled','no-show') LEFT JOIN club_tables t ON t.table_id=r.table_id GROUP BY s.show_id,a.artist_name ORDER BY s.performance_date;
-- 3 Shows without employee shifts
SELECT s.show_id,a.artist_name,s.performance_date FROM shows s JOIN artists a ON a.artist_id=s.artist_id LEFT JOIN employee_shifts es ON es.show_id=s.show_id WHERE es.shift_id IS NULL;
-- 4 Weekly employee availability
SELECT e.employee_id,e.employee_name,es.day_of_week,es.start_time,es.end_time FROM employees e LEFT JOIN employee_schedules es ON es.employee_id=e.employee_id ORDER BY e.employee_name,FIELD(es.day_of_week,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday');
-- 5 Assigned roles per show
SELECT s.show_id,a.artist_name,es.role,COUNT(*) assigned FROM employee_shifts es JOIN shows s ON s.show_id=es.show_id JOIN artists a ON a.artist_id=s.artist_id GROUP BY s.show_id,a.artist_name,es.role;
-- 6 Low-stock menu items
SELECT item_id,item_name,category,stock_quantity FROM menu_items WHERE stock_quantity<=10 ORDER BY stock_quantity,item_name;
-- 7 Best-selling menu items
SELECT mi.item_id,mi.item_name,SUM(oi.quantity) units_sold,SUM(oi.quantity*oi.price_at_time) revenue FROM menu_items mi JOIN order_items oi ON oi.item_id=mi.item_id GROUP BY mi.item_id,mi.item_name ORDER BY units_sold DESC,revenue DESC;
-- 8 Audit stored totals
SELECT o.order_id,o.total_amount,SUM(oi.quantity*oi.price_at_time) calculated_total,o.total_amount-SUM(oi.quantity*oi.price_at_time) difference FROM orders o JOIN order_items oi ON oi.order_id=o.order_id GROUP BY o.order_id,o.total_amount;
-- 9 Unpaid orders
SELECT o.order_id,o.reservation_id,c.name,o.total_amount,o.status FROM orders o JOIN reservations r ON r.reservation_id=o.reservation_id JOIN customers c ON c.customer_id=r.customer_id LEFT JOIN payments p ON p.order_id=o.order_id WHERE p.payment_id IS NULL AND o.status<>'cancelled';
-- 10 Revenue by payment method
SELECT payment_method,COUNT(*) payments,SUM(amount) revenue FROM payments GROUP BY payment_method ORDER BY revenue DESC;
-- 11 Revenue per show
SELECT s.show_id,a.artist_name,COALESCE(SUM(p.amount),0) paid_revenue FROM shows s JOIN artists a ON a.artist_id=s.artist_id LEFT JOIN reservations r ON r.show_id=s.show_id LEFT JOIN orders o ON o.reservation_id=r.reservation_id LEFT JOIN payments p ON p.order_id=o.order_id GROUP BY s.show_id,a.artist_name ORDER BY paid_revenue DESC;
-- 12 Reservation status distribution
SELECT status,COUNT(*) reservations FROM reservations GROUP BY status ORDER BY reservations DESC;
