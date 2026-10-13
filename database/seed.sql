-- Repeatable demonstration data. Transactional rows are rebuilt so every
-- relationship and report has a predictable example.
USE jazzclub;

DELETE FROM payments;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM employee_shifts;
DELETE FROM employee_schedules;
DELETE FROM reservations;
DELETE FROM shows;
DELETE FROM employees;
DELETE FROM customers;
DELETE FROM artists;
DELETE FROM menu_items;
DELETE FROM club_tables;

INSERT INTO club_tables (table_id, capacity, zone, status) VALUES
  ('F01',8,'Front Stage','available'),('F02',8,'Front Stage','available'),
  ('F03',8,'Front Stage','available'),('F04',8,'Front Stage','available'),
  ('M01',8,'Main Floor','available'),('M02',8,'Main Floor','available'),('M03',8,'Main Floor','available'),
  ('VIP-1',12,'VIP Lounge','available'),('VIP-2',12,'VIP Lounge','available'),
  ('B01',1,'Bar Counter','available'),('B02',1,'Bar Counter','available'),
  ('B03',1,'Bar Counter','available'),('B04',1,'Bar Counter','maintenance')
ON DUPLICATE KEY UPDATE capacity=VALUES(capacity),zone=VALUES(zone),status=VALUES(status);

INSERT INTO artists (artist_name, artist_type, genre) VALUES
 ('The Araya Quartet','group','Contemporary Jazz'),('Midnight Blue Trio','group','Bebop & Standards'),
 ('Nina & The Brass','group','Soul Jazz'),('Chiang Mai Swing Collective','group','Swing'),
 ('Riverfront Jazz Ensemble','group','Latin Jazz')
ON DUPLICATE KEY UPDATE artist_type=VALUES(artist_type),genre=VALUES(genre);

INSERT INTO shows (artist_id,performance_date,start_time,end_time)
SELECT artist_id,'2026-10-12','20:30','22:30' FROM artists WHERE artist_name='The Araya Quartet';
INSERT INTO shows (artist_id,performance_date,start_time,end_time)
SELECT artist_id,'2026-10-13','21:00','23:00' FROM artists WHERE artist_name='Midnight Blue Trio';
INSERT INTO shows (artist_id,performance_date,start_time,end_time)
SELECT artist_id,'2026-10-16','20:00','22:00' FROM artists WHERE artist_name='Nina & The Brass';
INSERT INTO shows (artist_id,performance_date,start_time,end_time)
SELECT artist_id,'2026-10-17','20:30','22:30' FROM artists WHERE artist_name='Chiang Mai Swing Collective';
INSERT INTO shows (artist_id,performance_date,start_time,end_time)
SELECT artist_id,'2026-10-18','21:00','23:00' FROM artists WHERE artist_name='Riverfront Jazz Ensemble';

INSERT INTO employees (employee_name,phone,status,employment_type) VALUES
 ('Garnet Faioei','081-600-0001','Active','Full-time'),('Ganet Faioei','081-600-0002','Active','Full-time'),
 ('Garnes Faioei','081-600-0003','Active','Full-time'),('Mary Reshi','081-600-0004','Active','Full-time'),
 ('Mariyam Reshi','081-600-0005','Active','Full-time'),('Mery Reshi','081-600-0006','Active','Full-time'),
 ('Fifa Sroiraya','081-600-0007','Active','Full-time'),('Phifa Sroiraya','081-600-0008','Active','Full-time'),
 ('Fipha Sroiraya','081-600-0009','Active','Full-time'),('Many Chai','081-600-0010','Active','Full-time'),
 ('Makmai Chai','081-600-0011','Active','Full-time'),('Fany Chai','081-600-0012','Active','Full-time'),
 ('Anan Prasert','081-600-0013','Active','Full-time'),('Anant Prasert','081-600-0014','Active','Full-time'),
 ('Anan Chai','081-600-0015','Active','Full-time'),('Irene Tan','081-600-0016','Active','Part-time'),
 ('Irine Tan','081-600-0017','Active','Part-time'),('Airene Tan','081-600-0018','On leave','Part-time')
