-- 6 Low-stock menu items
SELECT item_id,item_name,category,stock_quantity FROM menu_items WHERE stock_quantity<=10 ORDER BY stock_quantity,item_name;
