import { NavLink } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useUser } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './navigation';
import { useNavBadge } from './useNavBadge';

const MAX_TABS = 4;

// Telefon uchun pastki menyu: rolga ruxsat etilgan birinchi 4 bo'lim + qolgani "Menyu" ichida
export default function BottomNav({ onMore }: { onMore: () => void }) {
  const user = useUser();
  const items = NAV_ITEMS.filter((i) => i.roles.includes(user.role));
  const tabs = items.slice(0, MAX_TABS);
  const hasMore = items.length > MAX_TABS;
  const badgeOf = useNavBadge();
  // Telefonda menyuda yashiringan arizalar ham ko'rinsin
  const hiddenBadges = items.slice(MAX_TABS).reduce((s, i) => s + badgeOf(i), 0);

  const cell = 'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium';

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      aria-label="Pastki menyu"
    >
      {tabs.map((item) => (
        <NavLink key={item.path} to={item.path} end={item.path === '/'}
          className={({ isActive }) => cn(cell, isActive ? 'text-gray-900' : 'text-gray-500')}>
          {({ isActive }) => (
            <>
              <span className={cn('relative flex h-7 w-12 items-center justify-center rounded-full transition-colors', isActive && 'bg-brand-400')}>
                <item.icon className="h-5 w-5" />
                {badgeOf(item) > 0 && <span className="absolute -right-0.5 -top-1 rounded-full bg-red-600 px-1 text-[10px] font-bold leading-4 text-white">{badgeOf(item)}</span>}
              </span>
              <span className={cn('truncate', isActive && 'font-semibold')}>{item.short}</span>
            </>
          )}
        </NavLink>
      ))}
      {hasMore && (
        <button onClick={onMore} className={cn(cell, 'text-gray-500')}>
          <span className="relative flex h-7 w-12 items-center justify-center">
            <Menu className="h-5 w-5" />
            {hiddenBadges > 0 && <span className="absolute -right-0.5 -top-1 rounded-full bg-red-600 px-1 text-[10px] font-bold leading-4 text-white">{hiddenBadges}</span>}
          </span>
          <span>Menyu</span>
        </button>
      )}
    </nav>
  );
}
