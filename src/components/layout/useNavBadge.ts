import { useQuery } from '@tanstack/react-query';
import { leadsApi, requestsApi } from '@/api';
import { useUser } from '@/lib/auth';
import type { NavItem } from './navigation';

/** Menyudagi son: javob kutayotgan saytdan arizalar; direktorga — kutilayotgan xodim so'rovlari */
export function useNavBadge() {
  const user = useUser();
  const canSeeLeads = user.role === 'ADMIN' || user.role === 'MANAGER';
  const { data } = useQuery({ queryKey: ['leads', 'count'], queryFn: leadsApi.count, enabled: canSeeLeads, refetchInterval: 30_000 });
  const { data: pending } = useQuery({
    queryKey: ['requests', 'all', 'PENDING'], queryFn: () => requestsApi.all('PENDING'), enabled: user.role === 'ADMIN', refetchInterval: 60_000,
  });
  return (item: NavItem) => (item.badge === 'leads' ? data?.new ?? 0 : item.badge === 'requests' ? pending?.length ?? 0 : 0);
}
