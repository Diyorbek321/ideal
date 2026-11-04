import type { MyTask } from '@/api';

export type BucketKey = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'none';

export const BUCKETS: ReadonlyArray<{ key: BucketKey; label: string; tone: string }> = [
  { key: 'overdue', label: 'Muddati o\'tgan', tone: 'bg-red-500' },
  { key: 'today', label: 'Bugun', tone: 'bg-orange-500' },
  { key: 'tomorrow', label: 'Ertaga', tone: 'bg-amber-400' },
  { key: 'week', label: '7 kun ichida', tone: 'bg-sky-400' },
  { key: 'later', label: 'Keyinroq', tone: 'bg-gray-300' },
  { key: 'none', label: 'Muddatsiz', tone: 'bg-gray-200' },
];

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Ish qaysi vaqt guruhiga tushadi (brauzer vaqti — Toshkent) */
export function bucketOf(dueAt: string | null, now: Date): BucketKey {
  if (!dueAt) return 'none';
  const due = new Date(dueAt).getTime();
  if (due < now.getTime()) return 'overdue';
  const days = Math.round((startOfDay(new Date(due)) - startOfDay(now)) / DAY);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days <= 7) return 'week';
  return 'later';
}

export function groupTasks(tasks: MyTask[], now: Date): Array<{ key: BucketKey; label: string; tone: string; items: MyTask[] }> {
  return BUCKETS
    .map((b) => ({ ...b, items: tasks.filter((t) => bucketOf(t.dueAt, now) === b.key) }))
    .filter((g) => g.items.length > 0);
}

const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];

/** Qisqa vaqt matni: "2 kun kechikdi", "18:00 gacha", "ertaga 10:00", "12-noy" */
export function dueText(dueAt: string | null, now: Date): string {
  if (!dueAt) return 'muddat yo\'q';
  const due = new Date(dueAt);
  const diff = due.getTime() - now.getTime();
  if (diff < 0) {
    const h = -diff / 3_600_000;
    if (h < 1) return `${Math.max(1, Math.round(h * 60))} daqiqa kechikdi`;
    if (h < 24) return `${Math.round(h)} soat kechikdi`;
    return `${Math.floor(h / 24)} kun kechikdi`;
  }
  const bucket = bucketOf(dueAt, now);
  if (bucket === 'today') return `${hhmm(due)} gacha`;
  if (bucket === 'tomorrow') return `ertaga ${hhmm(due)}`;
  return `${due.getDate()}-${MONTHS[due.getMonth()]}${bucket === 'week' ? ` ${hhmm(due)}` : ''}`;
}
