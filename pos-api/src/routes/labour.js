const router = require('express').Router();
const { Op } = require('sequelize');
const { postJournal } = require('../helpers/journal');

// ── Workers ──────────────────────────────────────────────────

router.get('/workers', async (req, res) => {
  const { LabourWorker } = req.models;
  const list = await LabourWorker.findAll({ where: { active: true }, order: [['name', 'ASC']] });
  res.json(list);
});

router.get('/workers/:id', async (req, res) => {
  const { LabourWorker } = req.models;
  const worker = await LabourWorker.findByPk(req.params.id);
  if (!worker) return res.status(404).json({ error: 'Not found' });
  res.json(worker);
});

router.post('/workers', async (req, res) => {
  const { LabourWorker } = req.models;
  const { name, phone, address, daily_rate } = req.body;
  const worker = await LabourWorker.create({ name, phone, address, daily_rate });
  res.status(201).json(worker);
});

router.put('/workers/:id', async (req, res) => {
  const { LabourWorker } = req.models;
  const worker = await LabourWorker.findByPk(req.params.id);
  if (!worker) return res.status(404).json({ error: 'Not found' });
  const { name, phone, address, daily_rate, active } = req.body;
  await worker.update({ name, phone, address, daily_rate, active });
  res.json(worker);
});

// ── Attendance ───────────────────────────────────────────────

// Get attendance for a date (all workers)
router.get('/attendance', async (req, res) => {
  const { LabourAttendance, LabourWorker } = req.models;
  const { date, from, to, worker_id } = req.query;
  const where = {};
  if (date)      where.work_date  = date;
  if (worker_id) where.worker_id  = worker_id;
  if (from || to) where.work_date = {};
  if (from) where.work_date[Op.gte] = from;
  if (to)   where.work_date[Op.lte] = to;

  const list = await LabourAttendance.findAll({
    where,
    include: [{ association: 'worker', attributes: ['id','name','daily_rate'] }],
    order: [['work_date', 'DESC'], ['worker_id', 'ASC']],
  });
  res.json(list);
});

// Bulk attendance entry for a day
// Body: { date, entries: [{ worker_id, status, note }] }
router.post('/attendance/bulk', async (req, res) => {
  const { LabourAttendance } = req.models;
  const { date, entries } = req.body;
  const user_id = req.user?.id || 1;

  const results = [];
  for (const e of entries) {
    const [record, created] = await LabourAttendance.upsert(
      { worker_id: e.worker_id, work_date: date, status: e.status || 'full', note: e.note, user_id },
      { returning: true }
    );
    results.push(record);
  }
  res.json(results);
});

// Single attendance entry
router.post('/attendance', async (req, res) => {
  const { LabourAttendance } = req.models;
  const { worker_id, work_date, status, note } = req.body;
  const user_id = req.user?.id || 1;
  const [record] = await LabourAttendance.upsert({ worker_id, work_date, status, note, user_id }, { returning: true });
  res.json(record);
});

// Monthly summary for a worker
router.get('/attendance/summary', async (req, res) => {
  const { LabourAttendance, LabourWorker } = req.models;
  const { worker_id, month } = req.query; // month = "2026-11"
  if (!month) return res.status(400).json({ error: 'month required (YYYY-MM)' });
  const from = `${month}-01`;
  const to   = `${month}-31`;

  const where = { work_date: { [Op.between]: [from, to] } };
  if (worker_id) where.worker_id = worker_id;

  const records = await LabourAttendance.findAll({ where, include: ['worker'] });

  // Group by worker
  const summary = {};
  for (const r of records) {
    if (!summary[r.worker_id]) {
      summary[r.worker_id] = { worker: r.worker, full_days: 0, half_days: 0, absent: 0 };
    }
    if (r.status === 'full')   summary[r.worker_id].full_days++;
    if (r.status === 'half')   summary[r.worker_id].half_days++;
    if (r.status === 'absent') summary[r.worker_id].absent++;
  }

  res.json(Object.values(summary).map(s => ({
    ...s,
    total_days:  s.full_days + s.half_days * 0.5,
    gross_wage:  (s.full_days + s.half_days * 0.5) * parseFloat(s.worker?.daily_rate || 0),
  })));
});

// ── Worker Advances ───────────────────────────────────────────

router.get('/advances', async (req, res) => {
  const { WorkerAdvance } = req.models;
  const { worker_id, deducted } = req.query;
  const where = {};
  if (worker_id !== undefined) where.worker_id = worker_id;
  if (deducted  !== undefined) where.deducted  = deducted === 'true';
  const list = await WorkerAdvance.findAll({
    where,
    include: [{ association: 'worker', attributes: ['id','name'] }],
    order: [['given_date', 'DESC']],
  });
  res.json(list);
});

