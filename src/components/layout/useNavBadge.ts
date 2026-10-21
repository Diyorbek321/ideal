import { useQuery } from '@tanstack/react-query';
import { leadsApi } from '@/api';
import { useUser } from '@/lib/auth';
import type { NavItem } from './navigation';

/** Menyudagi son: hozircha faqat javob kutayotgan saytdan arizalar */
export function useNavBadge() {
  const user = useUser();
  const canSeeLeads = user.role === 'ADMIN' || user.role === 'MANAGER';
  const { data } = useQuery({ queryKey: ['leads', 'count'], queryFn: leadsApi.count, enabled: canSeeLeads, refetchInterval: 30_000 });
  return (item: NavItem) => (item.badge === 'leads' ? data?.new ?? 0 : 0);
}
