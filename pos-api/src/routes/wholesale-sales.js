const router = require('express').Router();
const { Op } = require('sequelize');
const { postJournal } = require('../helpers/journal');

// List
router.get('/', async (req, res) => {
  const { WholesaleSale } = req.models;
  const { customer_id, status, from, to } = req.query;
  const where = {};
  if (customer_id) where.customer_id = customer_id;
  if (status)      where.payment_status = status;
  if (from || to)  where.sale_date = {};
  if (from) where.sale_date[Op.gte] = from;
  if (to)   where.sale_date[Op.lte] = to;

  const list = await WholesaleSale.findAll({
    where,
    include: [{ association: 'customer', attributes: ['id','name','phone'] },
              { association: 'items' }],
    order: [['sale_date', 'DESC'], ['id', 'DESC']],
  });
  res.json(list);
});

router.get('/:id', async (req, res) => {
  const { WholesaleSale } = req.models;
  const sale = await WholesaleSale.findByPk(req.params.id, { include: ['customer','items','payments'] });
  if (!sale) return res.status(404).json({ error: 'Not found' });
  res.json(sale);
});

// Create sale
// Body: { customer_id, sale_date, discount, note,
//   items: [{ rice_grade_id, grade_name, quantity_kg, price_per_kg }],
//   payment: { amount, payment_method, cash_account_id, bank_reference } }  // optional immediate payment
router.post('/', async (req, res) => {
  const { WholesaleSale, WholesaleSaleItem, WholesaleSalePayment, RiceGrade, Customer, CashAccount } = req.models;
  const { customer_id, sale_date, discount, note, items, payment } = req.body;
  const user_id = req.user?.id || 1;

  if (!items?.length) return res.status(400).json({ error: 'items required' });

  // Validate stock
  for (const it of items) {
    const grade = await RiceGrade.findByPk(it.rice_grade_id);
    if (!grade) return res.status(400).json({ error: `Rice grade ${it.rice_grade_id} not found` });
    if (parseFloat(grade.current_stock) < parseFloat(it.quantity_kg)) {
      return res.status(400).json({ error: `Insufficient stock for ${grade.name}` });
    }
  }

  const subtotal = items.reduce((s, i) => s + parseFloat(i.quantity_kg) * parseFloat(i.price_per_kg), 0);
  const disc     = parseFloat(discount) || 0;
  const total    = parseFloat((subtotal - disc).toFixed(2));
  const paidNow  = payment ? parseFloat(payment.amount) || 0 : 0;
  const balance  = parseFloat((total - paidNow).toFixed(2));
  const status   = balance <= 0 ? 'paid' : paidNow > 0 ? 'partial' : 'unpaid';

  // Auto invoice_no: INV-YYYYMMDD-NNN
  const prefix     = `INV-${sale_date.replace(/-/g, '')}-`;
  const count      = await WholesaleSale.count({ where: { invoice_no: { [Op.like]: `${prefix}%` } } });
  const invoice_no = `${prefix}${String(count + 1).padStart(3, '0')}`;

  const t = await req.db.transaction();
  try {
    const sale = await WholesaleSale.create({
      invoice_no, customer_id, sale_date,
      subtotal: parseFloat(subtotal.toFixed(2)), discount: disc, total, paid: paidNow, balance, payment_status: status, note, user_id,
    }, { transaction: t });

    for (const it of items) {
      await WholesaleSaleItem.create({
        sale_id: sale.id, rice_grade_id: it.rice_grade_id, grade_name: it.grade_name,
        quantity_kg: it.quantity_kg, price_per_kg: it.price_per_kg,
        total: parseFloat((parseFloat(it.quantity_kg) * parseFloat(it.price_per_kg)).toFixed(2)),
      }, { transaction: t });
      await RiceGrade.decrement('current_stock', { by: it.quantity_kg, where: { id: it.rice_grade_id }, transaction: t });
    }

    if (customer_id && balance > 0) {
      await Customer.increment('credit_balance', { by: balance, where: { id: customer_id }, transaction: t });
    }

    // Journal lines
    const journalLines = [];
    if (paidNow > 0) {
      let cashCode = '1100';
      if (payment?.cash_account_id) {
        const ca = await CashAccount.findByPk(payment.cash_account_id, { transaction: t });
        cashCode = ca?.type === 'bank' ? '1200' : '1100';
        await CashAccount.increment('current_balance', { by: paidNow, where: { id: payment.cash_account_id }, transaction: t });
      }
      journalLines.push({ account_code: cashCode, debit: paidNow, credit: 0, note: `Cash received - ${invoice_no}` });
    }
    if (balance > 0) {
      journalLines.push({ account_code: '1700', debit: balance, credit: 0, note: `Credit sale - ${invoice_no}` });
    }
    journalLines.push({ account_code: '4100', debit: 0, credit: total, note: `Sale - ${invoice_no}` });

    await postJournal(req.models, {
      date: sale_date, description: `Wholesale sale ${invoice_no}`,
      source_type: 'wholesale_sale', source_id: sale.id,
      lines: journalLines, user_id, t,
    });

    // Record immediate payment if provided
    if (paidNow > 0 && payment) {
      await WholesaleSalePayment.create({
        sale_id: sale.id, amount: paidNow, payment_method: payment.payment_method,
        cash_account_id: payment.cash_account_id, bank_reference: payment.bank_reference,
        payment_date: sale_date, note: 'Payment at sale', user_id,
      }, { transaction: t });
    }

    await t.commit();
    res.status(201).json(await WholesaleSale.findByPk(sale.id, { include: ['customer','items','payments'] }));
  } catch (err) {
    await t.rollback();
    throw err;
  }
});

