import React from 'react';
import type { FeedbackInput, HeardFrom } from '@/types';
import { HEARD_FROM_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { StarInput } from './Stars';

/** Buyurtma yakunlangach mijoz so'rovnomasi (ochiq sahifa va menejer oynasi uchun umumiy) */
export function FeedbackForm({ onSubmit, isLoading }: { onSubmit: (body: FeedbackInput) => void; isLoading?: boolean }) {
  const [f, setF] = React.useState({ rating: 0, quality: 0, speed: 0, service: 0, recommend: null as boolean | null, heardFrom: '' as HeardFrom | '', comment: '' });
  const submit = () => onSubmit({
    rating: f.rating,
    ...(f.quality ? { quality: f.quality } : {}),
    ...(f.speed ? { speed: f.speed } : {}),
    ...(f.service ? { service: f.service } : {}),
    ...(f.recommend != null ? { recommend: f.recommend } : {}),
    ...(f.heardFrom ? { heardFrom: f.heardFrom } : {}),
    ...(f.comment.trim() ? { comment: f.comment.trim() } : {}),
  });

  return (
    <div className="space-y-5">
      <StarInput label="Umumiy baho" value={f.rating} onChange={(rating) => setF({ ...f, rating })} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StarInput label="Sifat" value={f.quality} onChange={(quality) => setF({ ...f, quality })} />
        <StarInput label="Muddatga rioya" value={f.speed} onChange={(speed) => setF({ ...f, speed })} />
        <StarInput label="Muomala" value={f.service} onChange={(service) => setF({ ...f, service })} />
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium text-gray-700">Bizni tanishlaringizga tavsiya qilasizmi?</p>
        <div className="flex gap-2">
          {([[true, 'Ha'], [false, 'Yo\'q']] as const).map(([v, l]) => (
            <button key={l} type="button" onClick={() => setF({ ...f, recommend: v })}
              className={cn('h-10 flex-1 rounded-xl border text-sm font-medium', f.recommend === v ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-700')}>{l}</button>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-700">Bizni qayerdan bildingiz?</span>
        <select value={f.heardFrom} onChange={(e) => setF({ ...f, heardFrom: e.target.value as HeardFrom | '' })} className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm">
          <option value="">— tanlang —</option>
          {(Object.entries(HEARD_FROM_LABELS) as Array<[HeardFrom, string]>).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-700">Taklif yoki izoh</span>
        <textarea value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} maxLength={1000} rows={3}
          className="w-full rounded-xl border border-gray-300 p-3 text-sm" placeholder="Nimani yaxshilashimiz kerak?" />
      </label>
      <Button className="h-12 w-full" disabled={!f.rating} isLoading={isLoading} onClick={submit}>Yuborish</Button>
    </div>
  );
}
