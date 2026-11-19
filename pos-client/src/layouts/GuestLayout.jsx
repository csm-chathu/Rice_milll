import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const TAGLINES = [
  'From paddy field to market — all in one place.',
  'Track every kilo of paddy, rice and by-products.',
  'Labour wages, advances and settlements — made simple.',
  'Real-time stock. Automatic profit calculation.',
  'Supplier payments, customer credit — always up to date.',
  'Your mill, your data — full control every day.',
];

const FEATURES = [
  { icon: '🌾', label: 'Paddy Purchasing',    desc: 'Lot-wise buying from farmers & suppliers' },
  { icon: '⚙️', label: 'Rice Production',     desc: 'Milling batches with yield tracking' },
  { icon: '📦', label: 'Wholesale Sales',     desc: 'Invoicing with cash & bank payments' },
  { icon: '👷', label: 'Labour Management',   desc: 'Attendance, advances & wage settlements' },
  { icon: '📊', label: 'Profit & Loss',       desc: 'Automatic reports from every transaction' },
];

function Typewriter({ speed = 45, pause = 1800, eraseSpeed = 25 }) {
  const [displayed, setDisplayed] = useState('');
  const [idx, setIdx]             = useState(0);
  const [erasing, setErasing]     = useState(false);

  useEffect(() => {
    const text = TAGLINES[idx];
    if (!erasing) {
      if (displayed.length < text.length) {
        const id = setTimeout(() => setDisplayed(text.slice(0, displayed.length + 1)), speed);
        return () => clearTimeout(id);
      } else {
        const id = setTimeout(() => setErasing(true), pause);
        return () => clearTimeout(id);
      }
    } else {
      if (displayed.length > 0) {
        const id = setTimeout(() => setDisplayed(displayed.slice(0, -1)), eraseSpeed);
        return () => clearTimeout(id);
      } else {
        setErasing(false);
        setIdx(i => (i + 1) % TAGLINES.length);
      }
    }
  }, [displayed, erasing, idx, speed, pause, eraseSpeed]);

  return (
    <span>
      {displayed}
      <span className="inline-block w-0.5 h-4 bg-green-300 ml-0.5 align-middle animate-pulse" />
    </span>
  );
}


