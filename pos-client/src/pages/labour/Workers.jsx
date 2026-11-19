import { useState, useEffect } from 'react';
import { getApiUrl } from '../../config/runtimeConfig';
import { useSelector } from 'react-redux';
import { selectToken } from '../../features/auth/authSlice';
import { useTheme } from '../../contexts/ThemeContext';

const API = getApiUrl();

export default function LabourWorkers() {
  const token = useSelector(selectToken);
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', phone: '', address: '', daily_rate: '' });
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  async function load() {
    const r = await fetch(`${API}/api/labour/workers`, { headers: h });
    setList(await r.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true); setError('');
    const url = editing ? `${API}/api/labour/workers/${editing.id}` : `${API}/api/labour/workers`;
    const method = editing ? 'PUT' : 'POST';
    const r = await fetch(url, { method, headers: h, body: JSON.stringify(form) });
    if (!r.ok) { setError((await r.json()).error || 'Failed'); setSaving(false); return; }
    setForm({ name: '', phone: '', address: '', daily_rate: '' }); setEditing(null);
    await load(); setSaving(false);
  }

  function startEdit(w) { setEditing(w); setForm({ name: w.name, phone: w.phone || '', address: w.address || '', daily_rate: w.daily_rate }); }
  function cancelEdit() { setEditing(null); setForm({ name: '', phone: '', address: '', daily_rate: '' }); setError(''); }

  const card = { backgroundColor: dark ? '#1f2937' : '#fff', borderColor: dark ? '#374151' : '#e2e8f0' };
  const inputCls = `w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-600`;
  const inputStyle = dark ? { backgroundColor: '#111827', border: '1px solid #374151', color: '#f1f5f9' }
                           : { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a' };

  return (
    <div className="p-5 w-full">
      <h1 className="text-2xl font-extrabold mb-1" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>Workers</h1>
      <p className="text-sm text-slate-400 mb-6">Manage daily-wage worker profiles.</p>

      <div className="rounded-2xl border shadow-sm p-5 mb-6" style={card}>
        <h2 className="font-bold text-sm mb-4" style={{ color: dark ? '#e2e8f0' : '#1e293b' }}>
          {editing ? `Edit — ${editing.name}` : 'Add New Worker'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Name *</label>
            <input className={inputCls} style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Worker name" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Phone</label>
            <input className={inputCls} style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="07x xxxxxxx" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Daily Rate (Rs) *</label>
            <input type="number" min="0" step="0.01" className={inputCls} style={inputStyle} value={form.daily_rate} onChange={e => setForm(f => ({ ...f, daily_rate: e.target.value }))} placeholder="1500.00" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Address</label>
            <input className={inputCls} style={inputStyle} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="optional" />
          </div>
        </div>
        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button onClick={save} disabled={saving || !form.name.trim() || !form.daily_rate}
            className="px-5 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-bold disabled:opacity-50">
            {saving ? 'Saving…' : editing ? 'Update' : 'Add Worker'}
          </button>
          {editing && <button onClick={cancelEdit} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-600">Cancel</button>}
        </div>
      </div>

      <div className="rounded-2xl border shadow-sm overflow-hidden" style={card}>
        {loading ? <p className="p-5 text-slate-400 text-sm">Loading…</p> : list.length === 0 ? (
          <p className="p-5 text-slate-400 text-sm">No workers added yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-widest text-slate-400"
                style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
                <th className="px-5 py-3 text-left font-semibold">Name</th>
                <th className="px-5 py-3 text-left font-semibold">Phone</th>
                <th className="px-5 py-3 text-right font-semibold">Daily Rate</th>
                <th className="px-5 py-3 text-right font-semibold">Advance Balance</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
              {list.map(w => (
                <tr key={w.id}>
                  <td className="px-5 py-3 font-semibold" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>{w.name}</td>
                  <td className="px-5 py-3 text-slate-400">{w.phone || '—'}</td>
                  <td className="px-5 py-3 text-right font-mono">Rs {parseFloat(w.daily_rate).toFixed(2)}</td>
                  <td className="px-5 py-3 text-right font-mono font-bold" style={{ color: parseFloat(w.advance_balance) > 0 ? '#dc2626' : '#16a34a' }}>
                    Rs {parseFloat(w.advance_balance || 0).toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => startEdit(w)}
                      className="text-xs px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold">Edit</button>
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
