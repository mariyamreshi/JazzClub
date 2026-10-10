const db = require('../config/db');

function orderError(code) {
  return Object.assign(new Error(code), { code });
}

async function listAvailableTables() {
  const [rows] = await db.execute(
    `SELECT table_id, capacity, zone
     FROM club_tables
     WHERE status = 'available'
     ORDER BY zone, table_id`
  );
  return rows.map(row => ({
    table_id: row.table_id,
    capacity: Number(row.capacity),
    zone: row.zone,
  }));
}

async function create({ table_id, item_id, quantity }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [tables] = await connection.execute(
      'SELECT table_id, status FROM club_tables WHERE table_id = ? FOR UPDATE',
      [table_id]
    );
    if (!tables.length) throw orderError('TABLE_NOT_FOUND');
    if (tables[0].status !== 'available') throw orderError('TABLE_NOT_AVAILABLE');

    const [items] = await connection.execute(
      `SELECT item_id, item_name, price, stock_quantity
       FROM menu_items WHERE item_id = ? FOR UPDATE`,
      [item_id]
    );
    if (!items.length) throw orderError('MENU_ITEM_NOT_FOUND');

    const item = items[0];
    if (Number(item.stock_quantity) < quantity) throw orderError('INSUFFICIENT_STOCK');
    const priceAtTime = Number(item.price).toFixed(2);
    const total = (Number(priceAtTime) * quantity).toFixed(2);

    const [orderResult] = await connection.execute(
      "INSERT INTO orders (table_id, status, total) VALUES (?, 'pending', ?)",
      [table_id, total]
    );
    await connection.execute(
      `INSERT INTO order_items (order_id, item_id, price_at_time, quantity)
       VALUES (?, ?, ?, ?)`,
      [orderResult.insertId, item_id, priceAtTime, quantity]
    );
    const [stockResult] = await connection.execute(
      `UPDATE menu_items SET stock_quantity = stock_quantity - ?
       WHERE item_id = ? AND stock_quantity >= ?`,
      [quantity, item_id, quantity]
    );
    if (!stockResult.affectedRows) throw orderError('INSUFFICIENT_STOCK');

    await connection.commit();
    return {
      order_id: orderResult.insertId,
      table_id,
      status: 'pending',
      total,
      item: {
        item_id,
        item_name: item.item_name,
        price_at_time: priceAtTime,
        quantity,
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { listAvailableTables, create };
