import { useState, useEffect } from 'react';
import { getApiUrl } from '../../config/runtimeConfig';
import { useSelector } from 'react-redux';
import { selectToken } from '../../features/auth/authSlice';
import { useTheme } from '../../contexts/ThemeContext';

const API = getApiUrl();

export default function LabourAdvances() {
  const token = useSelector(selectToken);
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [advances, setAdvances] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ worker_id: '', given_date: new Date().toISOString().slice(0, 10), amount: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  async function load() {
    const [a, w, c] = await Promise.all([
      fetch(`${API}/api/labour/advances`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/labour/workers`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/cash-accounts`, { headers: h }).then(r => r.json()),
    ]);
    setAdvances(Array.isArray(a) ? a : []);
    setWorkers(Array.isArray(w) ? w : []);
    setCashAccounts(Array.isArray(c) ? c : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true); setError('');
    const r = await fetch(`${API}/api/labour/advances`, { method: 'POST', headers: h, body: JSON.stringify(form) });
    if (!r.ok) { setError((await r.json()).error || 'Failed'); setSaving(false); return; }
    setShowForm(false);
    setForm({ worker_id: '', given_date: new Date().toISOString().slice(0, 10), amount: '', note: '' });
    await load(); setSaving(false);
  }

  const bg = dark ? '#1f2937' : '#fff';
  const border = dark ? '#374151' : '#e2e8f0';
  const inputStyle = dark ? { backgroundColor: '#111827', border: '1px solid #374151', color: '#f1f5f9' }
                           : { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a' };
  const inputCls = `w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-600`;
  const fmt = n => parseFloat(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
  const totalPending = advances.filter(a => !a.deducted).reduce((s, a) => s + parseFloat(a.amount), 0);

  return (
    <div className="p-5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>Worker Advances</h1>
          <p className="text-sm text-slate-400 mt-0.5">Total pending: <strong className="text-red-500">Rs {fmt(totalPending)}</strong></p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="px-5 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-bold shadow">
          + Give Advance
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl border shadow-sm p-5 mb-5" style={{ backgroundColor: bg, borderColor: border }}>
          <h2 className="font-bold text-sm mb-4" style={{ color: dark ? '#e2e8f0' : '#1e293b' }}>Give Advance</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Worker *</label>
              <select className={inputCls} style={inputStyle} value={form.worker_id} onChange={e => setForm(f => ({ ...f, worker_id: e.target.value }))}>
                <option value="">Select worker…</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Date *</label>
              <input type="date" className={inputCls} style={inputStyle} value={form.given_date} onChange={e => setForm(f => ({ ...f, given_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Amount (Rs) *</label>
              <input type="number" min="0" step="0.01" className={inputCls} style={inputStyle} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Note</label>
              <input className={inputCls} style={inputStyle} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="optional" />
            </div>
          </div>
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={save} disabled={saving || !form.worker_id || !form.amount}
              className="px-5 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-bold disabled:opacity-50">
              {saving ? 'Saving…' : 'Record Advance'}
            </button>
            <button onClick={() => { setShowForm(false); setError(''); }} className="px-4 py-2 text-sm text-slate-400">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: bg, borderColor: border }}>
        {loading ? <p className="p-5 text-slate-400 text-sm">Loading…</p> : advances.length === 0 ? (
          <p className="p-5 text-slate-400 text-sm">No advances recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-widest text-slate-400" style={{ borderColor: border }}>
                <th className="px-5 py-3 text-left font-semibold">Worker</th>
                <th className="px-5 py-3 text-left font-semibold">Date</th>
                <th className="px-5 py-3 text-right font-semibold">Amount (Rs)</th>
                <th className="px-5 py-3 text-left font-semibold">Note</th>
                <th className="px-5 py-3 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: border }}>
              {advances.map(a => (
                <tr key={a.id}>
                  <td className="px-5 py-3 font-semibold" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>{a.worker?.name ?? '—'}</td>
                  <td className="px-5 py-3 text-slate-400">{a.given_date?.slice(0, 10)}</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-orange-500">Rs {fmt(a.amount)}</td>
                  <td className="px-5 py-3 text-slate-400">{a.note || '—'}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.deducted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {a.deducted ? 'Deducted' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