ON DUPLICATE KEY UPDATE employee_name=VALUES(employee_name),status=VALUES(status),employment_type=VALUES(employment_type);

INSERT INTO employee_schedules (employee_id,day_of_week,start_time,end_time)
SELECT employee_id,'Monday','17:00','23:59' FROM employees WHERE phone BETWEEN '081-600-0001' AND '081-600-0006';
INSERT INTO employee_schedules (employee_id,day_of_week,start_time,end_time)
SELECT employee_id,'Tuesday','17:00','23:59' FROM employees WHERE phone BETWEEN '081-600-0007' AND '081-600-0012';
INSERT INTO employee_schedules (employee_id,day_of_week,start_time,end_time)
SELECT employee_id,'Friday','17:00','23:59' FROM employees WHERE phone BETWEEN '081-600-0013' AND '081-600-0018';
INSERT INTO employee_schedules (employee_id,day_of_week,start_time,end_time)
SELECT employee_id,'Saturday','17:00','23:59' FROM employees WHERE phone IN ('081-600-0001','081-600-0004','081-600-0007','081-600-0010','081-600-0013','081-600-0016');

-- The 18 October show intentionally has no shifts so the red warning and
-- show-readiness report have a meaningful missing-staff example.
INSERT INTO employee_shifts (employee_id,show_id,role,shift_date,start_time,end_time)
SELECT e.employee_id,s.show_id,'Floor server',s.performance_date,'18:30','23:30' FROM employees e JOIN shows s ON s.performance_date='2026-10-12' WHERE e.phone='081-600-0001';
INSERT INTO employee_shifts (employee_id,show_id,role,shift_date,start_time,end_time)
SELECT e.employee_id,s.show_id,'Bartender',s.performance_date,'18:30','23:30' FROM employees e JOIN shows s ON s.performance_date='2026-10-12' WHERE e.phone='081-600-0004';
INSERT INTO employee_shifts (employee_id,show_id,role,shift_date,start_time,end_time)
SELECT e.employee_id,s.show_id,'Kitchen staff',s.performance_date,'18:30','23:30' FROM employees e JOIN shows s ON s.performance_date='2026-10-12' WHERE e.phone='081-600-0007';
INSERT INTO employee_shifts (employee_id,show_id,role,shift_date,start_time,end_time)
SELECT e.employee_id,s.show_id,'Floor server',s.performance_date,'19:00','23:59' FROM employees e JOIN shows s ON s.performance_date='2026-10-13' WHERE e.phone='081-600-0008';
INSERT INTO employee_shifts (employee_id,show_id,role,shift_date,start_time,end_time)
SELECT e.employee_id,s.show_id,'Bartender',s.performance_date,'19:00','23:59' FROM employees e JOIN shows s ON s.performance_date='2026-10-13' WHERE e.phone='081-600-0010';
INSERT INTO employee_shifts (employee_id,show_id,role,shift_date,start_time,end_time)
SELECT e.employee_id,s.show_id,'Reservations staff',s.performance_date,'18:00','22:30' FROM employees e JOIN shows s ON s.performance_date='2026-10-16' WHERE e.phone='081-600-0013';
INSERT INTO employee_shifts (employee_id,show_id,role,shift_date,start_time,end_time)
SELECT e.employee_id,s.show_id,'Floor server',s.performance_date,'18:00','22:30' FROM employees e JOIN shows s ON s.performance_date='2026-10-16' WHERE e.phone='081-600-0014';
INSERT INTO employee_shifts (employee_id,show_id,role,shift_date,start_time,end_time)
SELECT e.employee_id,s.show_id,'Artist coordinator',s.performance_date,'18:00','23:00' FROM employees e JOIN shows s ON s.performance_date='2026-10-17' WHERE e.phone='081-600-0016';

