/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  DollarSign, 
  TrendingDown, 
  CreditCard, 
  Banknote,
  Calendar,
  User,
  ArrowRight
} from 'lucide-react';
import { financeApi } from '@/api/payments.api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

export default function FinancePage() {
  const { data: stats } = useQuery({ queryKey: ['finance-stats'], queryFn: financeApi.getStats });
  const { data: payments } = useQuery({ queryKey: ['payments'], queryFn: financeApi.getPayments });

  const chartData = [
    { day: '01.10', amount: 4500000 },
    { day: '05.10', amount: 3200000 },
    { day: '10.10', amount: 7800000 },
    { day: '15.10', amount: 5400000 },
    { day: '20.10', amount: 9100000 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Moliya va To'lovlar</h1>
          <p className="text-gray-500">Daromadlar, xarajatlar va qarzlar hisobi</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            Xarajat qo'shish
          </Button>
          <Button>
            Hisobot yuklash (Excel)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-blue-600 text-white border-0 shadow-lg shadow-blue-100">
           <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <DollarSign className="h-6 w-6" />
              </div>
              <Badge className="bg-white/20 text-white border-0">+12%</Badge>
           </div>
           <p className="text-sm opacity-80 mb-1">Umumiy tushum (oylik)</p>
           <p className="text-2xl font-black">{formatCurrency(stats?.totalRevenue || 0)}</p>
        </Card>

        <Card className="p-6 bg-red-500 text-white border-0 shadow-lg shadow-red-100">
           <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <TrendingDown className="h-6 w-6" />
              </div>
           </div>
           <p className="text-sm opacity-80 mb-1">Qarzdorlik (Nasiya)</p>
           <p className="text-2xl font-black">{formatCurrency(stats?.totalDebt || 0)}</p>
        </Card>

        <Card className="p-6 bg-white shadow-sm">
           <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <Banknote className="h-6 w-6" />
              </div>
           </div>
           <p className="text-sm text-gray-500 mb-1">Naqd pullar</p>
           <p className="text-2xl font-black text-gray-900">{formatCurrency((stats?.totalRevenue || 0) * 0.4)}</p>
        </Card>

        <Card className="p-6 bg-white shadow-sm">
           <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                <CreditCard className="h-6 w-6" />
              </div>
           </div>
           <p className="text-sm text-gray-500 mb-1">Karta / Perechislenie</p>
           <p className="text-2xl font-black text-gray-900">{formatCurrency((stats?.totalRevenue || 0) * 0.6)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card title="Daromad grafigi" className="lg:col-span-2">
           <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="amount" stroke="#2563eb" fillOpacity={1} fill="url(#colorAmount)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </Card>

        <Card title="Oxirgi to'lovlar">
           <div className="space-y-4">
              {payments?.slice(0, 6).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 border border-gray-50 rounded-xl hover:bg-gray-50 transition-colors">
                   <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs">
                        ID
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(p.amount)}</p>
                        <p className="text-[10px] text-gray-500 uppercase">{formatDate(p.createdAt)}</p>
                      </div>
                   </div>
                   <button className="text-gray-400 hover:text-blue-600">
                      <ArrowRight className="h-4 w-4" />
                   </button>
                </div>
              ))}
              <Button variant="ghost" className="w-full text-sm font-bold">Barchasini ko'rish</Button>
           </div>
        </Card>
      </div>

      <Card title="Qarzdor mijozlar (Nasiya)">
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-4 font-semibold text-gray-900">Mijoz</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Buyurtma</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Sana</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Umumiy summa</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Qarz miqdori</th>
                  <th className="px-6 py-4 font-semibold text-gray-900"></th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                       <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center"><User className="h-4 w-4 text-gray-400" /></div>
                          <span className="font-medium text-gray-900">Byudjet Tashkiloti #{i + 1}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-blue-600 font-bold">ID-2026-00{i + 10}</td>
                    <td className="px-6 py-4 text-gray-500">12.10.2026</td>
                    <td className="px-6 py-4 font-semibold">{formatCurrency(2500000)}</td>
                    <td className="px-6 py-4 text-red-600 font-black">{formatCurrency(1200000)}</td>
                    <td className="px-6 py-4 text-right">
                       <Button variant="outline" size="sm">Eslatma yuborish</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
         </div>
      </Card>
    </div>
  );
}
