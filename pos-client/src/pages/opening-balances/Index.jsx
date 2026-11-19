import { useState, useEffect } from 'react';
import { getApiUrl } from '../../config/runtimeConfig';
import { useSelector } from 'react-redux';
import { selectToken } from '../../features/auth/authSlice';
import { useTheme } from '../../contexts/ThemeContext';

const API = getApiUrl();

export default function OpeningBalancesIndex() {
  const token = useSelector(selectToken);
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));

  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  async function load() {
    setLoading(true);
    const r = await fetch(`${API}/api/opening-balances`, { headers: h });
    const data = await r.json();
    setBalances(Array.isArray(data) ? data : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function setValue(id, val) {
    setBalances(b => b.map(row => row.id === id ? { ...row, amount: val } : row));
  }

  async function saveAll() {
    setSaving(true); setError(''); setSaved(false);
    const r = await fetch(`${API}/api/opening-balances`, {
      method: 'POST', headers: h,
      body: JSON.stringify({ as_of: asOf, balances: balances.map(b => ({ account_id: b.account_id || b.id, amount: b.amount })) }),
    });
    if (!r.ok) { setError((await r.json()).error || 'Failed'); setSaving(false); return; }
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    await load();
  }

  const card = { backgroundColor: dark ? '#1f2937' : '#fff', borderColor: dark ? '#374151' : '#e2e8f0' };
  const inputCls = `w-full rounded-xl px-4 py-2.5 text-sm text-right outline-none focus:ring-2 focus:ring-green-600 font-mono`;
  const inputStyle = dark ? { backgroundColor: '#111827', border: '1px solid #374151', color: '#f1f5f9' }
                           : { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a' };

  const total = balances.reduce((s, b) => s + parseFloat(b.amount || 0), 0);
  const fmt = n => parseFloat(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

  return (
    <div className="p-5 w-full">
      <h1 className="text-2xl font-extrabold mb-1" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>Opening Balances</h1>
      <p className="text-sm text-slate-400 mb-6">Set the starting cash and bank balances for each account.</p>

      <div className="flex items-center gap-4 mb-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">As Of Date</label>
          <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)}
            className="rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-600"
            style={inputStyle} />
        </div>
      </div>

      <div className="rounded-2xl border shadow-sm overflow-hidden mb-4" style={card}>
        {loading ? <p className="p-5 text-slate-400 text-sm">Loading…</p> : balances.length === 0 ? (
          <div className="p-5 text-slate-400 text-sm">
            No cash accounts found. <a href="/cash-accounts" className="text-green-600 font-semibold hover:underline">Add accounts first →</a>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-widest text-slate-400"
                style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
                <th className="px-5 py-3 text-left font-semibold">Account</th>
                <th className="px-5 py-3 text-left font-semibold">Type</th>
                <th className="px-5 py-3 text-right font-semibold w-48">Opening Balance (Rs)</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: dark ? '#374151' : '#f1f5f9' }}>
              {balances.map(b => (
                <tr key={b.id}>
                  <td className="px-5 py-3 font-semibold" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>{b.name}</td>
                  <td className="px-5 py-3 text-slate-400 capitalize">{b.type}</td>
                  <td className="px-5 py-3">
                    <input type="number" min="0" step="0.01" className={inputCls} style={inputStyle}
                      value={b.amount || ''} onChange={e => setValue(b.id, e.target.value)} placeholder="0.00" />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t" style={{ borderColor: dark ? '#374151' : '#e2e8f0' }}>
                <td colSpan={2} className="px-5 py-3 font-bold text-sm" style={{ color: dark ? '#e2e8f0' : '#1e293b' }}>Total</td>
                <td className="px-5 py-3 text-right font-mono font-bold text-green-600">Rs {fmt(total)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {!loading && balances.length > 0 && (
        <>
          {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
          <button onClick={saveAll} disabled={saving}
            className="w-full py-3 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Opening Balances'}
          </button>
        </>
      )}
    </div>
  );
}
