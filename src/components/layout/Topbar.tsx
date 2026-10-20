import React from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Menu, Search, User } from 'lucide-react';
import { isFinance, useUser } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/labels';
import ChangePasswordModal from './ChangePasswordModal';
import NotificationBell from './NotificationBell';

const NOTIFIED_ROLES = new Set(['ADMIN', 'MANAGER', 'DESIGNER']);

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  const user = useUser();
  const navigate = useNavigate();
  const [q, setQ] = React.useState('');
  const [menu, setMenu] = React.useState(false);
  const [pwOpen, setPwOpen] = React.useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate(`/orders?search=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 lg:px-8">
      <div className="flex flex-1 items-center gap-3">
        <button className="lg:hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100" onClick={onMenu} aria-label="Menyu">
          <Menu className="h-5 w-5" />
        </button>
        {isFinance(user.role) && (
          <form onSubmit={submit} className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buyurtma raqami, mijoz yoki telefon..."
              className="w-full rounded-full border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </form>
        )}
      </div>
      <div className="flex items-center gap-2">
        {NOTIFIED_ROLES.has(user.role) && <NotificationBell />}
        <div className="relative border-l border-gray-100 pl-3">
          <button onClick={() => setMenu(!menu)} onBlur={() => setTimeout(() => setMenu(false), 150)}
            className="flex items-center space-x-3 rounded-lg p-1 text-left hover:bg-gray-50" aria-haspopup="menu" aria-expanded={menu}>
            <div className="text-right">
              <p className="text-sm font-semibold leading-none text-gray-900">{user.fullName}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-gray-500">{ROLE_LABELS[user.role]}</p>
            </div>
            <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 sm:flex">
              <User className="h-6 w-6" />
            </div>
          </button>
          {menu && (
            <div role="menu" className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
              <button role="menuitem" onMouseDown={(e) => e.preventDefault()} onClick={() => { setMenu(false); setPwOpen(true); }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
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
