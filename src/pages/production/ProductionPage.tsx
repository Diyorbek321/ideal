import React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Download, Play, Printer } from 'lucide-react';
import { equipmentApi, inventoryApi, productionApi } from '@/api';
import type { EquipmentStatus, QueueTask } from '@/types';
import { EQUIPMENT_STATUS_LABELS, EQUIPMENT_TYPE_LABELS, TASK_STATUS_LABELS, UNIT_LABELS, options } from '@/lib/labels';
import { cn, deadlineText, fileUrl, formatNumber, parseDecimal } from '@/lib/utils';
import { invalidateOrderViews } from '@/lib/queries';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MyKpiCard } from '@/components/kpi/MyKpiCard';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Empty, ErrorState, Loading, PageHeader } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

const EQ_VARIANT: Record<EquipmentStatus, 'success' | 'default' | 'error'> = { WORKING: 'success', IDLE: 'default', REPAIR: 'error' };

function FinishModal({ task, onClose }: { task: QueueTask | null; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [materialId, setMaterialId] = React.useState('');
  const [used, setUsed] = React.useState('');
  const [waste, setWaste] = React.useState('0');
  const { data: materials } = useQuery({ queryKey: ['materials'], queryFn: () => inventoryApi.materials(), enabled: !!task });

  React.useEffect(() => {
    if (!task) return;
    setMaterialId(task.materialId ?? '');
    const area = task.orderItem ? task.orderItem.areaM2 * task.orderItem.quantity : 0;
    setUsed(area ? String(Math.round(area * 100) / 100) : '');
    setWaste('0');
  }, [task]);

  const finish = useMutation({
    mutationFn: () => [used, waste].some((v) => v.trim() && parseDecimal(v) === null)
      ? Promise.reject(new Error('Miqdorni raqam bilan kiriting'))
      : productionApi.finish(task!.id, {
      materialId: materialId || undefined,
      materialUsed: used.trim() ? parseDecimal(used) ?? NaN : 0,
      wasteAmount: waste.trim() ? parseDecimal(waste) ?? NaN : 0,
    }),
    onSuccess: (r) => {
      toast.success(r.orderReady ? 'Buyurtma tayyor bo\'ldi' : 'Vazifa tugadi');
      if (r.negativeStock) toast.error(new Error('Diqqat: ombordagi qoldiq manfiy bo\'lib qoldi — kirimni tekshiring'));
      invalidateOrderViews(qc);
      onClose();
    },
    onError: toast.error,
  });

  const unit = materials?.find((m) => m.id === materialId)?.unit;

  return (
    <Modal
      open={!!task}
      onClose={onClose}
      title={`${task?.order.number ?? ''}: tayyor`}
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button isLoading={finish.isPending} onClick={() => finish.mutate()}>Tugatish</Button>
        </>
      )}
    >
      <div className="space-y-4">
        <Select
          label="Sarflangan material"
          value={materialId}
          onChange={(e) => setMaterialId(e.target.value)}
          placeholder="Material sarflanmadi"
          options={(materials ?? []).map((m) => ({ value: m.id, label: `${m.name} (qoldiq ${formatNumber(m.stock, 1)} ${UNIT_LABELS[m.unit]})` }))}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input label={`Ishlatildi${unit ? `, ${UNIT_LABELS[unit]}` : ''}`} inputMode="decimal" value={used} onChange={(e) => setUsed(e.target.value)} />
          <Input label={`Brak${unit ? `, ${UNIT_LABELS[unit]}` : ''}`} inputMode="decimal" value={waste} onChange={(e) => setWaste(e.target.value)} />
        </div>
        <p className="text-xs text-gray-500">Ishlatilgan va brak miqdori ombordan avtomatik ayriladi.</p>
      </div>
    </Modal>
  );
}

