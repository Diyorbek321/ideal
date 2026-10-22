import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { cn, formatCurrency } from '@/lib/utils';

// Recharts CSS o'zgaruvchilarni o'qimaydi — qiymatlar index.css dagi token'lar bilan bir xil
export const C = {
  ink: '#0E1726',
  yellow: '#FFC20E',
  red: '#DC2626',
  green: '#059669',
  grid: '#EEEEEA',
  axis: '#5D6676',
};
// Kategoriyalar uchun ketma-ket ranglar (sariq + neytral + yordamchi)
export const PALETTE = ['#FFC20E', '#0E1726', '#2563EB', '#059669', '#DC2626', '#9333EA', '#EA580C', '#0891B2', '#65A30D', '#94A3B8'];

export const axisMoney = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} mlrd`;
  if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} mln`;
  if (a >= 1000) return `${Math.round(v / 1000)} ming`;
  return String(v);
};

const tooltipStyle = { borderRadius: 12, borderColor: '#E4E5E1', fontSize: 13 };

interface Series { key: string; name: string; color: string; type?: 'bar' | 'line' }

/** Oyma-oy ustunlar (masalan, tushum va xarajat) + ixtiyoriy chiziq (foyda) */
export function MonthlyBars({ data, series, className = 'h-72', money = true }: {
  data: Array<Record<string, string | number | null>>; series: Series[]; className?: string; money?: boolean;
}) {
  return (
    <div className={cn('-ml-3', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid stroke={C.grid} vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: C.axis }} />
          <YAxis tickLine={false} axisLine={false} width={56} tick={{ fontSize: 11, fill: C.axis }} tickFormatter={money ? axisMoney : undefined} allowDecimals={!money} />
          <Tooltip formatter={(v) => (money ? formatCurrency(Number(v)) : String(v))} contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span style={{ color: C.ink }}>{v}</span>} />
          {series.map((s) => (s.type === 'line'
            ? <Line key={s.key} type="linear" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
            : <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[6, 6, 0, 0]} maxBarSize={36} isAnimationActive={false} />))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Gorizontal ustunlar: "nimaga qancha" */
export function HorizontalBars({ data, className, money = true }: {
  data: Array<{ name: string; value: number }>; className?: string; money?: boolean;
}) {
  const h = Math.max(160, data.length * 36 + 20);
  return (
    <div className={className} style={{ height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid stroke={C.grid} horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: C.axis }} tickFormatter={money ? axisMoney : undefined} />
          <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={120} tick={{ fontSize: 12, fill: C.ink }} />
          <Tooltip formatter={(v) => (money ? formatCurrency(Number(v)) : String(v))} contentStyle={tooltipStyle} />
          <Bar dataKey="value" name={money ? 'Summa' : 'Soni'} radius={[0, 6, 6, 0]} maxBarSize={22} isAnimationActive={false}>
            {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Ulushlar halqasi + izoh ro'yxati */
export function Donut({ data, money = true }: { data: Array<{ name: string; value: number }>; money?: boolean }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-48 w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="100%" paddingAngle={1} isAnimationActive={false}>
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="#fff" />)}
            </Pie>
            <Tooltip formatter={(v) => (money ? formatCurrency(Number(v)) : String(v))} contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-1.5 text-sm">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="min-w-0 flex-1 truncate text-gray-700">{d.name}</span>
            <span className="tabular-nums font-semibold text-gray-900">{money ? formatCurrency(d.value) : d.value}</span>
            <span className="w-12 text-right tabular-nums text-gray-500">{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Kichik ko'rsatkich kartasi */
export function Stat({ label, value, hint, tone = 'default' }: {
  label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: 'default' | 'good' | 'bad' | 'brand';
}) {
  return (
    <div className={cn(
      'rounded-2xl border p-4 sm:p-5',
      tone === 'brand' ? 'border-0 bg-brand-400 text-gray-900'
        : tone === 'bad' ? 'border-red-200 bg-red-50 text-red-800'
          : tone === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-white',
    )}>
      <p className={cn('text-xs font-medium sm:text-sm', tone === 'default' ? 'text-gray-500' : 'opacity-80')}>{label}</p>
      <p className="mt-1 font-display text-lg font-bold tabular-nums sm:text-2xl">{value}</p>
      {hint && <p className={cn('mt-1 text-xs sm:text-sm', tone === 'default' && 'text-gray-500')}>{hint}</p>}
    </div>
  );
}

/** O'tgan oyga nisbatan o'zgarish: ↑ 12% */
export function Delta({ now, prev, inverse = false }: { now: number; prev: number | null | undefined; inverse?: boolean }) {
  if (!prev) return null;
  const p = Math.round(((now - prev) / Math.abs(prev)) * 100);
  if (p === 0) return <span className="text-gray-500">o'tgan oy bilan teng</span>;
  const good = inverse ? p < 0 : p > 0;
  return <span className={cn('font-semibold', good ? 'text-emerald-700' : 'text-red-700')}>{p > 0 ? '↑' : '↓'} {Math.abs(p)}% o'tgan oyga nisbatan</span>;
}
