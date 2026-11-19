// Auto-post double-entry journal entries for every transaction
async function postJournal(models, { date, description, source_type, source_id, lines, user_id, t }) {
  const { JournalEntry, JournalLine, Account } = models;

  // Generate ref_no: JE-YYYYMMDD-XXXX
  const prefix = `JE-${date.replace(/-/g, '')}-`;
  const count = await JournalEntry.count({ where: { ref_no: { [require('sequelize').Op.like]: `${prefix}%` } }, transaction: t });
  const ref_no = `${prefix}${String(count + 1).padStart(4, '0')}`;

  const entry = await JournalEntry.create(
    { ref_no, date, description, source_type, source_id, user_id },
    { transaction: t }
  );

  // Resolve account IDs from codes
  const codes = [...new Set(lines.map(l => l.account_code))];
  const accounts = await Account.findAll({ where: { code: codes }, transaction: t });
  const codeMap = Object.fromEntries(accounts.map(a => [a.code, a.id]));

  await JournalLine.bulkCreate(
    lines.map(l => ({
      entry_id:   entry.id,
      account_id: codeMap[l.account_code],
      debit:      l.debit  || 0,
      credit:     l.credit || 0,
      note:       l.note   || null,
    })),
    { transaction: t }
  );

  return entry;
}

module.exports = { postJournal };
