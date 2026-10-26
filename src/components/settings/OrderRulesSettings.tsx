import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/api';
import type { ClientType, CompanySettings } from '@/types';
import { CLIENT_TYPE_LABELS } from '@/lib/labels';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

/** Bosqich darvozalari: ishlab chiqarishga o'tish uchun avans va avanssiz mijoz turlari */
export function OrderRulesSettings({ s }: { s: CompanySettings }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [percent, setPercent] = React.useState('');
  const [exempt, setExempt] = React.useState<ClientType[]>([]);
  React.useEffect(() => {
    setPercent(String(s.prepayPercent));
    setExempt(s.prepayExemptTypes);
  }, [s]);

  const value = percent.trim() === '' ? 0 : Number(percent);
  const valid = Number.isInteger(value) && value >= 0 && value <= 100;
  const toggle = (t: ClientType, on: boolean) => setExempt((x) => (on ? [...x, t] : x.filter((v) => v !== t)));

  const save = useMutation({
    mutationFn: () => settingsApi.updateCompany({ prepayPercent: value, prepayExemptTypes: exempt }),
    onSuccess: () => {
      toast.success('Saqlandi');
      qc.invalidateQueries({ queryKey: ['company'] });
    },
    onError: toast.error,
  });

  return (
    <Card title="Buyurtma qoidalari" description="Shart bajarilmasa buyurtma keyingi bosqichga o'tmaydi. Direktor sabab yozib istisno qila oladi — sabab jurnalga tushadi">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Input label="Ishlab chiqarish uchun avans (%)" inputMode="numeric" placeholder="0 — tekshirilmaydi" value={percent} onChange={(e) => setPercent(e.target.value)} />
          <p className="mt-1 text-xs text-gray-500">
            {value ? `Mijoz buyurtma summasining kamida ${value}% ini to'lamaguncha ishlab chiqarish boshlanmaydi. Maket tasdiqlangan bo'lsa, avans kelishi bilan buyurtma o'zi ishlab chiqarishga o'tadi` : 'Avans tekshirilmaydi'}
          </p>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Avanssiz ishlaydigan mijozlar</p>
          <div className="space-y-1.5">
            {(Object.keys(CLIENT_TYPE_LABELS) as ClientType[]).map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={exempt.includes(t)} onChange={(e) => toggle(t, e.target.checked)} />{CLIENT_TYPE_LABELS[t]}
              </label>
            ))}
          </div>
        </div>
      </div>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-gray-500">
        <li>Maket mijoz tomonidan tasdiqlanmaguncha pechatga o'tmaydi</li>
        <li>Ochiq ishlab chiqarish vazifasi bor buyurtma «Tayyor» bo'lmaydi</li>
        <li>Qarzi bor buyurtmani faqat direktor sabab yozib yopadi</li>
      </ul>
      <div className="mt-6 flex justify-end">
        <Button disabled={!valid} isLoading={save.isPending} onClick={() => save.mutate()}>Saqlash</Button>
      </div>
    </Card>
  );
}
