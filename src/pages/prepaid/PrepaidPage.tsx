import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Landmark } from 'lucide-react';
import { paymentsApi } from '@/api';
import type { ClientType } from '@/types';
import { CLIENT_TYPE_LABELS } from '@/lib/labels';
import { cn, formatCurrency, formatDate, formatPhone } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Empty, ErrorState, Loading, PageHeader } from '@/components/ui/States';
import { Stat } from '@/components/reports/charts';

/**
 * Perechisleniya: oldindan pul o'tkazgan tashkilotlar. Buyurtma ochilganda summa balansdan o'zi ayiriladi,
 * yetmasa qolgani qarz bo'ladi. Yangi pul tushsa — qarzlar eskisidan boshlab yopiladi.
 */
export default function PrepaidPage() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['client-balance', 'list'], queryFn: paymentsApi.prepaidClients });
  const totals = (data ?? []).reduce(
    (t, r) => ({ deposited: t.deposited + r.deposited, used: t.used + r.used, balance: t.balance + r.balance }),
    { deposited: 0, used: 0, balance: 0 },
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Perechisleniya" subtitle="Oldindan to'lov qilgan mijozlar — buyurtmalar shu puldan avtomatik ayiriladi" />
      {isLoading ? <Loading rows={6} /> : error || !data ? <ErrorState error={error} onRetry={refetch} /> : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Jami tushgan" value={formatCurrency(totals.deposited)} />
            <Stat label="Buyurtmalarga ayirilgan" value={formatCurrency(totals.used)} />
            <Stat tone="good" label="Hozir balansda" value={formatCurrency(totals.balance)} hint={`${data.filter((r) => r.balance > 0).length} ta mijozda pul bor`} />
          </div>
          <Card>
            {data.length === 0 ? (
              <Empty icon={Landmark} text="Hali oldindan to'lov yo'q. Mijoz sahifasida «Oldindan to'lov» tugmasi bilan qabul qiling" />
            ) : (
              <div className="-mx-5 overflow-x-auto sm:-mx-6">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-5 py-2 font-semibold sm:px-6">Mijoz</th>
                      <th className="px-2 py-2 text-right font-semibold">Tushgan</th>
                      <th className="px-2 py-2 text-right font-semibold">Ayirilgan</th>
                      <th className="px-2 py-2 text-right font-semibold">Qaytarilgan</th>
                      <th className="px-2 py-2 text-right font-semibold">Qoldiq</th>
                      <th className="px-5 py-2 text-right font-semibold sm:px-6">Oxirgi tushum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((r) => (
                      <tr key={r.clientId} onClick={() => navigate(`/clients/${r.clientId}`)}
                        className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-brand-50">
                        <td className="px-5 py-2.5 sm:px-6">
                          <p className="font-medium text-gray-900">{r.name}</p>
                          <p className="text-xs text-gray-500">{CLIENT_TYPE_LABELS[r.type as ClientType] ?? r.type} · {formatPhone(r.phone)}</p>
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums">{formatCurrency(r.deposited)}</td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-gray-600">{formatCurrency(r.used)}</td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-gray-600">{r.refunded ? formatCurrency(r.refunded) : '—'}</td>
                        <td className={cn('px-2 py-2.5 text-right font-semibold tabular-nums', r.balance > 0 ? 'text-emerald-700' : 'text-gray-400')}>{formatCurrency(r.balance)}</td>
                        <td className="px-5 py-2.5 text-right text-gray-500 sm:px-6">{r.lastDepositAt ? formatDate(r.lastDepositAt) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
