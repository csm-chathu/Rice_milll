const router = require('express').Router();

router.get('/', async (req, res) => {
  const { RiceGrade } = req.models;
  const { type } = req.query;
  const where = { active: true };
  if (type) where.type = type;
  const list = await RiceGrade.findAll({ where, order: [['type', 'ASC'], ['name', 'ASC']] });
  res.json(list);
});

router.post('/', async (req, res) => {
  const { RiceGrade } = req.models;
  const { name, type, unit } = req.body;
  const item = await RiceGrade.create({ name, type, unit });
  res.status(201).json(item);
});

router.put('/:id', async (req, res) => {
  const { RiceGrade } = req.models;
  const item = await RiceGrade.findByPk(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  const { name, type, unit, active } = req.body;
  await item.update({ name, type, unit, active });
  res.json(item);
});

module.exports = router;
