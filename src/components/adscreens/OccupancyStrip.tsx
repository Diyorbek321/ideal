import { useQuery } from '@tanstack/react-query';
import { adScreensApi } from '@/api';
import { cn } from '@/lib/utils';

interface Props {
  screenId: string;
  from?: string;
  days?: number;
  /** Shu davr ajratib ko'rsatiladi (yangi bron tanlanganda) */
  highlight?: { from: string; to: string; slots: number };
}

// Kunlik bandlik: har ustun — bir kun, balandligi band slotlar ulushi
export function OccupancyStrip({ screenId, from, days = 30, highlight }: Props) {
  const { data } = useQuery({
    queryKey: ['ad-screens', 'occupancy', screenId, from, days],
    queryFn: () => adScreensApi.occupancy(screenId, { from, days }),
  });
  if (!data) return <div className="h-16 animate-pulse rounded-xl bg-gray-100" />;

  return (
    <div>
      <div className="flex h-16 items-end gap-[2px]" role="img" aria-label="Kunlik bandlik">
        {data.days.map((d) => {
          const inRange = !!highlight && d.day >= highlight.from && d.day <= highlight.to;
          const full = inRange ? d.free < highlight.slots : d.free === 0;
          const pct = Math.max((d.used / data.maxSlots) * 100, 4);
          return (
            <div key={d.day} title={`${d.day}: ${d.used}/${data.maxSlots} band, ${d.free} bo'sh`}
              className={cn('relative h-full flex-1 rounded-t-sm', inRange ? 'bg-gray-300' : 'bg-gray-100')}>
              <div className={cn('absolute inset-x-0 bottom-0 rounded-t-sm', full ? 'bg-red-500' : d.used ? 'bg-brand-400' : 'bg-transparent')}
                style={{ height: `${pct}%` }} />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-gray-500">
        <span>{data.days[0]?.day.slice(5).split('-').reverse().join('.')}</span>
        <span>{highlight ? 'kulrang — tanlangan davr, ' : ''}sariq — band, qizil — joy yo'q</span>
        <span>{data.days.at(-1)?.day.slice(5).split('-').reverse().join('.')}</span>
      </div>
    </div>
  );
}
