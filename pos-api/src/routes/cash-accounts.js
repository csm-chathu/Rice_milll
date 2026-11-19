const router = require('express').Router();

// List all cash/bank accounts
router.get('/', async (req, res) => {
  const { CashAccount } = req.models;
  const accounts = await CashAccount.findAll({ order: [['type', 'ASC'], ['name', 'ASC']] });
  res.json(accounts);
});

// Create
router.post('/', async (req, res) => {
  const { CashAccount } = req.models;
  const { name, type, bank_name, account_no, opening_balance } = req.body;
  const bal = parseFloat(opening_balance) || 0;
  const account = await CashAccount.create({ name, type, bank_name, account_no, opening_balance: bal, current_balance: bal });
  res.status(201).json(account);
});

// Update
router.put('/:id', async (req, res) => {
  const { CashAccount } = req.models;
  const account = await CashAccount.findByPk(req.params.id);
  if (!account) return res.status(404).json({ error: 'Not found' });
  const { name, type, bank_name, account_no, active } = req.body;
  await account.update({ name, type, bank_name, account_no, active });
  res.json(account);
});

module.exports = router;
