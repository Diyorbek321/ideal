import { NavLink } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import { useAuth, useUser } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './navigation';

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useUser();
  const { logout } = useAuth();
  const items = NAV_ITEMS.filter((i) => i.roles.includes(user.role));

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-100 px-6">
          <span className="text-xl font-bold text-blue-600">Ideal Dizayn</span>
          <button className="lg:hidden text-gray-400" onClick={onClose} aria-label="Menyuni yopish">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onClose}
              className={({ isActive }) => cn(
                'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-100 p-4">
          <button
            onClick={logout}
            className="flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-5 w-5" />
            <span>Chiqish</span>
          </button>
        </div>
      </aside>
    </>
  );
}
