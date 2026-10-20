/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Printer, 
  Layers, 
  Activity, 
  CheckCircle,
  Play,
  Pause
} from 'lucide-react';
import { ordersApi } from '@/api/orders.api';
import { equipmentApi } from '@/api/equipment.api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export default function ProductionPage() {
  const { data: orders } = useQuery({ 
    queryKey: ['orders-production'], 
    queryFn: () => ordersApi.getOrders() 
  });
  const { data: equipment } = useQuery({ 
    queryKey: ['equipment'], 
    queryFn: equipmentApi.getEquipment 
  });

  const productionQueue = orders?.filter(o => o.status === 'ISHLAB_CHIQARISHDA') || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ishlab chiqarish navbati</h1>
          <p className="text-gray-500">Printer, Lazer va CNC stanoklar navbati boshqaruvi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {equipment?.map((eq) => (
          <Card key={eq.id} className="p-4 bg-white relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-gray-50 rounded-lg text-gray-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                 <Printer className="h-5 w-5" />
              </div>
              <Badge variant={eq.status === 'WORKING' ? 'success' : eq.status === 'IDLE' ? 'default' : 'error'}>
                {eq.status === 'WORKING' ? 'ISHLAYAPTI' : eq.status === 'IDLE' ? 'BO\'SH' : 'TA\'MIRDA'}
              </Badge>
            </div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">{eq.name}</h3>
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Hozirgi ish: Navbatda 3 ta</p>
            <div className="absolute -bottom-2 -right-2 opacity-5 scale-150">
               <Activity className="h-20 w-20" />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card title="Ishlab chiqarish navbati" className="lg:col-span-2">
           <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-6 py-4 font-semibold text-gray-900">Nomer</th>
                    <th className="px-6 py-4 font-semibold text-gray-900">Mahsulot / Material</th>
                    <th className="px-6 py-4 font-semibold text-gray-900">O'lcham</th>
                    <th className="px-6 py-4 font-semibold text-gray-900">Holat</th>
                    <th className="px-6 py-4 font-semibold text-gray-900"></th>
                  </tr>
                </thead>
                <tbody>
                  {productionQueue.map((order) => (
                    <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-black text-blue-600">{order.number}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{order.source}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{order.items[0].productType}</p>
                        <p className="text-xs text-gray-500 italic">{order.items[0].materialId}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{order.items[0].widthCm}x{order.items[0].heightCm} cm</p>
                        <p className="text-xs text-gray-400">{order.items[0].areaM2} m²</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="info">Jarayonda</Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                           <Button size="sm" variant="outline"><Pause className="h-3 w-3" /></Button>
                           <Button size="sm" variant="primary"><CheckCircle className="h-3 w-3 mr-2" />Tayyor</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {productionQueue.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-gray-500">Hozircha ishlab chiqarishda ishlar yo'q.</td>
                    </tr>
                  )}
                </tbody>
              </table>
           </div>
        </Card>

        <Card title="Material sarfi (Bugun)">
           <div className="space-y-6">
              <div className="space-y-2">
                 <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-gray-400">
                    <span>Banner 440g</span>
                    <span>45 / 100 m²</span>
                 </div>
                 <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '45%' }} />
                 </div>
              </div>
              <div className="space-y-2">
                 <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-gray-400">
                    <span>Fomeks 3mm</span>
                    <span>12 / 20 dona</span>
                 </div>
                 <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '60%' }} />
                 </div>
              </div>
              <div className="space-y-2">
                 <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-gray-400">
                    <span>Akril 3mm</span>
                    <span>2 / 5 dona</span>
                 </div>
                 <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: '40%' }} />
                 </div>
              </div>

              <div className="pt-6 border-t border-gray-50">
                 <h4 className="font-bold text-gray-900 mb-4">Brak (chiqindi) hisobi</h4>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-center">
                       <p className="text-xl font-black text-red-600">3.2 m²</p>
                       <p className="text-[10px] text-red-700 font-bold uppercase">Bugungi brak</p>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-center">
                       <p className="text-xl font-black text-gray-900">4%</p>
                       <p className="text-[10px] text-gray-500 font-bold uppercase">Yo'qotish</p>
                    </div>
                 </div>
              </div>
           </div>
        </Card>
      </div>
    </div>
  );
}
