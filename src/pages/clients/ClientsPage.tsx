import React from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Building2, FileSpreadsheet, GraduationCap, Phone, Plus, Search, Shield, User } from 'lucide-react';
import { clientsApi } from '@/api';
import type { ClientType } from '@/types';
import { CLIENT_TYPE_LABELS, SOURCE_LABELS, options } from '@/lib/labels';
import { cn, formatCurrency, formatPhone } from '@/lib/utils';
import { ClientFormModal } from '@/components/clients/ClientFormModal';
import { ClientImportModal } from '@/components/clients/ClientImportModal';
import { useDebounced } from '@/components/clients/ClientPicker';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Empty, ErrorState, Loading, PageHeader } from '@/components/ui/States';

const ICONS: Record<ClientType, typeof User> = {
  BUDGET: Building2, MILITARY: Shield, SCHOOL: GraduationCap, COMPANY: Building2, INDIVIDUAL: User,
};
const COLORS: Record<ClientType, string> = {
  BUDGET: 'bg-blue-50 text-blue-600', MILITARY: 'bg-red-50 text-red-600', SCHOOL: 'bg-amber-50 text-amber-600',
  COMPANY: 'bg-emerald-50 text-emerald-600', INDIVIDUAL: 'bg-gray-50 text-gray-600',
};

export default function ClientsPage() {
  const [search, setSearch] = React.useState('');
  const [type, setType] = React.useState('');
  const [withDebt, setWithDebt] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [creating, setCreating] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const q = useDebounced(search);

  React.useEffect(() => setPage(1), [q, type, withDebt]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['clients', q, type, withDebt, page],
    queryFn: () => clientsApi.list({ search: q || undefined, type: type || undefined, withDebt: withDebt || undefined, page, limit: 30 }),
    placeholderData: keepPreviousData,
  });
  const pages = data ? Math.max(1, Math.ceil(data.meta.total / data.meta.limit)) : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mijozlar"
        subtitle={data ? `Jami: ${data.meta.total}` : undefined}
        actions={(
          <>
            <Button variant="outline" onClick={() => setImporting(true)}><FileSpreadsheet className="mr-2 h-4 w-4" />Excel'dan import</Button>
            <Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" />Yangi mijoz</Button>
          </>
        )}
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Nomi, STIR yoki telefon..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={type} onChange={(e) => setType(e.target.value)} placeholder="Barcha turlar" options={options(CLIENT_TYPE_LABELS)} />
        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={withDebt} onChange={(e) => setWithDebt(e.target.checked)} />Faqat qarzdorlar</label>
      </div>

      {error ? <ErrorState error={error} onRetry={refetch} /> : isLoading ? <Loading rows={6} /> : !data?.data.length ? <Card><Empty text="Mijozlar topilmadi" /></Card> : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.data.map((c) => {
            const Icon = ICONS[c.type];
            return (
              <Link key={c.id} to={`/clients/${c.id}`}>
                <Card className="group relative h-full overflow-hidden p-6 transition-shadow hover:shadow-md">
                  <div className="mb-4 flex items-start justify-between">
                    <div className={cn('rounded-2xl p-3', COLORS[c.type])}><Icon className="h-6 w-6" /></div>
                    {!!c.debt && <Badge variant="error">Qarz: {formatCurrency(c.debt)}</Badge>}
                  </div>
                  <h3 className="mb-1 truncate font-bold text-gray-900">{c.name}</h3>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-[10px] font-bold uppercase">{CLIENT_TYPE_LABELS[c.type]}</Badge>
                    <span className="text-[10px] font-bold uppercase text-gray-400">{SOURCE_LABELS[c.source]}</span>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-gray-50 pt-4 text-xs text-gray-500">
                    <span className="flex items-center"><Phone className="mr-2 h-3 w-3" />{formatPhone(c.phones[0])}</span>
                    <span>{c.ordersCount ?? 0} buyurtma · {formatCurrency(c.totalOrdered)}</span>
                  </div>
                  <div className="absolute right-0 top-0 h-1 w-0 bg-blue-500 transition-all group-hover:w-full" />
                </Card>
              </Link>
            );
          })}
        </div>
      )}
      {pages > 1 && (
        <div className="flex justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Oldingi</Button>
          <span className="self-center text-sm text-gray-600">{page} / {pages}</span>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Keyingi</Button>
        </div>
      )}
      <ClientFormModal open={creating} onClose={() => setCreating(false)} />
      <ClientImportModal open={importing} onClose={() => setImporting(false)} />
    </div>
  );
}
