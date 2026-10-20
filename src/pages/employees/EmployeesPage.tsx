/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  UserCheck, 
  Wallet, 
  Award, 
  Briefcase,
  Plus,
  Search,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { employeesApi } from '@/api/employees.api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/lib/utils';

export default function EmployeesPage() {
  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: employeesApi.getEmployees,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Xodimlar va Ish haqi</h1>
          <p className="text-gray-500">Jamoa a'zolari va oylik hisob-kitoblari</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            Oylik hisoblash
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Yangi xodim
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="p-4 bg-white">
            <p className="text-sm text-gray-500 mb-1">Xodimlar soni</p>
            <p className="text-2xl font-black text-gray-900">{employees?.length || 0}</p>
         </Card>
         <Card className="p-4 bg-white">
            <p className="text-sm text-gray-500 mb-1">Shu oy kutilayotgan oylik</p>
            <p className="text-2xl font-black text-blue-600">64 500 000 so'm</p>
         </Card>
         <Card className="p-4 bg-white">
            <p className="text-sm text-gray-500 mb-1">To'langan oyliklar</p>
            <p className="text-2xl font-black text-emerald-600">12 000 000 so'm</p>
         </Card>
      </div>

      <Card>
         <div className="p-4 border-b border-gray-100">
            <div className="relative w-96">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
               <Input placeholder="Ism yoki telefon bo'yicha..." className="pl-10" />
            </div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-4 font-semibold text-gray-900">Xodim</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Lavozim</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Turi</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Stavka / Oylik</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Holat</th>
                  <th className="px-6 py-4 font-semibold text-gray-900"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse border-b border-gray-50">
                      <td colSpan={6} className="px-6 py-8"><div className="h-4 bg-gray-100 rounded w-full" /></td>
                    </tr>
                  ))
                ) : employees?.map((emp) => (
                  <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                       <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold uppercase">
                            {emp.fullName.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{emp.fullName}</p>
                            <p className="text-xs text-gray-500">{emp.phone}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <Badge variant="outline">{emp.role}</Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                       {emp.payType === 'FIXED' ? 'Fiksirlangan' : 'Ishbay (m²)'}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                       {emp.payType === 'FIXED' ? formatCurrency(emp.salary || 0) : `${formatCurrency(emp.ratePerM2 || 0)} / m²`}
                    </td>
                    <td className="px-6 py-4">
                       {emp.isActive ? (
                         <div className="flex items-center text-emerald-600 font-medium">
                            <CheckCircle2 className="h-4 w-4 mr-1.5" />
                            Faol
                         </div>
                       ) : (
                         <div className="flex items-center text-red-500 font-medium">
                            <XCircle className="h-4 w-4 mr-1.5" />
                            Nofaol
                         </div>
                       )}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <Button variant="ghost" size="sm" className="font-bold">Kartochka</Button>
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
