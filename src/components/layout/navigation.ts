import {
  Calculator, DollarSign, FileText, LayoutDashboard, Palette, Printer, Settings, ShoppingBag, Truck, UserCheck, Users,
  Warehouse,
} from 'lucide-react';
import type { UserRole } from '@/types';

export const NAV_ITEMS: Array<{ path: string; label: string; icon: typeof LayoutDashboard; roles: UserRole[] }> = [
  { path: '/', label: 'Bosh sahifa', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER'] },
  { path: '/orders', label: 'Buyurtmalar', icon: ShoppingBag, roles: ['ADMIN', 'MANAGER'] },
  { path: '/calculator', label: 'Narx kalkulyatori', icon: Calculator, roles: ['ADMIN', 'MANAGER'] },
  { path: '/design', label: 'Dizayn', icon: Palette, roles: ['ADMIN', 'MANAGER', 'DESIGNER'] },
  { path: '/production', label: 'Ishlab chiqarish', icon: Printer, roles: ['ADMIN', 'MANAGER', 'PRINTER'] },
  { path: '/installation', label: 'O\'rnatish', icon: Truck, roles: ['ADMIN', 'MANAGER', 'INSTALLER'] },
  { path: '/clients', label: 'Mijozlar', icon: Users, roles: ['ADMIN', 'MANAGER'] },
  { path: '/inventory', label: 'Ombor', icon: Warehouse, roles: ['ADMIN', 'MANAGER', 'PRINTER'] },
  { path: '/finance', label: 'Moliya', icon: DollarSign, roles: ['ADMIN', 'MANAGER'] },
  { path: '/employees', label: 'Xodimlar va oylik', icon: UserCheck, roles: ['ADMIN'] },
  { path: '/documents', label: 'Hujjatlar', icon: FileText, roles: ['ADMIN', 'MANAGER'] },
  { path: '/settings', label: 'Sozlamalar', icon: Settings, roles: ['ADMIN'] },
];
