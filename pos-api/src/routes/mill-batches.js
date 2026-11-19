const router = require('express').Router();
const { Op } = require('sequelize');
const { postJournal } = require('../helpers/journal');

// List
router.get('/', async (req, res) => {
  const { MillBatch } = req.models;
  const { from, to } = req.query;
  const where = {};
  if (from || to) where.mill_date = {};
  if (from) where.mill_date[Op.gte] = from;
  if (to)   where.mill_date[Op.lte] = to;

  const list = await MillBatch.findAll({
    where,
    include: [
      { association: 'inputs',  include: [{ association: 'paddyLot', attributes: ['id','lot_no','variety_id'] }] },
      { association: 'outputs', include: [{ association: 'riceGrade', attributes: ['id','name','type'] }] },
    ],
    order: [['mill_date', 'DESC'], ['id', 'DESC']],
  });
  res.json(list);
});

router.get('/:id', async (req, res) => {
  const { MillBatch } = req.models;
  const batch = await MillBatch.findByPk(req.params.id, {
    include: ['inputs', 'outputs'],
  });
  if (!batch) return res.status(404).json({ error: 'Not found' });
  res.json(batch);
});

// Create a milling batch
// Body: { mill_date, milling_cost, note,
//   inputs:  [{ paddy_purchase_id, quantity_kg }],
//   outputs: [{ rice_grade_id, quantity_kg }] }
router.post('/', async (req, res) => {
  const { MillBatch, MillBatchInput, MillBatchOutput, PaddyPurchase, RiceGrade, CashAccount } = req.models;
  const { mill_date, milling_cost, note, inputs, outputs } = req.body;
  const user_id      = req.user?.id || 1;
  const millingCost  = parseFloat(milling_cost) || 0;

  if (!inputs?.length)  return res.status(400).json({ error: 'inputs required' });
  if (!outputs?.length) return res.status(400).json({ error: 'outputs required' });

  // Validate paddy stock
  for (const inp of inputs) {
    const lot = await PaddyPurchase.findByPk(inp.paddy_purchase_id);
    if (!lot) return res.status(400).json({ error: `Paddy lot ${inp.paddy_purchase_id} not found` });
    if (parseFloat(lot.remaining_kg) < parseFloat(inp.quantity_kg)) {
      return res.status(400).json({ error: `Insufficient remaining paddy in lot ${lot.lot_no}` });
    }
  }

  const totalPaddyIn = inputs.reduce((s, i) => s + parseFloat(i.quantity_kg), 0);

  // Auto batch_no
  const prefix  = `MB-${mill_date.replace(/-/g, '')}-`;
  const count   = await MillBatch.count({ where: { batch_no: { [Op.like]: `${prefix}%` } } });
  const batch_no = `${prefix}${String(count + 1).padStart(3, '0')}`;

  const t = await req.db.transaction();
  try {
    const batch = await MillBatch.create({
      batch_no, mill_date, paddy_qty_in: totalPaddyIn, milling_cost: millingCost, status: 'completed', note, user_id,
    }, { transaction: t });

    // Inputs — deduct remaining_kg from each paddy lot
    for (const inp of inputs) {
      await MillBatchInput.create({ batch_id: batch.id, paddy_purchase_id: inp.paddy_purchase_id, quantity_kg: inp.quantity_kg }, { transaction: t });
      await PaddyPurchase.decrement('remaining_kg', { by: inp.quantity_kg, where: { id: inp.paddy_purchase_id }, transaction: t });
    }

    // Outputs — add to rice grade stock + calc yield
    let totalRiceValue = 0;
    for (const out of outputs) {
      const yieldPct = parseFloat(((parseFloat(out.quantity_kg) / totalPaddyIn) * 100).toFixed(2));
      await MillBatchOutput.create({ batch_id: batch.id, rice_grade_id: out.rice_grade_id, quantity_kg: out.quantity_kg, yield_pct: yieldPct }, { transaction: t });
      await RiceGrade.increment('current_stock', { by: out.quantity_kg, where: { id: out.rice_grade_id }, transaction: t });

      // Approximate value for journal: use a nominal cost (paddy cost * yield_pct / 100)
      // We'll just move value proportionally; actual cost is captured in paddy purchase
      totalRiceValue += parseFloat(out.quantity_kg);
    }

    // Build journal lines
    // Dr Rice Stock (1400) + By-products (1500) + Milling Cost (5300)
    // Cr Paddy Stock (1300) + Cash/Bank (1100) for milling cost
    const lines = [
      { account_code: '1400', debit: totalRiceValue, credit: 0, note: `Rice output - Batch ${batch_no}` },
      { account_code: '1300', debit: 0, credit: totalRiceValue, note: `Paddy consumed - Batch ${batch_no}` },
    ];
    if (millingCost > 0) {
      lines.push({ account_code: '5300', debit: millingCost, credit: 0,           note: `Milling cost - ${batch_no}` });
      lines.push({ account_code: '1100', debit: 0,           credit: millingCost, note: `Cash paid for milling` });
      // Also deduct from default cash account
      const cashAcct = await CashAccount.findOne({ where: { type: 'cash', active: true }, transaction: t });
      if (cashAcct) await CashAccount.decrement('current_balance', { by: millingCost, where: { id: cashAcct.id }, transaction: t });
    }

    await postJournal(req.models, {
      date: mill_date, description: `Milling batch ${batch_no}`,
      source_type: 'mill_batch', source_id: batch.id,
      lines, user_id, t,
    });

    await t.commit();
    res.status(201).json(await MillBatch.findByPk(batch.id, { include: ['inputs', 'outputs'] }));
  } catch (err) {
    await t.rollback();
    throw err;
  }
});

module.exports = router;
