import { useState, useEffect } from 'react';
import { getApiUrl } from '../../config/runtimeConfig';
import { useSelector } from 'react-redux';
import { selectToken } from '../../features/auth/authSlice';
import { useTheme } from '../../contexts/ThemeContext';

const API = getApiUrl();

function Badge({ status }) {
  const map = { paid: 'bg-green-100 text-green-700', partial: 'bg-yellow-100 text-yellow-700', pending: 'bg-red-100 text-red-700' };
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${map[status] || map.pending}`}>{status}</span>;
}

export default function WholesaleSalesIndex() {
  const token = useSelector(selectToken);
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [grades, setGrades] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [payModal, setPayModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    customer_id: '', sale_date: new Date().toISOString().slice(0, 10), note: '',
  });
  const [items, setItems] = useState([{ grade_id: '', quantity_kg: '', price_per_kg: '' }]);
  const [payForm, setPayForm] = useState({ payment_date: new Date().toISOString().slice(0, 10), amount: '', payment_method: 'cash', cash_account_id: '', note: '' });

  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  async function load() {
    setLoading(true);
    const [s, c, g, ca] = await Promise.all([
      fetch(`${API}/api/wholesale-sales`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/customers`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/rice-grades`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/cash-accounts`, { headers: h }).then(r => r.json()),
    ]);
    setSales(Array.isArray(s) ? s : (s.data ?? []));
    setCustomers(Array.isArray(c) ? c : []);
    setGrades(Array.isArray(g) ? g : []);
    setCashAccounts(Array.isArray(ca) ? ca : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function addItem() { setItems(i => [...i, { grade_id: '', quantity_kg: '', price_per_kg: '' }]); }
  function removeItem(i) { setItems(list => list.filter((_, idx) => idx !== i)); }
  function setItem(i, key, val) { setItems(list => list.map((row, idx) => idx === i ? { ...row, [key]: val } : row)); }

  const saleTotal = items.reduce((sum, r) => sum + parseFloat(r.quantity_kg || 0) * parseFloat(r.price_per_kg || 0), 0);

  async function saveSale() {
    setSaving(true); setError('');
    const r = await fetch(`${API}/api/wholesale-sales`, {
      method: 'POST', headers: h, body: JSON.stringify({ ...form, items }),
    });
    if (!r.ok) { setError((await r.json()).error || 'Failed'); setSaving(false); return; }
    setShowForm(false);
    setForm({ customer_id: '', sale_date: new Date().toISOString().slice(0, 10), note: '' });
    setItems([{ grade_id: '', quantity_kg: '', price_per_kg: '' }]);
    await load(); setSaving(false);
  }

  async function savePayment() {
    setSaving(true); setError('');
    const r = await fetch(`${API}/api/wholesale-sales/${payModal.id}/payments`, {
      method: 'POST', headers: h, body: JSON.stringify(payForm),
    });
    if (!r.ok) { setError((await r.json()).error || 'Failed'); setSaving(false); return; }
    setPayModal(null);
    setPayForm({ payment_date: new Date().toISOString().slice(0, 10), amount: '', payment_method: 'cash', cash_account_id: '', note: '' });
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
          <h1 className="text-2xl font-extrabold" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>Wholesale Sales</h1>
          <p className="text-sm text-slate-400 mt-0.5">Record rice sales to wholesale buyers and retailers.</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="px-5 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-bold shadow">
          + New Sale
        </button>
      </div>

      {/* New sale form */}
      {showForm && (
        <div className="rounded-2xl border shadow-sm p-5 mb-6" style={card}>
          <h2 className="font-bold text-sm mb-4" style={{ color: dark ? '#e2e8f0' : '#1e293b' }}>New Wholesale Sale</h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Customer *</label>
              <select className={inputCls} style={inputStyle} value={form.customer_id}
                onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
                <option value="">Select customer…</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Sale Date *</label>
              <input type="date" className={inputCls} style={inputStyle} value={form.sale_date}
                onChange={e => setForm(f => ({ ...f, sale_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Note</label>
              <input className={inputCls} style={inputStyle} value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="optional" />
            </div>
          </div>

          {/* Items */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Sale Items</span>
              <button onClick={addItem} className="text-xs px-3 py-1 rounded-lg bg-green-100 text-green-700 font-semibold hover:bg-green-200">+ Add Item</button>
            </div>
            <div className="space-y-2">
              {items.map((row, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <select className={inputCls} style={inputStyle} value={row.grade_id}
                      onChange={e => setItem(i, 'grade_id', e.target.value)}>
                      <option value="">Select grade…</option>
                      {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input type="number" min="0" step="0.01" className={inputCls} style={inputStyle}
                      placeholder="Qty (kg)" value={row.quantity_kg}
                      onChange={e => setItem(i, 'quantity_kg', e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <input type="number" min="0" step="0.01" className={inputCls} style={inputStyle}
                      placeholder="Price / kg" value={row.price_per_kg}
                      onChange={e => setItem(i, 'price_per_kg', e.target.value)} />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {items.length > 1 && (
                      <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {saleTotal > 0 && (
              <p className="mt-3 text-sm font-bold text-green-600">Total: Rs {fmt(saleTotal)}</p>
            )}
          </div>

          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={saveSale} disabled={saving || !form.customer_id || items.some(r => !r.grade_id || !r.quantity_kg || !r.price_per_kg)}
              className="px-5 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-bold disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Sale'}
            </button>
            <button onClick={() => { setShowForm(false); setError(''); }}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-600">Cancel</button>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-2xl border shadow-xl p-6 w-full max-w-md mx-4" style={card}>
            <h2 className="font-bold mb-1" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>Record Payment</h2>
            <p className="text-sm text-slate-400 mb-4">Invoice: {payModal.invoice_no} · Balance: <strong className="text-red-500">Rs {fmt(payModal.balance)}</strong></p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Date</label>
                <input type="date" className={inputCls} style={inputStyle} value={payForm.payment_date}
                  onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Amount (Rs)</label>
                <input type="number" min="0" step="0.01" className={inputCls} style={inputStyle}
                  value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Method</label>
                <select className={inputCls} style={inputStyle} value={payForm.payment_method}
                  onChange={e => setPayForm(f => ({ ...f, payment_method: e.target.value }))}>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Cash Account</label>
                <select className={inputCls} style={inputStyle} value={payForm.cash_account_id}
                  onChange={e => setPayForm(f => ({ ...f, cash_account_id: e.target.value }))}>
                  <option value="">Default</option>
                  {cashAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Note</label>
                <input className={inputCls} style={inputStyle} value={payForm.note}
                  onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))} placeholder="optional" />
              </div>
            </div>
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={savePayment} disabled={saving || !payForm.amount}
                className="px-5 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-bold disabled:opacity-50">
                {saving ? 'Saving…' : 'Record Payment'}
              </button>
              <button onClick={() => { setPayModal(null); setError(''); }} className="px-4 py-2 text-sm text-slate-400">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border shadow-sm overflow-hidden" style={card}>
        {loading ? <p className="p-5 text-slate-400 text-sm">Loading…</p> : sales.length === 0 ? (
          <p className="p-5 text-slate-400 text-sm">No sales recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-widest text-slate-400"
                  style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
                  <th className="px-4 py-3 text-left font-semibold">Invoice</th>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Customer</th>
                  <th className="px-4 py-3 text-right font-semibold">Total (Rs)</th>
                  <th className="px-4 py-3 text-right font-semibold">Balance (Rs)</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
                {sales.map(s => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: dark ? '#93c5fd' : '#2563eb' }}>{s.invoice_no}</td>
                    <td className="px-4 py-3 text-slate-400">{s.sale_date?.slice(0, 10)}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>{s.customer?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(s.total_amount)}</td>
                    <td className="px-4 py-3 text-right font-mono text-red-500 font-bold">{fmt(s.balance)}</td>
                    <td className="px-4 py-3 text-center"><Badge status={s.payment_status} /></td>
                    <td className="px-4 py-3 text-right">
                      {s.payment_status !== 'paid' && (
                        <button onClick={() => { setPayModal(s); setError(''); }}
                          className="text-xs px-3 py-1 rounded-lg bg-green-700 text-white hover:bg-green-800 font-semibold">
                          Pay
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
