/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Truck, 
  MapPin, 
  Phone, 
  CheckSquare, 
  Camera, 
  AlertTriangle,
  Calendar as CalendarIcon,
  Navigation,
  ChevronRight
} from 'lucide-react';
import { ordersApi } from '@/api/orders.api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';

export default function InstallationPage() {
  const { data: orders } = useQuery({ 
    queryKey: ['orders-installation'], 
    queryFn: () => ordersApi.getOrders() 
  });

  const installations = orders?.filter(o => o.status === 'ORNATISHDA') || [];

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">O'rnatish ishlari</h1>
          <p className="text-gray-500">Bugungi vazifalar</p>
        </div>
        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
           <Truck className="h-6 w-6" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
         <div className="p-4 bg-white rounded-2xl border border-gray-100 text-center shadow-sm">
            <p className="text-2xl font-black text-blue-600">{installations.length}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase">Ishlar soni</p>
         </div>
         <div className="p-4 bg-white rounded-2xl border border-gray-100 text-center shadow-sm">
            <p className="text-2xl font-black text-amber-600">2</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase">Kutilayotgan</p>
         </div>
      </div>

      <div className="space-y-4">
        {installations.map((inst) => (
          <Card key={inst.id} className="p-0 overflow-hidden group border-0 shadow-md">
            <div className="bg-blue-600 p-4 text-white">
               <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-black uppercase tracking-widest opacity-80">{inst.number}</span>
                  <Badge className="bg-white/20 text-white border-0 text-[10px]">BUGUN</Badge>
               </div>
               <h3 className="text-lg font-bold">Mijoz {inst.clientId}</h3>
            </div>
            <div className="p-5 space-y-5">
               <div className="space-y-3">
                  <div className="flex items-start text-sm text-gray-600">
                     <MapPin className="h-4 w-4 mr-3 text-blue-500 mt-1 flex-shrink-0" />
                     <p className="font-medium leading-relaxed">{inst.installationAddress}</p>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                     <Phone className="h-4 w-4 mr-3 text-emerald-500 flex-shrink-0" />
                     <p className="font-bold">+998 90 123 45 67</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="w-full h-12 bg-gray-50 border-gray-200">
                    <Navigation className="h-4 w-4 mr-2 text-blue-600" />
                    Xarita
                  </Button>
                  <Button variant="primary" className="w-full h-12">
                    Boshladim
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
               </div>

               <div className="pt-4 border-t border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Pre-departure checklist</p>
                  <div className="space-y-2">
                     <div className="flex items-center space-x-3 text-sm text-gray-600">
                        <div className="h-5 w-5 rounded border-2 border-blue-200 flex items-center justify-center bg-blue-50">
                           <CheckSquare className="h-3 w-3 text-blue-600" />
                        </div>
                        <span>O'lchamlar tekshirildi</span>
                     </div>
                     <div className="flex items-center space-x-3 text-sm text-gray-600">
                        <div className="h-5 w-5 rounded border-2 border-gray-200" />
                        <span>Barcha detallar olindi</span>
                     </div>
                     <div className="flex items-center space-x-3 text-sm text-gray-600">
                        <div className="h-5 w-5 rounded border-2 border-gray-200" />
                        <span>Manzil tasdiqlandi</span>
                     </div>
                  </div>
               </div>

               <div className="pt-2">
                  <Button variant="ghost" className="w-full text-red-600 text-xs font-bold py-2">
                    <AlertTriangle className="h-3 w-3 mr-2" />
                    Muammo haqida xabar berish
                  </Button>
               </div>
            </div>
          </Card>
        ))}

        {installations.length === 0 && (
          <div className="text-center py-20">
             <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckSquare className="h-10 w-10 text-gray-200" />
             </div>
             <p className="text-gray-400 font-medium">Bugun uchun vazifalar yo'q.</p>
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-around items-center z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
         <button className="flex flex-col items-center space-y-1 text-blue-600">
            <CalendarIcon className="h-6 w-6" />
            <span className="text-[10px] font-bold uppercase">Ishlar</span>
         </button>
         <button className="flex flex-col items-center space-y-1 text-gray-400">
            <Camera className="h-6 w-6" />
            <span className="text-[10px] font-bold uppercase">Foto</span>
         </button>
         <button className="flex flex-col items-center space-y-1 text-gray-400">
            <Truck className="h-6 w-6" />
            <span className="text-[10px] font-bold uppercase">Mashina</span>
         </button>
      </nav>
    </div>
  );
}
