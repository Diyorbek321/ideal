/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Settings as SettingsIcon, 
  Building2, 
  CreditCard, 
  Bell, 
  ShieldCheck,
  Languages,
  DollarSign
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tizim Sozlamalari</h1>
        <p className="text-gray-500">Kompaniya ma'lumotlari va tizim parametrlarini boshqarish</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
         <div className="md:col-span-1 space-y-1">
            <button className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg bg-blue-50 text-blue-600 font-bold text-sm text-left">
               <Building2 className="h-4 w-4" />
               <span>Kompaniya</span>
            </button>
            <button className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 font-medium text-sm text-left">
               <DollarSign className="h-4 w-4" />
               <span>Narx-navo</span>
            </button>
            <button className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 font-medium text-sm text-left">
               <ShieldCheck className="h-4 w-4" />
               <span>Xavfsizlik</span>
            </button>
            <button className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 font-medium text-sm text-left">
               <Bell className="h-4 w-4" />
               <span>Bildirishnomalar</span>
            </button>
         </div>

         <div className="md:col-span-3 space-y-6">
            <Card title="Kompaniya ma'lumotlari" description="Hujjatlarda ko'rsatiladigan rasmiy ma'lumotlar">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <Input label="Kompaniya nomi" defaultValue="Ideal Dizayn MCHJ" />
                  <Input label="STIR (INN)" defaultValue="301234567" />
                  <Input label="Bank nomi" defaultValue="Hamkorbank ATB" />
                  <Input label="H/R (MFO)" defaultValue="00441" />
                  <Input label="Hisob raqami" defaultValue="20208000123456789001" />
                  <Input label="Telefon" defaultValue="+998 90 123 45 67" />
                  <div className="md:col-span-2">
                     <Input label="Manzil" defaultValue="Toshkent sh., Yunusobod tumani, 4-kvartal" />
                  </div>
               </div>
               <div className="mt-8 flex justify-end">
                  <Button>O'zgarishlarni saqlash</Button>
               </div>
            </Card>

            <Card title="SLA va Vaqt limitlari" description="Statuslar orasidagi maksimal kutish vaqtlari (soat)">
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <Input label="Dizayn" type="number" defaultValue={24} />
                  <Input label="Tasdiqlash" type="number" defaultValue={48} />
                  <Input label="Ishlab chiq." type="number" defaultValue={72} />
                  <Input label="O'rnatish" type="number" defaultValue={24} />
               </div>
            </Card>
         </div>
      </div>
    </div>
  );
}
