import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, MapPin, Paperclip, Phone, Printer, User } from 'lucide-react';
import { ordersApi, usersApi } from '@/api';
import { CLIENT_TYPE_LABELS, SOURCE_LABELS, TASK_STATUS_LABELS } from '@/lib/labels';
import { isFinance, useUser } from '@/lib/auth';
import { fileUrl, formatCurrency, formatDate, formatPhone } from '@/lib/utils';
import { DesignsCard } from '@/components/orders/detail/DesignsCard';
import { InstallationCard } from '@/components/orders/detail/InstallationCard';
import { FeedbackCard } from '@/components/orders/detail/FeedbackCard';
import { PaymentsCard } from '@/components/orders/detail/PaymentsCard';
import { SmsCard } from '@/components/orders/detail/SmsCard';
import { StatusPanel } from '@/components/orders/detail/StatusPanel';
import { TimelineCard } from '@/components/orders/detail/TimelineCard';
import { StatusBadge } from '@/components/orders/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FileButton } from '@/components/ui/FileButton';
import { Select } from '@/components/ui/Select';
import { ErrorState, Loading } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { formatSize } from '@/lib/size';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useUser();
  const toast = useToast();
  const qc = useQueryClient();
  const finance = isFinance(user.role);

  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.get(id!),
    enabled: !!id,
  });
  const { data: designers } = useQuery({
    queryKey: ['users', 'DESIGNER'],
    queryFn: () => usersApi.list({ role: 'DESIGNER', active: true }),
    enabled: finance,
  });

  const assign = useMutation({
    mutationFn: (designerId: string | null) => ordersApi.update(id!, { designerId }),
    onSuccess: () => { toast.success('Dizayner tayinlandi'); qc.invalidateQueries({ queryKey: ['order', id] }); },
    onError: toast.error,
  });

  if (isLoading) return <Loading rows={8} />;
  if (error || !order) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="Orqaga"><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{order.number}</h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {formatDate(order.createdAt)} · {SOURCE_LABELS[order.source]} · Menejer: {order.manager.fullName}
              {order.deadline && <> · <span className={order.isLate ? 'font-bold text-red-600' : ''}>Muddat: {formatDate(order.deadline)}</span></>}
            </p>
          </div>
        </div>
        {finance && (
          <Link to={`/documents?order=${order.id}`}>
            <Button variant="outline"><FileText className="h-4 w-4" />Hujjatlar</Button>
          </Link>
        )}
      </div>

      <StatusPanel order={order} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Mahsulotlar">
            <div className="divide-y divide-gray-100">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-bold text-gray-900">{item.productType}</p>
                    <p className="text-sm text-gray-500">{formatSize(item.widthCm, item.heightCm)} · {item.areaM2} m² · {item.quantity} dona</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.material && <Badge variant="outline">{item.material.name}</Badge>}
                      {item.finishing.map((f) => <Badge key={f}>{f}</Badge>)}
                    </div>
                  </div>
                  {item.total !== undefined && (
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(item.total)}</p>
                      <p className="text-xs text-gray-500">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {finance && (
              <div className="mt-6 flex items-end justify-between border-t border-gray-100 pt-6">
                <p className="text-sm text-gray-500">{order.discount ? `Chegirma: ${formatCurrency(order.discount)}` : ''}</p>
                <div className="text-right">
                  <p className="text-sm font-bold uppercase tracking-wider text-gray-500">Umumiy summa</p>
                  <p className="text-3xl font-black text-brand-600">{formatCurrency(order.totalAmount)}</p>
                </div>
              </div>
            )}
            {order.notes && <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{order.notes}</p>}
          </Card>

          <DesignsCard order={order} />

          {order.productionTasks.length > 0 && (
            <Card title="Ishlab chiqarish">
              <div className="space-y-2">
                {order.productionTasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 text-sm">
                    <span className="flex items-center"><Printer className="mr-2 h-4 w-4 text-gray-400" />{t.equipment?.name ?? 'Uskuna tanlanmagan'}</span>
                    <span className="text-gray-500">{t.assignee?.fullName}</span>
                    <Badge variant={t.status === 'DONE' ? 'success' : t.status === 'IN_PROGRESS' ? 'info' : 'default'}>{TASK_STATUS_LABELS[t.status]}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <TimelineCard orderId={order.id} events={order.events} />
        </div>

        <div className="space-y-6">
          <Card title="Mijoz">
            <div className="space-y-3">
              <div>
                {finance ? (
                  <Link to={`/clients/${order.client.id}`} className="font-bold text-brand-600 hover:underline">{order.client.name}</Link>
                ) : <p className="font-bold text-gray-900">{order.client.name}</p>}
                <p className="text-xs uppercase tracking-wider text-gray-500">{CLIENT_TYPE_LABELS[order.client.type]}</p>
              </div>
              {order.client.contactPerson && <p className="flex items-center text-sm text-gray-600"><User className="mr-3 h-4 w-4 text-gray-400" />{order.client.contactPerson}</p>}
              {order.client.phones.map((p) => (
                <a key={p} href={`tel:${p}`} className="flex items-center text-sm text-gray-600 hover:text-brand-600"><Phone className="mr-3 h-4 w-4 text-gray-400" />{formatPhone(p)}</a>
              ))}
              {order.client.address && <p className="flex items-center text-sm text-gray-600"><MapPin className="mr-3 h-4 w-4 text-gray-400" />{order.client.address}</p>}
            </div>
          </Card>

          {finance && order.needsDesign && (
            <Card title="Dizayner">
              <Select
                value={order.designerId ?? ''}
                onChange={(e) => assign.mutate(e.target.value || null)}
                placeholder="Tayinlanmagan"
                options={(designers ?? []).map((d) => ({ value: d.id, label: d.fullName }))}
                disabled={assign.isPending}
              />
            </Card>
          )}

          {finance && <PaymentsCard order={order} />}

          {finance && <SmsCard order={order} />}

          {finance && <FeedbackCard order={order} />}

          <InstallationCard order={order} />

          <Card
            title="Fayllar"
            actions={(
              <FileButton size="sm" variant="outline" kind="REFERENCE" orderId={order.id} onUploaded={() => qc.invalidateQueries({ queryKey: ['order', id] })}>
                Qo'shish
              </FileButton>
            )}
          >
            {order.files.length ? (
              <div className="space-y-2">
                {order.files.map((f) => (
                  <a key={f.id} href={fileUrl(f.url)} target="_blank" rel="noreferrer" className="flex items-center text-sm text-brand-600 hover:underline">
                    <Paperclip className="mr-2 h-4 w-4 shrink-0" /><span className="truncate">{f.name}</span>
                  </a>
                ))}
              </div>
            ) : <p className="text-center text-sm text-gray-400">Fayllar yo'q</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
