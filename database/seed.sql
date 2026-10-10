-- Fictional shows. Re-running the seed skips matching rows and preserves existing data.
INSERT INTO shows (show_date, artist, genre, start_time)
SELECT '2026-10-16', 'The Araya Quartet', 'Contemporary Jazz', '20:30:00'
WHERE NOT EXISTS (
  SELECT 1 FROM shows WHERE show_date = '2026-10-16' AND artist = 'The Araya Quartet'
    AND genre = 'Contemporary Jazz' AND start_time = '20:30:00'
);

INSERT INTO shows (show_date, artist, genre, start_time)
SELECT '2026-10-17', 'Midnight Blue Trio', 'Bebop & Standards', '21:00:00'
WHERE NOT EXISTS (
  SELECT 1 FROM shows WHERE show_date = '2026-10-17' AND artist = 'Midnight Blue Trio'
    AND genre = 'Bebop & Standards' AND start_time = '21:00:00'
);

INSERT INTO shows (show_date, artist, genre, start_time)
SELECT '2026-10-18', 'Nina & The Brass', 'Soul Jazz', '20:00:00'
WHERE NOT EXISTS (
  SELECT 1 FROM shows WHERE show_date = '2026-10-18' AND artist = 'Nina & The Brass'
    AND genre = 'Soul Jazz' AND start_time = '20:00:00'
);

INSERT INTO shows (show_date, artist, genre, start_time)
SELECT '2026-10-23', 'Chiang Mai Swing Collective', 'Swing', '20:30:00'
WHERE NOT EXISTS (
  SELECT 1 FROM shows WHERE show_date = '2026-10-23' AND artist = 'Chiang Mai Swing Collective'
    AND genre = 'Swing' AND start_time = '20:30:00'
);

INSERT INTO shows (show_date, artist, genre, start_time)
SELECT '2026-10-24', 'Riverfront Jazz Ensemble', 'Latin Jazz', '21:00:00'
WHERE NOT EXISTS (
  SELECT 1 FROM shows WHERE show_date = '2026-10-24' AND artist = 'Riverfront Jazz Ensemble'
    AND genre = 'Latin Jazz' AND start_time = '21:00:00'
);

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
