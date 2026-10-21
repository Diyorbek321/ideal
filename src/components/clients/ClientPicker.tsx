import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, X } from 'lucide-react';
import { clientsApi } from '@/api';
import type { Client } from '@/types';
import { CLIENT_TYPE_LABELS } from '@/lib/labels';
import { formatPhone } from '@/lib/utils';
import { ClientFormModal } from './ClientFormModal';

interface Props {
  value: Pick<Client, 'id' | 'name'> | null;
  onChange: (c: Client | null) => void;
  error?: string;
}

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// Nom, STIR yoki telefon bo'yicha qidiradi; topilmasa shu yerning o'zida yangi mijoz yaratiladi
export function ClientPicker({ value, onChange, error }: Props) {
  const [q, setQ] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const search = useDebounced(q);
  const { data, isFetching } = useQuery({
    queryKey: ['clients', 'picker', search],
    queryFn: () => clientsApi.list({ search, limit: 8 }),
    enabled: open,
  });

  if (value) {
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">Mijoz *</label>
        <div className="flex h-10 items-center justify-between rounded-md border border-brand-200 bg-brand-50 px-3 text-sm">
          <span className="font-medium text-brand-900">{value.name}</span>
          <button type="button" onClick={() => onChange(null)} className="text-brand-600 hover:text-brand-700" aria-label="Mijozni olib tashlash">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-1.5">
      <label className="text-sm font-medium text-gray-700">Mijoz *</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Nomi, STIR yoki telefon..."
          className={`h-10 w-full rounded-md border bg-white pl-10 pr-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-4 focus:ring-brand-300/50 ${error ? 'border-red-500' : 'border-gray-300'}`}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          {isFetching && <p className="px-3 py-2 text-xs text-gray-400">Qidirilmoqda...</p>}
          {data?.data.map((c) => (
            <button
              type="button"
              key={c.id}
              onMouseDown={() => { onChange(c); setQ(''); }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
            >
              <span>
                <span className="font-medium text-gray-900">{c.name}</span>
                <span className="ml-2 text-xs text-gray-400">{CLIENT_TYPE_LABELS[c.type]}</span>
              </span>
              <span className="text-xs text-gray-500">{formatPhone(c.phones[0])}</span>
            </button>
          ))}
          <button
            type="button"
            onMouseDown={() => setCreating(true)}
            className="flex w-full items-center border-t border-gray-100 px-3 py-2 text-left text-sm font-medium text-brand-600 hover:bg-brand-50"
          >
            <Plus className="mr-2 h-4 w-4" /> Yangi mijoz{q ? `: "${q}"` : ''}
          </button>
        </div>
      )}
      <ClientFormModal open={creating} onClose={() => setCreating(false)} initialName={q} onSaved={(c) => { onChange(c); setQ(''); }} />
    </div>
  );
}
