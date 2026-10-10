const db = require('../config/db');

const selectFields = 'item_id, item_name, category, price, stock_quantity';

function normalize(row) {
  return {
    ...row,
    price: Number(row.price).toFixed(2),
    stock_quantity: Number(row.stock_quantity),
  };
}

async function listAvailable() {
  const [rows] = await db.execute(
    `SELECT ${selectFields} FROM menu_items
     WHERE stock_quantity > 0
     ORDER BY category, item_name`
  );
  return rows.map(normalize);
}

async function listAll() {
  const [rows] = await db.execute(
    `SELECT ${selectFields} FROM menu_items
     ORDER BY category, item_name`
  );
  return rows.map(normalize);
}

async function findById(itemId) {
  const [rows] = await db.execute(
    `SELECT ${selectFields} FROM menu_items WHERE item_id = ?`,
    [itemId]
  );
  return rows[0] ? normalize(rows[0]) : null;
}

async function create(item) {
  const { item_name, category, price, stock_quantity } = item;
  const [result] = await db.execute(
    `INSERT INTO menu_items (item_name, category, price, stock_quantity)
     VALUES (?, ?, ?, ?)`,
    [item_name, category, price, stock_quantity]
  );
  return { item_id: result.insertId, ...item };
}

async function update(itemId, item) {
  const { item_name, category, price, stock_quantity } = item;
  const [result] = await db.execute(
    `UPDATE menu_items SET item_name = ?, category = ?, price = ?, stock_quantity = ?
     WHERE item_id = ?`,
    [item_name, category, price, stock_quantity, itemId]
  );
  return result.affectedRows ? { item_id: itemId, ...item } : null;
}

async function remove(itemId) {
  const [result] = await db.execute('DELETE FROM menu_items WHERE item_id = ?', [itemId]);
  return result.affectedRows > 0;
}

module.exports = { listAvailable, listAll, findById, create, update, remove };
