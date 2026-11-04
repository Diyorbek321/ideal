import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { smsApi } from '@/api';
import type { SmsTemplateRow } from '@/types';
import { SMS_EVENT_LABELS } from '@/lib/labels';
import { useUser } from '@/lib/auth';
import type { BadgeProps } from '@/components/ui/Badge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState, Loading } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

type Variant = NonNullable<BadgeProps['variant']>;

function moderation(row: SmsTemplateRow): { label: string; variant: Variant; canSubmit: boolean } {
  const st = row.template?.status;
  if (st === 'service' || st === 'reklama') return { label: 'Tasdiqlangan', variant: 'success', canSubmit: false };
  if (st === 'moderation') return { label: 'Moderatsiyada', variant: 'info', canSubmit: false };
  if (st === 'rejected') return { label: 'Rad etilgan', variant: 'error', canSubmit: true };
  return { label: 'Yuborilmagan', variant: 'outline', canSubmit: true };
}

/** Avtomatik SMS matnlari va ularning Eskiz'dagi moderatsiya holati */
export function SmsTemplates() {
  const isAdmin = useUser().role === 'ADMIN';
  const toast = useToast();
  const qc = useQueryClient();
  const tpl = useQuery({ queryKey: ['sms', 'templates'], queryFn: smsApi.templates });
  const submit = useMutation({
    mutationFn: smsApi.submitTemplate,
    onSuccess: () => { toast.success('Moderatsiyaga yuborildi. Eskiz odatda 1 ish kunida ko\'rib chiqadi'); qc.invalidateQueries({ queryKey: ['sms', 'templates'] }); },
    onError: toast.error,
  });

  if (tpl.error) return <ErrorState error={tpl.error} onRetry={tpl.refetch} />;
  if (tpl.isLoading || !tpl.data) return <Loading />;
  const { supported, rows } = tpl.data;
  const approved = rows.filter((r) => moderation(r).variant === 'success').length;

  return (
    <Card title="SMS shablonlari" actions={supported ? <span className="text-sm text-gray-500">Tasdiqlangan: {approved} / {rows.length}</span> : undefined}>
      <p className="mb-4 text-sm text-gray-500">
        {supported
          ? 'Eskiz faqat oldindan tasdiqlangan matnni yuboradi. Raqam, summa va havolalar o\'zgaruvchan qism — har SMSda o\'zgaradi. Matnning qolgan qismi o\'zgarsa, shablonni qayta tasdiqlatish kerak.'
          : 'Test rejimi: moderatsiya holati faqat Eskiz ulanganda ko\'rinadi. Quyida mijozlarga ketadigan matnlar namunasi.'}
      </p>
      <ul className="divide-y divide-gray-50">
        {rows.map((r) => {
          const m = moderation(r);
          return (
            <li key={r.event} className="py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-gray-900">{SMS_EVENT_LABELS[r.event]}</span>
                <span className="flex items-center gap-2">
                  {supported && <Badge variant={m.variant}>{m.label}</Badge>}
                  {supported && isAdmin && m.canSubmit && (
                    <Button size="sm" variant="outline" isLoading={submit.isPending && submit.variables === r.event} onClick={() => submit.mutate(r.event)}>
                      <Send className="mr-1 h-3.5 w-3.5" />Moderatsiyaga
                    </Button>
                  )}
                </span>
              </div>
              <p className="mt-1 break-words text-gray-600">{r.text}</p>
              {r.template && <p className="mt-1 break-words text-xs text-gray-400">Eskiz #{r.template.id}: {r.template.template}</p>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
