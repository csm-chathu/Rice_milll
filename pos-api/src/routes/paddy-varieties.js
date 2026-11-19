const router = require('express').Router();

router.get('/', async (req, res) => {
  const { PaddyVariety } = req.models;
  const list = await PaddyVariety.findAll({ order: [['name', 'ASC']] });
  res.json(list);
});

router.post('/', async (req, res) => {
  const { PaddyVariety } = req.models;
  const { name, description } = req.body;
  const item = await PaddyVariety.create({ name, description });
  res.status(201).json(item);
});

router.put('/:id', async (req, res) => {
  const { PaddyVariety } = req.models;
  const item = await PaddyVariety.findByPk(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  await item.update(req.body);
  res.json(item);
});

router.delete('/:id', async (req, res) => {
  const { PaddyVariety } = req.models;
  const item = await PaddyVariety.findByPk(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  await item.update({ active: false });
  res.json({ ok: true });
});

module.exports = router;
