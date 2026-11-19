const router = require('express').Router();
const { Op } = require('sequelize');
const { postJournal } = require('../helpers/journal');

// List
router.get('/', async (req, res) => {
  const { PaddyPurchase } = req.models;
  const { supplier_id, status, from, to } = req.query;
  const where = {};
  if (supplier_id) where.supplier_id = supplier_id;
  if (status)      where.payment_status = status;
  if (from || to)  where.purchase_date = {};
  if (from) where.purchase_date[Op.gte] = from;
  if (to)   where.purchase_date[Op.lte] = to;

  const list = await PaddyPurchase.findAll({
    where,
    include: [{ association: 'supplier', attributes: ['id','name','type'] },
              { association: 'variety',  attributes: ['id','name'] }],
    order: [['purchase_date', 'DESC'], ['id', 'DESC']],
  });
  res.json(list);
});

// Get single with payments
router.get('/:id', async (req, res) => {
  const { PaddyPurchase } = req.models;
  const purchase = await PaddyPurchase.findByPk(req.params.id, {
    include: ['supplier', 'variety', 'payments'],
  });
  if (!purchase) return res.status(404).json({ error: 'Not found' });
  res.json(purchase);
});

// Create purchase
router.post('/', async (req, res) => {
  const { PaddyPurchase, Supplier } = req.models;
  const { supplier_id, variety_id, purchase_date, quantity_kg, price_per_kg, moisture_pct, note } = req.body;
  const user_id = req.user?.id || 1;

  const qty   = parseFloat(quantity_kg);
  const price = parseFloat(price_per_kg);
  const total = parseFloat((qty * price).toFixed(2));

  // Auto lot_no: LOT-YYYYMMDD-NNN
  const prefix = `LOT-${purchase_date.replace(/-/g, '')}-`;
  const count  = await PaddyPurchase.count({ where: { lot_no: { [Op.like]: `${prefix}%` } } });
  const lot_no = `${prefix}${String(count + 1).padStart(3, '0')}`;

  const t = await req.db.transaction();
  try {
    const purchase = await PaddyPurchase.create({
      lot_no, supplier_id, variety_id, purchase_date,
      quantity_kg: qty, remaining_kg: qty,
      price_per_kg: price, moisture_pct: moisture_pct || 0,
      total_amount: total, paid_amount: 0, balance: total,
      payment_status: 'unpaid', note, user_id,
    }, { transaction: t });

    // Update supplier payable
    await Supplier.increment('payable_balance', { by: total, where: { id: supplier_id }, transaction: t });

    // Journal: Dr Paddy Stock / Cr Supplier Payables
    await postJournal(req.models, {
      date: purchase_date, description: `Paddy purchase ${lot_no}`,
      source_type: 'paddy_purchase', source_id: purchase.id,
      lines: [
        { account_code: '1300', debit: total, credit: 0,     note: `Lot ${lot_no}` },
        { account_code: '2100', debit: 0,     credit: total, note: `Supplier payable: Lot ${lot_no}` },
      ],
      user_id, t,
    });

    await t.commit();
    res.status(201).json(purchase);
  } catch (err) {
    await t.rollback();
    throw err;
  }
});

// Record a payment against a purchase
router.post('/:id/payments', async (req, res) => {
  const { PaddyPurchase, PaddyPurchasePayment, Supplier, CashAccount } = req.models;
  const { amount, payment_method, cash_account_id, bank_reference, payment_date, note } = req.body;
  const user_id = req.user?.id || 1;
  const pay = parseFloat(amount);

  const purchase = await PaddyPurchase.findByPk(req.params.id);
  if (!purchase) return res.status(404).json({ error: 'Not found' });
  if (pay > parseFloat(purchase.balance)) return res.status(400).json({ error: 'Payment exceeds outstanding balance' });

  const t = await req.db.transaction();
  try {
    await PaddyPurchasePayment.create({
      paddy_purchase_id: purchase.id, amount: pay, payment_method,
      cash_account_id, bank_reference, payment_date, note, user_id,
    }, { transaction: t });

    const newPaid    = parseFloat(purchase.paid_amount) + pay;
    const newBalance = parseFloat(purchase.total_amount) - newPaid;
    const newStatus  = newBalance <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
    await purchase.update({ paid_amount: newPaid, balance: newBalance, payment_status: newStatus }, { transaction: t });

    // Update supplier payable & cash account
    await Supplier.decrement('payable_balance', { by: pay, where: { id: purchase.supplier_id }, transaction: t });
    if (cash_account_id) {
      await CashAccount.decrement('current_balance', { by: pay, where: { id: cash_account_id }, transaction: t });
    }

    // Determine cash/bank account code
    let cashCode = '1100';
    if (cash_account_id) {
      const ca = await CashAccount.findByPk(cash_account_id, { transaction: t });
      cashCode = ca?.type === 'bank' ? '1200' : '1100';
    }

    // Journal: Dr Supplier Payables / Cr Cash/Bank
    await postJournal(req.models, {
      date: payment_date, description: `Payment for paddy lot ${purchase.lot_no}`,
      source_type: 'paddy_purchase_payment', source_id: purchase.id,
      lines: [
        { account_code: '2100',    debit: pay, credit: 0,   note: `Settling Lot ${purchase.lot_no}` },
        { account_code: cashCode,  debit: 0,   credit: pay, note: `Payment method: ${payment_method}` },
      ],
      user_id, t,
    });

    await t.commit();
    res.json({ ok: true, purchase: await PaddyPurchase.findByPk(purchase.id) });
  } catch (err) {
    await t.rollback();
    throw err;
  }
});

// List payments for a purchase
router.get('/:id/payments', async (req, res) => {
  const { PaddyPurchasePayment } = req.models;
  const payments = await PaddyPurchasePayment.findAll({
    where: { paddy_purchase_id: req.params.id },
    order: [['payment_date', 'DESC']],
  });
  res.json(payments);
});

module.exports = router;
