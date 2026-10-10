const order = require('../models/order.model');

function validUnsignedId(value) {
  return /^[1-9]\d*$/.test(String(value)) && Number(value) <= 4294967295;
}

function validateOrder(body = {}) {
  const tableId = typeof body.table_id === 'string' ? body.table_id.trim().toUpperCase() : '';
  const quantity = Number(body.quantity);

  if (!tableId || tableId.length > 10 || !/^[A-Z0-9-]+$/.test(tableId)) {
    return { error: 'Please select a valid table ID.' };
  }
  if (!validUnsignedId(body.item_id)) {
    return { error: 'Please select a valid menu item.' };
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return { error: 'Quantity must be a whole number from 1 to 99.' };
  }
  return { value: { table_id: tableId, item_id: Number(body.item_id), quantity } };
}

async function listTables(req, res, next) {
  res.set('Cache-Control', 'no-store');
  try {
    res.json({ data: await order.listAvailableTables() });
  } catch (error) {
    next(error);
  }
}

async function listOrders(req, res, next) {
  res.set('Cache-Control', 'no-store');
  try {
    res.json({ data: await order.listOpen() });
  } catch (error) {
    next(error);
  }
}

async function createOrder(req, res, next) {
  const { value, error } = validateOrder(req.body || {});
  if (error) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error } });
  }
  try {
    res.status(201).json({ data: await order.create(value) });
  } catch (error) {
    const errors = {
      TABLE_NOT_FOUND: [404, 'The selected table does not exist.'],
      TABLE_NOT_AVAILABLE: [409, 'The selected table is not available for ordering.'],
      MENU_ITEM_NOT_FOUND: [404, 'This menu item is no longer available.'],
      INSUFFICIENT_STOCK: [409, 'There is not enough stock for this quantity.'],
    };
    if (errors[error.code]) {
      const [status, message] = errors[error.code];
      return res.status(status).json({ error: { code: error.code, message } });
    }
    next(error);
  }
}

module.exports = { listTables, listOrders, createOrder, validateOrder };
