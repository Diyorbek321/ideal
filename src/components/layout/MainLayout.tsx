import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import BottomNav from './BottomNav';
import { Logo } from './Logo';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function MainLayout() {
  const { user, loading } = useAuth();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-50">
        <Logo className="animate-pulse" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return (
    <div className="flex h-dvh overflow-hidden bg-gray-50">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onMenu={() => setMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
          <div className="mx-auto w-full max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav onMore={() => setMenuOpen(true)} />
    </div>
  );
}
