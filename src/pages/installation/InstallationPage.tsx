import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckSquare, Hand, Truck } from 'lucide-react';
import { installationsApi } from '@/api';
import { INSTALL_STATUS_LABELS, PROBLEM_LABELS, options } from '@/lib/labels';
import { useUser } from '@/lib/auth';
import { formatDateTime, toDateInput } from '@/lib/utils';
import { InstallJobCard } from '@/components/installation/InstallJobCard';
import { Badge } from '@/components/ui/Badge';
import { MyKpiCard } from '@/components/kpi/MyKpiCard';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Empty, ErrorState, Loading, PageHeader } from '@/components/ui/States';

// Ustanovkachi uchun telefon ekrani
function InstallerView() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['installations', 'my-today'],
    queryFn: installationsApi.myToday,
    refetchInterval: 60_000,
  });
  const { data: pool } = useQuery({
    queryKey: ['installations', 'open'],
    queryFn: installationsApi.open,
    refetchInterval: 60_000,
  });
  if (isLoading) return <Loading />;
  if (error || !data) return <ErrorState error={error} onRetry={refetch} />;
  const open = data.filter((i) => i.status !== 'DONE');

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">O'rnatish ishlari</h1>
          <p className="text-gray-500">Bugungi vazifalar</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-600"><Truck className="h-6 w-6" /></div>
      </div>
      <MyKpiCard />
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-black text-brand-600">{open.length}</p>
          <p className="text-[10px] font-bold uppercase text-gray-400">Qolgan ishlar</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-black text-emerald-600">{data.length - open.length}</p>
          <p className="text-[10px] font-bold uppercase text-gray-400">Bajarildi</p>
        </div>
      </div>
      {!!pool?.length && (
        <section className="space-y-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900"><Hand className="h-5 w-5 text-brand-600" />Ochiq ishlar ({pool.length})</h2>
            <p className="text-sm text-gray-500">Mahsulot tayyor. Borsangiz "Men boraman"ni bosing — bir necha kishi qo'shilishi mumkin</p>
          </div>
          {pool.map((job) => <InstallJobCard key={job.id} job={job} variant="open" />)}
        </section>
      )}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Mening ishlarim</h2>
        {data.map((job) => <InstallJobCard key={job.id} job={job} />)}
        {data.length === 0 && <Empty text="Sizda hozircha ish yo'q" icon={CheckSquare} />}
      </section>
    </div>
  );
}

// Menejer: kunlar bo'yicha jadval
function ManagerView() {
  const [from, setFrom] = React.useState(toDateInput(new Date()));
  const [to, setTo] = React.useState(toDateInput(new Date(Date.now() + 7 * 86_400_000)));
  const [status, setStatus] = React.useState('');
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['installations', from, to, status],
    queryFn: () => installationsApi.list({
      from: new Date(`${from}T00:00:00`).toISOString(),
      to: new Date(`${to}T23:59:59`).toISOString(),
      status: status || undefined,
    }),
    enabled: !!from && !!to,
  });

  const { data: pool } = useQuery({ queryKey: ['installations', 'open'], queryFn: installationsApi.open });
  const undated = (pool ?? []).filter((i) => !i.scheduledAt);

  const byDay = new Map<string, NonNullable<typeof data>>();
  for (const i of data ?? []) {
    if (!i.scheduledAt) continue;
    const day = toDateInput(new Date(i.scheduledAt));
    byDay.set(day, [...(byDay.get(day) ?? []), i]);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="O'rnatish jadvali" subtitle="Rejalashtirish buyurtma sahifasidan amalga oshiriladi" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Input type="date" label="Dan" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" label="Gacha" value={to} onChange={(e) => setTo(e.target.value)} />
        <Select label="Holat" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Barchasi" options={options(INSTALL_STATUS_LABELS)} />
      </div>
      {undated.length > 0 && (
        <Card title={`Sanasi kelishilmagan — ${undated.length} ta`} description="Mahsulot tayyor; ustanovkachilar o'zlari qo'shiladi yoki buyurtma sahifasida sana va jamoani belgilang">
          <div className="space-y-3">
            {undated.map((i) => (
              <div key={i.id} className="flex flex-col gap-1 rounded-lg border border-gray-100 p-3 text-sm md:flex-row md:items-center md:justify-between">
                <div>
                  <Link to={`/orders/${i.orderId}`} className="font-bold text-brand-600 hover:underline">{i.order?.number}</Link>
                  <span className="ml-2 text-gray-900">{i.order?.client.name}</span>
                  <p className="text-xs text-gray-500">{i.address}</p>
                </div>
                <span className="text-xs text-gray-500">{i.team.length ? i.team.map((t) => t.fullName).join(', ') : 'Hali hech kim qo\'shilmagan'}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
      {error ? <ErrorState error={error} onRetry={refetch} /> : isLoading ? <Loading /> : byDay.size === 0 ? <Card><Empty text="Bu davrda o'rnatish yo'q" /></Card> : (
        [...byDay.entries()].map(([day, list]) => (
          <Card key={day} title={`${day.split('-').reverse().join('.')} — ${list.length} ta`}>
            <div className="space-y-3">
              {list.map((i) => (
                <div key={i.id} className="flex flex-col gap-2 rounded-lg border border-gray-100 p-3 text-sm md:flex-row md:items-center md:justify-between">
                  <div>
                    <Link to={`/orders/${i.orderId}`} className="font-bold text-brand-600 hover:underline">{i.order?.number}</Link>
                    <span className="ml-2 text-gray-900">{i.order?.client.name}</span>
                    <p className="text-xs text-gray-500">{formatDateTime(i.scheduledAt)} · {i.address}</p>
                    <p className="text-xs text-gray-500">{i.team.map((t) => t.fullName).join(', ')}</p>
                    {i.problems.filter((p) => !p.resolved).map((p) => (
                      <p key={p.id} className="mt-1 text-xs font-medium text-red-600">{PROBLEM_LABELS[p.type]}: {p.description}</p>
                    ))}
                  </div>
                  <Badge variant={i.status === 'DONE' ? 'success' : i.status === 'PROBLEM' ? 'error' : 'info'}>{INSTALL_STATUS_LABELS[i.status]}</Badge>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

export default function InstallationPage() {
  const user = useUser();
  return user.role === 'INSTALLER' ? <InstallerView /> : <ManagerView />;
}
