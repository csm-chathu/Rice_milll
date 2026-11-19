import { useState, useEffect } from 'react';
import { getApiUrl } from '../../config/runtimeConfig';
import { useSelector } from 'react-redux';
import { selectToken } from '../../features/auth/authSlice';
import { useTheme } from '../../contexts/ThemeContext';

const API = getApiUrl();

const SOURCE_LABELS = {
  paddy_purchase:         'Paddy Purchase',
  paddy_purchase_payment: 'Paddy Payment',
  wholesale_sale:         'Wholesale Sale',
  wholesale_sale_payment: 'Sale Receipt',
  wage_settlement:        'Wage Settlement',
  worker_advance:         'Worker Advance',
  opening_balance:        'Opening Balance',
};

function SourceBadge({ type }) {
  const colors = {
    paddy_purchase:         'bg-amber-100 text-amber-700',
    paddy_purchase_payment: 'bg-green-100 text-green-700',
    wholesale_sale:         'bg-blue-100 text-blue-700',
    wholesale_sale_payment: 'bg-teal-100 text-teal-700',
    wage_settlement:        'bg-purple-100 text-purple-700',
    worker_advance:         'bg-orange-100 text-orange-700',
    opening_balance:        'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${colors[type] || 'bg-slate-100 text-slate-600'}`}>
      {SOURCE_LABELS[type] || type || 'Manual'}
    </span>
  );
}

