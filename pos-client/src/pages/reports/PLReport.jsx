import { useState, useEffect } from 'react';
import { getApiUrl } from '../../config/runtimeConfig';
import { useSelector } from 'react-redux';
import { selectToken } from '../../features/auth/authSlice';
import { useTheme } from '../../contexts/ThemeContext';

const API = getApiUrl();

export default function PLReport() {
  const token = useSelector(selectToken);
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const now = new Date();
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo]     = useState(now.toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const h = { Authorization: `Bearer ${token}` };

  async function run() {
    setLoading(true);
    const r = await fetch(`${API}/api/rice-reports/pl?from=${from}&to=${to}`, { headers: h });
    setData(await r.json());
    setLoading(false);
  }
  useEffect(() => { run(); }, []);

  const card = { backgroundColor: dark ? '#1f2937' : '#fff', borderColor: dark ? '#374151' : '#e2e8f0' };
  const fmt = n => parseFloat(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

  const revenue     = parseFloat(data?.revenue ?? 0);
  const paddyCost   = parseFloat(data?.paddy_cost ?? 0);
  const millingCost = parseFloat(data?.milling_cost ?? 0);
  const labourCost  = parseFloat(data?.labour_cost ?? 0);
  const otherCost   = parseFloat(data?.other_expenses ?? 0);
  const totalCost   = paddyCost + millingCost + labourCost + otherCost;
  const profit      = revenue - totalCost;

  return (
    <div className="p-5 w-full">
      <h1 className="text-2xl font-extrabold mb-1" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>Profit & Loss</h1>
      <p className="text-sm text-slate-400 mb-5">Income and expense summary for the selected period.</p>

      <div className="flex flex-wrap gap-3 mb-6 items-end">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-600"
            style={{ backgroundColor: dark ? '#111827' : '#f8fafc', border: `1px solid ${dark ? '#374151' : '#e2e8f0'}`, color: dark ? '#f1f5f9' : '#0f172a' }} />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-600"
            style={{ backgroundColor: dark ? '#111827' : '#f8fafc', border: `1px solid ${dark ? '#374151' : '#e2e8f0'}`, color: dark ? '#f1f5f9' : '#0f172a' }} />
        </div>
        <button onClick={run} disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-bold disabled:opacity-50">
          {loading ? 'Loading…' : 'Generate'}
        </button>
      </div>

      {data && (
        <div className="space-y-4">
          {/* KPI bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Revenue',    value: `Rs ${fmt(revenue)}`,   color: '#16a34a' },
              { label: 'Total Cost', value: `Rs ${fmt(totalCost)}`,  color: '#dc2626' },
              { label: 'Net Profit', value: `Rs ${fmt(profit)}`,     color: profit >= 0 ? '#059669' : '#dc2626' },
              { label: 'Margin',     value: revenue > 0 ? `${((profit / revenue) * 100).toFixed(1)}%` : '—', color: profit >= 0 ? '#0284c7' : '#dc2626' },
            ].map(k => (
              <div key={k.label} className="rounded-2xl border p-4" style={card}>
                <p className="text-xs text-slate-400 mb-1">{k.label}</p>
                <p className="text-xl font-extrabold" style={{ color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* P&L Statement */}
          <div className="rounded-2xl border shadow-sm" style={card}>
            <div className="px-5 py-3 border-b font-bold text-sm" style={{ borderColor: dark ? '#374151' : '#f1f5f9', color: dark ? '#e2e8f0' : '#1e293b' }}>
              P&L Statement
            </div>
            <div className="divide-y" style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
              {/* Income section */}
              <div className="px-5 py-3">
                <p className="text-xs font-bold uppercase tracking-widest text-green-600 mb-2">Income</p>
                <div className="flex justify-between text-sm">
                  <span style={{ color: dark ? '#e2e8f0' : '#1e293b' }}>Rice Sales</span>
                  <span className="font-mono font-semibold text-green-600">Rs {fmt(revenue)}</span>
                </div>
              </div>
              {/* Expenses section */}
              <div className="px-5 py-3">
                <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-2">Expenses</p>
                <div className="space-y-1.5">
                  {[
                    { label: 'Paddy Purchases',  value: paddyCost },
                    { label: 'Milling Charges',  value: millingCost },
                    { label: 'Labour / Wages',   value: labourCost },
                    { label: 'Other Expenses',   value: otherCost },
                  ].map(e => (
                    <div key={e.label} className="flex justify-between text-sm">
                      <span className="text-slate-400">{e.label}</span>
                      <span className="font-mono text-red-500">Rs {fmt(e.value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold border-t pt-1.5" style={{ borderColor: dark ? '#374151' : '#e2e8f0' }}>
                    <span style={{ color: dark ? '#e2e8f0' : '#1e293b' }}>Total Expenses</span>
                    <span className="font-mono text-red-600">Rs {fmt(totalCost)}</span>
                  </div>
                </div>
              </div>
              {/* Net */}
              <div className="px-5 py-4 flex justify-between items-center">
                <span className="font-bold text-base" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>Net Profit / Loss</span>
                <span className="font-extrabold text-xl font-mono" style={{ color: profit >= 0 ? '#059669' : '#dc2626' }}>
                  {profit >= 0 ? '+' : ''}Rs {fmt(profit)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
