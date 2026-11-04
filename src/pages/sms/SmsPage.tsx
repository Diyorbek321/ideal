import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/States';
import { SmsOverview } from '@/components/sms/SmsOverview';
import { SmsLog } from '@/components/sms/SmsLog';
import { SmsTemplates } from '@/components/sms/SmsTemplates';

const TABS = [
  { id: 'overview', label: 'Umumiy' },
  { id: 'log', label: 'Jurnal' },
  { id: 'templates', label: 'Shablonlar' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export default function SmsPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = TABS.some((t) => t.id === raw) ? (raw as Tab) : 'overview';

  return (
    <div className="space-y-6">
      <PageHeader title="SMS" subtitle="Mijozlarga ketadigan avtomatik xabarlar, jurnal va Eskiz shablonlari" />
      <div className="flex gap-2 overflow-x-auto" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setParams(t.id === 'overview' ? {} : { tab: t.id })}
            className={cn('shrink-0 rounded-xl px-4 py-2 text-sm', tab === t.id ? 'bg-brand-400 font-semibold text-white' : 'bg-white font-medium text-gray-600 hover:bg-gray-100')}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'overview' ? <SmsOverview /> : tab === 'log' ? <SmsLog /> : <SmsTemplates />}
    </div>
  );
}