export default function JournalIndex() {
  const token = useSelector(selectToken);
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const now = new Date();
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo]     = useState(now.toISOString().slice(0, 10));
  const [entries, setEntries] = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail]   = useState(null); // expanded entry

  const h = { Authorization: `Bearer ${token}` };

  async function load() {
    setLoading(true);
    const r = await fetch(`${API}/api/journal?from=${from}&to=${to}&per_page=100`, { headers: h });
    const d = await r.json();
    setEntries(Array.isArray(d) ? d : (d.data ?? []));
    setTotal(d.total ?? 0);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function toggleDetail(entry) {
    setDetail(d => d?.id === entry.id ? null : entry);
  }

  const fmt = n => parseFloat(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

  const card = { backgroundColor: dark ? '#1f2937' : '#fff', borderColor: dark ? '#374151' : '#e2e8f0' };
  const inputStyle = dark
    ? { backgroundColor: '#111827', border: '1px solid #374151', color: '#f1f5f9' }
    : { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a' };

  // totals for period
  const periodDebit  = entries.reduce((s, e) => s + (e.lines ?? []).reduce((ls, l) => ls + parseFloat(l.debit  || 0), 0), 0);
  const periodCredit = entries.reduce((s, e) => s + (e.lines ?? []).reduce((ls, l) => ls + parseFloat(l.credit || 0), 0), 0);

  return (
    <div className="p-5 w-full">
      <h1 className="text-2xl font-extrabold mb-1" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>Journal Entries</h1>
      <p className="text-sm text-slate-400 mb-5">All double-entry accounting transactions auto-posted by the system.</p>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 items-end">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-600"
            style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-600"
            style={inputStyle} />
        </div>
        <button onClick={load} disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-bold disabled:opacity-50">
          {loading ? 'Loading…' : 'Search'}
        </button>
        <div className="ml-auto flex gap-4 text-sm">
          <span className="font-semibold text-slate-400">
            {entries.length} entries
          </span>
          <span className="font-mono font-bold text-red-500">Dr: Rs {fmt(periodDebit)}</span>
          <span className="font-mono font-bold text-green-600">Cr: Rs {fmt(periodCredit)}</span>
        </div>
      </div>

      {/* Entries list */}
      <div className="rounded-2xl border shadow-sm overflow-hidden" style={card}>
        {loading ? (
          <p className="p-5 text-slate-400 text-sm">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="p-5 text-slate-400 text-sm">No journal entries found for this period.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-widest text-slate-400"
                style={{ borderColor: dark ? '#374151' : '#f1f5f9', backgroundColor: dark ? '#111827' : '#f8fafc' }}>
                <th className="px-4 py-3 text-left font-semibold">Ref No</th>
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-left font-semibold">Description</th>
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-4 py-3 text-right font-semibold">Debit (Rs)</th>
                <th className="px-4 py-3 text-right font-semibold">Credit (Rs)</th>
                <th className="px-4 py-3 text-center font-semibold">Lines</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => {
                const entryDebit  = (e.lines ?? []).reduce((s, l) => s + parseFloat(l.debit  || 0), 0);
                const entryCredit = (e.lines ?? []).reduce((s, l) => s + parseFloat(l.credit || 0), 0);
                const isOpen = detail?.id === e.id;
                return [
                  <tr key={e.id}
                    onClick={() => toggleDetail(e)}
                    className="border-b cursor-pointer transition-colors"
                    style={{
                      borderColor: dark ? '#374151' : '#f1f5f9',
                      backgroundColor: isOpen ? (dark ? '#1a2744' : '#eff6ff') : 'transparent',
                    }}
                    onMouseEnter={ev => { if (!isOpen) ev.currentTarget.style.backgroundColor = dark ? '#374151' : '#f8fafc'; }}
                    onMouseLeave={ev => { if (!isOpen) ev.currentTarget.style.backgroundColor = 'transparent'; }}>
                    <td className="px-4 py-3 font-mono text-xs font-bold" style={{ color: dark ? '#93c5fd' : '#2563eb' }}>
                      {e.ref_no}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{e.date?.slice(0, 10)}</td>
                    <td className="px-4 py-3 font-medium max-w-xs truncate" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>
                      {e.description}
                    </td>
                    <td className="px-4 py-3"><SourceBadge type={e.source_type} /></td>
                    <td className="px-4 py-3 text-right font-mono text-red-500 font-semibold">{fmt(entryDebit)}</td>
                    <td className="px-4 py-3 text-right font-mono text-green-600 font-semibold">{fmt(entryCredit)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {(e.lines ?? []).length}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400 text-lg leading-none select-none">
                      {isOpen ? '▲' : '▼'}
                    </td>
                  </tr>,

                  /* Expanded lines */
                  isOpen && (
                    <tr key={`${e.id}-detail`}>
                      <td colSpan={8} className="px-0 py-0">
                        <div className="mx-4 mb-3 mt-1 rounded-xl overflow-hidden border"
                          style={{ borderColor: dark ? '#3b4f7a' : '#bfdbfe', backgroundColor: dark ? '#0f172a' : '#eff6ff' }}>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b text-xs uppercase tracking-widest"
                                style={{ borderColor: dark ? '#3b4f7a' : '#bfdbfe', color: '#6b7280' }}>
                                <th className="px-4 py-2 text-left font-semibold">Account Code</th>
                                <th className="px-4 py-2 text-left font-semibold">Account Name</th>
                                <th className="px-4 py-2 text-left font-semibold">Note</th>
                                <th className="px-4 py-2 text-right font-semibold">Debit (Rs)</th>
                                <th className="px-4 py-2 text-right font-semibold">Credit (Rs)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(e.lines ?? []).map((l, i) => (
                                <tr key={l.id ?? i} className="border-b last:border-0"
                                  style={{ borderColor: dark ? '#3b4f7a' : '#bfdbfe' }}>
                                  <td className="px-4 py-2 font-mono font-bold" style={{ color: dark ? '#93c5fd' : '#1d4ed8' }}>
                                    {l.account?.code}
                                  </td>
                                  <td className="px-4 py-2 font-medium" style={{ color: dark ? '#e2e8f0' : '#1e293b' }}>
                                    {l.account?.name}
                                  </td>
                                  <td className="px-4 py-2 text-slate-400">{l.note || '—'}</td>
                                  <td className="px-4 py-2 text-right font-mono font-semibold text-red-500">
                                    {parseFloat(l.debit) > 0 ? fmt(l.debit) : '—'}
                                  </td>
                                  <td className="px-4 py-2 text-right font-mono font-semibold text-green-600">
                                    {parseFloat(l.credit) > 0 ? fmt(l.credit) : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr style={{ borderTop: `1px solid ${dark ? '#3b4f7a' : '#bfdbfe'}` }}>
                                <td colSpan={3} className="px-4 py-2 text-xs font-bold" style={{ color: dark ? '#93c5fd' : '#1d4ed8' }}>
                                  Total — {parseFloat(entryDebit) === parseFloat(entryCredit)
                                    ? <span className="text-green-600">✓ Balanced</span>
                                    : <span className="text-red-500">⚠ Unbalanced</span>}
                                </td>
                                <td className="px-4 py-2 text-right font-mono font-bold text-red-500">{fmt(entryDebit)}</td>
                                <td className="px-4 py-2 text-right font-mono font-bold text-green-600">{fmt(entryCredit)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
            <tfoot>
              <tr className="border-t" style={{ borderColor: dark ? '#374151' : '#e2e8f0', backgroundColor: dark ? '#111827' : '#f8fafc' }}>
                <td colSpan={4} className="px-4 py-3 font-bold text-sm" style={{ color: dark ? '#e2e8f0' : '#1e293b' }}>
                  Period Total ({entries.length} entries)
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-red-500">Rs {fmt(periodDebit)}</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-green-600">Rs {fmt(periodCredit)}</td>
                <td colSpan={2} className="px-4 py-3 text-right text-xs font-bold"
                  style={{ color: Math.abs(periodDebit - periodCredit) < 0.01 ? '#16a34a' : '#dc2626' }}>
                  {Math.abs(periodDebit - periodCredit) < 0.01 ? '✓ Balanced' : '⚠ Unbalanced'}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
