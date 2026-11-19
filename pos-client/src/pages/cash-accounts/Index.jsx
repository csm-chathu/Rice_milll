import { useState, useEffect } from 'react';
import { getApiUrl } from '../../config/runtimeConfig';
import { useSelector } from 'react-redux';
import { selectToken } from '../../features/auth/authSlice';
import { useTheme } from '../../contexts/ThemeContext';

const API = getApiUrl();

export default function CashAccountsIndex() {
  const token = useSelector(selectToken);
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', type: 'cash', account_no: '', note: '' });
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  async function load() {
    const r = await fetch(`${API}/api/cash-accounts`, { headers: h });
    setAccounts(await r.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true); setError('');
    const url = editing ? `${API}/api/cash-accounts/${editing.id}` : `${API}/api/cash-accounts`;
    const method = editing ? 'PUT' : 'POST';
    const r = await fetch(url, { method, headers: h, body: JSON.stringify(form) });
    if (!r.ok) { setError((await r.json()).error || 'Failed'); setSaving(false); return; }
    setForm({ name: '', type: 'cash', account_no: '', note: '' }); setEditing(null);
    await load(); setSaving(false);
  }

  function startEdit(a) { setEditing(a); setForm({ name: a.name, type: a.type, account_no: a.account_no || '', note: a.note || '' }); }
  function cancelEdit() { setEditing(null); setForm({ name: '', type: 'cash', account_no: '', note: '' }); setError(''); }

  const card = { backgroundColor: dark ? '#1f2937' : '#fff', borderColor: dark ? '#374151' : '#e2e8f0' };
  const inputCls = `w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-600`;
  const inputStyle = dark ? { backgroundColor: '#111827', border: '1px solid #374151', color: '#f1f5f9' }
                           : { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a' };
  const fmt = n => parseFloat(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

  const typeColors = { cash: 'bg-green-100 text-green-700', bank: 'bg-blue-100 text-blue-700', mobile: 'bg-purple-100 text-purple-700' };

  return (
    <div className="p-5 w-full">
      <h1 className="text-2xl font-extrabold mb-1" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>Cash Accounts</h1>
      <p className="text-sm text-slate-400 mb-6">Manage cash drawers and bank accounts used in transactions.</p>

      <div className="rounded-2xl border shadow-sm p-5 mb-6" style={card}>
        <h2 className="font-bold text-sm mb-4" style={{ color: dark ? '#e2e8f0' : '#1e293b' }}>
          {editing ? `Edit — ${editing.name}` : 'Add New Account'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Account Name *</label>
            <input className={inputCls} style={inputStyle} value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Main Cash" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Type</label>
            <select className={inputCls} style={inputStyle} value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="mobile">Mobile Banking</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Account No</label>
            <input className={inputCls} style={inputStyle} value={form.account_no}
              onChange={e => setForm(f => ({ ...f, account_no: e.target.value }))} placeholder="optional" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Note</label>
            <input className={inputCls} style={inputStyle} value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="optional" />
          </div>
        </div>
        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button onClick={save} disabled={saving || !form.name.trim()}
            className="px-5 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-bold disabled:opacity-50">
            {saving ? 'Saving…' : editing ? 'Update' : 'Add Account'}
          </button>
          {editing && <button onClick={cancelEdit} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-600">Cancel</button>}
        </div>
      </div>

      <div className="rounded-2xl border shadow-sm overflow-hidden" style={card}>
        {loading ? <p className="p-5 text-slate-400 text-sm">Loading…</p> : accounts.length === 0 ? (
          <p className="p-5 text-slate-400 text-sm">No accounts added yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-widest text-slate-400"
                style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
                <th className="px-5 py-3 text-left font-semibold">Account</th>
                <th className="px-5 py-3 text-left font-semibold">Type</th>
                <th className="px-5 py-3 text-left font-semibold">Account No</th>
                <th className="px-5 py-3 text-right font-semibold">Balance (Rs)</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
              {accounts.map(a => (
                <tr key={a.id}>
                  <td className="px-5 py-3 font-semibold" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>{a.name}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${typeColors[a.type] || 'bg-slate-100 text-slate-600'}`}>{a.type}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-400 font-mono text-xs">{a.account_no || '—'}</td>
                  <td className="px-5 py-3 text-right font-mono font-bold" style={{ color: parseFloat(a.balance || 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                    Rs {fmt(a.balance)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => startEdit(a)}
                      className="text-xs px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t" style={{ borderColor: dark ? '#374151' : '#e2e8f0' }}>
                <td colSpan={3} className="px-5 py-3 text-sm font-bold" style={{ color: dark ? '#e2e8f0' : '#1e293b' }}>Total</td>
                <td className="px-5 py-3 text-right font-mono font-bold text-green-600">
                  Rs {fmt(accounts.reduce((s, a) => s + parseFloat(a.balance || 0), 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
