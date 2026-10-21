import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Check, Circle, Phone, Truck } from 'lucide-react';
import { publicApi } from '@/api';
import type { OrderStatus, TrackInfo } from '@/types';
import { STATUS_LABELS } from '@/lib/labels';
import { cn, fileUrl, formatCurrency, formatDate, formatDateTime, formatPhone } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/States';

// Mijoz ko'radigan bosqichlar: kerak bo'lmagan bosqichlar (dizayn, o'rnatish) chiqarilmaydi
function stepsFor(t: TrackInfo): OrderStatus[] {
  const all: OrderStatus[] = ['YANGI', 'DIZAYNDA', 'TASDIQDA', 'ISHLAB_CHIQARISHDA', 'TAYYOR', 'ORNATISHDA', 'YAKUNLANDI'];
  return all.filter((s) => (t.needsDesign || (s !== 'DIZAYNDA' && s !== 'TASDIQDA')) && (t.needsInstallation || s !== 'ORNATISHDA'));
}

const CLIENT_TEXT: Partial<Record<OrderStatus, string>> = {
  YANGI: 'Buyurtma qabul qilindi',
  NARX_HISOBLANDI: 'Buyurtma qabul qilindi',
  DIZAYNDA: 'Dizayn tayyorlanmoqda',
  TASDIQDA: 'Dizayn sizning tasdig\'ingizni kutmoqda',
  ISHLAB_CHIQARISHDA: 'Ishlab chiqarilmoqda',
  TAYYOR: 'Tayyor',
  ORNATISHDA: 'O\'rnatilmoqda',
  YETKAZISHDA: 'Yetkazilmoqda',
  YAKUNLANDI: 'Topshirildi',
  BEKOR_QILINDI: 'Bekor qilingan',
};

export default function TrackPage() {
  const { token = '' } = useParams<{ token: string }>();
  const { data: t, isLoading, error } = useQuery({ queryKey: ['track', token], queryFn: () => publicApi.track(token), retry: false, refetchInterval: 60_000 });

  if (isLoading) return <div className="flex min-h-screen items-center justify-center text-gray-400">Yuklanmoqda...</div>;
  if (error || !t) return <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4"><Card className="w-full max-w-md p-8"><ErrorState error={error} /></Card></div>;

  const steps = stepsFor(t);
  const effective: OrderStatus = t.status === 'NARX_HISOBLANDI' ? 'YANGI' : t.status === 'YETKAZISHDA' ? 'ORNATISHDA' : t.status;
  const current = steps.indexOf(effective);
  const reachedAt = (s: OrderStatus) => t.steps.filter((x) => x.status === s).at(-1)?.at;
  const company = t.company?.name ?? 'Ideal Dizayn';

  return (
    <div className="min-h-screen bg-gray-100 pb-12">
      <header className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          {t.company?.logoUrl ? <img src={fileUrl(t.company.logoUrl)} alt={company} className="h-8" /> : <span className="text-xl font-black text-brand-600">{company}</span>}
          <span className="text-sm font-bold text-gray-900">{t.number}</span>
        </div>
      </header>

      <main className="mx-auto mt-6 max-w-lg space-y-4 px-4">
        <Card className="p-6 text-center">
          <p className="text-sm text-gray-500">{t.clientName}</p>
          <h1 className={cn('mt-1 text-2xl font-black', t.status === 'BEKOR_QILINDI' ? 'text-red-600' : 'text-gray-900')}>{CLIENT_TEXT[t.status] ?? STATUS_LABELS[t.status]}</h1>
          {t.deadline && t.status !== 'YAKUNLANDI' && <p className="mt-2 flex items-center justify-center text-sm text-gray-500"><Calendar className="mr-1 h-4 w-4" />Taxminiy muddat: {formatDate(t.deadline)}</p>}
          {t.approvalUrl && (
            <a href={t.approvalUrl} className="mt-4 block"><Button className="h-12 w-full bg-emerald-600 hover:bg-emerald-700">Dizaynni ko'rish va tasdiqlash</Button></a>
          )}
          {t.installation && (
            <p className="mt-4 flex items-center justify-center rounded-lg bg-brand-50 p-3 text-sm font-medium text-brand-800">
              <Truck className="mr-2 h-4 w-4" />O'rnatish: {formatDateTime(t.installation.scheduledAt)}
            </p>
          )}
        </Card>

        {t.status !== 'BEKOR_QILINDI' && (
          <Card className="p-6">
            <ol className="space-y-5">
              {steps.map((s, i) => {
                const done = i < current || t.status === 'YAKUNLANDI';
                const active = i === current && t.status !== 'YAKUNLANDI';
                const at = reachedAt(s);
                return (
                  <li key={s} className="flex items-start gap-3">
                    <span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                      done ? 'bg-emerald-500 text-white' : active ? 'bg-brand-400 text-gray-900' : 'bg-gray-100 text-gray-300')}>
                      {done ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3" fill="currentColor" />}
                    </span>
                    <div>
                      <p className={cn('text-sm', done || active ? 'font-bold text-gray-900' : 'text-gray-400')}>{CLIENT_TEXT[s]}</p>
                      {at && (done || active) && <p className="text-xs text-gray-400">{formatDateTime(at)}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        )}

        <Card className="p-6">
          {t.items.map((it, i) => (
            <p key={i} className="text-sm text-gray-900">{it.productType} — {it.widthCm}×{it.heightCm} sm × {it.quantity}</p>
          ))}
          <div className="mt-4 space-y-1 border-t border-gray-100 pt-4 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Jami</span><b>{formatCurrency(t.totalAmount)}</b></div>
            <div className="flex justify-between"><span className="text-gray-500">To'langan</span><span className="text-emerald-700">{formatCurrency(t.paidAmount)}</span></div>
            {t.remainingAmount > 0 && <div className="flex justify-between"><span className="text-gray-500">Qoldiq</span><b className="text-red-600">{formatCurrency(t.remainingAmount)}</b></div>}
          </div>
        </Card>

        {t.company?.phone && (
          <a href={`tel:${t.company.phone}`} className="flex items-center justify-center rounded-2xl bg-white p-4 font-bold text-brand-600 shadow-sm">
            <Phone className="mr-2 h-4 w-4" />{formatPhone(t.company.phone)}
          </a>
        )}
      </main>
    </div>
  );
}
