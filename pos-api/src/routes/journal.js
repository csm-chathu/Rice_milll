const express = require('express');
const router  = express.Router();
const { Op }  = require('sequelize');
const auth    = require('../middleware/auth');

// GET /api/journal  — paginated list with optional date/source filter
router.get('/', auth, async (req, res) => {
  try {
    const { JournalEntry, JournalLine, Account } = req.models;
    const { from, to, source_type, page = 1, per_page = 50 } = req.query;

    const where = {};
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = from;
      if (to)   where.date[Op.lte] = to;
    }
    if (source_type) where.source_type = source_type;

    const offset = (parseInt(page) - 1) * parseInt(per_page);

    const { count, rows } = await JournalEntry.findAndCountAll({
      where,
      order: [['date', 'DESC'], ['id', 'DESC']],
      limit:  parseInt(per_page),
      offset,
      include: [{
        model:   JournalLine,
        as:      'lines',
        include: [{ model: Account, as: 'account', attributes: ['code', 'name', 'type'] }],
      }],
    });

    res.json({ total: count, page: parseInt(page), data: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/journal/:id  — single entry with full lines
router.get('/:id', auth, async (req, res) => {
  try {
    const { JournalEntry, JournalLine, Account } = req.models;
    const entry = await JournalEntry.findByPk(req.params.id, {
      include: [{
        model:   JournalLine,
        as:      'lines',
        include: [{ model: Account, as: 'account', attributes: ['code', 'name', 'type'] }],
      }],
    });
    if (!entry) return res.status(404).json({ error: 'Not found' });
    res.json(entry);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
