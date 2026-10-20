/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Clock, 
  User, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  MessageSquare,
  Paperclip,
  Share2,
  AlertCircle
} from 'lucide-react';
import { ordersApi } from '@/api/orders.api';
import { clientsApi } from '@/api/clients.api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '@/components/orders/StatusBadge';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { OrderStatus } from '@/types';

const statusWorkflow: OrderStatus[] = [
  'YANGI', 
  'NARX_HISOBLANDI', 
  'DIZAYNDA', 
  'TASDIQDA', 
  'ISHLAB_CHIQARISHDA', 
  'TAYYOR', 
  'ORNATISHDA', 
  'YAKUNLANDI'
];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getOrderById(id!),
    enabled: !!id,
  });

  const { data: client } = useQuery({
    queryKey: ['client', order?.clientId],
    queryFn: () => clientsApi.getClientById(order!.clientId),
    enabled: !!order?.clientId,
  });

  const statusMutation = useMutation({
    mutationFn: ({ status }: { status: OrderStatus }) => ordersApi.updateStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 animate-pulse text-gray-400">Yuklanmoqda...</div>;
  if (!order) return <div className="text-center py-20 text-gray-500">Buyurtma topilmadi.</div>;

  const currentStatusIndex = statusWorkflow.indexOf(order.status);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/orders')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{order.number}</h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-sm text-gray-500 mt-1">Sana: {formatDate(order.createdAt)} • Manba: {order.source}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
            Tasdiqlash havolasi
          </Button>
          <Button variant="primary">
            To'lov qo'shish
          </Button>
        </div>
      </div>

      {/* Stepper */}
      <Card className="p-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 z-0" />
          <div 
            className="absolute top-1/2 left-0 h-0.5 bg-blue-500 -translate-y-1/2 transition-all duration-500 z-0" 
            style={{ width: `${(currentStatusIndex / (statusWorkflow.length - 1)) * 100}%` }}
          />
          {statusWorkflow.map((status, idx) => {
            const isCompleted = idx < currentStatusIndex;
            const isCurrent = idx === currentStatusIndex;
            return (
              <div key={status} className="relative z-10 flex flex-col items-center group">
                <div 
                  className={cn(
                    'h-8 w-8 rounded-full border-2 flex items-center justify-center transition-colors',
                    isCompleted ? 'bg-blue-500 border-blue-500 text-white' : 
                    isCurrent ? 'bg-white border-blue-500 text-blue-500' : 
                    'bg-white border-gray-200 text-gray-300 group-hover:border-gray-300'
                  )}
                  onClick={() => statusMutation.mutate({ status })}
                  role="button"
                >
                  {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-xs font-bold">{idx + 1}</span>}
                </div>
                <span className={cn(
                  'absolute top-10 whitespace-nowrap text-[10px] font-bold uppercase tracking-tighter text-center max-w-[80px]',
                  isCurrent ? 'text-blue-600' : 'text-gray-400'
                )}>
                  {status.replace(/_/g, ' ')}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-16 flex justify-center">
            {order.status !== 'YAKUNLANDI' && (
              <Button 
                isLoading={statusMutation.isPending}
                onClick={() => statusMutation.mutate({ status: statusWorkflow[currentStatusIndex + 1] })}
              >
                Keyingi statusga o'tkazish: {statusWorkflow[currentStatusIndex + 1]?.replace(/_/g, ' ')}
              </Button>
            )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Mahsulotlar">
            <div className="divide-y divide-gray-100">
              {order.items.map((item, i) => (
                <div key={i} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-900">{item.productType}</p>
                      <p className="text-sm text-gray-500">{item.widthCm}x{item.heightCm} cm ({item.areaM2} m²)</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline">{item.materialId}</Badge>
                        {item.finishing.map(f => <Badge key={f} variant="default">{f}</Badge>)}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(item.total)}</p>
                      <p className="text-xs text-gray-500">{item.quantity} dona x {formatCurrency(item.unitPrice)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-gray-100 flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">To'langan: {formatCurrency(order.paidAmount)}</p>
                <p className="text-sm font-bold text-red-600">Qarz: {formatCurrency(order.totalAmount - order.paidAmount)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 uppercase font-bold tracking-wider">Umumiy summa</p>
                <p className="text-3xl font-black text-blue-600">{formatCurrency(order.totalAmount)}</p>
              </div>
            </div>
          </Card>

          <Card title="Dizayn variantlari">
             <div className="grid grid-cols-2 gap-4">
                <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer">
                  <div className="text-center p-4">
                    <Paperclip className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-600">Dizayn yuklash (v{order.revisionCount + 1})</p>
                  </div>
                </div>
                {order.revisionCount > 0 && (
                  <div className="aspect-square bg-gray-50 border border-gray-100 rounded-xl overflow-hidden relative group">
                    <img src="https://placehold.co/400x400/2563eb/white?text=Dizayn+v1" alt="Design" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <Button size="sm">Ko'rish</Button>
                    </div>
                    <div className="absolute top-2 left-2">
                       <Badge variant="success">TASDIQLANGAN</Badge>
                    </div>
                  </div>
                )}
             </div>
          </Card>

          <Card title="Timeline / Tarix">
             <div className="space-y-6">
                <div className="flex space-x-4">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 w-0.5 bg-gray-100 my-1" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Status o'zgardi: {order.status}</p>
                    <p className="text-xs text-gray-500">{formatDate(order.statusChangedAt)} • Sanjar Karimov</p>
                  </div>
                </div>
                <div className="flex space-x-4">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-amber-600" />
                    </div>
                  </div>
                  <div className="flex-1 bg-amber-50 p-3 rounded-lg border border-amber-100">
                    <p className="text-sm text-amber-900 font-medium italic">"Mijoz shoshiltiryapti, dizaynni bugun bitirish kerak."</p>
                    <p className="text-[10px] text-amber-700 mt-1 uppercase font-bold">Ichki izoh • 10:45</p>
                  </div>
                </div>
             </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Mijoz ma'lumotlari">
            {client && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-bold text-gray-900">{client.name}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{client.type}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="h-4 w-4 mr-3 text-gray-400" />
                    {client.contactPerson || 'Mas\'ul xodim yo\'q'}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-3 text-gray-400" />
                    {client.phones[0]}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-3 text-gray-400" />
                    {client.address || 'Manzil ko\'rsatilmagan'}
                  </div>
                </div>
                <Button variant="outline" className="w-full text-xs" size="sm">Mijoz kartasi</Button>
              </div>
            )}
          </Card>

          <Card title="O'rnatish ishlari">
             {order.needsInstallation ? (
               <div className="space-y-4">
                  <div className="flex items-start space-x-3 bg-blue-50 p-3 rounded-lg border border-blue-100 text-blue-800">
                    <MapPin className="h-5 w-5 mt-0.5" />
                    <p className="text-xs font-medium leading-relaxed">{order.installationAddress}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500">
                    <span>Deadline:</span>
                    <span className="text-red-600">{formatDate(order.deadline)}</span>
                  </div>
                  <Button variant="outline" className="w-full" size="sm">O'rnatuvchilarni biriktirish</Button>
               </div>
             ) : (
               <p className="text-sm text-gray-500 text-center py-4">O'rnatish talab qilinmaydi.</p>
             )}
          </Card>

          {order.status === 'TASDIQDA' && (
            <Card className="bg-amber-50 border-amber-200">
               <div className="flex items-center space-x-3 text-amber-800 mb-3">
                  <AlertCircle className="h-5 w-5" />
                  <p className="font-bold">SLA Ogohlantirish</p>
               </div>
               <p className="text-xs text-amber-700 leading-relaxed">Ushbu buyurtma 24 soatdan beri mijoz tasdig'ini kutmoqda. Iltimos, menejer bilan bog'laning.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
