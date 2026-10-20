/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Palette, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Upload,
  ExternalLink,
  MessageCircle
} from 'lucide-react';
import { ordersApi } from '@/api/orders.api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';

export default function DesignPage() {
  const { data: orders } = useQuery({ 
    queryKey: ['orders-design'], 
    queryFn: () => ordersApi.getOrders() 
  });

  const designTasks = orders?.filter(o => ['DIZAYNDA', 'TASDIQDA'].includes(o.status)) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dizayn Boshqaruvi</h1>
          <p className="text-gray-500">Mijozlar bilan dizaynni tasdiqlash va ishlar oqimi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-4 bg-white">
          <p className="text-sm text-gray-500 mb-1">Dizayndagi ishlar</p>
          <p className="text-2xl font-black text-amber-600">{designTasks.filter(o => o.status === 'DIZAYNDA').length}</p>
        </Card>
        <Card className="p-4 bg-white">
          <p className="text-sm text-gray-500 mb-1">Tasdiq kutilayotgan</p>
          <p className="text-2xl font-black text-blue-600">{designTasks.filter(o => o.status === 'TASDIQDA').length}</p>
        </Card>
        <Card className="p-4 bg-white">
          <p className="text-sm text-gray-500 mb-1">O'rtacha tasdiqlash vaqti</p>
          <p className="text-2xl font-black text-gray-900">1.5 kun</p>
        </Card>
        <Card className="p-4 bg-white">
          <p className="text-sm text-gray-500 mb-1">Dizayner oyligi (shu oy)</p>
          <p className="text-2xl font-black text-emerald-600">2 450 000 so'm</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-amber-600" />
            Navbatdagi dizaynlar
          </h2>
          {designTasks.filter(o => o.status === 'DIZAYNDA').map((task) => (
            <Card key={task.id} className="p-5 hover:border-blue-300 transition-colors cursor-pointer">
               <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                       <span className="font-black text-blue-600">{task.number}</span>
                       <Badge variant="warning">DIZAYNDA</Badge>
                    </div>
                    <p className="font-bold text-gray-900">Mijoz {task.clientId}</p>
                    <p className="text-xs text-gray-500 mt-2">Muddati: {formatDate(task.deadline)}</p>
                  </div>
                  <Button size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Yuklash
                  </Button>
               </div>
               <div className="mt-4 pt-4 border-t border-gray-50 flex items-center space-x-4">
                  <div className="flex -space-x-2">
                     <div className="h-6 w-6 rounded-full bg-blue-100 border-2 border-white" />
                     <div className="h-6 w-6 rounded-full bg-gray-100 border-2 border-white" />
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dizayner: Jamshid Saidov</p>
               </div>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <CheckCircle2 className="h-5 w-5 mr-2 text-blue-600" />
            Tasdiq kutilayotgan
          </h2>
          {designTasks.filter(o => o.status === 'TASDIQDA').map((task) => (
            <Card key={task.id} className="p-5 bg-blue-50/30 border-blue-100">
               <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                       <span className="font-black text-blue-600">{task.number}</span>
                       <Badge variant="info">TASDIQDA</Badge>
                    </div>
                    <p className="font-bold text-gray-900">Mijoz {task.clientId}</p>
                    <p className="text-xs text-gray-500 mt-1">Yuborilgan: 4 soat oldin</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="bg-white">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="bg-white">
                      <MessageCircle className="h-4 w-4 text-emerald-500" />
                    </Button>
                  </div>
               </div>
               <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                     <AlertCircle className="h-4 w-4 text-amber-500" />
                     <p className="text-xs font-medium text-amber-700">Revisiyalar soni: {task.revisionCount}</p>
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">Token: {task.id.repeat(2)}</p>
               </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
