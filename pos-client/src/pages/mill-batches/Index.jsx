import { useState, useEffect } from 'react';
import { getApiUrl } from '../../config/runtimeConfig';
import { useSelector } from 'react-redux';
import { selectToken } from '../../features/auth/authSlice';
import { useTheme } from '../../contexts/ThemeContext';

const API = getApiUrl();

function StatusBadge({ status }) {
  const map = {
    pending:    'bg-yellow-100 text-yellow-700',
    milling:    'bg-blue-100 text-blue-700',
    completed:  'bg-green-100 text-green-700',
    cancelled:  'bg-red-100 text-red-700',
  };
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${map[status] || map.pending}`}>{status}</span>;
}

export default function MillBatchesIndex() {
  const token = useSelector(selectToken);
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [batches, setBatches] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [outputModal, setOutputModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    batch_date: new Date().toISOString().slice(0, 10),
    paddy_lot_id: '', variety_id: '', paddy_qty_kg: '',
    milling_charge_per_kg: '', note: '',
  });

  const [outputs, setOutputs] = useState([
    { grade_id: '', quantity_kg: '', note: '' },
  ]);

  const [grades, setGrades] = useState([]);

  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  async function load() {
    setLoading(true);
    const [b, v, l, g] = await Promise.all([
      fetch(`${API}/api/mill-batches`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/paddy-varieties`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/paddy-purchases?status=received`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/rice-grades`, { headers: h }).then(r => r.json()),
    ]);
    setBatches(Array.isArray(b) ? b : (b.data ?? []));
    setVarieties(Array.isArray(v) ? v : []);
    setLots(Array.isArray(l) ? l : (l.data ?? []));
    setGrades(Array.isArray(g) ? g : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function saveBatch() {
    setSaving(true); setError('');
    const r = await fetch(`${API}/api/mill-batches`, {
      method: 'POST', headers: h,
      body: JSON.stringify({ ...form, outputs }),
    });
    if (!r.ok) { setError((await r.json()).error || 'Failed'); setSaving(false); return; }
    setShowForm(false);
    setForm({ batch_date: new Date().toISOString().slice(0, 10), paddy_lot_id: '', variety_id: '', paddy_qty_kg: '', milling_charge_per_kg: '', note: '' });
    setOutputs([{ grade_id: '', quantity_kg: '', note: '' }]);
    await load(); setSaving(false);
  }

  async function updateStatus(id, status) {
    await fetch(`${API}/api/mill-batches/${id}/status`, { method: 'PATCH', headers: h, body: JSON.stringify({ status }) });
    await load();
  }

  function addOutputRow() { setOutputs(o => [...o, { grade_id: '', quantity_kg: '', note: '' }]); }
  function removeOutputRow(i) { setOutputs(o => o.filter((_, idx) => idx !== i)); }
  function setOutput(i, key, val) { setOutputs(o => o.map((row, idx) => idx === i ? { ...row, [key]: val } : row)); }

  const card = { backgroundColor: dark ? '#1f2937' : '#fff', borderColor: dark ? '#374151' : '#e2e8f0' };
  const inputCls = `w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-600`;
  const inputStyle = dark ? { backgroundColor: '#111827', border: '1px solid #374151', color: '#f1f5f9' }
                           : { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a' };
  const fmt = n => parseFloat(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

  return (
    <div className="p-5 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>Milling Batches</h1>
          <p className="text-sm text-slate-400 mt-0.5">Record each milling run — paddy input, outputs, and milling charges.</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="px-5 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-bold shadow">
          + New Batch
        </button>
      </div>

      {/* New batch form */}
      {showForm && (
        <div className="rounded-2xl border shadow-sm p-5 mb-6" style={card}>
          <h2 className="font-bold text-sm mb-4" style={{ color: dark ? '#e2e8f0' : '#1e293b' }}>New Milling Batch</h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Date *</label>
              <input type="date" className={inputCls} style={inputStyle} value={form.batch_date}
                onChange={e => setForm(f => ({ ...f, batch_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Paddy Variety *</label>
              <select className={inputCls} style={inputStyle} value={form.variety_id}
                onChange={e => setForm(f => ({ ...f, variety_id: e.target.value }))}>
                <option value="">Select variety…</option>
                {varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">From Lot (optional)</label>
              <select className={inputCls} style={inputStyle} value={form.paddy_lot_id}
                onChange={e => setForm(f => ({ ...f, paddy_lot_id: e.target.value }))}>
                <option value="">No specific lot</option>
                {lots.map(l => <option key={l.id} value={l.id}>{l.lot_no} — {l.supplier?.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Paddy Input (kg) *</label>
              <input type="number" min="0" step="0.01" className={inputCls} style={inputStyle}
                value={form.paddy_qty_kg} onChange={e => setForm(f => ({ ...f, paddy_qty_kg: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Milling Charge / kg (Rs)</label>
              <input type="number" min="0" step="0.01" className={inputCls} style={inputStyle}
                value={form.milling_charge_per_kg} onChange={e => setForm(f => ({ ...f, milling_charge_per_kg: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Note</label>
              <input className={inputCls} style={inputStyle} value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="optional" />
            </div>
          </div>

          {/* Output rows */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Output Products</span>
              <button onClick={addOutputRow} className="text-xs px-3 py-1 rounded-lg bg-green-100 text-green-700 font-semibold hover:bg-green-200">+ Add Row</button>
            </div>
            <div className="space-y-2">
              {outputs.map((row, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <select className={inputCls} style={inputStyle} value={row.grade_id}
                      onChange={e => setOutput(i, 'grade_id', e.target.value)}>
                      <option value="">Select grade…</option>
                      {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input type="number" min="0" step="0.01" className={inputCls} style={inputStyle}
                      placeholder="Qty (kg)" value={row.quantity_kg} onChange={e => setOutput(i, 'quantity_kg', e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <input className={inputCls} style={inputStyle} placeholder="note" value={row.note}
                      onChange={e => setOutput(i, 'note', e.target.value)} />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {outputs.length > 1 && (
                      <button onClick={() => removeOutputRow(i)}
                        className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={saveBatch} disabled={saving || !form.variety_id || !form.paddy_qty_kg}
              className="px-5 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-bold disabled:opacity-50">
              {saving ? 'Saving…' : 'Create Batch'}
            </button>
            <button onClick={() => { setShowForm(false); setError(''); }}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-600">Cancel</button>
          </div>
        </div>
      )}

      {/* Batches table */}
      <div className="rounded-2xl border shadow-sm overflow-hidden" style={card}>
        {loading ? <p className="p-5 text-slate-400 text-sm">Loading…</p> : batches.length === 0 ? (
          <p className="p-5 text-slate-400 text-sm">No milling batches recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-widest text-slate-400"
                  style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
                  <th className="px-4 py-3 text-left font-semibold">Batch No</th>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Variety</th>
                  <th className="px-4 py-3 text-right font-semibold">Paddy In (kg)</th>
                  <th className="px-4 py-3 text-right font-semibold">Rice Out (kg)</th>
                  <th className="px-4 py-3 text-right font-semibold">Milling Cost</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
                {batches.map(b => (
                  <tr key={b.id}>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: dark ? '#93c5fd' : '#2563eb' }}>{b.batch_no}</td>
                    <td className="px-4 py-3 text-slate-400">{b.batch_date?.slice(0, 10)}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>{b.variety?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-mono">{parseFloat(b.paddy_qty_kg || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-green-600 font-semibold">{parseFloat(b.total_output_kg || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono">Rs {fmt(b.milling_cost)}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={b.status} /></td>
                    <td className="px-4 py-3 text-right">
                      {b.status === 'pending' && (
                        <button onClick={() => updateStatus(b.id, 'completed')}
                          className="text-xs px-3 py-1 rounded-lg bg-green-700 text-white hover:bg-green-800 font-semibold">
                          Complete
                        </button>
                      )}
                      {b.status === 'milling' && (
                        <button onClick={() => updateStatus(b.id, 'completed')}
                          className="text-xs px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold">
                          Mark Done
                        </button>
                      )}
                    </td>
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
