import { AlertTriangle, Inbox } from 'lucide-react';
import { errorMessage } from '@/api';
import { Button } from './Button';

export function Loading({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2.5 p-4" aria-busy="true" aria-label="Yuklanmoqda">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-gray-100" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-2/5 animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-gray-100/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Empty({ text = 'Ma\'lumot yo\'q', icon: Icon = Inbox }: { text?: string; icon?: typeof Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-gray-600">{text}</p>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-red-700">{errorMessage(error)}</p>
      {onRetry && <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>Qayta urinish</Button>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-xl font-bold text-gray-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 sm:gap-3">{actions}</div>}
    </div>
  );
}
