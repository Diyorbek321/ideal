/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OrderStatus } from '@/types';
import { Badge } from '../ui/Badge';

const statusConfig: Record<OrderStatus, { label: string; variant: any }> = {
  YANGI: { label: 'Yangi', variant: 'info' },
  NARX_HISOBLANDI: { label: 'Narxi hisoblandi', variant: 'default' },
  DIZAYNDA: { label: 'Dizaynda', variant: 'warning' },
  TASDIQDA: { label: 'Tasdiqda', variant: 'warning' },
  ISHLAB_CHIQARISHDA: { label: 'Ishlab chiqarishda', variant: 'info' },
  TAYYOR: { label: 'Tayyor', variant: 'success' },
  ORNATISHDA: { label: 'O\'rnatishda', variant: 'info' },
  YAKUNLANDI: { label: 'Yakunlandi', variant: 'success' },
  BEKOR_QILINDI: { label: 'Bekor qilindi', variant: 'error' },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
