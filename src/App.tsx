import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ApiError } from '@/api';
import { AuthProvider, HOME_BY_ROLE, RequireRole, useAuth } from '@/lib/auth';
import { ToastProvider } from '@/components/ui/Toast';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import OrdersPage from './pages/orders/OrdersPage';
import OrderDetailPage from './pages/orders/OrderDetailPage';
import ClientsPage from './pages/clients/ClientsPage';
import LeadsPage from './pages/leads/LeadsPage';
import KpiPage from './pages/kpi/KpiPage';
import ClientDetailPage from './pages/clients/ClientDetailPage';
import InventoryPage from './pages/inventory/InventoryPage';
import FinancePage from './pages/finance/FinancePage';
import ExpensesPage from './pages/expenses/ExpensesPage';
import DesignPage from './pages/design/DesignPage';
import ProductionPage from './pages/production/ProductionPage';
import InstallationPage from './pages/installation/InstallationPage';
import CalculatorPage from './pages/calculator/CalculatorPage';
import EmployeesPage from './pages/employees/EmployeesPage';
import DocumentsPage from './pages/documents/DocumentsPage';
import SettingsPage from './pages/SettingsPage';
import PublicApprovalPage from './pages/public/PublicApprovalPage';
import TrackPage from './pages/public/TrackPage';
import ClientsAnalyticsPage from './pages/analytics/ClientsAnalyticsPage';
import AttendancePage from './pages/analytics/AttendancePage';
import OverduePage from './pages/analytics/OverduePage';
import AdScreensPage from './pages/adscreens/AdScreensPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      staleTime: 15_000,
      // Ruxsat/topilmadi xatolarini qayta so'ramaymiz
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
    },
  },
});

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'ADMIN' || user.role === 'MANAGER' ? <Dashboard /> : <Navigate to={HOME_BY_ROLE[user.role]} replace />;
}

const staff = ['ADMIN', 'MANAGER'] as const;

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/approve/:token" element={<PublicApprovalPage />} />
              <Route path="/t/:token" element={<TrackPage />} />
              <Route path="/" element={<MainLayout />}>
                <Route index element={<HomeRedirect />} />
                <Route path="orders" element={<RequireRole roles={[...staff]}><OrdersPage /></RequireRole>} />
                <Route path="orders/:id" element={<OrderDetailPage />} />
                <Route path="calculator" element={<RequireRole roles={[...staff]}><CalculatorPage /></RequireRole>} />
                <Route path="design" element={<RequireRole roles={[...staff, 'DESIGNER']}><DesignPage /></RequireRole>} />
                <Route path="production" element={<RequireRole roles={[...staff, 'PRINTER']}><ProductionPage /></RequireRole>} />
                <Route path="installation" element={<RequireRole roles={[...staff, 'INSTALLER']}><InstallationPage /></RequireRole>} />
                <Route path="ad-screens" element={<RequireRole roles={[...staff]}><AdScreensPage /></RequireRole>} />
                <Route path="clients" element={<RequireRole roles={[...staff]}><ClientsPage /></RequireRole>} />
                <Route path="leads" element={<RequireRole roles={[...staff]}><LeadsPage /></RequireRole>} />
                <Route path="kpi" element={<KpiPage />} />
                <Route path="clients/:id" element={<RequireRole roles={[...staff]}><ClientDetailPage /></RequireRole>} />
                <Route path="inventory" element={<RequireRole roles={[...staff, 'PRINTER']}><InventoryPage /></RequireRole>} />
                <Route path="finance" element={<RequireRole roles={[...staff]}><FinancePage /></RequireRole>} />
                <Route path="analytics/clients" element={<RequireRole roles={[...staff]}><ClientsAnalyticsPage /></RequireRole>} />
                <Route path="attendance" element={<RequireRole roles={[...staff]}><AttendancePage /></RequireRole>} />
                <Route path="overdue" element={<RequireRole roles={[...staff]}><OverduePage /></RequireRole>} />
                <Route path="expenses" element={<RequireRole roles={[...staff]}><ExpensesPage /></RequireRole>} />
                <Route path="employees" element={<RequireRole roles={['ADMIN']}><EmployeesPage /></RequireRole>} />
                <Route path="documents" element={<RequireRole roles={[...staff]}><DocumentsPage /></RequireRole>} />
                <Route path="settings" element={<RequireRole roles={['ADMIN']}><SettingsPage /></RequireRole>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
