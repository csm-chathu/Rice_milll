import { useState, useEffect } from 'react';
import { getApiUrl } from '../../config/runtimeConfig';
import { useSelector } from 'react-redux';
import { selectToken } from '../../features/auth/authSlice';
import { useTheme } from '../../contexts/ThemeContext';

const API = getApiUrl();

function getWeekDays(anchor) {
  const d = new Date(anchor);
  const day = d.getDay(); // 0=Sun
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((day + 6) % 7)); // Monday
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(mon);
    dd.setDate(mon.getDate() + i);
    return dd.toISOString().slice(0, 10);
  });
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const today = new Date().toISOString().slice(0, 10);

const STATUS = {
  full:   { label: 'Full Day',  short: 'F', multiplier: 1.0, ring: 'ring-green-500',  bg: 'bg-green-500',  text: 'text-white',          row: 'bg-green-50',         rowDark: '#1a2e1a' },
  half:   { label: 'Half Day',  short: 'H', multiplier: 0.5, ring: 'ring-yellow-400', bg: 'bg-yellow-400', text: 'text-yellow-900',      row: 'bg-yellow-50',        rowDark: '#2a2510' },
  absent: { label: 'Absent',    short: 'A', multiplier: 0.0, ring: 'ring-red-400',    bg: 'bg-red-400',    text: 'text-white',          row: 'bg-red-50',           rowDark: '#2a1515' },
};

