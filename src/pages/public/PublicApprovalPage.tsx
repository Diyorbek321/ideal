/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { Check, X, Download, MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';

export default function PublicApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = React.useState<'view' | 'success' | 'revision'>('view');

  // Mock data for the specific approval token
  const data = {
    orderNumber: 'ID-2026-0042',
    clientName: 'O\'zbekiston Milliy Gvardiyasi',
    totalAmount: 1250000,
    items: [
      { name: 'Hajmli harflar (Ideal Dizayn)', size: '120x40 cm', price: 1250000 }
    ],
    designUrl: 'https://placehold.co/800x600/2563eb/white?text=Sizning+Dizayningiz+v1',
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-12">
          <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Tasdiqlandi!</h1>
          <p className="text-gray-600 mb-8">Dizayn muvaffaqiyatli tasdiqlandi. Buyurtma ishlab chiqarishga yo'naltirildi.</p>
          <p className="text-sm text-gray-400 italic">"Ideal Dizayn" jamoasi sizga rahmat aytadi!</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <header className="bg-white border-b border-gray-200 py-4 px-6 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
             <span className="text-xl font-black text-blue-600">Ideal Dizayn</span>
             <Badge variant="outline">TASDIQLASH</Badge>
          </div>
          <p className="text-sm font-bold text-gray-900">{data.orderNumber}</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto mt-8 px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Dizaynni ko'zdan kechiring" description="Rasmni kattalashtirish uchun ustiga bosing">
            <div className="rounded-xl border border-gray-100 overflow-hidden bg-white shadow-inner">
               <img src={data.designUrl} alt="Design Preview" className="w-full h-auto cursor-zoom-in" />
            </div>
            <div className="flex justify-center mt-6">
               <Button variant="outline">
                 <Download className="h-4 w-4 mr-2" />
                 Dizaynni yuklab olish (PDF)
               </Button>
            </div>
          </Card>

          {step === 'revision' && (
            <Card className="border-amber-200 bg-amber-50">
               <h3 className="font-bold text-amber-900 mb-4 flex items-center">
                 <MessageSquare className="h-5 w-5 mr-2" />
                 O'zgartirishlar kiriting
               </h3>
               <textarea 
                 className="w-full p-4 border border-amber-200 rounded-xl focus:ring-amber-500 focus:border-amber-500 min-h-[120px]"
                 placeholder="Dizaynda nimalarni o'zgartirish kerak? (masalan: shriftni kattalashtiring, rangini o'zgartiring...)"
               />
               <div className="flex justify-end space-x-3 mt-4">
                  <Button variant="ghost" onClick={() => setStep('view')}>Bekor qilish</Button>
                  <Button variant="primary" className="bg-amber-600 hover:bg-amber-700" onClick={() => setStep('success')}>Yuborish</Button>
               </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Buyurtma tafsilotlari">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold tracking-widest mb-1">Mijoz:</p>
                <p className="font-bold text-gray-900">{data.clientName}</p>
              </div>
              <div className="pt-4 border-t border-gray-50">
                {data.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.size}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(item.price)}</p>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-gray-100 flex justify-between items-end">
                 <p className="text-xs font-black text-gray-400 uppercase">Jami:</p>
                 <p className="text-2xl font-black text-blue-600">{formatCurrency(data.totalAmount)}</p>
              </div>
            </div>
          </Card>

          {step === 'view' && (
            <div className="grid grid-cols-1 gap-4">
              <Button 
                variant="primary" 
                size="lg" 
                className="h-16 text-lg bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200"
                onClick={() => setStep('success')}
              >
                <Check className="h-6 w-6 mr-2" />
                Tasdiqlayman
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="h-16 text-lg border-amber-200 text-amber-700 hover:bg-amber-50"
                onClick={() => setStep('revision')}
              >
                <X className="h-6 w-6 mr-2" />
                O'zgartirish kerak
              </Button>
            </div>
          )}

          <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
             <h4 className="font-bold text-blue-900 mb-2">Savollar bormi?</h4>
             <p className="text-sm text-blue-700 mb-4">Agar sizda dizayn yoki buyurtma bo'yicha savollar bo'lsa, menejer bilan bog'laning:</p>
             <a href="tel:+998901234567" className="flex items-center justify-center p-3 bg-white rounded-xl font-bold text-blue-600 shadow-sm">
               +998 90 123 45 67
             </a>
          </div>
        </div>
      </main>
    </div>
  );
}
