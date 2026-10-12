const db = require('../config/db');

function paymentError(code) {
  return Object.assign(new Error(code), { code });
}

async function create({ order_id, payment_method, amount }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [orders] = await connection.execute(
      `SELECT o.order_id, o.reservation_id, r.table_id, o.status, o.total_amount
       FROM orders o
       JOIN reservations r ON r.reservation_id = o.reservation_id
       WHERE o.order_id = ? FOR UPDATE`,
      [order_id]
    );
    if (!orders.length) throw paymentError('ORDER_NOT_FOUND');

    const order = orders[0];
    if (order.status === 'cancelled') throw paymentError('ORDER_NOT_PAYABLE');
    const [existing] = await connection.execute(
      'SELECT payment_id FROM payments WHERE order_id = ?',
      [order_id]
    );
    if (order.status === 'paid' || existing.length) throw paymentError('PAYMENT_EXISTS');
    if (Number(amount).toFixed(2) !== Number(order.total_amount).toFixed(2)) {
      throw paymentError('PAYMENT_AMOUNT_MISMATCH');
    }

    const [result] = await connection.execute(
      `INSERT INTO payments (order_id, payment_method, amount)
       VALUES (?, ?, ?)`,
      [order_id, payment_method, amount]
    );
    await connection.execute("UPDATE orders SET status = 'paid' WHERE order_id = ?", [order_id]);
    const [rows] = await connection.execute(
      `SELECT payment_id, order_id, payment_method, amount,
              DATE_FORMAT(payment_time, '%Y-%m-%dT%H:%i:%s') AS payment_time
       FROM payments WHERE payment_id = ?`,
      [result.insertId]
    );
    await connection.commit();
    return {
      ...rows[0],
      payment_id: Number(rows[0].payment_id),
      order_id: Number(rows[0].order_id),
      reservation_id: Number(order.reservation_id),
      amount: Number(rows[0].amount).toFixed(2),
      table_id: order.table_id,
    };
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw paymentError('PAYMENT_EXISTS');
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { create };
