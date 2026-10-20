import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, RefreshCw, XCircle } from 'lucide-react';
import { excelApi } from '@/api';
import type { ClientImportResult, ClientImportRow } from '@/types';
import { CLIENT_TYPE_LABELS } from '@/lib/labels';
import { cn, formatCurrency, formatDate, formatPhone } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

const ACTION = {
  create: { label: 'Yangi', cls: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  exists: { label: 'Bazada bor', cls: 'bg-blue-50 text-blue-700', icon: RefreshCw },
  error: { label: 'Xato', cls: 'bg-red-50 text-red-700', icon: XCircle },
} as const;

type Filter = 'all' | 'error';

// Bosqichlar: fayl tanlash → tekshirish natijasi (hech narsa yozilmagan) → tasdiqlash
export function ClientImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<ClientImportResult | null>(null);
  const [busy, setBusy] = React.useState<'check' | 'commit' | 'template' | null>(null);
  const [filter, setFilter] = React.useState<Filter>('all');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setFilter('all');
    if (inputRef.current) inputRef.current.value = '';
  };
  const close = () => { reset(); onClose(); };

  const run = async <T,>(kind: NonNullable<typeof busy>, fn: () => Promise<T>) => {
    setBusy(kind);
    try {
      return await fn();
    } catch (err) {
      toast.error(err);
      return null;
    } finally {
      setBusy(null);
    }
  };

  const check = async (f: File) => {
    setFile(f);
    setPreview(await run('check', () => excelApi.importClients(f, false)));
  };

  const commit = async () => {
    if (!file) return;
    const r = await run('commit', () => excelApi.importClients(file, true));
    if (!r) return;
    const { toCreate, existing, debtRows, debtTotal } = r.summary;
    toast.success(`Import tugadi: ${toCreate} ta yangi mijoz${existing ? `, ${existing} ta bazada bor edi` : ''}${debtRows ? `, ${debtRows} ta qarz (${formatCurrency(debtTotal)})` : ''}`);
    void qc.invalidateQueries({ queryKey: ['clients'] });
    void qc.invalidateQueries({ queryKey: ['debts'] });
    void qc.invalidateQueries({ queryKey: ['orders'] });
    close();
  };

  const s = preview?.summary;
  const writable = s ? s.toCreate + s.debtRows > 0 : false;
  const rows = preview?.rows.filter((r) => filter === 'all' || r.action === 'error') ?? [];

  return (
    <Modal
      open={open}
      onClose={close}
      title="Mijozlarni Excel'dan import qilish"
      size="xl"
      footer={preview ? (
        <>
          <Button variant="outline" onClick={reset}>Boshqa fayl</Button>
          <Button onClick={commit} isLoading={busy === 'commit'} disabled={!writable}>
            {writable ? `Import qilish (${s!.toCreate} yangi${s!.debtRows ? `, ${s!.debtRows} qarz` : ''})` : 'Yoziladigan narsa yo\'q'}
          </Button>
        </>
      ) : undefined}
    >
      {!preview ? (
        <div className="space-y-5">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-600">
            <li>Shablonni yuklab oling va mijozlarni yozing (eski qarzi bo'lsa — summasi bilan).</li>
            <li>Faylni tanlang — tizim avval <b>tekshiradi</b>, hech narsa yozmaydi.</li>
            <li>Natijani ko'rib, "Import qilish" ni bosing. Xato qatorlar o'tkazib yuboriladi.</li>
          </ol>
          <Button variant="outline" onClick={() => run('template', excelApi.clientsTemplate)} isLoading={busy === 'template'}>
            <Download className="mr-2 h-4 w-4" />Shablonni yuklab olish
          </Button>
          <label className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-6 py-10 text-center hover:border-blue-400 hover:bg-blue-50/40',
            busy === 'check' && 'pointer-events-none opacity-60',
          )}>
            <FileSpreadsheet className="h-10 w-10 text-emerald-600" />
            <span className="text-sm font-medium text-gray-900">{busy === 'check' ? 'Tekshirilmoqda...' : 'Excel faylni tanlang (.xlsx)'}</span>
            <span className="text-xs text-gray-500">Ko'pi bilan 2000 qator</span>
            <input ref={inputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void check(f); }} />
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{file?.name} — <b>hali hech narsa yozilmagan</b></p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Yangi mijoz" value={s!.toCreate} cls="text-emerald-600" />
            <Stat label="Bazada bor" value={s!.existing} cls="text-blue-600" />
            <Stat label="Xato (o'tkaziladi)" value={s!.errors} cls={s!.errors ? 'text-red-600' : 'text-gray-400'} />
            <Stat label={`Eski qarz (${s!.debtRows} ta)`} value={formatCurrency(s!.debtTotal)} cls="text-amber-600" />
          </div>
          {s!.errors > 0 && (
            <div className="flex gap-2 text-sm">
              <Button size="sm" variant={filter === 'all' ? 'primary' : 'outline'} onClick={() => setFilter('all')}>Hammasi ({s!.total})</Button>
              <Button size="sm" variant={filter === 'error' ? 'danger' : 'outline'} onClick={() => setFilter('error')}>Faqat xatolar ({s!.errors})</Button>
            </div>
          )}
          <div className="max-h-[50vh] overflow-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="sticky top-0 bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr><th className="px-3 py-2">Qator</th><th className="px-3 py-2">Holat</th><th className="px-3 py-2">Mijoz</th><th className="px-3 py-2">Telefon</th><th className="px-3 py-2 text-right">Eski qarz</th><th className="px-3 py-2">Izoh</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">{rows.map((r) => <Row key={r.row} r={r} />)}</tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Stat({ label, value, cls }: { label: string; value: React.ReactNode; cls: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={cn('text-xl font-bold', cls)}>{value}</p>
    </div>
  );
}

function Row({ r }: { r: ClientImportRow }) {
  const a = ACTION[r.action];
  const Icon = a.icon;
  return (
    <tr className={r.action === 'error' ? 'bg-red-50/40' : undefined}>
      <td className="px-3 py-2 text-gray-500">{r.row}</td>
      <td className="px-3 py-2"><Badge className={cn('inline-flex items-center gap-1', a.cls)}><Icon className="h-3 w-3" />{a.label}</Badge></td>
      <td className="px-3 py-2">
        <p className="font-medium text-gray-900">{r.name || '—'}</p>
        <p className="text-xs text-gray-500">{r.type ? CLIENT_TYPE_LABELS[r.type] : ''}{r.inn ? ` · STIR ${r.inn}` : ''}</p>
      </td>
      <td className="px-3 py-2 text-gray-700">{r.phones.map(formatPhone).join(', ') || '—'}</td>
      <td className="px-3 py-2 text-right">
        {r.debt > 0 ? (
          <span className={r.addsDebt ? 'font-medium text-amber-700' : 'text-gray-400 line-through'}>{formatCurrency(r.debt)}</span>
        ) : '—'}
        {r.debt > 0 && r.debtDate && <p className="text-xs text-gray-400">{formatDate(r.debtDate)}</p>}
      </td>
      <td className="px-3 py-2 text-xs">
        {r.errors.map((e) => <p key={e} className="text-red-600">{e}</p>)}
        {r.warnings.map((w) => <p key={w} className="flex items-start gap-1 text-amber-700"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{w}</p>)}
      </td>
    </tr>
  );
}