router.post('/advances', async (req, res) => {
  const { WorkerAdvance, LabourWorker, CashAccount } = req.models;
  const { worker_id, given_date, amount, note } = req.body;
  const user_id = req.user?.id || 1;
  const amt = parseFloat(amount);

  const t = await req.db.transaction();
  try {
    const advance = await WorkerAdvance.create({ worker_id, given_date, amount: amt, note, given_by: user_id }, { transaction: t });
    await LabourWorker.increment('advance_balance', { by: amt, where: { id: worker_id }, transaction: t });

    // Deduct from default cash account
    const cashAcct = await CashAccount.findOne({ where: { type: 'cash', active: true }, transaction: t });
    if (cashAcct) await CashAccount.decrement('current_balance', { by: amt, where: { id: cashAcct.id }, transaction: t });

    await postJournal(req.models, {
      date: given_date, description: `Advance to worker #${worker_id}`,
      source_type: 'worker_advance', source_id: advance.id,
      lines: [
        { account_code: '1600', debit: amt, credit: 0,   note: `Advance given` },
        { account_code: '1100', debit: 0,   credit: amt, note: `Cash paid` },
      ],
      user_id, t,
    });

    await t.commit();
    res.status(201).json(advance);
  } catch (err) {
    await t.rollback();
    throw err;
  }
});

// ── Wage Settlements ──────────────────────────────────────────

router.get('/settlements', async (req, res) => {
  const { WageSettlement } = req.models;
  const { worker_id } = req.query;
  const where = worker_id ? { worker_id } : {};
  const list = await WageSettlement.findAll({
    where,
    include: [{ association: 'worker', attributes: ['id','name'] }],
    order: [['period_to', 'DESC']],
  });
  res.json(list);
});

// Preview — calculate wages without saving
router.get('/settlements/preview', async (req, res) => {
  const { LabourAttendance, WorkerAdvance, LabourWorker } = req.models;
  const { worker_id, from, to } = req.query;
  if (!worker_id || !from || !to) return res.status(400).json({ error: 'worker_id, from, to required' });

  const worker = await LabourWorker.findByPk(worker_id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  const attendance = await LabourAttendance.findAll({ where: { worker_id, work_date: { [Op.between]: [from, to] } } });
  const full_days  = attendance.filter(a => a.status === 'full').length;
  const half_days  = attendance.filter(a => a.status === 'half').length;
  const total_days = full_days + half_days * 0.5;
  const gross_wage = parseFloat((total_days * parseFloat(worker.daily_rate)).toFixed(2));

  const advances   = await WorkerAdvance.findAll({ where: { worker_id, deducted: false } });
  const total_advances = advances.reduce((s, a) => s + parseFloat(a.amount), 0);
  const net_payable    = parseFloat((gross_wage - total_advances).toFixed(2));

  res.json({ worker, full_days, half_days, total_days, gross_wage, total_advances, net_payable, advances });
});

// Create settlement
router.post('/settlements', async (req, res) => {
  const { WageSettlement, WorkerAdvance, LabourWorker, CashAccount } = req.models;
  const { worker_id, period_from, period_to, payment_method, cash_account_id, bank_reference, note } = req.body;
  const user_id = req.user?.id || 1;

  const worker = await LabourWorker.findByPk(worker_id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  // Recalculate
  const { LabourAttendance } = req.models;
  const attendance    = await LabourAttendance.findAll({ where: { worker_id, work_date: { [Op.between]: [period_from, period_to] } } });
  const full_days     = attendance.filter(a => a.status === 'full').length;
  const half_days     = attendance.filter(a => a.status === 'half').length;
  const total_days    = full_days + half_days * 0.5;
  const gross_wage    = parseFloat((total_days * parseFloat(worker.daily_rate)).toFixed(2));
  const advances      = await WorkerAdvance.findAll({ where: { worker_id, deducted: false } });
  const total_advances = advances.reduce((s, a) => s + parseFloat(a.amount), 0);
  const net_payable   = parseFloat((gross_wage - total_advances).toFixed(2));

  // Auto ref_no
  const count  = await WageSettlement.count();
  const ref_no = `WS-${String(count + 1).padStart(5, '0')}`;

  const t = await req.db.transaction();
  try {
    const settlement = await WageSettlement.create({
      ref_no, worker_id, period_from, period_to,
      full_days, half_days, total_days, daily_rate: worker.daily_rate,
      gross_wage, total_advances, net_payable,
      payment_method, cash_account_id, bank_reference, note, user_id,
    }, { transaction: t });

    // Mark advances as deducted
    for (const adv of advances) {
      await adv.update({ deducted: true, wage_settlement_id: settlement.id }, { transaction: t });
    }

    // Reset advance balance
    await LabourWorker.update({ advance_balance: 0 }, { where: { id: worker_id }, transaction: t });

    // Deduct net payable from cash account
    if (net_payable > 0 && cash_account_id) {
      await CashAccount.decrement('current_balance', { by: net_payable, where: { id: cash_account_id }, transaction: t });
    }

    let cashCode = '1100';
    if (cash_account_id) {
      const ca = await CashAccount.findByPk(cash_account_id, { transaction: t });
      cashCode = ca?.type === 'bank' ? '1200' : '1100';
    }

    // Journal: Dr Labour Cost / Cr Worker Advances + Cash/Bank
    const lines = [{ account_code: '5200', debit: gross_wage, credit: 0, note: `Wages ${ref_no}` }];
    if (total_advances > 0) lines.push({ account_code: '1600', debit: 0, credit: total_advances, note: `Advances cleared` });
    if (net_payable > 0)    lines.push({ account_code: cashCode, debit: 0, credit: net_payable,   note: `Net paid` });

    await postJournal(req.models, {
      date: period_to, description: `Wage settlement ${ref_no}`,
      source_type: 'wage_settlement', source_id: settlement.id,
      lines, user_id, t,
    });

    await t.commit();
    res.status(201).json(settlement);
  } catch (err) {
    await t.rollback();
    throw err;
  }
});

module.exports = router;