export default function ProductionPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [eqFilter, setEqFilter] = React.useState('');
  const [finishing, setFinishing] = React.useState<QueueTask | null>(null);

  const { data: equipment } = useQuery({ queryKey: ['equipment'], queryFn: equipmentApi.list });
  const { data: tasks, isLoading, error, refetch } = useQuery({
    queryKey: ['production', eqFilter],
    queryFn: () => productionApi.queue({ equipmentId: eqFilter || undefined }),
    refetchInterval: 30_000,
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['production'] }); qc.invalidateQueries({ queryKey: ['equipment'] }); };
  const setEqStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: EquipmentStatus }) => equipmentApi.update(id, { status }),
    onSuccess: refresh,
    onError: toast.error,
  });
  const assignEq = useMutation({
    mutationFn: ({ id, equipmentId }: { id: string; equipmentId: string | null }) => productionApi.update(id, { equipmentId }),
    onSuccess: refresh,
    onError: toast.error,
  });
  const start = useMutation({
    mutationFn: (t: QueueTask) => productionApi.start(t.id, t.equipmentId ?? undefined),
    onSuccess: () => { toast.success('Ish boshlandi'); refresh(); },
    onError: toast.error,
  });

  const active = (tasks ?? []).filter((t) => t.status !== 'DONE');
  const doneToday = (tasks ?? []).filter((t) => t.status === 'DONE');
  const wasteToday = doneToday.reduce((s, t) => s + t.wasteAmount, 0);
  const usedToday = doneToday.reduce((s, t) => s + t.materialUsed, 0);

  return (
    <div className="space-y-8">
      <PageHeader title="Ishlab chiqarish navbati" subtitle="Printer, lazer va frezer navbati" />
      <MyKpiCard />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {equipment?.map((eq) => (
          <Card
            key={eq.id}
            className={cn('cursor-pointer p-4 transition-colors', eqFilter === eq.id && 'border-gray-900 ring-1 ring-gray-900')}
            onClick={() => setEqFilter((f) => (f === eq.id ? '' : eq.id))}
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="rounded-lg bg-gray-50 p-2 text-gray-600"><Printer className="h-5 w-5" /></div>
              <Badge variant={EQ_VARIANT[eq.status]}>{EQUIPMENT_STATUS_LABELS[eq.status]}</Badge>
            </div>
            <h3 className="mb-1 text-sm font-bold text-gray-900">{eq.name}</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{EQUIPMENT_TYPE_LABELS[eq.type]} · navbatda {eq.openTasks}</p>
            <select
              value={eq.status}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setEqStatus.mutate({ id: eq.id, status: e.target.value as EquipmentStatus })}
              className="mt-3 w-full rounded border border-gray-200 px-2 py-1 text-xs"
              aria-label="Uskuna holati"
            >
              {options(EQUIPMENT_STATUS_LABELS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Card title={`Navbat${eqFilter ? ` — ${equipment?.find((e) => e.id === eqFilter)?.name}` : ''}`} className="lg:col-span-2">
          {error ? <ErrorState error={error} onRetry={refetch} /> : isLoading ? <Loading /> : active.length === 0 ? (
            <Empty text="Hozircha ishlab chiqarishda ishlar yo'q" />
          ) : (
            <div className="space-y-3">
              {active.map((t) => {
                const dl = deadlineText(t.order.deadline);
                return (
                  <div key={t.id} className="flex flex-col gap-3 rounded-xl border border-gray-100 p-4 md:flex-row md:items-center">
                    {t.approvedDesign && (
                      <a href={fileUrl(t.approvedDesign.previewUrl)} target="_blank" rel="noreferrer" className="shrink-0">
                        <img src={fileUrl(t.approvedDesign.previewUrl)} alt="Dizayn" className="h-16 w-24 rounded object-cover" />
                      </a>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Link to={`/orders/${t.order.id}`} className="font-black text-brand-600 hover:underline">{t.order.number}</Link>
                        <Badge variant={t.status === 'IN_PROGRESS' ? 'info' : 'default'}>{TASK_STATUS_LABELS[t.status]}</Badge>
                        {dl && <span className={cn('text-xs', dl.late ? 'font-bold text-red-600' : 'text-gray-400')}>{dl.text}</span>}
                      </div>
                      <p className="text-sm text-gray-600">{t.order.client.name}</p>
                      {t.orderItem && (
                        <p className="text-sm font-medium text-gray-900">
                          {t.orderItem.productType} · {t.orderItem.widthCm}×{t.orderItem.heightCm} sm × {t.orderItem.quantity}
                          <span className="text-gray-400"> · {t.material?.name ?? 'material ko\'rsatilmagan'}</span>
                        </p>
                      )}
                      {t.orderItem?.finishing.length ? <p className="text-xs text-gray-500">{t.orderItem.finishing.join(', ')}</p> : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {t.status === 'QUEUED' && (
                        <select
                          value={t.equipmentId ?? ''}
                          onChange={(e) => assignEq.mutate({ id: t.id, equipmentId: e.target.value || null })}
                          className="h-9 rounded-md border border-gray-200 px-2 text-xs"
                          aria-label="Uskuna"
                        >
                          <option value="">Uskuna...</option>
                          {equipment?.filter((e) => e.status !== 'REPAIR').map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                      )}
                      {t.approvedDesign && (
                        <a href={fileUrl(t.approvedDesign.fileUrl)} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline" aria-label="Faylni yuklab olish"><Download className="h-3 w-3" /></Button>
                        </a>
                      )}
                      {t.status === 'QUEUED' && (
                        <Button size="sm" variant="outline" isLoading={start.isPending && start.variables?.id === t.id} onClick={() => start.mutate(t)}>
                          <Play className="h-3 w-3" />Boshlash
                        </Button>
                      )}
                      <Button size="sm" onClick={() => setFinishing(t)}><CheckCircle className="h-3 w-3" />Tayyor</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Oxirgi 24 soat">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
              <p className="text-xl font-black text-gray-900">{doneToday.length}</p>
              <p className="text-[10px] font-bold uppercase text-gray-500">Tugagan vazifa</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
              <p className="text-xl font-black text-gray-900">{formatNumber(usedToday, 1)}</p>
              <p className="text-[10px] font-bold uppercase text-gray-500">Material sarfi</p>
            </div>
            <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-center">
              <p className="text-xl font-black text-red-600">{formatNumber(wasteToday, 1)}</p>
              <p className="text-[10px] font-bold uppercase text-red-700">Brak</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
              <p className="text-xl font-black text-gray-900">{usedToday + wasteToday > 0 ? Math.round((wasteToday / (usedToday + wasteToday)) * 100) : 0}%</p>
              <p className="text-[10px] font-bold uppercase text-gray-500">Yo'qotish</p>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            {doneToday.map((t) => (
              <div key={t.id} className="flex justify-between text-xs text-gray-600">
                <span>{t.order.number}</span>
                <span>{t.material?.name ?? '—'}: {t.materialUsed}{t.wasteAmount ? ` (+${t.wasteAmount} brak)` : ''}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <FinishModal task={finishing} onClose={() => setFinishing(null)} />
    </div>
  );
}
