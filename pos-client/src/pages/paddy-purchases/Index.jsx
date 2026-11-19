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

export default function PaddyPurchasesIndex() {
  const token = useSelector(selectToken);
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [payModal, setPayModal] = useState(null);
  const [historyModal, setHistoryModal] = useState(null); // { purchase, payments[] }
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    supplier_id: '', variety_id: '', purchase_date: new Date().toISOString().slice(0, 10),
    quantity_kg: '', price_per_kg: '', moisture_pct: '', note: '',
  });
  const [payForm, setPayForm] = useState({ payment_date: new Date().toISOString().slice(0, 10), amount: '', payment_method: 'cash', cash_account_id: '', note: '' });

  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  async function load() {
    const [p, s, v, c] = await Promise.all([
      fetch(`${API}/api/paddy-purchases`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/suppliers`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/paddy-varieties`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/cash-accounts`, { headers: h }).then(r => r.json()),
    ]);
    setPurchases(Array.isArray(p) ? p : (p.data ?? []));
    setSuppliers(Array.isArray(s) ? s : []);
    setVarieties(Array.isArray(v) ? v : []);
    setCashAccounts(Array.isArray(c) ? c : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function savePurchase() {
    setSaving(true); setError('');
    const r = await fetch(`${API}/api/paddy-purchases`, { method: 'POST', headers: h, body: JSON.stringify(form) });
    if (!r.ok) { setError((await r.json()).error || 'Failed'); setSaving(false); return; }
    setShowForm(false);
    setForm({ supplier_id: '', variety_id: '', purchase_date: new Date().toISOString().slice(0, 10), quantity_kg: '', price_per_kg: '', moisture_pct: '', note: '' });
    await load(); setSaving(false);
  }

  async function savePayment() {
    setSaving(true); setError('');
    const r = await fetch(`${API}/api/paddy-purchases/${payModal.id}/payments`, { method: 'POST', headers: h, body: JSON.stringify(payForm) });
    if (!r.ok) { setError((await r.json()).error || 'Failed'); setSaving(false); return; }
    setPayModal(null);
    setPayForm({ payment_date: new Date().toISOString().slice(0, 10), amount: '', payment_method: 'cash', cash_account_id: '', note: '' });
    await load(); setSaving(false);
  }

  async function openHistory(purchase) {
    setHistoryModal({ purchase, payments: [] });
    setHistoryLoading(true);
    const r = await fetch(`${API}/api/paddy-purchases/${purchase.id}/payments`, { headers: h });
    const data = await r.json();
    setHistoryModal({ purchase, payments: Array.isArray(data) ? data : [] });
    setHistoryLoading(false);
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
          <h1 className="text-2xl font-extrabold" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>Paddy Purchasing</h1>
          <p className="text-sm text-slate-400 mt-0.5">Record lot-wise paddy purchases from suppliers and farmers.</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="px-5 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-bold shadow">
          + New Purchase
        </button>
      </div>

      {/* New purchase form */}
      {showForm && (
        <div className="rounded-2xl border shadow-sm p-5 mb-6" style={card}>
          <h2 className="font-bold text-sm mb-4" style={{ color: dark ? '#e2e8f0' : '#1e293b' }}>New Paddy Purchase</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Supplier *</label>
              <select className={inputCls} style={inputStyle} value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
                <option value="">Select supplier…</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Paddy Variety *</label>
              <select className={inputCls} style={inputStyle} value={form.variety_id} onChange={e => setForm(f => ({ ...f, variety_id: e.target.value }))}>
                <option value="">Select variety…</option>
                {varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Purchase Date *</label>
              <input type="date" className={inputCls} style={inputStyle} value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Quantity (kg) *</label>
              <input type="number" min="0" step="0.01" className={inputCls} style={inputStyle} value={form.quantity_kg} onChange={e => setForm(f => ({ ...f, quantity_kg: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Price / kg (Rs) *</label>
              <input type="number" min="0" step="0.01" className={inputCls} style={inputStyle} value={form.price_per_kg} onChange={e => setForm(f => ({ ...f, price_per_kg: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Moisture %</label>
              <input type="number" min="0" max="100" step="0.1" className={inputCls} style={inputStyle} value={form.moisture_pct} onChange={e => setForm(f => ({ ...f, moisture_pct: e.target.value }))} placeholder="optional" />
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Note</label>
              <input className={inputCls} style={inputStyle} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="optional" />
            </div>
          </div>
          {form.quantity_kg && form.price_per_kg && (
            <p className="mt-3 text-sm font-bold text-green-600">
              Total: Rs {fmt(parseFloat(form.quantity_kg || 0) * parseFloat(form.price_per_kg || 0))}
            </p>
          )}
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={savePurchase} disabled={saving || !form.supplier_id || !form.variety_id || !form.quantity_kg || !form.price_per_kg}
              className="px-5 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-bold disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Purchase'}
            </button>
            <button onClick={() => { setShowForm(false); setError(''); }} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-600">Cancel</button>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-2xl border shadow-xl p-6 w-full max-w-md mx-4" style={card}>
            <h2 className="font-bold mb-1" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>Record Payment</h2>
            <p className="text-sm text-slate-400 mb-4">Lot: {payModal.lot_no} · Balance: <strong className="text-red-500">Rs {fmt(payModal.balance)}</strong></p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Date</label>
                <input type="date" className={inputCls} style={inputStyle} value={payForm.payment_date} onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Amount (Rs)</label>
                <input type="number" min="0" step="0.01" className={inputCls} style={inputStyle} value={payForm.amount}
                  onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Method</label>
                <select className={inputCls} style={inputStyle} value={payForm.payment_method} onChange={e => setPayForm(f => ({ ...f, payment_method: e.target.value }))}>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Cash Account</label>
                <select className={inputCls} style={inputStyle} value={payForm.cash_account_id} onChange={e => setPayForm(f => ({ ...f, cash_account_id: e.target.value }))}>
                  <option value="">Default</option>
                  {cashAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Note</label>
                <input className={inputCls} style={inputStyle} value={payForm.note} onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))} placeholder="optional" />
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

      {/* Payment history modal */}
      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-2xl border shadow-xl p-6 w-full max-w-lg mx-4" style={card}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-bold text-base" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>
                  Payment History
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {historyModal.purchase.lot_no} · {historyModal.purchase.supplier?.name}
                </p>
              </div>
              <button onClick={() => setHistoryModal(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Total',   value: fmt(historyModal.purchase.total_amount), color: dark ? '#f1f5f9' : '#0f172a' },
                { label: 'Paid',    value: fmt(historyModal.purchase.paid_amount),  color: '#16a34a' },
                { label: 'Balance', value: fmt(historyModal.purchase.balance),      color: parseFloat(historyModal.purchase.balance) > 0 ? '#dc2626' : '#16a34a' },
              ].map(k => (
                <div key={k.label} className="rounded-xl p-3 text-center"
                  style={{ backgroundColor: dark ? '#111827' : '#f8fafc', border: `1px solid ${dark ? '#374151' : '#e2e8f0'}` }}>
                  <p className="text-xs text-slate-400 mb-0.5">{k.label}</p>
                  <p className="font-bold text-sm font-mono" style={{ color: k.color }}>Rs {k.value}</p>
                </div>
              ))}
            </div>

            {historyLoading ? (
              <p className="text-slate-400 text-sm text-center py-4">Loading…</p>
            ) : historyModal.payments.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No payments recorded yet.</p>
            ) : (
              <div className="rounded-xl overflow-hidden border" style={{ borderColor: dark ? '#374151' : '#e2e8f0' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-widest text-slate-400 border-b"
                      style={{ borderColor: dark ? '#374151' : '#f1f5f9', backgroundColor: dark ? '#111827' : '#f8fafc' }}>
                      <th className="px-4 py-2.5 text-left font-semibold">Date</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Method</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Note</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Amount (Rs)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
                    {historyModal.payments.map((p, i) => (
                      <tr key={p.id ?? i}>
                        <td className="px-4 py-2.5 text-slate-400">{p.payment_date?.slice(0, 10)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.payment_method === 'cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {p.payment_method === 'bank_transfer' ? 'Bank' : 'Cash'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 text-xs">{p.note || '—'}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-green-600">
                          {fmt(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t" style={{ borderColor: dark ? '#374151' : '#e2e8f0' }}>
                      <td colSpan={3} className="px-4 py-2.5 text-sm font-bold" style={{ color: dark ? '#e2e8f0' : '#1e293b' }}>Total Paid</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-green-600">
                        {fmt(historyModal.payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              {historyModal.purchase.payment_status !== 'paid' && (
                <button onClick={() => { setPayModal(historyModal.purchase); setHistoryModal(null); setError(''); }}
                  className="px-4 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-bold">
                  + Add Payment
                </button>
              )}
              <button onClick={() => setHistoryModal(null)}
                className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-600">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border shadow-sm overflow-hidden" style={card}>
        {loading ? <p className="p-5 text-slate-400 text-sm">Loading…</p> : purchases.length === 0 ? (
          <p className="p-5 text-slate-400 text-sm">No purchases recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-widest text-slate-400"
                  style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
                  <th className="px-4 py-3 text-left font-semibold">Lot No</th>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Supplier</th>
                  <th className="px-4 py-3 text-left font-semibold">Variety</th>
                  <th className="px-4 py-3 text-right font-semibold">Qty (kg)</th>
                  <th className="px-4 py-3 text-right font-semibold">Total (Rs)</th>
                  <th className="px-4 py-3 text-right font-semibold">Balance (Rs)</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
                {purchases.map(p => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: dark ? '#93c5fd' : '#2563eb' }}>{p.lot_no}</td>
                    <td className="px-4 py-3 text-slate-400">{p.purchase_date?.slice(0, 10)}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>{p.supplier?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{p.variety?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-mono">{parseFloat(p.quantity_kg).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(p.total_amount)}</td>
                    <td className="px-4 py-3 text-right font-mono text-red-500 font-bold">{fmt(p.balance)}</td>
                    <td className="px-4 py-3 text-center"><Badge status={p.payment_status} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openHistory(p)}
                          className="text-xs px-3 py-1 rounded-lg border font-semibold transition-colors"
                          style={{ borderColor: dark ? '#374151' : '#e2e8f0', color: dark ? '#94a3b8' : '#64748b', backgroundColor: 'transparent' }}
                          title="View payment history">
                          History
                        </button>
                        {p.payment_status !== 'paid' && (
                          <button onClick={() => { setPayModal(p); setError(''); }}
                            className="text-xs px-3 py-1 rounded-lg bg-green-700 text-white hover:bg-green-800 font-semibold">
                            Pay
                          </button>
                        )}
                      </div>
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
