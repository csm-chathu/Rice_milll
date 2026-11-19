import { useState, useEffect } from 'react';
import { getApiUrl } from '../../config/runtimeConfig';
import { useSelector } from 'react-redux';
import { selectToken } from '../../features/auth/authSlice';
import { useTheme } from '../../contexts/ThemeContext';

const API = getApiUrl();

export default function SuppliersIndex() {
  const token = useSelector(selectToken);
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', phone: '', address: '', note: '' });
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  async function load() {
    const r = await fetch(`${API}/api/suppliers`, { headers: h });
    const d = await r.json();
    setList(Array.isArray(d) ? d : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true); setError('');
    const url = editing ? `${API}/api/suppliers/${editing.id}` : `${API}/api/suppliers`;
    const method = editing ? 'PUT' : 'POST';
    const r = await fetch(url, { method, headers: h, body: JSON.stringify(form) });
    if (!r.ok) { setError((await r.json()).error || 'Failed'); setSaving(false); return; }
    setForm({ name: '', phone: '', address: '', note: '' }); setEditing(null);
    await load(); setSaving(false);
  }

  function startEdit(s) { setEditing(s); setForm({ name: s.name, phone: s.phone || '', address: s.address || '', note: s.note || '' }); }
  function cancelEdit() { setEditing(null); setForm({ name: '', phone: '', address: '', note: '' }); setError(''); }

  const filtered = list.filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.phone?.includes(search));

  const card = { backgroundColor: dark ? '#1f2937' : '#fff', borderColor: dark ? '#374151' : '#e2e8f0' };
  const inputCls = `w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-600`;
  const inputStyle = dark ? { backgroundColor: '#111827', border: '1px solid #374151', color: '#f1f5f9' }
                           : { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a' };
  const fmt = n => parseFloat(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

  return (
    <div className="p-5 w-full">
      <h1 className="text-2xl font-extrabold mb-1" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>Suppliers</h1>
      <p className="text-sm text-slate-400 mb-6">Paddy farmers and other raw material suppliers.</p>

      <div className="rounded-2xl border shadow-sm p-5 mb-6" style={card}>
        <h2 className="font-bold text-sm mb-4" style={{ color: dark ? '#e2e8f0' : '#1e293b' }}>
          {editing ? `Edit — ${editing.name}` : 'Add New Supplier'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Name *</label>
            <input className={inputCls} style={inputStyle} value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Supplier name" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Phone</label>
            <input className={inputCls} style={inputStyle} value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="07x xxxxxxx" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Address</label>
            <input className={inputCls} style={inputStyle} value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="optional" />
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
            {saving ? 'Saving…' : editing ? 'Update' : 'Add Supplier'}
          </button>
          {editing && <button onClick={cancelEdit} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-600">Cancel</button>}
        </div>
      </div>

      <div className="mb-4">
        <input className="rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-600 w-full md:w-80"
          style={inputStyle} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone…" />
      </div>

      <div className="rounded-2xl border shadow-sm overflow-hidden" style={card}>
        {loading ? <p className="p-5 text-slate-400 text-sm">Loading…</p> : filtered.length === 0 ? (
          <p className="p-5 text-slate-400 text-sm">{list.length === 0 ? 'No suppliers yet.' : 'No results.'}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-widest text-slate-400"
                style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
                <th className="px-5 py-3 text-left font-semibold">Name</th>
                <th className="px-5 py-3 text-left font-semibold">Phone</th>
                <th className="px-5 py-3 text-left font-semibold">Address</th>
                <th className="px-5 py-3 text-right font-semibold">Total Purchased</th>
                <th className="px-5 py-3 text-right font-semibold">Balance Due</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td className="px-5 py-3 font-semibold" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>{s.name}</td>
                  <td className="px-5 py-3 text-slate-400">{s.phone || '—'}</td>
                  <td className="px-5 py-3 text-slate-400 text-xs">{s.address || '—'}</td>
                  <td className="px-5 py-3 text-right font-mono">Rs {fmt(s.total_purchases || 0)}</td>
                  <td className="px-5 py-3 text-right font-mono font-bold" style={{ color: parseFloat(s.balance_due || 0) > 0 ? '#dc2626' : '#16a34a' }}>
                    Rs {fmt(s.balance_due || 0)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => startEdit(s)}
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
