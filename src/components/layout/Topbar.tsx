/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bell, Search, User } from 'lucide-react';
import { authApi } from '@/api/auth.api';
import { Badge } from '../ui/Badge';

export default function Topbar() {
  const user = authApi.getCurrentUser();

  return (
    <header className="h-16 border-b border-gray-200 bg-white px-8 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center w-96">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Qidiruv (Buyurtma, mijoz, telefon...)"
            className="w-full rounded-full border-gray-200 bg-gray-50 pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border-2 border-white" />
        </button>
        
        <div className="flex items-center space-x-3 pl-4 border-l border-gray-100">
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900 leading-none">{user?.fullName}</p>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-medium">{user?.role}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <User className="h-6 w-6" />
          </div>
        </div>
      </div>
    </header>
  );
}