export default function GuestLayout({ children }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = e => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setInstallPrompt(null); setInstalled(true); });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') { setInstallPrompt(null); setInstalled(true); }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden md:flex md:w-[45%] lg:w-[40%] flex-col items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #052e16 0%, #14532d 50%, #166534 100%)' }}>

        <style>{`
          @keyframes blobFloat1 {
            0%, 100% { transform: translate(0,0) scale(1); }
            50%       { transform: translate(30px,-25px) scale(1.1); }
          }
          @keyframes blobFloat2 {
            0%, 100% { transform: translate(0,0) scale(1); }
            50%       { transform: translate(-25px,30px) scale(1.12); }
          }
          @keyframes particleRise {
            0%   { opacity: 0; transform: translateY(0) scale(0.5); }
            20%  { opacity: 0.8; }
            80%  { opacity: 0.5; }
            100% { opacity: 0; transform: translateY(-70px) scale(1.1); }
          }
        `}</style>

        {/* Background blobs */}
        <div className="absolute rounded-full pointer-events-none"
          style={{ width: 400, height: 400, top: '-100px', left: '-100px',
            background: 'radial-gradient(circle, rgba(74,222,128,0.25) 0%, transparent 65%)',
            animation: 'blobFloat1 8s ease-in-out infinite' }} />
        <div className="absolute rounded-full pointer-events-none"
          style={{ width: 350, height: 350, bottom: '-80px', right: '-80px',
            background: 'radial-gradient(circle, rgba(234,179,8,0.2) 0%, transparent 65%)',
            animation: 'blobFloat2 10s ease-in-out infinite' }} />
        <div className="absolute rounded-full pointer-events-none"
          style={{ width: 220, height: 220, top: '40%', right: '10%',
            background: 'radial-gradient(circle, rgba(74,222,128,0.15) 0%, transparent 65%)',
            animation: 'blobFloat1 12s ease-in-out infinite reverse' }} />

        {/* Subtle grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ opacity: 0.05,
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '36px 36px' }} />

        {/* Floating particles */}
        {[
          { size: 5,  top: '10%', left: '20%', delay: '0s',   dur: '4s'  },
          { size: 4,  top: '70%', left: '15%', delay: '1s',   dur: '5s'  },
          { size: 6,  top: '35%', left: '80%', delay: '2s',   dur: '4.5s'},
          { size: 4,  top: '80%', left: '65%', delay: '0.5s', dur: '6s'  },
          { size: 5,  top: '55%', left: '40%', delay: '1.5s', dur: '5s'  },
          { size: 3,  top: '20%', left: '60%', delay: '2.5s', dur: '4s'  },
        ].map((p, i) => (
          <div key={i} className="absolute rounded-full pointer-events-none"
            style={{ width: p.size, height: p.size, top: p.top, left: p.left,
              background: 'rgba(187,247,208,0.7)',
              boxShadow: '0 0 6px 2px rgba(187,247,208,0.4)',
              animation: `particleRise ${p.dur} ease-in-out ${p.delay} infinite` }} />
        ))}

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-10 w-full">
          {/* Mill icon */}
          <div className="mb-5 w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <svg className="w-10 h-10" viewBox="0 0 48 48" fill="none">
              {/* Grain stalk */}
              <line x1="24" y1="40" x2="24" y2="10" stroke="#86efac" strokeWidth="2.5" strokeLinecap="round"/>
              {/* Leaves */}
              <path d="M24 32 Q18 28 16 22 Q22 24 24 32Z" fill="#4ade80" opacity="0.9"/>
              <path d="M24 32 Q30 28 32 22 Q26 24 24 32Z" fill="#4ade80" opacity="0.9"/>
              <path d="M24 24 Q18 20 17 14 Q23 17 24 24Z" fill="#86efac" opacity="0.8"/>
              <path d="M24 24 Q30 20 31 14 Q25 17 24 24Z" fill="#86efac" opacity="0.8"/>
              {/* Grain head */}
              <ellipse cx="24" cy="10" rx="3" ry="4" fill="#fde047" opacity="0.9"/>
              <ellipse cx="20" cy="12" rx="2.5" ry="3.5" fill="#fde047" opacity="0.8"/>
              <ellipse cx="28" cy="12" rx="2.5" ry="3.5" fill="#fde047" opacity="0.8"/>
            </svg>
          </div>

          <h1 className="text-2xl font-extrabold text-white mb-1 tracking-tight">Jaliya Rice Mill</h1>
          <p className="text-green-300 text-xs font-medium tracking-widest uppercase mb-4">Rice Mill Management System</p>

          <p className="text-green-200/70 text-sm leading-relaxed min-h-[44px] max-w-xs mb-8">
            <Typewriter />
          </p>

          {/* Feature list */}
          <div className="w-full flex flex-col gap-2">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl px-4 py-3 text-left"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span className="text-xl shrink-0">{f.icon}</span>
                <div>
                  <p className="text-white text-sm font-semibold leading-tight">{f.label}</p>
                  <p className="text-green-300/60 text-xs">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 relative transition-colors duration-300"
        style={{ backgroundColor: isDark ? '#111827' : '#e5e7eb' }}>

        {/* Top-right controls */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {/* PWA install button — always visible unless already installed */}
          {!installed && (
            <button onClick={handleInstall}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all"
              style={isDark
                ? { backgroundColor: '#1f2937', borderColor: '#374151', color: '#60a5fa' }
                : { backgroundColor: '#fff', borderColor: '#bfdbfe', color: '#2563eb' }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              Install App
            </button>
          )}

          {/* Theme toggle */}
          <button onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all"
            style={isDark
              ? { backgroundColor: '#1f2937', borderColor: '#374151', color: '#d1d5db' }
              : { backgroundColor: '#fff', borderColor: '#d1d5db', color: '#475569' }}>
            {isDark ? (
              <>
                <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm0 15a5 5 0 100-10 5 5 0 000 10zm7-5a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zM3 11a1 1 0 110 2H2a1 1 0 110-2h1zm15.657-6.243a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM6.757 17.657a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM20 19.071a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707A1 1 0 0120 19.07zM5.05 6.464a1 1 0 01-1.414 1.414l-.707-.707A1 1 0 014.343 5.757l.707.707zM12 20a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z"/>
                </svg>
                Light mode
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/>
                </svg>
                Dark mode
              </>
            )}
          </button>
        </div>

        <div className="w-full max-w-lg flex flex-col gap-4">
          {children}

          {/* Lumac footer */}
          <div className="flex flex-col items-center gap-1 pt-2">
            <p className="text-[10px] uppercase tracking-widest text-slate-400">Powered by</p>
            <p className="font-bold text-sm" style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>Lumac Solutions</p>
            <a href="tel:0764643050"
              className="flex items-center gap-1.5 text-blue-500 font-semibold text-sm hover:text-blue-600 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              </svg>
              076 464 3050
            </a>
            <a href="https://www.lumac.lk" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-400 text-xs hover:text-blue-500 transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/>
              </svg>
              www.lumac.lk
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
