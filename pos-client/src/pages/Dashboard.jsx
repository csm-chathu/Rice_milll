import { useEffect, useState } from 'react';
import { getApiUrl } from '../config/runtimeConfig';
import { useSelector } from 'react-redux';
import { selectToken } from '../features/auth/authSlice';
import { useTheme } from '../contexts/ThemeContext';

const API = getApiUrl();

function StatCard({ label, value, sub, color = '#16a34a', icon }) {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-2 shadow-sm border"
      style={dark ? { backgroundColor: '#1f2937', borderColor: '#374151' } : { backgroundColor: '#fff', borderColor: '#e2e8f0' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#94a3b8' }}>{label}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-2xl font-extrabold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const token = useSelector(selectToken);
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/rice-reports/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="p-6 flex items-center gap-3 text-slate-400">
      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      Loading dashboard…
    </div>
  );

  const fmt = n => parseFloat(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
  const fmtKg = n => `${parseFloat(n || 0).toLocaleString()} kg`;

  const totalRiceStock = (data?.rice_stock || []).reduce((s, g) => s + parseFloat(g.current_stock || 0), 0);
  const totalCash = (data?.cash_accounts || []).reduce((s, a) => s + parseFloat(a.current_balance || 0), 0);

  return (
    <div className="p-5 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>Dashboard</h1>
        <p className="text-sm text-slate-400 mt-0.5">{new Date().toLocaleDateString('en-LK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Rice Stock" value={fmtKg(totalRiceStock)} icon="🌾" color="#16a34a" />
        <StatCard label="Pending Paddy Lots" value={data?.paddy_pending_lots?.length ?? 0} icon="📦" color="#d97706" sub="unpaid purchases" />
        <StatCard label="Supplier Payable" value={`Rs ${fmt(data?.total_supplier_payable)}`} icon="🚛" color="#dc2626" />
        <StatCard label="Customer Receivable" value={`Rs ${fmt(data?.total_customer_receivable)}`} icon="🧾" color="#2563eb" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Worker Advances" value={`Rs ${fmt(data?.total_worker_advances)}`} icon="👷" color="#7c3aed" />
        <StatCard label="Total Cash / Bank" value={`Rs ${fmt(totalCash)}`} icon="💰" color="#0891b2" />
        <StatCard label="Today's Purchases" value={`Rs ${fmt(data?.today?.purchases)}`} icon="⬆️" color="#16a34a" sub={`Sales: Rs ${fmt(data?.today?.sales)}`} />
      </div>

      {/* Rice stock breakdown */}
      {data?.rice_stock?.length > 0 && (
        <div className="rounded-2xl border shadow-sm overflow-hidden mb-6"
          style={dark ? { backgroundColor: '#1f2937', borderColor: '#374151' } : { backgroundColor: '#fff', borderColor: '#e2e8f0' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
            <h2 className="font-bold text-sm uppercase tracking-widest text-slate-400">Rice Stock</h2>
          </div>
          <div className="divide-y" style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
            {data.rice_stock.map(g => (
              <div key={g.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-semibold text-sm" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>{g.name}</p>
                  <p className="text-xs text-slate-400">{g.type}</p>
                </div>
                <span className="font-bold text-green-600">{fmtKg(g.current_stock)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cash accounts */}
      <div className="rounded-2xl border shadow-sm overflow-hidden"
        style={dark ? { backgroundColor: '#1f2937', borderColor: '#374151' } : { backgroundColor: '#fff', borderColor: '#e2e8f0' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
          <h2 className="font-bold text-sm uppercase tracking-widest text-slate-400">Cash &amp; Bank</h2>
        </div>
        <div className="divide-y" style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
          {(data?.cash_accounts || []).map(a => (
            <div key={a.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="font-semibold text-sm" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>{a.name}</p>
                <p className="text-xs text-slate-400 capitalize">{a.type}</p>
              </div>
              <span className="font-bold" style={{ color: parseFloat(a.current_balance) >= 0 ? '#16a34a' : '#dc2626' }}>
                Rs {fmt(a.current_balance)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
