import { useState, useEffect } from 'react';
import { getApiUrl } from '../../config/runtimeConfig';
import { useSelector } from 'react-redux';
import { selectToken } from '../../features/auth/authSlice';
import { useTheme } from '../../contexts/ThemeContext';

const API = getApiUrl();

export default function PaddyVarietiesIndex() {
  const token = useSelector(selectToken);
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', description: '' });
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  async function load() {
    const r = await fetch(`${API}/api/paddy-varieties`, { headers });
    setList(await r.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true); setError('');
    const url = editing ? `${API}/api/paddy-varieties/${editing.id}` : `${API}/api/paddy-varieties`;
    const method = editing ? 'PUT' : 'POST';
    const r = await fetch(url, { method, headers, body: JSON.stringify(form) });
    if (!r.ok) { setError((await r.json()).error || 'Failed'); setSaving(false); return; }
    setForm({ name: '', description: '' }); setEditing(null);
    await load(); setSaving(false);
  }

  function startEdit(v) { setEditing(v); setForm({ name: v.name, description: v.description || '' }); }
  function cancelEdit() { setEditing(null); setForm({ name: '', description: '' }); setError(''); }

  const card = { backgroundColor: dark ? '#1f2937' : '#fff', borderColor: dark ? '#374151' : '#e2e8f0' };
  const inputCls = `w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-600`;
  const inputStyle = dark ? { backgroundColor: '#111827', border: '1px solid #374151', color: '#f1f5f9' }
                           : { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a' };

  return (
    <div className="p-5 w-full">
      <h1 className="text-2xl font-extrabold mb-1" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>Paddy Varieties</h1>
      <p className="text-sm text-slate-400 mb-6">Manage paddy types purchased at the mill.</p>

      {/* Form */}
      <div className="rounded-2xl border shadow-sm p-5 mb-6" style={card}>
        <h2 className="font-bold text-sm mb-4" style={{ color: dark ? '#e2e8f0' : '#1e293b' }}>
          {editing ? `Edit — ${editing.name}` : 'Add New Variety'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Variety Name *</label>
            <input className={inputCls} style={inputStyle} value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Samba, Nadu, Keeri" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Description</label>
            <input className={inputCls} style={inputStyle} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional notes" />
          </div>
        </div>
        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button onClick={save} disabled={saving || !form.name.trim()}
            className="px-5 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-bold disabled:opacity-50">
            {saving ? 'Saving…' : editing ? 'Update' : 'Add Variety'}
          </button>
          {editing && <button onClick={cancelEdit} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-600">Cancel</button>}
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl border shadow-sm overflow-hidden" style={card}>
        {loading ? (
          <p className="p-5 text-slate-400 text-sm">Loading…</p>
        ) : list.length === 0 ? (
          <p className="p-5 text-slate-400 text-sm">No varieties added yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-widest text-slate-400"
                style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
                <th className="px-5 py-3 text-left font-semibold">Name</th>
                <th className="px-5 py-3 text-left font-semibold">Description</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
              {list.map(v => (
                <tr key={v.id}>
                  <td className="px-5 py-3 font-semibold" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>{v.name}</td>
                  <td className="px-5 py-3 text-slate-400">{v.description || '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => startEdit(v)}
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
