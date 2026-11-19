import { useState, useEffect } from 'react';
import { getApiUrl } from '../../config/runtimeConfig';
import { useSelector } from 'react-redux';
import { selectToken } from '../../features/auth/authSlice';
import { useTheme } from '../../contexts/ThemeContext';

const API = getApiUrl();

export default function WageSettlements() {
  const token = useSelector(selectToken);
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [settlements, setSettlements] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  const [form, setForm] = useState({
    worker_id: '',
    period_from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    period_to:   new Date().toISOString().slice(0, 10),
    cash_account_id: '',
    note: '',
  });

  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  async function load() {
    setLoading(true);
    const [s, w, ca] = await Promise.all([
      fetch(`${API}/api/labour/settlements`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/labour/workers`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/cash-accounts`, { headers: h }).then(r => r.json()),
    ]);
    setSettlements(Array.isArray(s) ? s : []);
    setWorkers(Array.isArray(w) ? w : []);
    setCashAccounts(Array.isArray(ca) ? ca : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function fetchPreview() {
    if (!form.worker_id || !form.period_from || !form.period_to) return;
    const r = await fetch(
      `${API}/api/labour/settlements/preview?worker_id=${form.worker_id}&from=${form.period_from}&to=${form.period_to}`,
      { headers: h }
    );
    if (r.ok) setPreview(await r.json());
  }
  useEffect(() => { setPreview(null); if (form.worker_id) fetchPreview(); }, [form.worker_id, form.period_from, form.period_to]);

  async function saveSettlement() {
    setSaving(true); setError('');
    const r = await fetch(`${API}/api/labour/settlements`, {
      method: 'POST', headers: h, body: JSON.stringify(form),
    });
    if (!r.ok) { setError((await r.json()).error || 'Failed'); setSaving(false); return; }
    setShowForm(false);
    setForm({ worker_id: '', period_from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), period_to: new Date().toISOString().slice(0, 10), cash_account_id: '', note: '' });
    setPreview(null);
    await load(); setSaving(false);
  }

  const card = { backgroundColor: dark ? '#1f2937' : '#fff', borderColor: dark ? '#374151' : '#e2e8f0' };
  const inputCls = `w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-600`;
  const inputStyle = dark ? { backgroundColor: '#111827', border: '1px solid #374151', color: '#f1f5f9' }
                           : { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a' };
  const fmt = n => parseFloat(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

  return (
    <div className="p-5 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>Wage Settlements</h1>
          <p className="text-sm text-slate-400 mt-0.5">Calculate wages from attendance, deduct advances, and pay workers.</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="px-5 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-bold shadow">
          + New Settlement
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border shadow-sm p-5 mb-6" style={card}>
          <h2 className="font-bold text-sm mb-4" style={{ color: dark ? '#e2e8f0' : '#1e293b' }}>New Wage Settlement</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Worker *</label>
              <select className={inputCls} style={inputStyle} value={form.worker_id}
                onChange={e => setForm(f => ({ ...f, worker_id: e.target.value }))}>
                <option value="">Select worker…</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">From *</label>
              <input type="date" className={inputCls} style={inputStyle} value={form.period_from}
                onChange={e => setForm(f => ({ ...f, period_from: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">To *</label>
              <input type="date" className={inputCls} style={inputStyle} value={form.period_to}
                onChange={e => setForm(f => ({ ...f, period_to: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Cash Account</label>
              <select className={inputCls} style={inputStyle} value={form.cash_account_id}
                onChange={e => setForm(f => ({ ...f, cash_account_id: e.target.value }))}>
                <option value="">Default</option>
                {cashAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div className="rounded-xl border p-4 mb-4" style={{ borderColor: dark ? '#374151' : '#e2e8f0', backgroundColor: dark ? '#111827' : '#f8fafc' }}>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Settlement Preview</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-slate-400 text-xs">Days Worked</p>
                  <p className="font-bold text-lg" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>
                    {preview.full_days} full + {preview.half_days} half
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Gross Wages</p>
                  <p className="font-bold text-lg text-green-600">Rs {fmt(preview.gross_wages)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Advance Deduction</p>
                  <p className="font-bold text-lg text-red-500">Rs {fmt(preview.advance_deduction)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Net Payable</p>
                  <p className="font-bold text-xl" style={{ color: dark ? '#86efac' : '#15803d' }}>Rs {fmt(preview.net_payable)}</p>
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          <div className="flex gap-2 mt-3">
            <button onClick={saveSettlement} disabled={saving || !form.worker_id || !preview}
              className="px-5 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-bold disabled:opacity-50">
              {saving ? 'Processing…' : 'Settle & Pay'}
            </button>
            <button onClick={() => { setShowForm(false); setError(''); setPreview(null); }}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-600">Cancel</button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border shadow-sm overflow-hidden" style={card}>
        {loading ? <p className="p-5 text-slate-400 text-sm">Loading…</p> : settlements.length === 0 ? (
          <p className="p-5 text-slate-400 text-sm">No wage settlements recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-widest text-slate-400"
                  style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
                  <th className="px-4 py-3 text-left font-semibold">Worker</th>
                  <th className="px-4 py-3 text-left font-semibold">Period</th>
                  <th className="px-4 py-3 text-right font-semibold">Days</th>
                  <th className="px-4 py-3 text-right font-semibold">Gross (Rs)</th>
                  <th className="px-4 py-3 text-right font-semibold">Advance (Rs)</th>
                  <th className="px-4 py-3 text-right font-semibold">Net Paid (Rs)</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
                {settlements.map(s => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-semibold" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>{s.worker?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{s.period_from?.slice(0,10)} → {s.period_to?.slice(0,10)}</td>
                    <td className="px-4 py-3 text-right">{s.full_days}F + {s.half_days}H</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(s.gross_wages)}</td>
                    <td className="px-4 py-3 text-right font-mono text-red-500">{fmt(s.advance_deduction)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-green-600">{fmt(s.net_payable)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