INSERT INTO menu_items (item_name,category,price,stock_quantity) VALUES
 ('Truffle Cream Pasta','recommended',18.50,12),('Grilled Salmon Steak','seasonal',22.00,8),
 ('Garnet Negroni','recommended',14.00,20),('Midnight Mule','cocktail',13.00,18),
 ('Single Malt Flight','liquor',24.00,10),('Small Batch Bourbon','liquor',16.00,14),
 ('Tiramisu Delight','dessert',9.50,9),('Basque Cheesecake','dessert',10.00,7),
 ('Truffle Parmesan Fries','appetizer',8.50,25),('Mediterranean Salad','appetizer',12.50,0)
ON DUPLICATE KEY UPDATE category=VALUES(category),price=VALUES(price),stock_quantity=VALUES(stock_quantity);

INSERT INTO customers (name,phone,address,membership_status) VALUES
 ('Garnet Guest','089-700-0001','Chiang Mai','vip'),('Mary Guest','089-700-0002','Chiang Mai','member'),
 ('Fifa Guest','089-700-0003','Lamphun','member'),('Many Guest','089-700-0004','Chiang Mai','non-member'),
 ('Anan Guest','089-700-0005','Lampang','non-member'),('Irene Guest','089-700-0006','Chiang Rai','vip'),
 ('Phifa Guest','089-700-0007','Chiang Mai','non-member'),('Fany Guest','089-700-0008','Chiang Mai','member')
ON DUPLICATE KEY UPDATE name=VALUES(name),address=VALUES(address),membership_status=VALUES(membership_status);

INSERT INTO reservations (customer_id,table_id,show_id,date_time,status)
SELECT c.customer_id,'F01',s.show_id,TIMESTAMP(s.performance_date,s.start_time),'confirmed' FROM customers c JOIN shows s ON s.performance_date='2026-10-12' WHERE c.phone='089-700-0001';
INSERT INTO reservations (customer_id,table_id,show_id,date_time,status)
SELECT c.customer_id,'VIP-1',s.show_id,TIMESTAMP(s.performance_date,s.start_time),'completed' FROM customers c JOIN shows s ON s.performance_date='2026-10-12' WHERE c.phone='089-700-0002';
INSERT INTO reservations (customer_id,table_id,show_id,date_time,status)
SELECT c.customer_id,'M01',s.show_id,TIMESTAMP(s.performance_date,s.start_time),'confirmed' FROM customers c JOIN shows s ON s.performance_date='2026-10-13' WHERE c.phone='089-700-0003';
INSERT INTO reservations (customer_id,table_id,show_id,date_time,status)
SELECT c.customer_id,'M02',s.show_id,TIMESTAMP(s.performance_date,s.start_time),'cancelled' FROM customers c JOIN shows s ON s.performance_date='2026-10-13' WHERE c.phone='089-700-0004';
INSERT INTO reservations (customer_id,table_id,show_id,date_time,status)
SELECT c.customer_id,'F02',s.show_id,TIMESTAMP(s.performance_date,s.start_time),'confirmed' FROM customers c JOIN shows s ON s.performance_date='2026-10-16' WHERE c.phone='089-700-0005';
INSERT INTO reservations (customer_id,table_id,show_id,date_time,status)
SELECT c.customer_id,'B01',s.show_id,TIMESTAMP(s.performance_date,s.start_time),'no-show' FROM customers c JOIN shows s ON s.performance_date='2026-10-16' WHERE c.phone='089-700-0006';
INSERT INTO reservations (customer_id,table_id,show_id,date_time,status)
SELECT c.customer_id,'VIP-2',s.show_id,TIMESTAMP(s.performance_date,s.start_time),'confirmed' FROM customers c JOIN shows s ON s.performance_date='2026-10-17' WHERE c.phone='089-700-0007';
INSERT INTO reservations (customer_id,table_id,show_id,date_time,status)
SELECT c.customer_id,'F03',s.show_id,TIMESTAMP(s.performance_date,s.start_time),'confirmed' FROM customers c JOIN shows s ON s.performance_date='2026-10-18' WHERE c.phone='089-700-0008';

