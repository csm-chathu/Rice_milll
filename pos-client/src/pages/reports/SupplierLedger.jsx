import { useState, useEffect } from 'react';
import { getApiUrl } from '../../config/runtimeConfig';
import { useSelector } from 'react-redux';
import { selectToken } from '../../features/auth/authSlice';
import { useTheme } from '../../contexts/ThemeContext';

const API = getApiUrl();

export default function SupplierLedger() {
  const token = useSelector(selectToken);
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [suppliers, setSuppliers] = useState([]);
  const [selected, setSelected] = useState('');
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(false);

  const h = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API}/api/suppliers`, { headers: h }).then(r => r.json()).then(d => setSuppliers(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    fetch(`${API}/api/rice-reports/supplier-ledger/${selected}`, { headers: h })
      .then(r => r.json())
      .then(d => { setLedger(d); setLoading(false); });
  }, [selected]);

  const card = { backgroundColor: dark ? '#1f2937' : '#fff', borderColor: dark ? '#374151' : '#e2e8f0' };
  const fmt = n => parseFloat(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
  const inputStyle = dark ? { backgroundColor: '#111827', border: '1px solid #374151', color: '#f1f5f9' }
                           : { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a' };

  return (
    <div className="p-5 w-full">
      <h1 className="text-2xl font-extrabold mb-1" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>Supplier Ledger</h1>
      <p className="text-sm text-slate-400 mb-5">View all purchases and payments for a supplier.</p>

      <div className="flex gap-3 mb-6">
        <select value={selected} onChange={e => setSelected(e.target.value)}
          className="rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-600 min-w-64"
          style={inputStyle}>
          <option value="">Select supplier…</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {loading && <p className="text-slate-400 text-sm">Loading…</p>}

      {ledger && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Purchases', value: `Rs ${fmt(ledger.total_purchases)}`, color: '#dc2626' },
              { label: 'Total Paid',      value: `Rs ${fmt(ledger.total_paid)}`,      color: '#16a34a' },
              { label: 'Balance Due',     value: `Rs ${fmt(ledger.balance)}`,         color: parseFloat(ledger.balance) > 0 ? '#f59e0b' : '#94a3b8' },
            ].map(k => (
              <div key={k.label} className="rounded-2xl border p-4" style={card}>
                <p className="text-xs text-slate-400 mb-1">{k.label}</p>
                <p className="text-xl font-extrabold" style={{ color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border shadow-sm overflow-hidden" style={card}>
            <div className="px-5 py-3 border-b font-bold text-sm" style={{ borderColor: dark ? '#374151' : '#f1f5f9', color: dark ? '#e2e8f0' : '#1e293b' }}>
              Transaction History
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-widest text-slate-400" style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Description</th>
                    <th className="px-4 py-3 text-right font-semibold">Debit (Rs)</th>
                    <th className="px-4 py-3 text-right font-semibold">Credit (Rs)</th>
                    <th className="px-4 py-3 text-right font-semibold">Balance (Rs)</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
                  {(ledger.transactions ?? []).map((t, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 text-slate-400">{t.date?.slice(0, 10)}</td>
                      <td className="px-4 py-3 font-medium" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>{t.description}</td>
                      <td className="px-4 py-3 text-right font-mono text-red-500">{t.debit ? fmt(t.debit) : '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-green-600">{t.credit ? fmt(t.credit) : '—'}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>{fmt(t.running_balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
