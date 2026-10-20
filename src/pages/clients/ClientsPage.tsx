/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Building2, 
  GraduationCap, 
  User, 
  Shield,
  MoreVertical
} from 'lucide-react';
import { clientsApi } from '@/api/clients.api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatDate, cn } from '@/lib/utils';
import { ClientType } from '@/types';

const typeIcons: Record<ClientType, any> = {
  BUDGET: Building2,
  MILITARY: Shield,
  SCHOOL: GraduationCap,
  COMPANY: Building2,
  INDIVIDUAL: User,
};

const typeLabels: Record<ClientType, string> = {
  BUDGET: 'Byudjet',
  MILITARY: 'Harbiy',
  SCHOOL: 'Maktab',
  COMPANY: 'Kompaniya',
  INDIVIDUAL: 'Jismoniy shaxs',
};

export default function ClientsPage() {
  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: clientsApi.getClients,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mijozlar Bazasi</h1>
          <p className="text-gray-500">Mijozlar ro'yxati va buyurtmalar tarixi</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Yangi mijoz
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Mijoz nomi, STIR yoki telefon bo'yicha qidiruv..." className="pl-10" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse h-40" />
          ))
        ) : clients?.map((client) => {
          const Icon = typeIcons[client.type];
          return (
            <Card key={client.id} className="p-6 hover:shadow-md transition-shadow group relative overflow-hidden">
               <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    'p-3 rounded-2xl',
                    client.type === 'BUDGET' ? 'bg-blue-50 text-blue-600' :
                    client.type === 'MILITARY' ? 'bg-red-50 text-red-600' :
                    client.type === 'INDIVIDUAL' ? 'bg-gray-50 text-gray-600' :
                    'bg-emerald-50 text-emerald-600'
                  )}>
                     <Icon className="h-6 w-6" />
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                     <MoreVertical className="h-5 w-5" />
                  </button>
               </div>
               
               <div>
                  <h3 className="font-bold text-gray-900 mb-1 truncate pr-8">{client.name}</h3>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-[10px] uppercase font-bold">{typeLabels[client.type]}</Badge>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">{client.source}</span>
                  </div>
               </div>

               <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center text-xs text-gray-500">
                     <Phone className="h-3 w-3 mr-2" />
                     {client.phones[0]}
                  </div>
                  <p className="text-[10px] text-gray-400">{formatDate(client.createdAt)}</p>
               </div>

               <div className="absolute top-0 right-0 h-2 w-0 bg-blue-500 transition-all group-hover:w-full" />
            </Card>
          );
        })}
      </div>
    </div>
  );
}


