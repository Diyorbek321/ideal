import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { requestsApi } from '@/api';
import type { RequestStatus } from '@/types';
import { useUser } from '@/lib/auth';
import { REQUEST_STATUS_LABELS } from '@/lib/labels';
import { Card } from '@/components/ui/Card';
import { ErrorState, Loading, PageHeader } from '@/components/ui/States';
import { RequestForm } from '@/components/requests/RequestForm';
import { RequestList } from '@/components/requests/RequestList';
import { GiveAdvanceCard } from '@/components/requests/GiveAdvanceCard';
import { AdvancesListCard } from '@/components/requests/AdvancesListCard';
import { cn } from '@/lib/utils';

function MyRequests() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['requests', 'mine'], queryFn: requestsApi.mine });
  return (
    <>
      <RequestForm />
      <Card title="Mening so'rovlarim" description="Javob Telegram'ga ham keladi (bot ulangan bo'lsa)">
        {isLoading ? <Loading rows={3} /> : error || !data ? <ErrorState error={error} onRetry={refetch} /> : <RequestList items={data} mode="mine" />}
      </Card>
    </>
  );
}

const FILTERS: Array<RequestStatus | 'ALL'> = ['PENDING', 'APPROVED', 'REJECTED', 'ALL'];

function ReviewRequests({ advanceOnly = false }: { advanceOnly?: boolean }) {
  const [status, setStatus] = React.useState<RequestStatus | 'ALL'>('PENDING');
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['requests', 'all', status],
    queryFn: () => requestsApi.all(status === 'ALL' ? undefined : status),
  });
  return (
    <Card title={advanceOnly ? 'Avans so\'rovlari' : 'Xodimlar so\'rovlari'}
      description={advanceOnly
        ? 'Tasdiqlansa avans shu oy oyligidan ushlanadi. Javob va davomat e\'tirozlarini direktor ko\'radi'
        : 'Tasdiqlansa darhol kuchga kiradi: javob kunlari sababli bo\'ladi, avans oylik daftariga yoziladi, e\'tirozda belgi olib tashlanadi'}>
      <div className="mt-2 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f} type="button" onClick={() => setStatus(f)}
            className={cn('rounded-full px-3 py-1 text-sm ring-1', status === f ? 'bg-gray-900 text-white ring-gray-900' : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50')}>
            {f === 'ALL' ? 'Hammasi' : REQUEST_STATUS_LABELS[f]}
          </button>
        ))}
      </div>
      <div className="mt-2">
        {isLoading ? <Loading rows={4} /> : error || !data ? <ErrorState error={error} onRetry={refetch} /> : <RequestList items={data} mode="review" />}
      </div>
    </Card>
  );
}

export default function RequestsPage() {
  const user = useUser();
  const director = user.role === 'ADMIN';
  const manager = user.role === 'MANAGER';
  return (
    <div className="space-y-6">
      <PageHeader title="So'rovlar" subtitle={director ? 'Javob, ta\'til, avans va davomatga e\'tirozlar' : 'Javob yoki ta\'til, avans so\'rash, davomatga e\'tiroz'} />
      {(director || manager) && <GiveAdvanceCard />}
      {(director || manager) && <AdvancesListCard />}
      {director ? <ReviewRequests /> : (<>
        {manager && <ReviewRequests advanceOnly />}
        <MyRequests />
      </>)}
    </div>
  );
}
