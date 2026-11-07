import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer } from 'lucide-react';
import { clientsApi, settingsApi } from '@/api';
import type { ClientStatement } from '@/types';
import { CLIENT_TYPE_LABELS, KIND_LABELS, METHOD_LABELS } from '@/lib/labels';
import { formatCurrency, formatDate, formatDateTime, formatPhone } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { ErrorState, Loading } from '@/components/ui/States';

// Mijoz hisob varag'i (prichisleniya): mijoz, bizga berilgan summalar (sana-vaqti), qilingan ishlar, qoldiq
export default function ClientStatementPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: st, isLoading, error, refetch } = useQuery({ queryKey: ['client-statement', id], queryFn: () => clientsApi.statement(id!), enabled: !!id });
  const { data: company } = useQuery({ queryKey: ['company'], queryFn: settingsApi.company });

  if (isLoading) return <Loading rows={8} />;
  if (error || !st) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="Orqaga"><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-2xl font-bold text-gray-900">Hisob varag'i</h1>
        </div>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4" />Chop etish / PDF</Button>
      </div>

      <div className="print-area mx-auto max-w-[800px] rounded-xl border border-gray-100 bg-white p-8 text-[13px] leading-relaxed text-black">
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <h2 className="text-lg font-bold">MIJOZ HISOB VARAG'I</h2>
            <p className="text-gray-600">Sana: {formatDateTime(st.generatedAt)}</p>
          </div>
          {company && (
            <div className="text-right text-xs text-gray-600">
              <p className="font-bold text-black">{company.name}</p>
              {company.phone && <p>{company.phone}</p>}
              {company.address && <p>{company.address}</p>}
            </div>
          )}
        </div>

        <Section title="1. Mijoz ma'lumotlari">
          <ClientInfo client={st.client} />
        </Section>

        <Section title="2. Bizga berilgan summalar">
          {st.payments.length ? (
            <table className="w-full border-collapse">
              <thead><tr className="border-b border-black text-left"><Th>Sana va vaqt</Th><Th>Buyurtma</Th><Th>Turi</Th><Th right>Summa</Th></tr></thead>
              <tbody>
                {st.payments.map((p) => (
                  <tr key={p.id} className="border-b border-gray-200">
                    <Td>{formatDateTime(p.date)}</Td>
                    <Td>{p.orderNumber ?? '—'}</Td>
                    <Td>{METHOD_LABELS[p.method]} · {KIND_LABELS[p.kind]}{p.note ? ` — ${p.note}` : ''}</Td>
                    <Td right className={p.amount < 0 ? 'text-red-600' : ''}>{p.amount < 0 ? `− ${formatCurrency(-p.amount)}` : formatCurrency(p.amount)}</Td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="font-bold"><Td colSpan={3}>Jami to'langan</Td><Td right>{formatCurrency(st.totals.paid)}</Td></tr></tfoot>
            </table>
          ) : <p className="text-gray-500">To'lovlar yo'q</p>}
        </Section>

        <Section title="3. Qilingan ishlar">
          {st.works.length ? (
            <table className="w-full border-collapse">
              <thead><tr className="border-b border-black text-left"><Th>Sana</Th><Th>Buyurtma</Th><Th>Ish</Th><Th right>Summa</Th></tr></thead>
              <tbody>
                {st.works.map((w) => (
                  <tr key={w.orderId} className="border-b border-gray-200">
                    <Td>{formatDate(w.date)}</Td>
                    <Td>{w.number}</Td>
                    <Td>
                      {w.description}
                      {w.cancelled && <span className="block text-xs text-gray-500">Bekor qilingan — {w.amount > 0 ? 'ushlab qolingan zaklat' : 'zaklat qaytarilgan'}</span>}
                    </Td>
                    <Td right>{formatCurrency(w.amount)}</Td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="font-bold"><Td colSpan={3}>Jami ishlar</Td><Td right>{formatCurrency(st.totals.works)}</Td></tr></tfoot>
            </table>
          ) : <p className="text-gray-500">Ishlar yo'q</p>}
        </Section>

        <Section title="4. Qolgan summa">
          <div className="flex items-center justify-between rounded-lg border-2 border-black p-4 text-base">
            <span>{st.totals.remaining > 0 ? 'Mijozning qarzi' : st.totals.remaining < 0 ? 'Mijozning haqi (ortiqcha to\'lov)' : 'Hisob-kitob yopilgan'}</span>
            <span className="text-xl font-black">{formatCurrency(Math.abs(st.totals.remaining))}</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Jami ishlar {formatCurrency(st.totals.works)} − jami to'langan {formatCurrency(st.totals.paid)} = {formatCurrency(st.totals.remaining)}
          </p>
        </Section>

        <div className="mt-12 grid grid-cols-2 gap-8">
          <p>Bajaruvchi: ____________________</p>
          <p>Mijoz: ____________________</p>
        </div>
      </div>
    </div>
  );
}

function ClientInfo({ client }: { client: ClientStatement['client'] }) {
  const rows: Array<[string, string | null]> = [
    ['Mijoz', client.name],
    ['Turi', CLIENT_TYPE_LABELS[client.type]],
    ['Mas\'ul shaxs', client.contactPerson],
    ['Telefon', client.phones.map(formatPhone).join(', ')],
    ['STIR', client.inn],
    ['Manzil', client.address],
  ];
  return (
    <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-1">
      {rows.filter(([, v]) => v).map(([k, v]) => (
        <div key={k} className="contents"><dt className="text-gray-600">{k}:</dt><dd className="font-medium">{v}</dd></div>
      ))}
    </dl>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-2 font-bold uppercase tracking-wide">{title}</h3>
      {children}
    </section>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`py-1.5 pr-2 font-semibold ${right ? 'text-right' : ''}`}>{children}</th>;
}

function Td({ children, right, className = '', colSpan }: { children: React.ReactNode; right?: boolean; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={`py-1.5 pr-2 align-top ${right ? 'whitespace-nowrap text-right' : ''} ${className}`}>{children}</td>;
}
