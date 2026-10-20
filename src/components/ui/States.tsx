import { AlertTriangle, Inbox } from 'lucide-react';
import { errorMessage } from '@/api';
import { Button } from './Button';

export function Loading({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
      ))}
    </div>
  );
}

export function Empty({ text = 'Ma\'lumot yo\'q', icon: Icon = Inbox }: { text?: string; icon?: typeof Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
      <Icon className="mb-3 h-10 w-10 text-gray-200" />
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertTriangle className="mb-3 h-10 w-10 text-red-300" />
      <p className="text-sm font-medium text-red-600">{errorMessage(error)}</p>
      {onRetry && <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>Qayta urinish</Button>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}
