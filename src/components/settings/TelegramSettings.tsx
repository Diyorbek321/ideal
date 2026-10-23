import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Send } from 'lucide-react';
import { settingsApi, telegramApi } from '@/api';
import type { CompanySettings } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Loading } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

/** Direktor: botni ulash, kunlik hisobot vaqti, sinov hisoboti */
export function TelegramSettings({ s }: { s: CompanySettings }) {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: status, isLoading } = useQuery({ queryKey: ['telegram-status'], queryFn: telegramApi.status, refetchInterval: 10_000 });
  const [enabled, setEnabled] = React.useState(s.dailyReportEnabled);
  const [time, setTime] = React.useState(s.dailyReportTime);
  React.useEffect(() => { setEnabled(s.dailyReportEnabled); setTime(s.dailyReportTime); }, [s]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['telegram-status'] });
  const link = useMutation({
    mutationFn: telegramApi.link,
    // Yangi oynada bot ochiladi — u yerda "Start" bosiladi
    onSuccess: (r) => { window.open(r.url, '_blank', 'noopener'); toast.success('Telegram\'da "Start" ni bosing'); },
    onError: toast.error,
  });
  const unlink = useMutation({ mutationFn: telegramApi.unlink, onSuccess: () => { toast.success('Uzildi'); refresh(); }, onError: toast.error });
  const test = useMutation({ mutationFn: telegramApi.testReport, onSuccess: () => toast.success('Hisobot Telegram\'ga yuborildi'), onError: toast.error });
  const save = useMutation({
    mutationFn: () => settingsApi.updateCompany({ dailyReportEnabled: enabled, dailyReportTime: time }),
    onSuccess: () => { toast.success('Saqlandi'); qc.invalidateQueries({ queryKey: ['company'] }); },
    onError: toast.error,
  });

  if (isLoading || !status) return <Loading />;

  return (
    <div className="space-y-6">
      <Card title="Telegram bot" description="Mijozlarga xabarlar va maket tasdig'i botdan ketadi (SMS dan arzon). Direktorga — kunlik hisobot">
        {!status.enabled ? (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Bot hali sozlanmagan. @BotFather dan olingan tokenni serverdagi <code>TELEGRAM_BOT_TOKEN</code> ga yozish kerak. Ungacha barcha xabarlar SMS orqali ketadi.
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Bot: <a className="font-semibold text-brand-700 hover:underline" href={`https://t.me/${status.username}`} target="_blank" rel="noreferrer">@{status.username}</a></p>
            {status.linked ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-2 text-sm font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" />Telegram'ingiz ulangan</span>
                <Button size="sm" variant="outline" isLoading={test.isPending} onClick={() => test.mutate()}><Send className="h-4 w-4" />Hisobotni hozir yuborish</Button>
                <Button size="sm" variant="ghost" isLoading={unlink.isPending} onClick={() => unlink.mutate()}>Uzish</Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Button isLoading={link.isPending} onClick={() => link.mutate()}><Send className="h-4 w-4" />Telegram'ni ulash</Button>
                <p className="text-xs text-gray-500">Telegram ochiladi — "Start" ni bosing. Havola 15 daqiqa amal qiladi. Keyin bu sahifa o'zi yangilanadi.</p>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card title="Kunlik hisobot" description="Bugungi tushum, xarajat, kechikishlar, ertangi reja, qarzlar, davomat, ombor va past baholar">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />Har kuni yuborilsin
          </label>
          <Input label="Yuborish vaqti" type="time" value={time} disabled={!enabled} onChange={(e) => setTime(e.target.value)} />
        </div>
        <p className="mt-3 text-xs text-gray-500">Botda istalgan payt: /bugun — hisobot, /qarzlar — qarzlar, /kechikkan — kechikayotgan ishlar.</p>
        <div className="mt-4 flex justify-end">
          <Button disabled={!/^\d{2}:\d{2}$/.test(time)} isLoading={save.isPending} onClick={() => save.mutate()}>Saqlash</Button>
        </div>
      </Card>
    </div>
  );
}
