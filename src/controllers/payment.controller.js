const payment = require('../models/payment.model');

const paymentMethods = new Map([
  ['cash', 'Cash'],
  ['credit card', 'Credit Card'],
  ['promptpay', 'PromptPay'],
]);

function validId(value) {
  return /^[1-9]\d*$/.test(String(value)) && Number(value) <= 4294967295;
}

function validatePayment(body = {}) {
  const rawMethod = typeof body.payment_method === 'string' ? body.payment_method.trim().toLowerCase() : '';
  const method = paymentMethods.get(rawMethod);
  const amount = Number(body.amount);
  if (!validId(body.order_id)) return { error: 'Please select a valid order.' };
  if (!method) return { error: 'Please select a valid payment method.' };
  if (!Number.isFinite(amount) || amount <= 0 || amount > 99999999.99 || !/^\d+(?:\.\d{1,2})?$/.test(String(body.amount).trim())) {
    return { error: 'Amount must be greater than zero with no more than two decimal places.' };
  }
  return { value: { order_id: Number(body.order_id), payment_method: method, amount: amount.toFixed(2) } };
}

async function createPayment(req, res, next) {
  const { value, error } = validatePayment(req.body || {});
  if (error) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error } });
  try {
    res.status(201).json({ data: await payment.create(value) });
  } catch (error) {
    const errors = {
      ORDER_NOT_FOUND: [404, 'This order no longer exists.'],
      ORDER_NOT_PAYABLE: [409, 'A cancelled order cannot be paid.'],
      PAYMENT_EXISTS: [409, 'This order has already been paid.'],
      PAYMENT_AMOUNT_MISMATCH: [409, 'Payment amount must equal the current order total.'],
    };
    if (errors[error.code]) {
      const [status, message] = errors[error.code];
      return res.status(status).json({ error: { code: error.code, message } });
    }
    next(error);
  }
}

module.exports = { createPayment, validatePayment };
