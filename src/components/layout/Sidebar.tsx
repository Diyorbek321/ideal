import { NavLink } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import { useAuth, useUser } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';
import { navForRole } from './navigation';
import { useNavBadge } from './useNavBadge';

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useUser();
  const { logout } = useAuth();
  const groups = navForRole(user.role);
  const badgeOf = useNavBadge();

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-[2px] lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-gray-200 bg-white transition-transform duration-200 lg:static lg:z-auto lg:w-64 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Asosiy menyu"
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-5">
          <Logo />
          <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden" onClick={onClose} aria-label="Menyuni yopish">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-2">
          {groups.map((g) => (
            <div key={g.title}>
              {groups.length > 1 && (
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{g.title}</p>
              )}
              <div className="space-y-0.5">
                {g.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={onClose}
                    className={({ isActive }) => cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                      isActive
                        ? 'bg-brand-400 font-semibold text-gray-900'
                        : 'font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                    )}
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-700')} />
                        <span className="truncate">{item.label}</span>
                        {badgeOf(item) > 0 && (
                          <span className="ml-auto rounded-full bg-red-600 px-1.5 text-[11px] font-bold leading-5 text-white">{badgeOf(item)}</span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-gray-100 p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-[18px] w-[18px]" />
            <span>Chiqish</span>
          </button>
        </div>
      </aside>
    </>
  );
}
