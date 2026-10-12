const db = require('../config/db');

function orderError(code) { return Object.assign(new Error(code), { code }); }

async function listAvailableTables() {
  const [rows] = await db.execute(
    `SELECT table_id, capacity, zone FROM club_tables
     WHERE status = 'available' ORDER BY zone, table_id`
  );
  return rows.map(row => ({ ...row, capacity: Number(row.capacity) }));
}

function groupOrders(rows) {
  const orders = new Map();
  for (const row of rows) {
    if (!orders.has(row.order_id)) {
      orders.set(row.order_id, {
        order_id: Number(row.order_id), reservation_id: Number(row.reservation_id),
        table_id: row.table_id, guest_name: row.guest_name, artist_name: row.artist_name,
        order_time: row.order_time, status: row.status,
        total_amount: Number(row.total_amount).toFixed(2),
        payment: row.payment_id ? {
          payment_id: Number(row.payment_id), payment_method: row.payment_method,
          amount: Number(row.payment_amount).toFixed(2), payment_time: row.payment_time,
        } : null,
        items: [],
      });
    }
    orders.get(row.order_id).items.push({
      item_id: Number(row.item_id), item_name: row.item_name,
      price_at_time: Number(row.price_at_time).toFixed(2), quantity: Number(row.quantity),
    });
  }
  return [...orders.values()];
}

async function listOpen() {
  const [rows] = await db.execute(
    `SELECT o.order_id, o.reservation_id, r.table_id, c.name AS guest_name, a.artist_name,
            DATE_FORMAT(o.order_time, '%Y-%m-%dT%H:%i:%s') AS order_time,
            o.status, o.total_amount, oi.item_id, mi.item_name, oi.price_at_time, oi.quantity,
            p.payment_id, p.payment_method, p.amount AS payment_amount,
            DATE_FORMAT(p.payment_time, '%Y-%m-%dT%H:%i:%s') AS payment_time
     FROM orders o
     JOIN reservations r ON r.reservation_id = o.reservation_id
     JOIN customers c ON c.customer_id = r.customer_id
     JOIN shows s ON s.show_id = r.show_id
     JOIN artists a ON a.artist_id = s.artist_id
     JOIN order_items oi ON oi.order_id = o.order_id
     JOIN menu_items mi ON mi.item_id = oi.item_id
     LEFT JOIN payments p ON p.order_id = o.order_id
     WHERE o.status <> 'cancelled'
     ORDER BY o.order_time DESC, o.order_id DESC, mi.item_name`
  );
  return groupOrders(rows);
}

async function create({ reservation_id, item_id, quantity }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [reservationRows] = await connection.execute(
      `SELECT reservation_id, table_id, status FROM reservations
       WHERE reservation_id = ? FOR UPDATE`, [reservation_id]
    );
    if (!reservationRows.length) throw orderError('RESERVATION_NOT_FOUND');
    if (!['confirmed', 'completed'].includes(reservationRows[0].status)) throw orderError('RESERVATION_NOT_ACTIVE');

    const [items] = await connection.execute(
      `SELECT item_id, item_name, price, stock_quantity FROM menu_items
       WHERE item_id = ? FOR UPDATE`, [item_id]
    );
    if (!items.length) throw orderError('MENU_ITEM_NOT_FOUND');
    const item = items[0];
    if (Number(item.stock_quantity) < quantity) throw orderError('INSUFFICIENT_STOCK');

    const [openOrders] = await connection.execute(
      `SELECT order_id, status FROM orders
       WHERE reservation_id = ? AND status IN ('pending', 'preparing', 'served')
       ORDER BY order_id DESC LIMIT 1 FOR UPDATE`, [reservation_id]
    );
    let orderId;
    let status;
    if (openOrders.length) {
      orderId = Number(openOrders[0].order_id);
      status = openOrders[0].status;
    } else {
      const [result] = await connection.execute(
        "INSERT INTO orders (reservation_id, status) VALUES (?, 'pending')", [reservation_id]
      );
      orderId = result.insertId;
      status = 'pending';
    }

    const priceAtTime = Number(item.price).toFixed(2);
    await connection.execute(
      `INSERT INTO order_items (order_id, item_id, price_at_time, quantity)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
      [orderId, item_id, priceAtTime, quantity, quantity]
    );
    const [stockResult] = await connection.execute(
      `UPDATE menu_items SET stock_quantity = stock_quantity - ?
       WHERE item_id = ? AND stock_quantity >= ?`, [quantity, item_id, quantity]
    );
    if (!stockResult.affectedRows) throw orderError('INSUFFICIENT_STOCK');

    const [orderRows] = await connection.execute(
      'SELECT total_amount FROM orders WHERE order_id = ?', [orderId]
    );
    await connection.commit();
    return {
      order_id: orderId, reservation_id, table_id: reservationRows[0].table_id,
      status, total_amount: Number(orderRows[0].total_amount).toFixed(2),
      item: { item_id, item_name: item.item_name, price_at_time: priceAtTime, quantity },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { listAvailableTables, listOpen, create, groupOrders };
