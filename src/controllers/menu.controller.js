const menu = require('../models/menu.model');

const categories = new Set(['recommended', 'seasonal', 'cocktail', 'liquor', 'dessert', 'appetizer']);

function validId(value) {
  return /^[1-9]\d*$/.test(value) && Number(value) <= 4294967295;
}

function validateMenuItem(body = {}) {
  const itemName = typeof body.item_name === 'string' ? body.item_name.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim().toLowerCase() : '';
  const price = typeof body.price === 'number' || typeof body.price === 'string' ? Number(body.price) : NaN;
  const stockQuantity = typeof body.stock_quantity === 'number' || typeof body.stock_quantity === 'string'
    ? Number(body.stock_quantity) : NaN;

  if (!itemName || itemName.length > 120) return { error: 'Item name must contain 1–120 characters.' };
  if (!categories.has(category)) return { error: 'Please select a valid menu category.' };
  if (!Number.isFinite(price) || price <= 0 || price > 99999.99 || !/^\d+(?:\.\d{1,2})?$/.test(String(body.price).trim())) {
    return { error: 'Price must be greater than zero with no more than two decimal places.' };
  }
  if (!Number.isInteger(stockQuantity) || stockQuantity < 0 || stockQuantity > 4294967295) {
    return { error: 'Stock quantity must be a whole number from 0 to 4294967295.' };
  }

  return {
    item: {
      item_name: itemName,
      category,
      price: price.toFixed(2),
      stock_quantity: stockQuantity,
    },
  };
}

function duplicateError(error, res, next) {
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      error: { code: 'MENU_ITEM_EXISTS', message: 'A menu item with this name already exists.' },
    });
  }
  next(error);
}

async function listPublic(req, res, next) {
  res.set('Cache-Control', 'no-store');
  try {
    res.json({ data: await menu.listAvailable() });
  } catch (error) {
    next(error);
  }
}

async function listAdmin(req, res, next) {
  res.set('Cache-Control', 'no-store');
  try {
    res.json({ data: await menu.listAll() });
  } catch (error) {
    next(error);
  }
}

async function createItem(req, res, next) {
  const { item, error } = validateMenuItem(req.body || {});
  if (error) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error } });
  try {
    res.status(201).json({ data: await menu.create(item) });
  } catch (error) {
    duplicateError(error, res, next);
  }
}

async function updateItem(req, res, next) {
  if (!validId(req.params.itemId)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid menu item ID.' } });
  }
  const { item, error } = validateMenuItem(req.body || {});
  if (error) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error } });
  try {
    const updated = await menu.update(Number(req.params.itemId), item);
    if (!updated) return res.status(404).json({ error: { code: 'MENU_ITEM_NOT_FOUND', message: 'This menu item no longer exists.' } });
    res.json({ data: updated });
  } catch (error) {
    duplicateError(error, res, next);
  }
}

async function deleteItem(req, res, next) {
  if (!validId(req.params.itemId)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid menu item ID.' } });
  }
  try {
    if (!await menu.remove(Number(req.params.itemId))) {
      return res.status(404).json({ error: { code: 'MENU_ITEM_NOT_FOUND', message: 'This menu item no longer exists.' } });
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

module.exports = { listPublic, listAdmin, createItem, updateItem, deleteItem, validateMenuItem };
