/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  Warehouse, 
  DollarSign, 
  Settings, 
  LogOut,
  Palette,
  Printer,
  Truck,
  UserCheck,
  FileText,
  Calculator
} from 'lucide-react';
import { authApi } from '@/api/auth.api';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER'] },
  { path: '/orders', label: 'Buyurtmalar', icon: ShoppingBag, roles: ['ADMIN', 'MANAGER'] },
  { path: '/calculator', label: 'Kalkulyator', icon: Calculator, roles: ['ADMIN', 'MANAGER'] },
  { path: '/design', label: 'Dizayn', icon: Palette, roles: ['ADMIN', 'DESIGNER'] },
  { path: '/production', label: 'Ishlab chiqarish', icon: Printer, roles: ['ADMIN', 'PRINTER'] },
  { path: '/installation', label: 'O\'rnatish', icon: Truck, roles: ['ADMIN', 'INSTALLER'] },
  { path: '/clients', label: 'Mijozlar', icon: Users, roles: ['ADMIN', 'MANAGER'] },
  { path: '/inventory', label: 'Ombor', icon: Warehouse, roles: ['ADMIN', 'PRINTER'] },
  { path: '/finance', label: 'Moliya', icon: DollarSign, roles: ['ADMIN'] },
  { path: '/employees', label: 'Xodimlar', icon: UserCheck, roles: ['ADMIN'] },
  { path: '/documents', label: 'Hujjatlar', icon: FileText, roles: ['ADMIN', 'MANAGER'] },
  { path: '/settings', label: 'Sozlamalar', icon: Settings, roles: ['ADMIN'] },
];

export default function Sidebar() {
  const user = authApi.getCurrentUser();
  const navigate = useNavigate();

  const filteredItems = navItems.filter(item => 
    !item.roles || (user && item.roles.includes(user.role))
  );

  const handleLogout = () => {
    authApi.logout();
    navigate('/login');
  };

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200">
      <div className="flex h-16 items-center px-6 border-b border-gray-100">
        <span className="text-xl font-bold text-blue-600">Ideal Dizayn</span>
      </div>
      <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-gray-100 p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Chiqish</span>
        </button>
      </div>
    </div>
  );
}
