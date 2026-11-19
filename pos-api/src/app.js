require('dotenv').config();
const express = require('express');

// Prevent unhandled DB errors from crashing the process
process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection]', err?.message || err);
});
const cors    = require('cors');
const tenant  = require('./middleware/tenant');

const app = express();

app.use(cors({
  origin: (origin, cb) => cb(null, true), // tighten in production
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Tenant DB switch — must be before all routes
app.use(tenant);

// Health check
app.get('/api/ping', (req, res) => res.json({ ok: true }));

// Routes
app.use('/api/public',    require('./routes/public'));
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/me',        require('./routes/auth')); // /api/me is in auth router
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/settings',  require('./routes/settings'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/roles',     require('./routes/roles'));

// ── Rice Mill routes ───────────────────────────────────────────
app.use('/api/cash-accounts',    require('./routes/cash-accounts'));
app.use('/api/opening-balances', require('./routes/opening-balances'));
app.use('/api/paddy-varieties',  require('./routes/paddy-varieties'));
app.use('/api/rice-grades',      require('./routes/rice-grades'));
app.use('/api/paddy-purchases',  require('./routes/paddy-purchases'));
app.use('/api/mill-batches',     require('./routes/mill-batches'));
app.use('/api/wholesale-sales',  require('./routes/wholesale-sales'));
app.use('/api/labour',           require('./routes/labour'));
app.use('/api/rice-reports',     require('./routes/rice-reports'));
app.use('/api/journal',          require('./routes/journal'));

// Wrap all async route handlers so thrown errors flow to the error handler
function wrapAsync(router) {
  router.stack.forEach(layer => {
    if (layer.handle?.stack) wrapAsync(layer.handle);
    else if (layer.route) {
      layer.route.stack.forEach(r => {
        const orig = r.handle;
        r.handle = (req, res, next) => {
          const result = orig(req, res, next);
          if (result?.catch) result.catch(next);
        };
      });
    }
  });
}

// Apply async wrapper to all mounted routers
['auth', 'suppliers', 'customers', 'settings', 'users', 'roles'].forEach(name => {
  try { wrapAsync(require(`./routes/${name}`)); } catch {}
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err?.message || err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`POS API running on http://localhost:${PORT}`));