export default function LabourAttendance() {
  const token = useSelector(selectToken);
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [date, setDate]           = useState(today);
  const [workers, setWorkers]     = useState([]);
  const [attendance, setAttendance] = useState({});
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [loading, setLoading]     = useState(true);
  const [weekHistory, setWeekHistory] = useState({}); // date → { worker_id: status }

  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const week = getWeekDays(date);

  async function load(d = date) {
    setLoading(true);
    const [ws, att] = await Promise.all([
      fetch(`${API}/api/labour/workers`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/labour/attendance?date=${d}`, { headers: h }).then(r => r.json()),
    ]);
    const wList = Array.isArray(ws) ? ws : [];
    setWorkers(wList);
    const map = {};
    (Array.isArray(att) ? att : []).forEach(a => { map[a.worker_id] = a.status; });
    wList.forEach(w => { if (!map[w.id]) map[w.id] = 'full'; });
    setAttendance(map);
    setLoading(false);
  }

  async function loadWeek() {
    const promises = week.map(d =>
      fetch(`${API}/api/labour/attendance?date=${d}`, { headers: h })
        .then(r => r.json())
        .then(rows => ({ date: d, rows: Array.isArray(rows) ? rows : [] }))
    );
    const results = await Promise.all(promises);
    const hist = {};
    results.forEach(({ date: d, rows }) => {
      hist[d] = {};
      rows.forEach(r => { hist[d][r.worker_id] = r.status; });
    });
    setWeekHistory(hist);
  }

  useEffect(() => { load(date); loadWeek(); }, [date]);

  async function saveAll() {
    setSaving(true); setSaved(false);
    const entries = workers.map(w => ({ worker_id: w.id, status: attendance[w.id] || 'full' }));
    await fetch(`${API}/api/labour/attendance/bulk`, {
      method: 'POST', headers: h,
      body: JSON.stringify({ date, entries }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    loadWeek();
  }

  function setStatus(wid, status) {
    setAttendance(a => ({ ...a, [wid]: status }));
    setSaved(false);
  }
  function markAll(status) {
    const map = {};
    workers.forEach(w => { map[w.id] = status; });
    setAttendance(map);
    setSaved(false);
  }

  const totals = workers.reduce((acc, w) => {
    const s = attendance[w.id];
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, { full: 0, half: 0, absent: 0 });

  const dailyWage = workers.reduce((sum, w) => {
    const mult = STATUS[attendance[w.id]]?.multiplier ?? 1;
    return sum + parseFloat(w.daily_rate) * mult;
  }, 0);

  const fmt = n => parseFloat(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

  const card = { backgroundColor: dark ? '#1f2937' : '#fff', borderColor: dark ? '#374151' : '#e2e8f0' };

  return (
    <div className="p-5 w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>Attendance</h1>
          <p className="text-sm text-slate-400 mt-0.5">Mark daily attendance for all workers.</p>
        </div>
        {/* Quick mark all */}
        <div className="flex gap-2">
          <button onClick={() => markAll('full')}
            className="text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 font-bold hover:bg-green-200 transition-colors">
            All Full
          </button>
          <button onClick={() => markAll('half')}
            className="text-xs px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-700 font-bold hover:bg-yellow-200 transition-colors">
            All Half
          </button>
          <button onClick={() => markAll('absent')}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 font-bold hover:bg-red-200 transition-colors">
            All Absent
          </button>
        </div>
      </div>

      {/* Week strip */}
      <div className="rounded-2xl border p-4 mb-5" style={card}>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {week.map((d, i) => {
            const isSelected = d === date;
            const isTodayDate = d === today;
            const dayTotals = workers.reduce((acc, w) => {
              const s = weekHistory[d]?.[w.id];
              if (s) acc[s] = (acc[s] || 0) + 1;
              return acc;
            }, {});
            const hasData = Object.keys(dayTotals).length > 0;

            return (
              <button key={d} onClick={() => setDate(d)}
                className={`flex flex-col items-center rounded-xl px-3 py-2.5 min-w-[56px] transition-all border-2 ${
                  isSelected
                    ? 'bg-green-700 border-green-700 text-white shadow-lg shadow-green-700/30'
                    : isTodayDate
                    ? 'border-green-400 text-green-600'
                    : dark ? 'border-transparent text-slate-300 hover:border-slate-500' : 'border-transparent text-slate-500 hover:border-slate-200'
                }`}>
                <span className="text-xs font-semibold">{DAY_NAMES[i]}</span>
                <span className={`text-lg font-extrabold leading-tight ${isSelected ? 'text-white' : ''}`}>
                  {parseInt(d.slice(8))}
                </span>
                {/* Mini status dots */}
                <div className="flex gap-0.5 mt-1">
                  {hasData ? (
                    <>
                      {(dayTotals.full   || 0) > 0 && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                      {(dayTotals.half   || 0) > 0 && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />}
                      {(dayTotals.absent || 0) > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                    </>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-transparent border border-slate-300" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-3 mb-5">
        {[
          { key: 'full',   emoji: '✓', label: 'Full Day',  cls: 'bg-green-100 text-green-700' },
          { key: 'half',   emoji: '½', label: 'Half Day',  cls: 'bg-yellow-100 text-yellow-700' },
          { key: 'absent', emoji: '✗', label: 'Absent',    cls: 'bg-red-100 text-red-700' },
        ].map(s => (
          <div key={s.key} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${s.cls}`}>
            <span>{s.emoji}</span>
            <span>{s.label}</span>
            <span className="text-lg font-extrabold">{totals[s.key] || 0}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-green-700 text-white">
          <span>Today's Wages</span>
          <span className="text-lg font-extrabold">Rs {fmt(dailyWage)}</span>
        </div>
      </div>

      {/* Workers */}
      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : workers.length === 0 ? (
        <div className="rounded-2xl border p-8 text-center" style={card}>
          <p className="text-slate-400 mb-2">No workers found.</p>
          <a href="/labour/workers" className="text-green-600 font-semibold text-sm hover:underline">Add workers first →</a>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden mb-4" style={card}>
          {workers.map((w, idx) => {
            const status = attendance[w.id] || 'full';
            const st = STATUS[status];
            const wage = parseFloat(w.daily_rate) * st.multiplier;
            const rowBg = dark ? st.rowDark : (status !== 'full' ? st.row : 'transparent');

            return (
              <div key={w.id}
                className={`flex items-center gap-4 px-5 py-4 transition-colors ${idx > 0 ? 'border-t' : ''}`}
                style={{
                  borderColor: dark ? '#374151' : '#f1f5f9',
                  backgroundColor: rowBg,
                }}>

                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0 ${st.bg} ${st.text}`}>
                  {w.name.charAt(0)}
                </div>

                {/* Name + rate */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>{w.name}</p>
                  <p className="text-xs text-slate-400">Rs {parseFloat(w.daily_rate).toFixed(2)} / day</p>
                </div>

                {/* Wage for today */}
                <div className="text-right mr-4">
                  <p className="text-xs text-slate-400">Today</p>
                  <p className={`text-sm font-bold font-mono ${status === 'absent' ? 'text-red-400 line-through' : 'text-green-600'}`}>
                    Rs {fmt(wage)}
                  </p>
                </div>

                {/* Status selector */}
                <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: dark ? '#374151' : '#e2e8f0' }}>
                  {Object.entries(STATUS).map(([key, s]) => (
                    <button key={key}
                      onClick={() => setStatus(w.id, key)}
                      className={`px-4 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                        status === key
                          ? `${s.bg} ${s.text}`
                          : dark
                            ? 'bg-gray-800 text-slate-400 hover:bg-gray-700'
                            : 'bg-white text-slate-500 hover:bg-slate-50'
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Save button */}
      {!loading && workers.length > 0 && (
        <button onClick={saveAll} disabled={saving}
          className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all ${
            saved
              ? 'bg-green-600 text-white'
              : 'bg-green-700 hover:bg-green-800 text-white shadow-lg shadow-green-700/20'
          } disabled:opacity-50 flex items-center justify-center gap-2`}>
          {saving ? (
            <span>Saving…</span>
          ) : saved ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 12 4 10" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/></svg>
              Attendance Saved for {date}
            </>
          ) : (
            `Save Attendance — ${date}`
          )}
        </button>
      )}
    </div>
  );
}
