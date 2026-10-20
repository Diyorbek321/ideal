import type { OrderStatus } from '@/types';
import { STATUS_LABELS } from '@/lib/labels';
import { Badge, type BadgeProps } from '../ui/Badge';

const VARIANTS: Record<OrderStatus, NonNullable<BadgeProps['variant']>> = {
  YANGI: 'info',
  NARX_HISOBLANDI: 'default',
  DIZAYNDA: 'warning',
  TASDIQDA: 'warning',
  ISHLAB_CHIQARISHDA: 'info',
  TAYYOR: 'success',
  ORNATISHDA: 'info',
  YETKAZISHDA: 'info',
  YAKUNLANDI: 'success',
  BEKOR_QILINDI: 'error',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>;
}
