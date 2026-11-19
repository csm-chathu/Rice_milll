import { createBrowserRouter, createHashRouter, Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectToken, selectRole, selectFeatures } from '../features/auth/authSlice';
import AppLayout   from '../layouts/AppLayout';
import GuestLayout from '../layouts/GuestLayout';
import Login       from '../pages/Login';
import Dashboard   from '../pages/Dashboard';

// Rice Mill pages
import PaddyPurchasesIndex from '../pages/paddy-purchases/Index';
import PaddyVarietiesIndex from '../pages/paddy-varieties/Index';
import RiceGradesIndex     from '../pages/rice-grades/Index';
import MillBatchesIndex    from '../pages/mill-batches/Index';
import WholesaleSalesIndex from '../pages/wholesale-sales/Index';
import LabourAttendance    from '../pages/labour/Attendance';
import LabourAdvances      from '../pages/labour/Advances';
import LabourWorkers       from '../pages/labour/Workers';
import WageSettlements     from '../pages/labour/Settlements';
import CustomersIndex      from '../pages/customers/Index';
import SuppliersIndex      from '../pages/suppliers/Index';
import CashAccountsIndex   from '../pages/cash-accounts/Index';
import OpeningBalancesIndex from '../pages/opening-balances/Index';
import StockReport         from '../pages/reports/StockReport';
import PLReport            from '../pages/reports/PLReport';
import SupplierLedger      from '../pages/reports/SupplierLedger';
import CustomerLedger      from '../pages/reports/CustomerLedger';
import LabourReport        from '../pages/reports/LabourReport';
import JournalIndex        from '../pages/journal/Index';
import UsersIndex          from '../pages/users/Index';
import Settings            from '../pages/Settings';
import RolesPage           from '../pages/settings/Roles';

function ProtectedRoute() {
  const token = useSelector(selectToken);
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

function FeatureRoute({ feature }) {
  const role     = useSelector(selectRole);
  const features = useSelector(selectFeatures);
  const isAdmin  = role?.toLowerCase() === 'admin';
  const allowed  = isAdmin || features === null || features?.includes(feature);
  return allowed ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

// Electron's packaged renderer loads index.html via the `file://` protocol,
// where `window.location.pathname` resolves to the absolute file path on
// disk instead of `/`. createBrowserRouter can never match a route against
// that, so it falls straight to the router's default 404 error screen.
// createHashRouter keeps all routing state after a `#`, which is untouched
// by `file://` resolution, so it works correctly in the packaged app. The
// web/PWA build still gets clean URLs via createBrowserRouter.
const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
const createAppRouter = isElectron ? createHashRouter : createBrowserRouter;


export const router = createAppRouter([
  {
    path: '/login',
    element: <GuestLayout><Login /></GuestLayout>,
  },
  {
    element: <ProtectedRoute />,
    children: [{
      element: <AppLayout />,
      children: [
        { index: true,                        element: <Navigate to="/dashboard" replace /> },
        { path: 'dashboard',                  element: <Dashboard /> },

        // ── Paddy ──────────────────────────────────────────────────
        { element: <FeatureRoute feature="paddy-purchases" />, children: [
          { path: 'paddy-purchases', element: <PaddyPurchasesIndex /> },
        ]},
        { element: <FeatureRoute feature="paddy-varieties" />, children: [
          { path: 'paddy-varieties', element: <PaddyVarietiesIndex /> },
        ]},

        // ── Milling ────────────────────────────────────────────────
        { element: <FeatureRoute feature="mill-batches" />, children: [
          { path: 'mill-batches', element: <MillBatchesIndex /> },
        ]},
        { element: <FeatureRoute feature="rice-grades" />, children: [
          { path: 'rice-grades', element: <RiceGradesIndex /> },
        ]},

        // ── Sales ──────────────────────────────────────────────────
        { element: <FeatureRoute feature="wholesale-sales" />, children: [
          { path: 'wholesale-sales', element: <WholesaleSalesIndex /> },
        ]},
        { element: <FeatureRoute feature="customers" />, children: [
          { path: 'customers', element: <CustomersIndex /> },
        ]},

        // ── Labour ─────────────────────────────────────────────────
        { element: <FeatureRoute feature="labour-attendance" />, children: [
          { path: 'labour/attendance', element: <LabourAttendance /> },
        ]},
        { element: <FeatureRoute feature="labour-advances" />, children: [
          { path: 'labour/advances', element: <LabourAdvances /> },
        ]},
        { element: <FeatureRoute feature="labour-workers" />, children: [
          { path: 'labour/workers', element: <LabourWorkers /> },
        ]},
        { element: <FeatureRoute feature="wage-settlements" />, children: [
          { path: 'labour/settlements', element: <WageSettlements /> },
        ]},

        // ── Suppliers / Finance ────────────────────────────────────
        { element: <FeatureRoute feature="suppliers" />, children: [
          { path: 'suppliers', element: <SuppliersIndex /> },
        ]},
        { element: <FeatureRoute feature="cash-accounts" />, children: [
          { path: 'cash-accounts', element: <CashAccountsIndex /> },
        ]},
        { element: <FeatureRoute feature="opening-balances" />, children: [
          { path: 'opening-balances', element: <OpeningBalancesIndex /> },
        ]},

        // ── Reports ────────────────────────────────────────────────
        { element: <FeatureRoute feature="stock-report" />, children: [
          { path: 'reports/stock', element: <StockReport /> },
        ]},
        { element: <FeatureRoute feature="pl-report" />, children: [
          { path: 'reports/pl', element: <PLReport /> },
        ]},
        { element: <FeatureRoute feature="supplier-ledger" />, children: [
          { path: 'reports/supplier-ledger', element: <SupplierLedger /> },
        ]},
        { element: <FeatureRoute feature="customer-ledger" />, children: [
          { path: 'reports/customer-ledger', element: <CustomerLedger /> },
        ]},
        { element: <FeatureRoute feature="labour-report" />, children: [
          { path: 'reports/labour', element: <LabourReport /> },
        ]},
        { path: 'journal', element: <JournalIndex /> },

        // ── Admin ──────────────────────────────────────────────────
        { element: <FeatureRoute feature="users" />, children: [
          { path: 'users', element: <UsersIndex /> },
        ]},
        { element: <FeatureRoute feature="settings" />, children: [
          { path: 'settings',       element: <Settings /> },
          { path: 'settings/roles', element: <RolesPage /> },
        ]},
      ],
    }],
  },
]);
