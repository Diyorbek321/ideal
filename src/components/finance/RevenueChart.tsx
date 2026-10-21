import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '@/lib/utils';

// Recharts CSS o'zgaruvchilarni o'qimaydi — qiymatlar index.css dagi token'lar bilan bir xil
const INK = '#0E1726';
const YELLOW = '#FFC20E';
const GRID = '#EEEEEA';
const AXIS = '#5D6676';

const axisMoney = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)} mln` : `${Math.round(v / 1000)} ming`);

export function RevenueChart({ data, className = 'h-56 sm:h-64' }: { data: Array<{ day: string; amount: number }>; className?: string }) {
  return (
    <div className={`-ml-3 ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={YELLOW} stopOpacity={0.55} />
              <stop offset="100%" stopColor={YELLOW} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: AXIS }} minTickGap={16} />
          <YAxis tickLine={false} axisLine={false} width={56} tick={{ fontSize: 11, fill: AXIS }} tickFormatter={axisMoney} />
          <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ borderRadius: 12, borderColor: '#E4E5E1', fontSize: 13 }} />
          <Area type="monotone" dataKey="amount" name="Tushum" stroke={INK} strokeWidth={2} fill="url(#revenue-fill)"
            dot={data.length === 1 ? { r: 4, fill: INK } : false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