// Record a payment against a sale
router.post('/:id/payments', async (req, res) => {
  const { WholesaleSale, WholesaleSalePayment, Customer, CashAccount } = req.models;
  const { amount, payment_method, cash_account_id, bank_reference, payment_date, note } = req.body;
  const user_id = req.user?.id || 1;
  const pay = parseFloat(amount);

  const sale = await WholesaleSale.findByPk(req.params.id);
  if (!sale) return res.status(404).json({ error: 'Not found' });
  if (pay > parseFloat(sale.balance)) return res.status(400).json({ error: 'Payment exceeds outstanding balance' });

  const t = await req.db.transaction();
  try {
    await WholesaleSalePayment.create({
      sale_id: sale.id, amount: pay, payment_method, cash_account_id, bank_reference, payment_date, note, user_id,
    }, { transaction: t });

    const newPaid   = parseFloat(sale.paid) + pay;
    const newBal    = parseFloat(sale.total) - newPaid;
    const newStatus = newBal <= 0 ? 'paid' : 'partial';
    await sale.update({ paid: newPaid, balance: newBal, payment_status: newStatus }, { transaction: t });

    if (sale.customer_id) {
      await Customer.decrement('credit_balance', { by: pay, where: { id: sale.customer_id }, transaction: t });
    }

    let cashCode = '1100';
    if (cash_account_id) {
      const ca = await CashAccount.findByPk(cash_account_id, { transaction: t });
      cashCode = ca?.type === 'bank' ? '1200' : '1100';
      await CashAccount.increment('current_balance', { by: pay, where: { id: cash_account_id }, transaction: t });
    }

    await postJournal(req.models, {
      date: payment_date, description: `Payment received - Invoice ${sale.invoice_no}`,
      source_type: 'wholesale_sale_payment', source_id: sale.id,
      lines: [
        { account_code: cashCode, debit: pay, credit: 0,   note: `Collected from customer` },
        { account_code: '1700',   debit: 0,   credit: pay, note: `Clearing receivable - ${sale.invoice_no}` },
      ],
      user_id, t,
    });

    await t.commit();
    res.json({ ok: true, sale: await WholesaleSale.findByPk(sale.id) });
  } catch (err) {
    await t.rollback();
    throw err;
  }
});

module.exports = router;
