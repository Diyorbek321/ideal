import {
  AlarmClock, BarChart3, Boxes, CalendarCheck, Calculator, DollarSign, FileText, Globe, LayoutDashboard, MonitorPlay, Palette, Printer, Receipt, Settings, ShoppingBag,
  Target, Truck, UserCheck, Users, Warehouse,
} from 'lucide-react';
import type { UserRole } from '@/types';

export interface NavItem {
  path: string;
  label: string;
  /** Telefondagi pastki menyu uchun qisqa nom */
  short: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
  /** Menyuda son ko'rsatiladi (masalan, yangi arizalar) */
  badge?: 'leads';
}

export const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Ish jarayoni',
    items: [
      { path: '/', label: 'Bosh sahifa', short: 'Asosiy', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER'] },
      { path: '/orders', label: 'Buyurtmalar', short: 'Buyurtma', icon: ShoppingBag, roles: ['ADMIN', 'MANAGER'] },
      { path: '/leads', label: 'Saytdan arizalar', short: 'Ariza', icon: Globe, roles: ['ADMIN', 'MANAGER'], badge: 'leads' },
      { path: '/calculator', label: 'Narx kalkulyatori', short: 'Narx', icon: Calculator, roles: ['ADMIN', 'MANAGER'] },
      { path: '/design', label: 'Dizayn', short: 'Dizayn', icon: Palette, roles: ['ADMIN', 'MANAGER', 'DESIGNER'] },
      { path: '/production', label: 'Ishlab chiqarish', short: 'Pechat', icon: Printer, roles: ['ADMIN', 'MANAGER', 'PRINTER'] },
      { path: '/ad-screens', label: 'LED ekranlar', short: 'Ekran', icon: MonitorPlay, roles: ['ADMIN', 'MANAGER'] },
      { path: '/installation', label: 'O\'rnatish', short: 'Montaj', icon: Truck, roles: ['ADMIN', 'MANAGER', 'INSTALLER'] },
    ],
  },
  {
    title: 'Resurslar',
    items: [
      { path: '/clients', label: 'Mijozlar', short: 'Mijoz', icon: Users, roles: ['ADMIN', 'MANAGER'] },
      { path: '/analytics/clients', label: 'Mijozlar statistikasi', short: 'Statistika', icon: BarChart3, roles: ['ADMIN', 'MANAGER'] },
      { path: '/product-types', label: 'Mahsulot turlari', short: 'Turlar', icon: Boxes, roles: ['ADMIN', 'MANAGER'] },
      { path: '/inventory', label: 'Ombor', short: 'Ombor', icon: Warehouse, roles: ['ADMIN', 'MANAGER', 'PRINTER'] },
    ],
  },
  {
    title: 'Boshqaruv',
    items: [
      { path: '/kpi', label: 'KPI va bonus', short: 'KPI', icon: Target, roles: ['ADMIN', 'MANAGER', 'DESIGNER', 'PRINTER', 'INSTALLER'] },
      { path: '/finance', label: 'Moliya', short: 'Moliya', icon: DollarSign, roles: ['ADMIN', 'MANAGER'] },
      { path: '/expenses', label: 'Xarajatlar', short: 'Xarajat', icon: Receipt, roles: ['ADMIN', 'MANAGER'] },
      { path: '/employees', label: 'Xodimlar va oylik', short: 'Xodim', icon: UserCheck, roles: ['ADMIN'] },
      { path: '/attendance', label: 'Davomat', short: 'Davomat', icon: CalendarCheck, roles: ['ADMIN', 'MANAGER'] },
      { path: '/overdue', label: 'Kechikkan ishlar', short: 'Kechikish', icon: AlarmClock, roles: ['ADMIN', 'MANAGER'] },
      { path: '/documents', label: 'Hujjatlar', short: 'Hujjat', icon: FileText, roles: ['ADMIN', 'MANAGER'] },
      { path: '/settings', label: 'Sozlamalar', short: 'Sozlama', icon: Settings, roles: ['ADMIN'] },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function navForRole(role: UserRole) {
  return NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) }))
    .filter((g) => g.items.length > 0);
}
