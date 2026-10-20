import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { errorMessage } from '@/api';
import { cn } from '@/lib/utils';

interface ToastItem {
  id: number;
  kind: 'success' | 'error';
  text: string;
}

interface ToastApi {
  success: (text: string) => void;
  error: (err: unknown) => void;
}

const ToastContext = React.createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const push = React.useCallback((kind: ToastItem['kind'], text: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, kind, text }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), kind === 'error' ? 6000 : 3000);
  }, []);

  const value = React.useMemo<ToastApi>(() => ({
    success: (text) => push('success', text),
    error: (err) => push('error', errorMessage(err)),
  }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[60] flex flex-col gap-2 sm:w-96">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg bg-white',
              t.kind === 'success' ? 'border-emerald-200 text-emerald-800' : 'border-red-200 text-red-800',
            )}
          >
            {t.kind === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast faqat ToastProvider ichida ishlaydi');
  return ctx;
}
