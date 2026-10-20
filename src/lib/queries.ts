import type { QueryClient } from '@tanstack/react-query';

// Buyurtma holati, to'lovi yoki vazifasi o'zgarganda unga bog'liq barcha ro'yxatlar yangilanadi
const ORDER_VIEWS = [
  'order', 'orders', 'dashboard', 'design-tasks', 'production', 'installations',
  'payments', 'debts', 'summary', 'client', 'clients', 'materials', 'equipment', 'sms',
];

export function invalidateOrderViews(qc: QueryClient) {
  for (const key of ORDER_VIEWS) qc.invalidateQueries({ queryKey: [key] });
}
