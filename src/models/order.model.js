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

function groupOrders(rows) {
  const orders = new Map();
  for (const row of rows) {
    if (!orders.has(row.order_id)) {
      orders.set(row.order_id, {
        order_id: Number(row.order_id),
        table_id: row.table_id,
        order_date: row.order_date,
        status: row.status,
        total: Number(row.total).toFixed(2),
        payment: row.payment_id ? {
          payment_id: Number(row.payment_id),
          payment_method: row.payment_method,
          amount: Number(row.payment_amount).toFixed(2),
          payment_time: row.payment_time,
        } : null,
        items: [],
      });
    }
    orders.get(row.order_id).items.push({
      item_id: Number(row.item_id),
      item_name: row.item_name,
      price_at_time: Number(row.price_at_time).toFixed(2),
      quantity: Number(row.quantity),
    });
  }
  return [...orders.values()];
}

async function listOpen() {
  const [rows] = await db.execute(
    `SELECT o.order_id, o.table_id,
            DATE_FORMAT(o.order_date, '%Y-%m-%dT%H:%i:%s') AS order_date,
            o.status, o.total,
            oi.item_id, mi.item_name, oi.price_at_time, oi.quantity,
            p.payment_id, p.payment_method, p.amount AS payment_amount,
            DATE_FORMAT(p.payment_time, '%Y-%m-%dT%H:%i:%s') AS payment_time
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.order_id
     JOIN menu_items mi ON mi.item_id = oi.item_id
     LEFT JOIN payments p ON p.order_id = o.order_id
     WHERE o.status <> 'cancelled'
     ORDER BY o.order_date DESC, o.order_id DESC, mi.item_name`
  );
  return groupOrders(rows);
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
    const [openOrders] = await connection.execute(
      `SELECT order_id, status FROM orders
       WHERE table_id = ? AND status IN ('pending', 'preparing', 'served')
       ORDER BY order_id DESC LIMIT 1 FOR UPDATE`,
      [table_id]
    );
    let orderId;
    let status;
    if (openOrders.length) {
      orderId = Number(openOrders[0].order_id);
      status = openOrders[0].status;
    } else {
      const [orderResult] = await connection.execute(
        "INSERT INTO orders (table_id, status, total) VALUES (?, 'pending', '0.00')",
        [table_id]
      );
      orderId = orderResult.insertId;
      status = 'pending';
    }

    await connection.execute(
      `INSERT INTO order_items (order_id, item_id, price_at_time, quantity)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
      [orderId, item_id, priceAtTime, quantity, quantity]
    );
    const [stockResult] = await connection.execute(
      `UPDATE menu_items SET stock_quantity = stock_quantity - ?
       WHERE item_id = ? AND stock_quantity >= ?`,
      [quantity, item_id, quantity]
    );
    if (!stockResult.affectedRows) throw orderError('INSUFFICIENT_STOCK');

    const [totals] = await connection.execute(
      `SELECT COALESCE(SUM(price_at_time * quantity), 0) AS total
       FROM order_items WHERE order_id = ?`,
      [orderId]
    );
    const total = Number(totals[0].total).toFixed(2);
    await connection.execute('UPDATE orders SET total = ? WHERE order_id = ?', [total, orderId]);

    await connection.commit();
    return {
      order_id: orderId,
      table_id,
      status,
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

module.exports = { listAvailableTables, listOpen, create, groupOrders };
