/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  LayoutGrid, 
  List, 
  Plus, 
  Filter, 
  Search,
  MoreVertical,
  Calendar,
  User,
  Phone
} from 'lucide-react';
import { ordersApi } from '@/api/orders.api';
import { clientsApi } from '@/api/clients.api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/orders/StatusBadge';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function OrdersPage() {
  const [view, setView] = React.useState<'table' | 'kanban'>('table');
  const [search, setSearch] = React.useState('');
  const navigate = useNavigate();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.getOrders(),
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: clientsApi.getClients,
  });

  const getClientName = (id: string) => {
    return clients?.find(c => c.id === id)?.name || 'Noma\'lum';
  };

  const filteredOrders = orders?.filter(o => 
    o.number.toLowerCase().includes(search.toLowerCase()) ||
    getClientName(o.clientId).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buyurtmalar</h1>
          <p className="text-gray-500">Barcha buyurtmalar ro'yxati va holati</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex border border-gray-200 rounded-lg p-1 bg-white">
            <button
              onClick={() => setView('table')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                view === 'table' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
              )}
            >
              <List className="h-5 w-5" />
            </button>
            <button
              onClick={() => setView('kanban')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                view === 'kanban' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
              )}
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
          </div>
          <Button onClick={() => navigate('/calculator')}>
            <Plus className="h-5 w-5 mr-2" />
            Yangi buyurtma
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Nomer yoki mijoz bo'yicha qidiruv..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filtrlar
        </Button>
      </div>

      {view === 'table' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-4 font-semibold text-gray-900">ID / Sana</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Mijoz</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Summa</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Deadline</th>
                  <th className="px-6 py-4 font-semibold text-gray-900"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                   Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse border-b border-gray-50">
                      <td colSpan={6} className="px-6 py-8">
                        <div className="h-4 bg-gray-100 rounded w-full" />
                      </td>
                    </tr>
                  ))
                ) : filteredOrders?.map((order) => (
                  <tr 
                    key={order.id} 
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-blue-600">{order.number}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(order.createdAt)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{getClientName(order.clientId)}</p>
                          <p className="text-xs text-gray-500 capitalize">{order.source.toLowerCase().replace('_', ' ')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{formatCurrency(order.totalAmount)}</p>
                      {order.totalAmount > order.paidAmount && (
                         <p className="text-xs text-red-500 mt-1 font-medium">Qarz: {formatCurrency(order.totalAmount - order.paidAmount)}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDate(order.deadline)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="flex space-x-4 overflow-x-auto pb-4">
          {/* Simple Kanban Mock */}
          {['YANGI', 'DIZAYNDA', 'TASDIQDA', 'ISHLAB_CHIQARISHDA', 'TAYYOR'].map((status) => (
            <div key={status} className="w-80 flex-shrink-0 space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="font-bold text-gray-700 flex items-center uppercase text-xs tracking-wider">
                  {status.replace('_', ' ')}
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 text-[10px]">
                    {orders?.filter(o => o.status === status).length || 0}
                  </span>
                </h3>
              </div>
              <div className="space-y-3 min-h-[500px]">
                {orders?.filter(o => o.status === status).slice(0, 5).map((order) => (
                  <Card 
                    key={order.id} 
                    className="p-4 hover:shadow-md cursor-grab active:cursor-grabbing border-l-4 border-l-blue-500"
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-bold text-blue-600">{order.number}</span>
                      <span className="text-[10px] text-gray-400 uppercase font-medium">{order.source}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-4">{getClientName(order.clientId)}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <p className="text-xs font-bold text-gray-900">{formatCurrency(order.totalAmount)}</p>
                      <div className="flex items-center text-[10px] text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        2 kun qoldi
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
