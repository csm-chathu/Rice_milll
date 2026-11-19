const router = require('express').Router();
const { postJournal } = require('../helpers/journal');

// List
router.get('/', async (req, res) => {
  const { OpeningBalance } = req.models;
  const balances = await OpeningBalance.findAll({ order: [['type', 'ASC'], ['reference_name', 'ASC']] });
  res.json(balances);
});

// Upsert a single opening balance entry
router.post('/', async (req, res) => {
  const { OpeningBalance } = req.models;
  const { type, reference_id, reference_name, amount, quantity_kg, note } = req.body;
  const user_id = req.user?.id || 1;

  const existing = await OpeningBalance.findOne({ where: { type, reference_id } });
  if (existing) {
    if (existing.posted) return res.status(400).json({ error: 'Opening balances already posted — cannot edit.' });
    await existing.update({ reference_name, amount: amount || 0, quantity_kg: quantity_kg || 0, note });
    return res.json(existing);
  }
  const ob = await OpeningBalance.create({ type, reference_id, reference_name, amount: amount || 0, quantity_kg: quantity_kg || 0, note, user_id });
  res.status(201).json(ob);
});

// Post all opening balances (run once — writes journal entries + updates all balances)
router.post('/post', async (req, res) => {
  const { OpeningBalance, Supplier, Customer, CashAccount, RiceGrade, LabourWorker, JournalEntry } = req.models;
  const user_id = req.user?.id || 1;

  const already = await OpeningBalance.findOne({ where: { posted: true } });
  if (already) return res.status(400).json({ error: 'Opening balances have already been posted.' });

  const balances = await OpeningBalance.findAll();
  if (!balances.length) return res.status(400).json({ error: 'No opening balances to post.' });

  const t = await req.db.transaction();
  try {
    const today = new Date().toISOString().slice(0, 10);
    const lines = [];

    for (const ob of balances) {
      const amt = parseFloat(ob.amount) || 0;
      const qty = parseFloat(ob.quantity_kg) || 0;

      if (ob.type === 'supplier_payable' && amt > 0) {
        await Supplier.increment('payable_balance', { by: amt, where: { id: ob.reference_id }, transaction: t });
        lines.push({ account_code: '1300', debit: amt,  credit: 0,   note: `Opening: ${ob.reference_name}` }); // Paddy Stock as proxy asset
        lines.push({ account_code: '2100', debit: 0,    credit: amt, note: `Opening payable: ${ob.reference_name}` });
      }

      if (ob.type === 'customer_receivable' && amt > 0) {
        await Customer.increment('credit_balance', { by: amt, where: { id: ob.reference_id }, transaction: t });
        lines.push({ account_code: '1700', debit: amt,  credit: 0,   note: `Opening receivable: ${ob.reference_name}` });
        lines.push({ account_code: '3100', debit: 0,    credit: amt, note: `Opening capital` });
      }

      if (ob.type === 'cash_account' && amt !== 0) {
        await CashAccount.update({ current_balance: amt }, { where: { id: ob.reference_id }, transaction: t });
        const code = (await CashAccount.findByPk(ob.reference_id))?.type === 'bank' ? '1200' : '1100';
        lines.push({ account_code: code,   debit: amt,  credit: 0,   note: `Opening balance: ${ob.reference_name}` });
        lines.push({ account_code: '3100', debit: 0,    credit: amt, note: `Opening capital` });
      }

      if (ob.type === 'rice_stock' && qty > 0) {
        await RiceGrade.update({ current_stock: qty, opening_stock: qty }, { where: { id: ob.reference_id }, transaction: t });
        lines.push({ account_code: '1400', debit: amt,  credit: 0,   note: `Opening stock: ${ob.reference_name}` });
        lines.push({ account_code: '3100', debit: 0,    credit: amt, note: `Opening capital` });
      }

      if (ob.type === 'worker_advance' && amt > 0) {
        await LabourWorker.update({ opening_advance: amt, advance_balance: amt }, { where: { id: ob.reference_id }, transaction: t });
        lines.push({ account_code: '1600', debit: amt,  credit: 0,   note: `Opening advance: ${ob.reference_name}` });
        lines.push({ account_code: '3100', debit: 0,    credit: amt, note: `Opening capital` });
      }

      await ob.update({ posted: true }, { transaction: t });
    }

    if (lines.length) {
      await postJournal(req.models, {
        date: today, description: 'Opening balances', source_type: 'opening_balance',
        source_id: 0, lines, user_id, t,
      });
    }

    await t.commit();
    res.json({ ok: true, message: 'Opening balances posted successfully.' });
  } catch (err) {
    await t.rollback();
    throw err;
  }
});

module.exports = router;
