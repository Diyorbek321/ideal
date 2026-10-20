/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import OrdersPage from './pages/orders/OrdersPage';
import OrderDetailPage from './pages/orders/OrderDetailPage';
import ClientsPage from './pages/clients/ClientsPage';
import InventoryPage from './pages/inventory/InventoryPage';
import FinancePage from './pages/finance/FinancePage';
import DesignPage from './pages/design/DesignPage';
import ProductionPage from './pages/production/ProductionPage';
import InstallationPage from './pages/installation/InstallationPage';
import CalculatorPage from './pages/calculator/CalculatorPage';
import PublicApprovalPage from './pages/public/PublicApprovalPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/approve/:token" element={<PublicApprovalPage />} />
          
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="design" element={<DesignPage />} />
            <Route path="production" element={<ProductionPage />} />
            <Route path="installation" element={<InstallationPage />} />
            <Route path="calculator" element={<CalculatorPage />} />
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
