import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Pencil } from 'lucide-react';
import { clientsApi } from '@/api';
import { CLIENT_TYPE_LABELS, KIND_LABELS, METHOD_LABELS, SOURCE_LABELS } from '@/lib/labels';
import { formatCurrency, formatDate, formatPhone } from '@/lib/utils';
import { ClientFormModal } from '@/components/clients/ClientFormModal';
import { StatusBadge } from '@/components/orders/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Empty, ErrorState, Loading } from '@/components/ui/States';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editing, setEditing] = React.useState(false);
  const { data: c, isLoading, error, refetch } = useQuery({ queryKey: ['client', id], queryFn: () => clientsApi.get(id!), enabled: !!id });

  if (isLoading) return <Loading rows={6} />;
  if (error || !c) return <ErrorState error={error} onRetry={refetch} />;

  const info: Array<[string, React.ReactNode]> = [
    ['Turi', CLIENT_TYPE_LABELS[c.type]],
    ['Manba', SOURCE_LABELS[c.source]],
    ['Telefon', c.phones.map((p) => <a key={p} href={`tel:${p}`} className="mr-2 text-brand-600">{formatPhone(p)}</a>)],
    ['Telegram', c.telegram],
    ['Mas\'ul shaxs', c.contactPerson],
    ['STIR', c.inn],
    ['Manzil', c.address],
    ['Bank rekvizitlari', c.bankDetails && <span className="whitespace-pre-wrap">{c.bankDetails}</span>],
    ['Izoh', c.notes],
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="Orqaga"><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-2xl font-bold text-gray-900">{c.name}</h1>
        </div>
        <Button variant="outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Tahrirlash</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4"><p className="text-sm text-gray-500">Jami buyurtma</p><p className="text-xl font-black">{formatCurrency(c.totalOrdered)}</p></Card>
        <Card className="p-4"><p className="text-sm text-gray-500">To'langan</p><p className="text-xl font-black text-emerald-600">{formatCurrency(c.totalPaid)}</p></Card>
        <Card className="p-4"><p className="text-sm text-gray-500">Qarz</p><p className="text-xl font-black text-red-600">{formatCurrency(c.debt)}</p></Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Ma'lumotlar">
          <dl className="space-y-3 text-sm">
            {info.filter(([, v]) => v && (!Array.isArray(v) || v.length)).map(([k, v]) => (
              <div key={k}><dt className="text-xs uppercase tracking-wider text-gray-400">{k}</dt><dd className="text-gray-900">{v}</dd></div>
            ))}
          </dl>
        </Card>
        <div className="space-y-6 lg:col-span-2">
          <Card title={`Buyurtmalar (${c.orders.length})`}>
            {c.orders.length ? (
              <table className="w-full text-left text-sm">
                <tbody>
                  {c.orders.map((o) => (
                    <tr key={o.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2"><Link to={`/orders/${o.id}`} className="font-bold text-brand-600 hover:underline">{o.number}</Link></td>
                      <td className="py-2 text-gray-500">{formatDate(o.createdAt)}</td>
                      <td className="py-2"><StatusBadge status={o.status} /></td>
                      <td className="py-2 text-right font-medium">{formatCurrency(o.totalAmount)}</td>
                      <td className="py-2 text-right text-red-600">{(o.totalAmount ?? 0) > (o.paidAmount ?? 0) ? formatCurrency((o.totalAmount ?? 0) - (o.paidAmount ?? 0)) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <Empty text="Buyurtmalar yo'q" />}
          </Card>
          <Card title="To'lovlar">
            {c.payments.length ? (
              <div className="divide-y divide-gray-50 text-sm">
                {c.payments.map((p) => (
                  <div key={p.id} className="flex justify-between py-2">
                    <span className="text-gray-500">{formatDate(p.createdAt)} · {METHOD_LABELS[p.method]} · {KIND_LABELS[p.kind]}</span>
                    <span className="font-semibold">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            ) : <Empty text="To'lovlar yo'q" />}
          </Card>
        </div>
      </div>
      <ClientFormModal open={editing} onClose={() => setEditing(false)} client={c} />
    </div>
  );
}
