import type { DebtReminder } from '@/api';
import { copyText, telegramShareUrl } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

/** Qarz eslatmasi natijasi: SMS holati + Telegram/nusxa uchun matn */
export function DebtReminderModal({ reminder, onClose }: { reminder: DebtReminder | null; onClose: () => void }) {
  const toast = useToast();
  return (
    <Modal open={!!reminder} onClose={onClose} title="Qarz eslatmasi">
      {reminder && (
        <div className="space-y-4">
          {reminder.smsStatus === 'QUEUED' && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">SMS eslatma navbatga qo'yildi va yuboriladi.</p>}
          {reminder.smsStatus === 'SKIPPED' && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">SMS yuborilmadi: {reminder.smsError}</p>}
          {reminder.smsStatus === 'SENT' && <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">Bugun bu qarz bo'yicha eslatma allaqachon yuborilgan.</p>}
          <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm">{reminder.message}</pre>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={async () => (await copyText(reminder.message)) && toast.success('Nusxa olindi')}>Nusxa olish</Button>
            <a href={telegramShareUrl(reminder.message)} target="_blank" rel="noreferrer"><Button>Telegram</Button></a>
            {reminder.phones[0] && <a href={`sms:${reminder.phones[0]}?body=${encodeURIComponent(reminder.message)}`}><Button variant="outline">SMS</Button></a>}
          </div>
        </div>
      )}
    </Modal>
  );
}
