import { useState, useEffect } from 'react';
import { getApiUrl } from '../../config/runtimeConfig';
import { useSelector } from 'react-redux';
import { selectToken } from '../../features/auth/authSlice';
import { useTheme } from '../../contexts/ThemeContext';

const API = getApiUrl();

export default function LabourReport() {
  const token = useSelector(selectToken);
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const now = new Date();
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(now.toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const h = { Authorization: `Bearer ${token}` };

  async function run() {
    setLoading(true);
    const r = await fetch(`${API}/api/rice-reports/labour?from=${from}&to=${to}`, { headers: h });
    setData(await r.json());
    setLoading(false);
  }
  useEffect(() => { run(); }, []);

  const card = { backgroundColor: dark ? '#1f2937' : '#fff', borderColor: dark ? '#374151' : '#e2e8f0' };
  const fmt = n => parseFloat(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
  const inputStyle = dark ? { backgroundColor: '#111827', border: '1px solid #374151', color: '#f1f5f9' }
                           : { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a' };

  const totals = {
    full:    (data?.workers ?? []).reduce((s, w) => s + (w.full_days || 0), 0),
    half:    (data?.workers ?? []).reduce((s, w) => s + (w.half_days || 0), 0),
    absent:  (data?.workers ?? []).reduce((s, w) => s + (w.absent_days || 0), 0),
    gross:   (data?.workers ?? []).reduce((s, w) => s + parseFloat(w.gross_wages || 0), 0),
    advance: (data?.workers ?? []).reduce((s, w) => s + parseFloat(w.advance_given || 0), 0),
    paid:    (data?.workers ?? []).reduce((s, w) => s + parseFloat(w.settled || 0), 0),
  };

  return (
    <div className="p-5 w-full">
      <h1 className="text-2xl font-extrabold mb-1" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>Labour Report</h1>
      <p className="text-sm text-slate-400 mb-5">Attendance, wages, advances, and settlements by worker.</p>

      <div className="flex flex-wrap gap-3 mb-6 items-end">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-600"
            style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-600"
            style={inputStyle} />
        </div>
        <button onClick={run} disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-bold disabled:opacity-50">
          {loading ? 'Loading…' : 'Generate'}
        </button>
      </div>

      {data && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Workers',    value: data.workers?.length ?? 0,     color: '#7c3aed' },
              { label: 'Total Gross Wages', value: `Rs ${fmt(totals.gross)}`,    color: '#dc2626' },
              { label: 'Advances Given',   value: `Rs ${fmt(totals.advance)}`,   color: '#f59e0b' },
              { label: 'Total Settled',    value: `Rs ${fmt(totals.paid)}`,      color: '#16a34a' },
            ].map(k => (
              <div key={k.label} className="rounded-2xl border p-4" style={card}>
                <p className="text-xs text-slate-400 mb-1">{k.label}</p>
                <p className="text-xl font-extrabold" style={{ color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Per-worker table */}
          <div className="rounded-2xl border shadow-sm overflow-hidden" style={card}>
            <div className="px-5 py-3 border-b font-bold text-sm" style={{ borderColor: dark ? '#374151' : '#f1f5f9', color: dark ? '#e2e8f0' : '#1e293b' }}>
              Worker Summary
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-widest text-slate-400" style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
                    <th className="px-4 py-3 text-left font-semibold">Worker</th>
                    <th className="px-4 py-3 text-right font-semibold">Full</th>
                    <th className="px-4 py-3 text-right font-semibold">Half</th>
                    <th className="px-4 py-3 text-right font-semibold">Absent</th>
                    <th className="px-4 py-3 text-right font-semibold">Gross (Rs)</th>
                    <th className="px-4 py-3 text-right font-semibold">Advance (Rs)</th>
                    <th className="px-4 py-3 text-right font-semibold">Settled (Rs)</th>
                    <th className="px-4 py-3 text-right font-semibold">Balance (Rs)</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
                  {(data.workers ?? []).map(w => {
                    const balance = parseFloat(w.gross_wages || 0) - parseFloat(w.settled || 0);
                    return (
                      <tr key={w.id}>
                        <td className="px-4 py-3 font-semibold" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>{w.name}</td>
                        <td className="px-4 py-3 text-right text-green-600 font-semibold">{w.full_days}</td>
                        <td className="px-4 py-3 text-right text-yellow-600 font-semibold">{w.half_days}</td>
                        <td className="px-4 py-3 text-right text-red-500 font-semibold">{w.absent_days}</td>
                        <td className="px-4 py-3 text-right font-mono">{fmt(w.gross_wages)}</td>
                        <td className="px-4 py-3 text-right font-mono text-amber-600">{fmt(w.advance_given)}</td>
                        <td className="px-4 py-3 text-right font-mono text-green-600">{fmt(w.settled)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: balance > 0 ? '#dc2626' : '#16a34a' }}>
                          {fmt(balance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t" style={{ borderColor: dark ? '#374151' : '#e2e8f0' }}>
                    <td className="px-4 py-3 font-bold" style={{ color: dark ? '#e2e8f0' : '#1e293b' }}>Total</td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">{totals.full}</td>
                    <td className="px-4 py-3 text-right font-bold text-yellow-600">{totals.half}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-500">{totals.absent}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">Rs {fmt(totals.gross)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-amber-600">Rs {fmt(totals.advance)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-green-600">Rs {fmt(totals.paid)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-red-600">Rs {fmt(totals.gross - totals.paid)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
