import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { payrollApi, type AdvanceRow } from '@/api';
import { useUser } from '@/lib/auth';
import { METHOD_LABELS, ROLE_LABELS } from '@/lib/labels';
import { currentPeriod, formatCurrency, formatDateTime } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { EditAdvanceModal } from './EditAdvanceModal';

/** Oy bo'yicha berilgan avanslar — kim, qancha, qachon, kim bergan. Direktor va menejer ko'radi */
export function AdvancesListCard() {
  const [period, setPeriod] = React.useState(currentPeriod);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['payroll', 'advances', period],
    queryFn: () => payrollApi.advances(period),
  });
  const rows = data?.rows ?? [];
  const me = useUser();
  const [editing, setEditing] = React.useState<AdvanceRow | null>(null);
  // Direktor istalganini, menejer faqat o'zi yozganini tuzatadi
  const canEdit = (r: AdvanceRow) => me.role === 'ADMIN' || r.createdById === me.id;

  return (
    <Card title="Berilgan avanslar" description={data ? `Jami: ${formatCurrency(data.total)} · ${rows.length} ta` : undefined}>
      <div className="mt-3 flex justify-end">
        <Input type="month" value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} className="w-44" aria-label="Oy" />
      </div>
      {isLoading && <p className="mt-3 text-sm text-slate-500">Yuklanmoqda…</p>}
      {isError && <p className="mt-3 text-sm text-red-600">Avanslarni yuklab bo'lmadi</p>}
      {data && rows.length === 0 && <p className="mt-3 text-sm text-slate-500">Bu oyda avans berilmagan</p>}
      {rows.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-3">Sana</th>
                <th className="py-2 pr-3">Xodim</th>
                <th className="py-2 pr-3 text-right">Summa</th>
                <th className="py-2 pr-3">Usul</th>
                <th className="py-2 pr-3">Izoh</th>
                <th className="py-2 pr-3">Kim berdi</th>
                <th className="py-2"><span className="sr-only">Amallar</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap py-2 pr-3">{formatDateTime(r.date)}</td>
                  <td className="py-2 pr-3">{r.userName} <span className="text-xs text-slate-500">· {ROLE_LABELS[r.role]}</span></td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right font-medium">{formatCurrency(r.amount)}</td>
                  <td className="py-2 pr-3">{r.method ? METHOD_LABELS[r.method] : '—'}</td>
                  <td className="py-2 pr-3 text-slate-600">{r.reason ?? '—'}</td>
                  <td className="py-2 pr-3 text-slate-600">{r.createdByName ?? '—'}</td>
                  <td className="py-2 text-right">
                    {canEdit(r) && (
                      <button type="button" onClick={() => setEditing(r)} aria-label="Avansni tahrirlash" title="Tahrirlash"
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <EditAdvanceModal row={editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}