INSERT INTO orders (reservation_id,order_time,status)
SELECT reservation_id,'2026-10-12 20:45','paid' FROM reservations WHERE table_id='VIP-1' AND date_time='2026-10-12 20:30:00';
INSERT INTO orders (reservation_id,order_time,status)
SELECT reservation_id,'2026-10-12 20:40','pending' FROM reservations WHERE table_id='F01' AND date_time='2026-10-12 20:30:00';
INSERT INTO orders (reservation_id,order_time,status)
SELECT reservation_id,'2026-10-13 21:10','preparing' FROM reservations WHERE table_id='M01' AND date_time='2026-10-13 21:00:00';
INSERT INTO orders (reservation_id,order_time,status)
SELECT reservation_id,'2026-10-17 20:45','served' FROM reservations WHERE table_id='VIP-2' AND date_time='2026-10-17 20:30:00';

-- Resolve order/menu keys before each INSERT. This keeps the INSERT statement
-- from reading orders while the total-maintenance trigger updates orders.
SET @seed_order_id = (SELECT o.order_id FROM orders o JOIN reservations r ON r.reservation_id=o.reservation_id WHERE r.table_id='VIP-1' LIMIT 1);
SET @seed_item_id = (SELECT item_id FROM menu_items WHERE item_name='Garnet Negroni' LIMIT 1);
SET @seed_item_price = (SELECT price FROM menu_items WHERE item_id=@seed_item_id);
INSERT INTO order_items (order_id,item_id,price_at_time,quantity) VALUES (@seed_order_id,@seed_item_id,@seed_item_price,2);

SET @seed_item_id = (SELECT item_id FROM menu_items WHERE item_name='Truffle Parmesan Fries' LIMIT 1);
SET @seed_item_price = (SELECT price FROM menu_items WHERE item_id=@seed_item_id);
INSERT INTO order_items (order_id,item_id,price_at_time,quantity) VALUES (@seed_order_id,@seed_item_id,@seed_item_price,1);

SET @seed_order_id = (SELECT o.order_id FROM orders o JOIN reservations r ON r.reservation_id=o.reservation_id WHERE r.table_id='F01' LIMIT 1);
SET @seed_item_id = (SELECT item_id FROM menu_items WHERE item_name='Midnight Mule' LIMIT 1);
SET @seed_item_price = (SELECT price FROM menu_items WHERE item_id=@seed_item_id);
INSERT INTO order_items (order_id,item_id,price_at_time,quantity) VALUES (@seed_order_id,@seed_item_id,@seed_item_price,3);

SET @seed_order_id = (SELECT o.order_id FROM orders o JOIN reservations r ON r.reservation_id=o.reservation_id WHERE r.table_id='M01' LIMIT 1);
SET @seed_item_id = (SELECT item_id FROM menu_items WHERE item_name='Truffle Cream Pasta' LIMIT 1);
SET @seed_item_price = (SELECT price FROM menu_items WHERE item_id=@seed_item_id);
INSERT INTO order_items (order_id,item_id,price_at_time,quantity) VALUES (@seed_order_id,@seed_item_id,@seed_item_price,2);

SET @seed_order_id = (SELECT o.order_id FROM orders o JOIN reservations r ON r.reservation_id=o.reservation_id WHERE r.table_id='VIP-2' LIMIT 1);
SET @seed_item_id = (SELECT item_id FROM menu_items WHERE item_name='Single Malt Flight' LIMIT 1);
SET @seed_item_price = (SELECT price FROM menu_items WHERE item_id=@seed_item_id);
INSERT INTO order_items (order_id,item_id,price_at_time,quantity) VALUES (@seed_order_id,@seed_item_id,@seed_item_price,1);

INSERT INTO payments (order_id,payment_method,amount,payment_time)
SELECT order_id,'PromptPay',total_amount,'2026-10-12 22:20' FROM orders WHERE status='paid';
