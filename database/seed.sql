-- Physical tables used by the reservation floor plan.
INSERT INTO club_tables (table_id, capacity, zone, status) VALUES
  ('F01', 8, 'Front Stage', 'available'), ('F02', 8, 'Front Stage', 'available'),
  ('F03', 8, 'Front Stage', 'available'), ('F04', 8, 'Front Stage', 'available'),
  ('M01', 8, 'Main Floor', 'available'), ('M02', 8, 'Main Floor', 'available'),
  ('M03', 8, 'Main Floor', 'available'),
  ('VIP-1', 12, 'VIP Lounge', 'available'), ('VIP-2', 12, 'VIP Lounge', 'available'),
  ('B01', 1, 'Bar Counter', 'available'), ('B02', 1, 'Bar Counter', 'available'),
  ('B03', 1, 'Bar Counter', 'available'), ('B04', 1, 'Bar Counter', 'available')
ON DUPLICATE KEY UPDATE capacity = VALUES(capacity), zone = VALUES(zone);

-- Fictional artists and shows. Re-running the seed preserves existing IDs.
INSERT INTO artists (artist_name, artist_type, genre) VALUES
  ('The Araya Quartet', 'group', 'Contemporary Jazz'),
  ('Midnight Blue Trio', 'group', 'Bebop & Standards'),
  ('Nina & The Brass', 'group', 'Soul Jazz'),
  ('Chiang Mai Swing Collective', 'group', 'Swing'),
  ('Riverfront Jazz Ensemble', 'group', 'Latin Jazz')
ON DUPLICATE KEY UPDATE artist_type = VALUES(artist_type), genre = VALUES(genre);

INSERT INTO shows (artist_id, performance_date, start_time, end_time)
SELECT artist_id, '2026-10-16', '20:30:00', '22:30:00' FROM artists
WHERE artist_name = 'The Araya Quartet'
  AND NOT EXISTS (SELECT 1 FROM shows WHERE performance_date = '2026-10-16' AND start_time = '20:30:00');

INSERT INTO shows (artist_id, performance_date, start_time, end_time)
SELECT artist_id, '2026-10-17', '21:00:00', '23:00:00' FROM artists
WHERE artist_name = 'Midnight Blue Trio'
  AND NOT EXISTS (SELECT 1 FROM shows WHERE performance_date = '2026-10-17' AND start_time = '21:00:00');

INSERT INTO shows (artist_id, performance_date, start_time, end_time)
SELECT artist_id, '2026-10-18', '20:00:00', '22:00:00' FROM artists
WHERE artist_name = 'Nina & The Brass'
  AND NOT EXISTS (SELECT 1 FROM shows WHERE performance_date = '2026-10-18' AND start_time = '20:00:00');

INSERT INTO shows (artist_id, performance_date, start_time, end_time)
SELECT artist_id, '2026-10-23', '20:30:00', '22:30:00' FROM artists
WHERE artist_name = 'Chiang Mai Swing Collective'
  AND NOT EXISTS (SELECT 1 FROM shows WHERE performance_date = '2026-10-23' AND start_time = '20:30:00');

INSERT INTO shows (artist_id, performance_date, start_time, end_time)
SELECT artist_id, '2026-10-24', '21:00:00', '23:00:00' FROM artists
WHERE artist_name = 'Riverfront Jazz Ensemble'
  AND NOT EXISTS (SELECT 1 FROM shows WHERE performance_date = '2026-10-24' AND start_time = '21:00:00');

-- Guest menu aligned with the MENU_ITEM entity in the ERD.
-- Re-running the seed skips items with the same name.
INSERT INTO menu_items (item_name, category, price, stock_quantity)
SELECT 'Truffle Cream Pasta', 'recommended', 18.50, 12
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE item_name = 'Truffle Cream Pasta');

INSERT INTO menu_items (item_name, category, price, stock_quantity)
SELECT 'Grilled Salmon Steak', 'seasonal', 22.00, 8
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE item_name = 'Grilled Salmon Steak');

INSERT INTO menu_items (item_name, category, price, stock_quantity)
SELECT 'Garnet Negroni', 'recommended', 14.00, 20
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE item_name = 'Garnet Negroni');

INSERT INTO menu_items (item_name, category, price, stock_quantity)
SELECT 'Midnight Mule', 'cocktail', 13.00, 18
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE item_name = 'Midnight Mule');

INSERT INTO menu_items (item_name, category, price, stock_quantity)
SELECT 'Single Malt Flight', 'liquor', 24.00, 10
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE item_name = 'Single Malt Flight');

INSERT INTO menu_items (item_name, category, price, stock_quantity)
SELECT 'Small Batch Bourbon', 'liquor', 16.00, 14
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE item_name = 'Small Batch Bourbon');

INSERT INTO menu_items (item_name, category, price, stock_quantity)
SELECT 'Tiramisu Delight', 'dessert', 9.50, 9
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE item_name = 'Tiramisu Delight');

INSERT INTO menu_items (item_name, category, price, stock_quantity)
SELECT 'Basque Cheesecake', 'dessert', 10.00, 7
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE item_name = 'Basque Cheesecake');

INSERT INTO menu_items (item_name, category, price, stock_quantity)
SELECT 'Truffle Parmesan Fries', 'appetizer', 8.50, 25
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE item_name = 'Truffle Parmesan Fries');

INSERT INTO menu_items (item_name, category, price, stock_quantity)
SELECT 'Mediterranean Salad', 'appetizer', 12.50, 11
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE item_name = 'Mediterranean Salad');
