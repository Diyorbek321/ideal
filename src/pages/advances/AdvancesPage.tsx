import { PageHeader } from '@/components/ui/States';
import { GiveAdvanceCard } from '@/components/requests/GiveAdvanceCard';
import { AdvancesListCard } from '@/components/requests/AdvancesListCard';

/** Avans berish + oy bo'yicha berilgan avanslar — direktor va menejer */
export default function AdvancesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Avanslar" subtitle="Xodimga avans berish va shu oy berilgan avanslar ro'yxati" />
      <GiveAdvanceCard />
      <AdvancesListCard />
    </div>
  );
}
