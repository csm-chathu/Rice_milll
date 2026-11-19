import { useState, useEffect } from 'react';
import { getApiUrl } from '../../config/runtimeConfig';
import { useSelector } from 'react-redux';
import { selectToken } from '../../features/auth/authSlice';
import { useTheme } from '../../contexts/ThemeContext';

const API = getApiUrl();

export default function StockReport() {
  const token = useSelector(selectToken);
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const h = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API}/api/rice-reports/stock`, { headers: h })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, []);

  const card = { backgroundColor: dark ? '#1f2937' : '#fff', borderColor: dark ? '#374151' : '#e2e8f0' };
  const fmt = n => parseFloat(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

  const paddyTotal = data?.paddy_stock?.reduce((s, r) => s + parseFloat(r.stock_kg || 0), 0) ?? 0;
  const riceTotal  = data?.rice_stock?.reduce((s, r) => s + parseFloat(r.current_stock || 0), 0) ?? 0;

  return (
    <div className="p-5 w-full">
      <h1 className="text-2xl font-extrabold mb-1" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>Stock Report</h1>
      <p className="text-sm text-slate-400 mb-6">Current paddy and rice inventory levels.</p>

      {loading ? <p className="text-slate-400 text-sm">Loading…</p> : (
        <div className="space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Paddy Stock', value: `${parseFloat(paddyTotal).toLocaleString()} kg`, color: '#f59e0b' },
              { label: 'Total Rice Stock',  value: `${parseFloat(riceTotal).toLocaleString()} kg`,  color: '#16a34a' },
              { label: 'Paddy Varieties',   value: data?.paddy_stock?.length ?? 0,                  color: '#7c3aed' },
              { label: 'Rice Grades',       value: data?.rice_stock?.length ?? 0,                   color: '#0284c7' },
            ].map(k => (
              <div key={k.label} className="rounded-2xl border p-4" style={card}>
                <p className="text-xs text-slate-400 mb-1">{k.label}</p>
                <p className="text-xl font-extrabold" style={{ color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Paddy stock */}
          <div className="rounded-2xl border shadow-sm overflow-hidden" style={card}>
            <div className="px-5 py-3 border-b font-bold text-sm" style={{ borderColor: dark ? '#374151' : '#f1f5f9', color: dark ? '#e2e8f0' : '#1e293b' }}>
              Paddy Stock by Variety
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-widest text-slate-400" style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
                  <th className="px-5 py-3 text-left font-semibold">Variety</th>
                  <th className="px-5 py-3 text-right font-semibold">Purchased (kg)</th>
                  <th className="px-5 py-3 text-right font-semibold">Milled (kg)</th>
                  <th className="px-5 py-3 text-right font-semibold">On Hand (kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
                {(data?.paddy_stock ?? []).map(r => (
                  <tr key={r.id}>
                    <td className="px-5 py-3 font-medium" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>{r.name}</td>
                    <td className="px-5 py-3 text-right font-mono">{parseFloat(r.total_purchased || 0).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right font-mono text-blue-500">{parseFloat(r.total_milled || 0).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right font-mono font-bold" style={{ color: parseFloat(r.stock_kg) > 0 ? '#f59e0b' : '#94a3b8' }}>
                      {parseFloat(r.stock_kg || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Rice stock */}
          <div className="rounded-2xl border shadow-sm overflow-hidden" style={card}>
            <div className="px-5 py-3 border-b font-bold text-sm" style={{ borderColor: dark ? '#374151' : '#f1f5f9', color: dark ? '#e2e8f0' : '#1e293b' }}>
              Rice & By-products Stock
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-widest text-slate-400" style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
                  <th className="px-5 py-3 text-left font-semibold">Grade</th>
                  <th className="px-5 py-3 text-left font-semibold">Type</th>
                  <th className="px-5 py-3 text-right font-semibold">Produced (kg)</th>
                  <th className="px-5 py-3 text-right font-semibold">Sold (kg)</th>
                  <th className="px-5 py-3 text-right font-semibold">On Hand (kg)</th>
                  <th className="px-5 py-3 text-right font-semibold">Value (Rs)</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
                {(data?.rice_stock ?? []).map(r => (
                  <tr key={r.id}>
                    <td className="px-5 py-3 font-medium" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>{r.name}</td>
                    <td className="px-5 py-3 text-slate-400 capitalize">{r.type}</td>
                    <td className="px-5 py-3 text-right font-mono">{parseFloat(r.total_produced || 0).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right font-mono text-blue-500">{parseFloat(r.total_sold || 0).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right font-mono font-bold" style={{ color: parseFloat(r.current_stock) > 0 ? '#16a34a' : '#94a3b8' }}>
                      {parseFloat(r.current_stock || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-green-600">
                      Rs {fmt(parseFloat(r.current_stock || 0) * parseFloat(r.price_per_kg || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
