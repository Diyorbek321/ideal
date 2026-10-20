import React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, Send, Share2, Upload } from 'lucide-react';
import { designsApi, reportsApi } from '@/api';
import type { DesignTask, ShareInfo } from '@/types';
import { DESIGN_STATUS_LABELS } from '@/lib/labels';
import { isFinance, useUser } from '@/lib/auth';
import { cn, deadlineText, fileUrl, formatHours, formatNumber, monthRange } from '@/lib/utils';
import { invalidateOrderViews } from '@/lib/queries';
import { DesignUploadModal } from '@/components/design/DesignUploadModal';
import { ShareModal } from '@/components/design/ShareModal';
import { DESIGN_VARIANT } from '@/components/orders/detail/DesignsCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Empty, ErrorState, Loading, PageHeader } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

export default function DesignPage() {
  const user = useUser();
  const finance = isFinance(user.role);
  const toast = useToast();
  const qc = useQueryClient();
  const [uploadFor, setUploadFor] = React.useState<DesignTask | null>(null);
  const [share, setShare] = React.useState<ShareInfo | null>(null);

  const { data: tasks, isLoading, error, refetch } = useQuery({
    queryKey: ['design-tasks'],
    queryFn: () => designsApi.tasks(),
    refetchInterval: 60_000,
  });
  const range = monthRange();
  const { data: stats } = useQuery({
    queryKey: ['designer-stats', range.from],
    queryFn: () => reportsApi.designers(range.from, range.to),
    enabled: finance,
  });

  const send = useMutation({
    mutationFn: designsApi.send,
    onSuccess: (info) => { setShare(info); invalidateOrderViews(qc); },
    onError: toast.error,
  });
  const getShare = useMutation({ mutationFn: designsApi.share, onSuccess: setShare, onError: toast.error });

  if (isLoading) return <Loading rows={6} />;
  if (error || !tasks) return <ErrorState error={error} onRetry={refetch} />;

  const inDesign = tasks.filter((t) => t.status === 'DIZAYNDA');
  const waiting = tasks.filter((t) => t.status === 'TASDIQDA');
  const overdue = tasks.filter((t) => t.sla.isOverdue).length;

  const renderTask = (t: DesignTask) => {
    const v = t.latestVersion;
    const dl = deadlineText(t.deadline);
    return (
      <Card key={t.id} className={cn('p-5', t.sla.isOverdue && 'border-red-200')}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Link to={`/orders/${t.id}`} className="font-black text-blue-600 hover:underline">{t.number}</Link>
              {v && <Badge variant={DESIGN_VARIANT[v.status]}>v{v.version} · {DESIGN_STATUS_LABELS[v.status]}</Badge>}
            </div>
            <p className="font-bold text-gray-900">{t.client.name}</p>
            <p className="mt-1 text-xs text-gray-500">
              {t.items.map((i) => `${i.productType} ${i.widthCm}×${i.heightCm}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(' · ')}
            </p>
          </div>
          <Link to={`/orders/${t.id}`} aria-label="Buyurtmani ochish"><ExternalLink className="h-4 w-4 text-gray-400" /></Link>
        </div>

        {v?.clientComment && v.status === 'CHANGES_REQUESTED' && (
          <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Mijoz: “{v.clientComment}”</p>
        )}
        {t.notes && <p className="mt-2 text-xs italic text-gray-500">{t.notes}</p>}
        {t.files.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {t.files.map((f) => <a key={f.id} href={fileUrl(f.url)} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">{f.name}</a>)}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-50 pt-4">
          <div className="flex items-center gap-3 text-xs">
            <span className={cn('flex items-center', t.sla.isOverdue ? 'font-bold text-red-600' : 'text-gray-500')}>
              {t.sla.isOverdue ? <AlertTriangle className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
              {formatHours(t.sla.hoursInStatus)}
            </span>
            {dl && <span className={dl.late ? 'font-bold text-red-600' : 'text-gray-500'}>{dl.text}</span>}
            {t.revisionCount > 0 && <span className="text-amber-700">Qayta: {t.revisionCount}</span>}
            {finance && t.designer && <span className="text-gray-400">{t.designer.fullName}</span>}
          </div>
          <div className="flex gap-2">
            {t.status === 'DIZAYNDA' && v?.status === 'DRAFT' && (
              <Button size="sm" isLoading={send.isPending && send.variables === v.id} onClick={() => send.mutate(v.id)}>
                <Send className="mr-1 h-3 w-3" />Yuborish
              </Button>
            )}
            {t.status === 'DIZAYNDA' && (
              <Button size="sm" variant={v?.status === 'DRAFT' ? 'outline' : 'primary'} onClick={() => setUploadFor(t)}>
                <Upload className="mr-1 h-3 w-3" />Yuklash
              </Button>
            )}
            {t.status === 'TASDIQDA' && v?.status === 'SENT' && (
              <Button size="sm" variant="outline" onClick={() => getShare.mutate(v.id)}><Share2 className="mr-1 h-3 w-3" />Havola</Button>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Dizayn" subtitle={finance ? 'Barcha dizayn vazifalari' : 'Sizga biriktirilgan vazifalar'} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="p-4"><p className="mb-1 text-sm text-gray-500">Dizayndagi ishlar</p><p className="text-2xl font-black text-amber-600">{inDesign.length}</p></Card>
        <Card className="p-4"><p className="mb-1 text-sm text-gray-500">Tasdiq kutilmoqda</p><p className="text-2xl font-black text-blue-600">{waiting.length}</p></Card>
        <Card className="p-4"><p className="mb-1 text-sm text-gray-500">Muddati o'tgan</p><p className="text-2xl font-black text-red-600">{overdue}</p></Card>
        <Card className="p-4"><p className="mb-1 text-sm text-gray-500">Qayta ishlashlar</p><p className="text-2xl font-black text-gray-900">{tasks.reduce((s, t) => s + t.revisionCount, 0)}</p></Card>
      </div>

      {finance && stats && stats.length > 0 && (
        <Card title="Dizaynerlar (shu oy)">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="py-2">Dizayner</th><th className="py-2">Tasdiqlangan</th><th className="py-2">m²</th>
                  <th className="py-2">Qayta ishlash</th><th className="py-2">O'rtacha tasdiq vaqti</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 font-medium">{s.fullName}</td>
                    <td className="py-2">{s.approvedCount}</td>
                    <td className="py-2">{formatNumber(s.approvedM2, 1)}</td>
                    <td className="py-2">{s.revisions}</td>
                    <td className="py-2">{s.avgApprovalHours != null ? formatHours(s.avgApprovalHours) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="flex items-center text-lg font-bold text-gray-900"><Clock className="mr-2 h-5 w-5 text-amber-600" />Navbatdagi dizaynlar</h2>
          {inDesign.length ? inDesign.map(renderTask) : <Card><Empty text="Navbatda ish yo'q" /></Card>}
        </div>
        <div className="space-y-4">
          <h2 className="flex items-center text-lg font-bold text-gray-900"><CheckCircle2 className="mr-2 h-5 w-5 text-blue-600" />Mijoz javobini kutmoqda</h2>
          {waiting.length ? waiting.map(renderTask) : <Card><Empty text="Javob kutilayotgan ish yo'q" /></Card>}
        </div>
      </div>

      {uploadFor && (
        <DesignUploadModal
          open
          onClose={() => setUploadFor(null)}
          orderId={uploadFor.id}
          orderNumber={uploadFor.number}
          defaultAreaM2={Math.round(uploadFor.items.reduce((sum, i) => sum + i.areaM2 * i.quantity, 0) * 100) / 100}
        />
      )}
      <ShareModal info={share} onClose={() => setShare(null)} />
    </div>
  );
}
