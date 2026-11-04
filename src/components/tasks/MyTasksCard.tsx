import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Banknote, Brush, ChevronRight, ClipboardList, Inbox, Printer, Truck, UserPlus, type LucideIcon } from 'lucide-react';
import { tasksApi, type MyTask, type TaskKind } from '@/api';
import { Card } from '@/components/ui/Card';
import { Empty, ErrorState, Loading } from '@/components/ui/States';
import { cn } from '@/lib/utils';
import { dueText, groupTasks, type BucketKey } from './taskBuckets';

const KIND_ICON: Record<TaskKind, LucideIcon> = {
  ORDER: ClipboardList, DESIGN: Brush, PRODUCTION: Printer, INSTALLATION: Truck, DEBT: Banknote, LEAD: UserPlus, REQUEST: Inbox,
};
const SHOW = 5;
// Uzoq muddatli guruhlar boshida yig'iq turadi
const COLLAPSED: BucketKey[] = ['later', 'none'];

function TaskRow({ t, now, late }: { t: MyTask; now: Date; late: boolean }) {
  const navigate = useNavigate();
  const Icon = KIND_ICON[t.kind];
  return (
    <li>
      <button onClick={() => navigate(t.link)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-gray-50">
        <Icon className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">{t.title}</p>
          <p className="truncate text-xs text-gray-500">{t.subtitle}</p>
        </div>
        <span className={cn('shrink-0 text-xs', late ? 'font-semibold text-red-700' : 'text-gray-600')}>{dueText(t.dueAt, now)}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" aria-hidden />
      </button>
    </li>
  );
}

/** "Mening ishlarim": qilinishi kerak bo'lgan ishlar vaqt guruhlari bo'yicha (muddati o'tgan → bugun → ...) */
export function MyTasksCard({ className }: { className?: string }) {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['my-tasks'], queryFn: tasksApi.my, refetchInterval: 60_000 });
  const [open, setOpen] = React.useState<Partial<Record<BucketKey, boolean>>>({});
  const now = new Date();

  const groups = data ? groupTasks(data, now) : [];
  const overdue = groups.find((g) => g.key === 'overdue')?.items.length ?? 0;

  return (
    <Card title="Mening ishlarim" className={className}
      description={data ? `${data.length} ta ish${overdue ? ` · ${overdue} tasi kechikkan` : ''}` : 'Vaqti bo\'yicha'}>
      {isLoading ? <Loading rows={3} />
        : error ? <ErrorState error={error} onRetry={refetch} />
          : !groups.length ? <Empty text="Hozircha ish yo'q" />
            : (
              <div className="space-y-4">
                {groups.map((g) => {
                  const expanded = open[g.key] ?? !COLLAPSED.includes(g.key);
                  const shown = expanded ? g.items : [];
                  const visible = open[g.key] ? shown : shown.slice(0, SHOW);
                  const hidden = g.items.length - visible.length;
                  return (
                    <section key={g.key}>
                      <h4 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <span className={cn('h-2 w-2 rounded-full', g.tone)} aria-hidden />
                        {g.label} <span className="font-normal text-gray-400">({g.items.length})</span>
                      </h4>
                      {visible.length > 0 && (
                        <ul className="-mx-2 divide-y divide-gray-100">
                          {visible.map((t) => <TaskRow key={t.id} t={t} now={now} late={g.key === 'overdue'} />)}
                        </ul>
                      )}
                      {hidden > 0 && (
                        <button onClick={() => setOpen((o) => ({ ...o, [g.key]: true }))} className="mt-1 text-xs font-medium text-brand-700 hover:underline">
                          {expanded ? `Yana ${hidden} ta` : `Ko'rsatish (${hidden} ta)`}
                        </button>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
    </Card>
  );
}
