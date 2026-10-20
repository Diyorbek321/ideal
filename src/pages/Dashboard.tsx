/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Wallet 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { financeApi } from '@/api/payments.api';
import { ordersApi } from '@/api/orders.api';
import { inventoryApi } from '@/api/inventory.api';
import { Card } from '@/components/ui/Card';
import { formatCurrency, cn } from '@/lib/utils';

export default function Dashboard() {
  const { data: stats } = useQuery({ queryKey: ['finance-stats'], queryFn: financeApi.getStats });
  const { data: orders } = useQuery({ queryKey: ['orders'], queryFn: () => ordersApi.getOrders() });
  const { data: materials } = useQuery({ queryKey: ['materials'], queryFn: inventoryApi.getMaterials });

  const kpis = [
    { label: 'Bugungi buyurtmalar', value: '12', icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Jarayondagi ishlar', value: orders?.filter(o => !['YAKUNLANDI', 'BEKOR_QILINDI'].includes(o.status)).length || 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Tasdiqlash kutilmoqda', value: orders?.filter(o => o.status === 'TASDIQDA').length || 0, icon: AlertCircle, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Tayyor buyurtmalar', value: orders?.filter(o => o.status === 'TAYYOR').length || 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Oy daromadi', value: formatCurrency(stats?.totalRevenue || 0), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Umumiy nasiya', value: formatCurrency(stats?.totalDebt || 0), icon: Wallet, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  const statusData = [
    { name: 'Yangi', value: orders?.filter(o => o.status === 'YANGI').length || 0 },
    { name: 'Dizaynda', value: orders?.filter(o => o.status === 'DIZAYNDA').length || 0 },
    { name: 'Tasdiqda', value: orders?.filter(o => o.status === 'TASDIQDA').length || 0 },
    { name: 'Ishlab chiqarishda', value: orders?.filter(o => o.status === 'ISHLAB_CHIQARISHDA').length || 0 },
    { name: 'O\'rnatishda', value: orders?.filter(o => o.status === 'ORNATISHDA').length || 0 },
  ];

  const sourceData = [
    { name: 'Walk-in', value: 70, color: '#2563eb' },
    { name: 'Telegram', value: 20, color: '#3b82f6' },
    { name: 'Instagram', value: 10, color: '#60a5fa' },
  ];

  const lowStock = materials?.filter(m => m.stock <= m.minStock) || [];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <Card key={i} className="p-4 flex flex-col items-center text-center space-y-2">
            <div className={cn('p-3 rounded-full', kpi.bg)}>
              <kpi.icon className={cn('h-6 w-6', kpi.color)} />
            </div>
            <p className="text-sm font-medium text-gray-500">{kpi.label}</p>
            <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="Buyurtmalar statusi bo'yicha">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Buyurtma manbalari">
          <div className="h-80 flex flex-col items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex space-x-6">
              {sourceData.map((s, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-sm text-gray-600">{s.name} ({s.value}%)</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card title="Muammoli buyurtmalar" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-3 font-semibold text-gray-900">Nomer</th>
                  <th className="py-3 font-semibold text-gray-900">Mijoz</th>
                  <th className="py-3 font-semibold text-gray-900">Status</th>
                  <th className="py-3 font-semibold text-gray-900">Kutilayotgan vaqt</th>
                  <th className="py-3 font-semibold text-gray-900">Muammo</th>
                </tr>
              </thead>
              <tbody>
                {orders?.slice(0, 5).map((o) => (
                  <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="py-4 font-medium text-blue-600 cursor-pointer">{o.number}</td>
                    <td className="py-4 text-gray-600">Mijoz {o.clientId}</td>
                    <td className="py-4">
                       <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">{o.status}</span>
                    </td>
                    <td className="py-4 text-red-600 font-medium">3 kun kechikkan</td>
                    <td className="py-4 text-gray-500">Mijoz tasdiqlamayapti</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Ombor qoldiqlari (Kamayganlar)">
          <div className="space-y-4">
            {lowStock.length > 0 ? (
              lowStock.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-red-100 bg-red-50">
                  <div>
                    <p className="font-semibold text-gray-900">{m.name}</p>
                    <p className="text-xs text-gray-500">Qoldiq: {m.stock} {m.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-red-600">Min: {m.minStock}</p>
                    <button className="text-xs text-blue-600 hover:underline">Sotib olish</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">Barcha materiallar yetarli.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}


