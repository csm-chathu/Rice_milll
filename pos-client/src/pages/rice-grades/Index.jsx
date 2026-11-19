import { useState, useEffect } from 'react';
import { getApiUrl } from '../../config/runtimeConfig';
import { useSelector } from 'react-redux';
import { selectToken } from '../../features/auth/authSlice';
import { useTheme } from '../../contexts/ThemeContext';

const API = getApiUrl();
const TYPES = ['raw', 'boiled', 'broken', 'bran', 'husk', 'other'];

export default function RiceGradesIndex() {
  const token = useSelector(selectToken);
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', type: 'raw', unit: 'kg', price_per_kg: '' });
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  async function load() {
    const r = await fetch(`${API}/api/rice-grades`, { headers });
    setList(await r.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true); setError('');
    const url = editing ? `${API}/api/rice-grades/${editing.id}` : `${API}/api/rice-grades`;
    const method = editing ? 'PUT' : 'POST';
    const r = await fetch(url, { method, headers, body: JSON.stringify(form) });
    if (!r.ok) { setError((await r.json()).error || 'Failed'); setSaving(false); return; }
    setForm({ name: '', type: 'raw', unit: 'kg', price_per_kg: '' }); setEditing(null);
    await load(); setSaving(false);
  }

  function startEdit(g) { setEditing(g); setForm({ name: g.name, type: g.type, unit: g.unit, price_per_kg: g.price_per_kg || '' }); }
  function cancelEdit() { setEditing(null); setForm({ name: '', type: 'raw', unit: 'kg', price_per_kg: '' }); setError(''); }

  const card = { backgroundColor: dark ? '#1f2937' : '#fff', borderColor: dark ? '#374151' : '#e2e8f0' };
  const inputCls = `w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-600`;
  const inputStyle = dark ? { backgroundColor: '#111827', border: '1px solid #374151', color: '#f1f5f9' }
                           : { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a' };

  const typeColors = { raw: 'bg-green-100 text-green-700', boiled: 'bg-yellow-100 text-yellow-700',
    broken: 'bg-orange-100 text-orange-700', bran: 'bg-amber-100 text-amber-700',
    husk: 'bg-stone-100 text-stone-700', other: 'bg-slate-100 text-slate-600' };

  return (
    <div className="p-5 w-full">
      <h1 className="text-2xl font-extrabold mb-1" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>Rice Grades</h1>
      <p className="text-sm text-slate-400 mb-6">Define rice types and by-products produced at the mill.</p>

      {/* Form */}
      <div className="rounded-2xl border shadow-sm p-5 mb-6" style={card}>
        <h2 className="font-bold text-sm mb-4" style={{ color: dark ? '#e2e8f0' : '#1e293b' }}>
          {editing ? `Edit — ${editing.name}` : 'Add New Grade'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Grade Name *</label>
            <input className={inputCls} style={inputStyle} value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Samba White" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Type</label>
            <select className={inputCls} style={inputStyle} value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Unit</label>
            <select className={inputCls} style={inputStyle} value={form.unit}
              onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="mt">metric ton</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Price / kg (Rs)</label>
            <input className={inputCls} style={inputStyle} type="number" min="0" step="0.01"
              value={form.price_per_kg} onChange={e => setForm(f => ({ ...f, price_per_kg: e.target.value }))} placeholder="0.00" />
          </div>
        </div>
        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button onClick={save} disabled={saving || !form.name.trim()}
            className="px-5 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-bold disabled:opacity-50">
            {saving ? 'Saving…' : editing ? 'Update' : 'Add Grade'}
          </button>
          {editing && <button onClick={cancelEdit} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-600">Cancel</button>}
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl border shadow-sm overflow-hidden" style={card}>
        {loading ? (
          <p className="p-5 text-slate-400 text-sm">Loading…</p>
        ) : list.length === 0 ? (
          <p className="p-5 text-slate-400 text-sm">No grades added yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-widest text-slate-400"
                style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
                <th className="px-5 py-3 text-left font-semibold">Grade</th>
                <th className="px-5 py-3 text-left font-semibold">Type</th>
                <th className="px-5 py-3 text-right font-semibold">Stock (kg)</th>
                <th className="px-5 py-3 text-right font-semibold">Price / kg</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
              {list.map(g => (
                <tr key={g.id}>
                  <td className="px-5 py-3 font-semibold" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>{g.name}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${typeColors[g.type] || typeColors.other}`}>{g.type}</span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono">{parseFloat(g.current_stock || 0).toLocaleString()}</td>
                  <td className="px-5 py-3 text-right font-mono">{g.price_per_kg ? `Rs ${parseFloat(g.price_per_kg).toFixed(2)}` : '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => startEdit(g)}
                      className="text-xs px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold">
                      Edit
                    </button>
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
