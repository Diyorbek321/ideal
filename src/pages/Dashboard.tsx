import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Clock, ShoppingBag, TrendingUp, Wallet, AlertTriangle } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { reportsApi } from '@/api';
import { Card } from '@/components/ui/Card';
import { Empty, ErrorState, Loading } from '@/components/ui/States';
import { StatusBadge } from '@/components/orders/StatusBadge';
import { SOURCE_LABELS, STATUS_LABELS, UNIT_LABELS } from '@/lib/labels';
import { cn, deadlineText, formatCurrency, formatHours } from '@/lib/utils';

const SOURCE_COLORS = ['#2563eb', '#0ea5e9', '#a855f7', '#f59e0b'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: reportsApi.dashboard,
    refetchInterval: 60_000,
  });

  if (isLoading) return <Loading rows={8} />;
  if (error || !data) return <ErrorState error={error} onRetry={refetch} />;

  const { kpi } = data;
  const kpis = [
    { label: 'Bugungi buyurtmalar', value: kpi.todayOrders, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50', to: '/orders' },
    { label: 'Jarayondagi ishlar', value: kpi.inProgress, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', to: '/orders?view=kanban' },
    { label: 'Tasdiqlash kutilmoqda', value: kpi.waitingApproval, icon: AlertCircle, color: 'text-purple-600', bg: 'bg-purple-50', to: '/orders?status=TASDIQDA' },
    { label: 'Muddati o\'tgan', value: kpi.overdue, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', to: '/orders?overdueOnly=true' },
    { label: 'Oy tushumi', value: formatCurrency(kpi.revenueThisMonth), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', to: '/finance' },
    { label: 'Umumiy nasiya', value: formatCurrency(kpi.totalDebt), icon: Wallet, color: 'text-red-600', bg: 'bg-red-50', to: '/finance' },
  ];

  const sourceData = data.ordersBySource.map((s) => ({ name: SOURCE_LABELS[s.source], value: s.count }));
  const sourceTotal = sourceData.reduce((s, x) => s + x.value, 0);
  const statusData = data.ordersByStatus.map((s) => ({ name: STATUS_LABELS[s.status], value: s.count }));
  const revenueData = data.revenueByDay.map((r) => ({ day: r.day.slice(8, 10) + '.' + r.day.slice(5, 7), amount: r.amount }));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <Link key={k.label} to={k.to}>
            <Card className="flex h-full flex-col items-center space-y-2 p-4 text-center transition-shadow hover:shadow-md">
              <div className={cn('rounded-full p-3', k.bg)}>
                <k.icon className={cn('h-6 w-6', k.color)} />
              </div>
              <p className="text-sm font-medium text-gray-500">{k.label}</p>
              <p className="text-xl font-bold text-gray-900">{k.value}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card title="Faol buyurtmalar statusi bo'yicha">
          {statusData.length ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="Buyurtmalar" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty text="Faol buyurtmalar yo'q" />}
        </Card>

        <Card title="Buyurtma manbalari (shu oy)">
          {sourceTotal ? (
            <div className="flex h-80 flex-col items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {sourceData.map((_, i) => <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-4">
                {sourceData.map((s, i) => (
                  <div key={s.name} className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                    <span className="text-sm text-gray-600">{s.name} ({Math.round((s.value / sourceTotal) * 100)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <Empty text="Shu oy buyurtmalar yo'q" />}
        </Card>
      </div>

      <Card title="Tushum (oxirgi 30 kun)">
        {revenueData.length ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" />
                <YAxis tickFormatter={(v: number) => `${Math.round(v / 1_000_000)} mln`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Line type="monotone" dataKey="amount" name="Tushum" stroke="#10b981" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <Empty text="To'lovlar hali yo'q" />}
      </Card>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Card title="Muammoli buyurtmalar" description="SLA yoki muddati o'tganlar" className="lg:col-span-2">
          {data.problemOrders.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-3 font-semibold text-gray-900">Nomer</th>
                    <th className="py-3 font-semibold text-gray-900">Mijoz</th>
                    <th className="py-3 font-semibold text-gray-900">Status</th>
                    <th className="py-3 font-semibold text-gray-900">Shu holatda</th>
                    <th className="py-3 font-semibold text-gray-900">Muddat</th>
                  </tr>
                </thead>
                <tbody>
                  {data.problemOrders.map((o) => {
                    const dl = deadlineText(o.deadline);
                    return (
                      <tr key={o.id} onClick={() => navigate(`/orders/${o.id}`)} className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <td className="py-4 font-medium text-blue-600">{o.number}</td>
                        <td className="py-4 text-gray-600">{o.client.name}</td>
                        <td className="py-4"><StatusBadge status={o.status} /></td>
                        <td className="py-4 font-medium text-red-600">
                          {formatHours((Date.now() - new Date(o.statusChangedAt).getTime()) / 3_600_000)}
                        </td>
                        <td className={cn('py-4', dl?.late ? 'font-medium text-red-600' : 'text-gray-500')}>{dl?.text ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <Empty text="Muammoli buyurtmalar yo'q" />}
        </Card>

        <Card title="Ombor: kam qolganlar">
          <div className="space-y-4">
            {data.lowStock.length ? data.lowStock.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 p-3">
                <div>
                  <p className="font-semibold text-gray-900">{m.name}</p>
                  <p className="text-xs text-gray-500">Qoldiq: {m.stock} {UNIT_LABELS[m.unit]}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-red-600">Min: {m.minStock}</p>
                  <Link to="/inventory" className="text-xs text-blue-600 hover:underline">Kirim qilish</Link>
                </div>
              </div>
            )) : <div className="py-8 text-center text-gray-500">Barcha materiallar yetarli.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
