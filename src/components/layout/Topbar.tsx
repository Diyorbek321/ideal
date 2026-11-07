import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, KeyRound, Menu, Repeat, Search } from 'lucide-react';
import { HOME_BY_ROLE, isFinance, useAuth, useUser } from '@/lib/auth';
import { errorMessage } from '@/api';
import type { UserRole } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { ROLE_LABELS } from '@/lib/labels';
import ChangePasswordModal from './ChangePasswordModal';
import { Logo } from './Logo';
import NotificationBell from './NotificationBell';

const NOTIFIED_ROLES = new Set(['ADMIN', 'MANAGER', 'DESIGNER']);

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  const user = useUser();
  const navigate = useNavigate();
  const [q, setQ] = React.useState('');
  const [menu, setMenu] = React.useState(false);
  const [pwOpen, setPwOpen] = React.useState(false);
  const { switchRole } = useAuth();
  const toast = useToast();
  const [switching, setSwitching] = React.useState(false);
  const roles = user.roles ?? [user.role];

  const changeRole = async (role: UserRole) => {
    setMenu(false);
    if (role === user.role || switching) return;
    setSwitching(true);
    try {
      await switchRole(role);
      navigate(HOME_BY_ROLE[role]);
      toast.success(`Endi siz: ${ROLE_LABELS[role]}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSwitching(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate(`/orders?search=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex flex-1 items-center gap-3">
        <button className="-ml-2 rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden" onClick={onMenu} aria-label="Menyu">
          <Menu className="h-5 w-5" />
        </button>
        <Logo className="lg:hidden" compact />
        {isFinance(user.role) && (
          <form onSubmit={submit} className="relative hidden w-full max-w-md md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buyurtma raqami, mijoz yoki telefon..."
              className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm placeholder:text-gray-400 hover:border-gray-300 focus:border-gray-900 focus:outline-none focus:ring-4 focus:ring-brand-300/50"
            />
          </form>
        )}
      </div>
      <div className="flex items-center gap-2">
        {NOTIFIED_ROLES.has(user.role) && <NotificationBell />}
        <div className="relative">
          <button onClick={() => setMenu(!menu)} onBlur={() => setTimeout(() => setMenu(false), 150)}
            className="flex items-center gap-3 rounded-xl p-1 text-left hover:bg-gray-100" aria-haspopup="menu" aria-expanded={menu}>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-none text-gray-900">{user.fullName}</p>
              <p className="mt-1 text-xs text-gray-500">{ROLE_LABELS[user.role]}{roles.length > 1 ? ' ⇄' : ''}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-400 font-display text-xs font-bold text-white">
              {initials(user.fullName)}
            </div>
          </button>
          {menu && (
            <div role="menu" className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-2xl border border-gray-200 bg-white p-1.5 shadow-xl">
              {roles.length > 1 && (
                <div className="mb-1 border-b border-gray-100 pb-1">
                  <p className="flex items-center gap-1.5 px-3 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    <Repeat className="h-3.5 w-3.5" />Lavozimni almashtirish
                  </p>
                  {roles.map((r) => (
                    <button key={r} role="menuitemradio" aria-checked={r === user.role} disabled={switching}
                      onMouseDown={(e) => e.preventDefault()} onClick={() => changeRole(r)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-gray-100 ${r === user.role ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                      {ROLE_LABELS[r]}
                      {r === user.role && <Check className="h-4 w-4 text-brand-500" />}
                    </button>
                  ))}
                </div>
              )}
              <button role="menuitem" onMouseDown={(e) => e.preventDefault()} onClick={() => { setMenu(false); setPwOpen(true); }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100">
                <KeyRound className="h-4 w-4 text-gray-400" />Parolni o'zgartirish
              </button>
            </div>
          )}
        </div>
      </div>
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </header>
  );
}
