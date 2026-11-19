const router = require('express').Router();
const { Op, fn, col, literal } = require('sequelize');

// Dashboard summary
router.get('/dashboard', async (req, res) => {
  const { PaddyPurchase, WholesaleSale, RiceGrade, Supplier, Customer, LabourWorker, CashAccount, WorkerAdvance } = req.models;
  const today = new Date().toISOString().slice(0, 10);

  const [
    riceStock, paddyPending, supplierPayable, customerReceivable,
    workerAdvances, cashAccounts, todayPurchases, todaySales,
  ] = await Promise.all([
    RiceGrade.findAll({ where: { active: true }, attributes: ['id','name','type','current_stock','unit'], order: [['type','ASC'],['name','ASC']] }),
    PaddyPurchase.findAll({ where: { payment_status: { [Op.ne]: 'paid' } }, attributes: ['id','lot_no','supplier_id','purchase_date','balance'], include: [{ association: 'supplier', attributes: ['name'] }] }),
    Supplier.sum('payable_balance'),
    Customer.sum('credit_balance'),
    LabourWorker.sum('advance_balance'),
    CashAccount.findAll({ where: { active: true }, attributes: ['id','name','type','current_balance'] }),
    PaddyPurchase.sum('total_amount', { where: { purchase_date: today } }),
    WholesaleSale.sum('total',        { where: { sale_date: today } }),
  ]);

  res.json({
    rice_stock:           riceStock,
    paddy_pending_lots:   paddyPending,
    total_supplier_payable:    supplierPayable    || 0,
    total_customer_receivable: customerReceivable || 0,
    total_worker_advances:     workerAdvances     || 0,
    cash_accounts:        cashAccounts,
    today:                { purchases: todayPurchases || 0, sales: todaySales || 0 },
  });
});

// Profit & Loss report
router.get('/pl', async (req, res) => {
  const { WholesaleSale, WholesaleSaleItem, PaddyPurchase, WageSettlement, MillBatch } = req.models;
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to required' });

  const [sales, purchases, wages, milling] = await Promise.all([
    WholesaleSaleItem.findAll({
      include: [{ association: 'sale', where: { sale_date: { [Op.between]: [from, to] } }, attributes: [] }],
      attributes: ['rice_grade_id','grade_name', [fn('SUM', col('quantity_kg')), 'qty'], [fn('SUM', col('total')), 'revenue']],
      group: ['rice_grade_id','grade_name'],
    }),
    PaddyPurchase.sum('total_amount', { where: { purchase_date: { [Op.between]: [from, to] } } }),
    WageSettlement.sum('gross_wage',  { where: { period_to:    { [Op.between]: [from, to] } } }),
    MillBatch.sum('milling_cost',     { where: { mill_date:    { [Op.between]: [from, to] } } }),
  ]);

  const total_revenue = sales.reduce((s, r) => s + parseFloat(r.dataValues.revenue || 0), 0);
  const total_cost    = (parseFloat(purchases) || 0) + (parseFloat(wages) || 0) + (parseFloat(milling) || 0);
  const profit        = total_revenue - total_cost;

  res.json({
    period: { from, to },
    revenue: { breakdown: sales, total: parseFloat(total_revenue.toFixed(2)) },
    costs:   { paddy_purchase: parseFloat(purchases) || 0, labour: parseFloat(wages) || 0, milling: parseFloat(milling) || 0, total: parseFloat(total_cost.toFixed(2)) },
    profit:  parseFloat(profit.toFixed(2)),
  });
});

// Stock report
router.get('/stock', async (req, res) => {
  const { RiceGrade, PaddyPurchase } = req.models;
  const [riceGrades, paddyLots] = await Promise.all([
    RiceGrade.findAll({ where: { active: true }, order: [['type','ASC'],['name','ASC']] }),
    PaddyPurchase.findAll({
      where: { remaining_kg: { [Op.gt]: 0 } },
      include: [{ association: 'supplier', attributes: ['name'] }, { association: 'variety', attributes: ['name'] }],
      order: [['purchase_date', 'ASC']],
    }),
  ]);
  res.json({ rice_grades: riceGrades, paddy_lots: paddyLots });
});

// Supplier ledger
router.get('/supplier-ledger/:id', async (req, res) => {
  const { Supplier, PaddyPurchase, PaddyPurchasePayment } = req.models;
  const { from, to } = req.query;
  const supplier = await Supplier.findByPk(req.params.id);
  if (!supplier) return res.status(404).json({ error: 'Not found' });

  const dateFilter = from && to ? { [Op.between]: [from, to] } : undefined;
  const [purchases, payments] = await Promise.all([
    PaddyPurchase.findAll({ where: { supplier_id: req.params.id, ...(dateFilter ? { purchase_date: dateFilter } : {}) }, order: [['purchase_date','ASC']] }),
    PaddyPurchasePayment.findAll({
      include: [{ association: 'purchase', where: { supplier_id: req.params.id }, attributes: ['lot_no'] }],
      where: dateFilter ? { payment_date: dateFilter } : {},
      order: [['payment_date','ASC']],
    }),
  ]);

  res.json({ supplier, purchases, payments, balance: supplier.payable_balance });
});

// Customer ledger
router.get('/customer-ledger/:id', async (req, res) => {
  const { Customer, WholesaleSale, WholesaleSalePayment } = req.models;
  const { from, to } = req.query;
  const customer = await Customer.findByPk(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Not found' });

  const dateFilter = from && to ? { [Op.between]: [from, to] } : undefined;
  const [sales, payments] = await Promise.all([
    WholesaleSale.findAll({
      where: { customer_id: req.params.id, ...(dateFilter ? { sale_date: dateFilter } : {}) },
      include: ['items'], order: [['sale_date','ASC']],
    }),
    WholesaleSalePayment.findAll({
      include: [{ association: 'sale', where: { customer_id: req.params.id }, attributes: ['invoice_no'] }],
      where: dateFilter ? { payment_date: dateFilter } : {},
      order: [['payment_date','ASC']],
    }),
  ]);

  res.json({ customer, sales, payments, balance: customer.credit_balance });
});

// Labour report
router.get('/labour', async (req, res) => {
  const { LabourWorker, LabourAttendance, WorkerAdvance, WageSettlement } = req.models;
  const { worker_id, from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to required' });

  const workerWhere = worker_id ? { id: worker_id } : { active: true };
  const workers     = await LabourWorker.findAll({ where: workerWhere });

  const report = await Promise.all(workers.map(async (w) => {
    const attendance = await LabourAttendance.findAll({ where: { worker_id: w.id, work_date: { [Op.between]: [from, to] } } });
    const advances   = await WorkerAdvance.findAll({    where: { worker_id: w.id, deducted: false } });
    const full_days  = attendance.filter(a => a.status === 'full').length;
    const half_days  = attendance.filter(a => a.status === 'half').length;
    const total_days = full_days + half_days * 0.5;
    const gross_wage = parseFloat((total_days * parseFloat(w.daily_rate)).toFixed(2));
    const total_adv  = advances.reduce((s, a) => s + parseFloat(a.amount), 0);
    return {
      worker: { id: w.id, name: w.name, daily_rate: w.daily_rate },
      full_days, half_days, total_days, gross_wage,
      pending_advances: parseFloat(total_adv.toFixed(2)),
      net_payable: parseFloat((gross_wage - total_adv).toFixed(2)),
    };
  }));

  res.json(report);
});

module.exports = router;
