/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Package, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Plus, 
  AlertTriangle 
} from 'lucide-react';
import { inventoryApi } from '@/api/inventory.api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatCurrency, cn } from '@/lib/utils';

export default function InventoryPage() {
  const { data: materials, isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: inventoryApi.getMaterials,
  });

  const lowStockCount = materials?.filter(m => m.stock <= m.minStock).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ombor va Materiallar</h1>
          <p className="text-gray-500">Materiallar qoldig'i va harakati boshqaruvi</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <ArrowDownLeft className="h-4 w-4 mr-2" />
            Kirim qilish
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Yangi material
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-4 flex items-center space-x-4 bg-white">
          <div className="p-3 bg-blue-50 rounded-full text-blue-600">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Jami turlar</p>
            <p className="text-2xl font-bold text-gray-900">{materials?.length || 0}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center space-x-4 bg-white border-red-100">
          <div className="p-3 bg-red-50 rounded-full text-red-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Kam qolganlar</p>
            <p className="text-2xl font-bold text-red-600">{lowStockCount}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center space-x-4 bg-white">
          <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
            <ArrowUpRight className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Oy davomida kirim</p>
            <p className="text-2xl font-bold text-gray-900">45 600 000 so'm</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
           <div className="relative w-96">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
             <Input placeholder="Material nomini kiriting..." className="pl-10" />
           </div>
           <div className="flex items-center space-x-2">
              <Badge variant="outline" className="cursor-pointer hover:bg-gray-50">Banner</Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-gray-50">Plastik</Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-gray-50">Akril</Badge>
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-4 font-semibold text-gray-900">Material nomi</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Kategoriya</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Qoldiq</th>
                <th className="px-6 py-4 font-semibold text-gray-900">O'lchov birligi</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Tannarx (m2/dona)</th>
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
              ) : materials?.map((m) => (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{m.name}</td>
                  <td className="px-6 py-4 text-gray-500">{m.category}</td>
                  <td className="px-6 py-4">
                     <div className="flex items-center space-x-2">
                        <span className={cn(
                          'font-bold',
                          m.stock <= m.minStock ? 'text-red-600' : 'text-gray-900'
                        )}>{m.stock}</span>
                        {m.stock <= m.minStock && <Badge variant="error" className="scale-75">KAM</Badge>}
                     </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 uppercase font-medium">{m.unit}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{formatCurrency(m.purchasePrice)}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-blue-600 font-bold hover:underline">Tarix</button>
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
