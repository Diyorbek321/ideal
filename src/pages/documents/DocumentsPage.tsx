/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  Eye,
  FileSignature,
  FileCheck,
  Briefcase
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const templates = [
  { name: 'Shartnoma (Shablon)', icon: FileSignature, color: 'text-blue-600', bg: 'bg-blue-50' },
  { name: 'Hisob-faktura', icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { name: 'Dalolatnoma (Act)', icon: FileCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
  { name: 'Tijorat taklifi', icon: Briefcase, color: 'text-amber-600', bg: 'bg-amber-50' },
];

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hujjatlar va Shablonlar</h1>
          <p className="text-gray-500">Avtomatik generatsiya qilinadigan hujjatlar tizimi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {templates.map((t, i) => (
          <Card key={i} className="p-6 hover:shadow-md transition-all cursor-pointer border-0 shadow-sm">
             <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center mb-4', t.bg)}>
                <t.icon className={cn('h-6 w-6', t.color)} />
             </div>
             <h3 className="font-bold text-gray-900 mb-4">{t.name}</h3>
             <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="h-3 w-3 mr-2" />
                  Ko'rish
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Download className="h-3 w-3 mr-2" />
                  Yuklash
                </Button>
             </div>
          </Card>
        ))}
      </div>

      <Card title="Oxirgi generatsiya qilingan hujjatlar">
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
               <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-6 py-4 font-semibold text-gray-900">Hujjat nomi</th>
                    <th className="px-6 py-4 font-semibold text-gray-900">Mijoz</th>
                    <th className="px-6 py-4 font-semibold text-gray-900">Sana</th>
                    <th className="px-6 py-4 font-semibold text-gray-900">Xodim</th>
                    <th className="px-6 py-4 font-semibold text-gray-900"></th>
                  </tr>
               </thead>
               <tbody>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                       <td className="px-6 py-4 flex items-center">
                          <FileText className="h-4 w-4 mr-3 text-gray-400" />
                          <span className="font-medium text-gray-900">Shartnoma #ID-2026-00{42 + i}</span>
                       </td>
                       <td className="px-6 py-4 text-gray-600 italic">Mijoz {10 + i}</td>
                       <td className="px-6 py-4 text-gray-500">20.10.2026</td>
                       <td className="px-6 py-4 text-gray-500">Sanjar Karimov</td>
                       <td className="px-6 py-4 text-right">
                          <button className="p-2 hover:bg-gray-100 rounded-lg text-blue-600"><Printer className="h-4 w-4" /></button>
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


