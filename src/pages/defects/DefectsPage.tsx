import React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { defectsApi } from '@/api';
import type { Defect, DefectStage } from '@/types';
import { ROLE_LABELS, options } from '@/lib/labels';
import { useUser } from '@/lib/auth';
import { cn, fileUrl, formatCurrency, formatDate } from '@/lib/utils';
import { MonthInput, periodLabel } from '@/components/reports/ReportToolbar';
import { Stat } from '@/components/reports/charts';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Empty, ErrorState, Loading, PageHeader } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { DefectFormModal, STAGE_LABELS } from '@/components/defects/DefectFormModal';

const STAGE_TONE: Record<DefectStage, string> = {
  DESIGN: 'bg-violet-50 text-violet-700',
  PRINT: 'bg-sky-50 text-sky-700',
  PRODUCTION: 'bg-amber-50 text-amber-700',
  INSTALLATION: 'bg-red-50 text-red-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

function monthBounds(ym: string) {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  return { from: new Date(y, m - 1, 1).toISOString(), to: new Date(y, m, 1).toISOString() };
}

/**
 * Ishchilar braki: kim, qachon, qaysi bosqichda xato qildi, korxonaga qancha zarar bo'ldi
 * va oylikdan qancha ushlandi. Ushlab qolishni faqat direktor belgilaydi.
 */
export default function DefectsPage() {
  const me = useUser();
  const toast = useToast();
  const qc = useQueryClient();
  const now = new Date();
  const [month, setMonth] = React.useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [userId, setUserId] = React.useState('');
  const [stage, setStage] = React.useState<DefectStage | ''>('');
  const [editing, setEditing] = React.useState<Defect | null>(null);
  const [creating, setCreating] = React.useState(false);
  const range = monthBounds(month);

  const list = useQuery({
    queryKey: ['defects', month, userId, stage],
    queryFn: () => defectsApi.list({ ...range, userId: userId || undefined, stage: stage || undefined }),
  });
  // Ishchi filtri uchun — oy bo'yicha barcha brak qilganlar (filtrsiz)
  const monthAll = useQuery({ queryKey: ['defects', month], queryFn: () => defectsApi.list(range) });

  const remove = useMutation({
    mutationFn: defectsApi.remove,
    onSuccess: () => { toast.success('Brak o\'chirildi'); qc.invalidateQueries({ queryKey: ['defects'] }); qc.invalidateQueries({ queryKey: ['payroll'] }); },
    onError: toast.error,
  });

  const canEdit = (d: Defect) => me.role === 'ADMIN' || d.createdById === me.id;
  const d = list.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Brak"
        subtitle={`Ishchilar xatosi va zarar · ${periodLabel(month)}`}
        actions={(
          <div className="flex flex-wrap gap-2">
            <MonthInput value={month} onChange={setMonth} />
            <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Brak yozish</Button>
          </div>
        )}
      />

      {list.isLoading ? <Loading rows={6} /> : list.error || !d ? <ErrorState error={list.error} onRetry={list.refetch} /> : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Braklar soni" value={`${d.totals.count} ta`} />
            <Stat tone="bad" label="Korxona zarari" value={formatCurrency(d.totals.loss)} />
            <Stat label="Oylikdan ushlandi" value={formatCurrency(d.totals.deducted)}
              hint={d.totals.loss ? `Zararning ${Math.round((d.totals.deducted / d.totals.loss) * 100)}%` : undefined} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
            <Card title="Xodimlar bo'yicha" className="lg:col-span-1">
              {d.workers.length === 0 ? <Empty text="Bu oyda brak yo'q" /> : (
                <div className="divide-y divide-gray-50 text-sm">
                  {d.workers.map((w) => (
                    <button key={w.userId} onClick={() => setUserId(userId === w.userId ? '' : w.userId)}
                      className={cn('flex w-full items-center justify-between py-2.5 text-left hover:bg-gray-50', userId === w.userId && 'bg-brand-50')}>
                      <span>
                        <span className="font-medium text-gray-900">{w.fullName}</span>
                        <span className="block text-xs text-gray-500">{w.count} ta brak{w.deducted ? ` · ushlandi ${formatCurrency(w.deducted)}` : ''}</span>
                      </span>
                      <span className="font-bold tabular-nums text-red-600">{formatCurrency(w.loss)}</span>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <Card
              title="Braklar"
              className="lg:col-span-2"
              actions={(
                <div className="flex gap-2">
                  <Select value={userId} onChange={(e) => setUserId(e.target.value)}
                    options={[{ value: '', label: 'Barcha xodimlar' }, ...(monthAll.data?.workers ?? []).map((w) => ({ value: w.userId, label: w.fullName }))]} />
                  <Select value={stage} onChange={(e) => setStage(e.target.value as DefectStage | '')}
                    options={[{ value: '', label: 'Barcha bosqich' }, ...options(STAGE_LABELS)]} />
                </div>
              )}
            >
              {d.items.length === 0 ? (
                <Empty icon={ShieldAlert} text="Brak yozilmagan. Xato pechat, montajda sindirish va boshqalarni «Brak yozish» bilan kiriting" />
              ) : (
                <div className="divide-y divide-gray-100">
                  {d.items.map((x) => (
                    <div key={x.id} className="flex gap-3 py-3">
                      {x.photoUrl && (
                        <a href={fileUrl(x.photoUrl)} target="_blank" rel="noreferrer" className="shrink-0">
                          <img src={fileUrl(x.photoUrl)} alt="Brak rasmi" className="h-16 w-16 rounded-lg object-cover" />
                        </a>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-semibold text-gray-900">{x.user.fullName}</span>
                          <span className="text-xs text-gray-400">{ROLE_LABELS[x.user.role]}</span>
                          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STAGE_TONE[x.stage])}>{STAGE_LABELS[x.stage]}</span>
                          {x.order && <Link to={`/orders/${x.order.id}`} className="text-xs font-bold text-brand-600 hover:underline">{x.order.number}</Link>}
                        </div>
                        <p className="mt-1 text-sm text-gray-700">{x.description}</p>
                        <p className="mt-1 text-xs text-gray-400">{formatDate(x.occurredAt)} · yozdi: {x.createdBy.fullName}</p>
                      </div>
                      <div className="shrink-0 text-right text-sm">
                        <p className="font-bold tabular-nums text-red-600">{formatCurrency(x.lossAmount)}</p>
                        {x.deductAmount > 0 && <p className="text-xs text-gray-600">ushlandi: {formatCurrency(x.deductAmount)}</p>}
                        <div className="mt-1 flex justify-end gap-2">
                          {canEdit(x) && (
                            <button aria-label="Tahrirlash" onClick={() => setEditing(x)} className="text-gray-300 hover:text-gray-700"><Pencil className="h-4 w-4" /></button>
                          )}
                          {me.role === 'ADMIN' && (
                            <button aria-label="O'chirish" className="text-gray-300 hover:text-red-600"
                              onClick={() => window.confirm(`Brakni o'chirasizmi?${x.deductAmount ? ' Oylikdan ushlab qolish ham bekor bo\'ladi.' : ''}`) && remove.mutate(x.id)}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      <DefectFormModal open={creating || !!editing} defect={editing} onClose={() => { setCreating(false); setEditing(null); }} />
    </div>
  );
}
