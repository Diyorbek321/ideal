import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function MainLayout() {
  const { user, loading } = useAuth();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const location = useLocation();

  if (loading) return <div className="flex h-screen items-center justify-center text-gray-400">Yuklanmoqda...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenu={() => setMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
