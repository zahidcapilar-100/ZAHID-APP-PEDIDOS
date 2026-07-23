import React, { useMemo } from 'react';
import {
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Package,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { OrderPayload } from '../../types';

interface AdminDashboardProps {
  orders: OrderPayload[];
  loading: boolean;
  onViewOrders: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  orders,
  loading,
  onViewOrders,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;

    let countToday = 0;
    let countThisMonth = 0;
    let countPrevMonth = 0;

    let revenueThisMonth = 0;
    let revenuePrevMonth = 0;

    let countPending = 0;

    const paymentMethodsMap: Record<string, number> = {
      Transferencia: 0,
      'Link de pago': 0,
      QR: 0,
    };

    const productMap: Record<string, { count: number; total: number }> = {};

    orders.forEach((o) => {
      const orderDate = new Date(o.fecha);
      const isVal = !isNaN(orderDate.getTime());
      if (!isVal) return;

      const dateStr = orderDate.toISOString().split('T')[0];
      const y = orderDate.getFullYear();
      const m = orderDate.getMonth();

      // Today
      if (dateStr === todayStr) {
        countToday++;
      }

      // This Month
      if (y === currentYear && m === currentMonth) {
        countThisMonth++;
        if (o.estado !== 'Cancelado') {
          revenueThisMonth += o.total || 0;
        }
      }

      // Prev Month
      if (y === prevMonthYear && m === prevMonth) {
        countPrevMonth++;
        if (o.estado !== 'Cancelado') {
          revenuePrevMonth += o.total || 0;
        }
      }

      // Pending
      if (o.estado === 'Pendiente de pago') {
        countPending++;
      }

      // Payment Method distribution
      const method = o.metodo_pago || 'Transferencia';
      paymentMethodsMap[method] = (paymentMethodsMap[method] || 0) + 1;

      // Product sales
      const pName = o.producto || 'Producto';
      if (!productMap[pName]) {
        productMap[pName] = { count: 0, total: 0 };
      }
      productMap[pName].count += o.cantidad || 1;
      if (o.estado !== 'Cancelado') {
        productMap[pName].total += o.total || 0;
      }
    });

    // MoM Percentages
    const orderDiffPercent =
      countPrevMonth > 0
        ? Math.round(((countThisMonth - countPrevMonth) / countPrevMonth) * 100)
        : countThisMonth > 0
        ? 100
        : 0;

    const revenueDiffPercent =
      revenuePrevMonth > 0
        ? Math.round(((revenueThisMonth - revenuePrevMonth) / revenuePrevMonth) * 100)
        : revenueThisMonth > 0
        ? 100
        : 0;

    // Daily trend last 30 days
    const dailyData: { date: string; label: string; pedidos: number; ingresos: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const dLabel = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });

      const dayOrders = orders.filter((o) => {
        const od = new Date(o.fecha);
        return !isNaN(od.getTime()) && od.toISOString().split('T')[0] === dStr;
      });

      const dayRevenue = dayOrders
        .filter((o) => o.estado !== 'Cancelado')
        .reduce((sum, o) => sum + (o.total || 0), 0);

      dailyData.push({
        date: dStr,
        label: dLabel,
        pedidos: dayOrders.length,
        ingresos: dayRevenue,
      });
    }

    // Payment methods array for chart
    const paymentMethodsData = Object.keys(paymentMethodsMap).map((key) => ({
      name: key,
      pedidos: paymentMethodsMap[key],
    }));

    // Top 5 Products
    const topProducts = Object.keys(productMap)
      .map((p) => ({
        nombre: p,
        count: productMap[p].count,
        total: productMap[p].total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      countToday,
      countThisMonth,
      revenueThisMonth,
      countPending,
      orderDiffPercent,
      revenueDiffPercent,
      dailyData,
      paymentMethodsData,
      topProducts,
    };
  }, [orders]);

  if (loading && orders.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-slate-900 border border-slate-800 rounded-3xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today Orders */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Pedidos Hoy
            </span>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-white font-mono">
              {metrics.countToday}
            </span>
            <span className="text-xs text-slate-400">pedidos nuevos</span>
          </div>
        </div>

        {/* Card 2: This Month Orders */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Pedidos del Mes
            </span>
            <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-2xl border border-sky-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-white font-mono">
              {metrics.countThisMonth}
            </span>
            <div
              className={`flex items-center text-xs font-bold font-mono ${
                metrics.orderDiffPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {metrics.orderDiffPercent >= 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span>{Math.abs(metrics.orderDiffPercent)}% vs mes ant.</span>
            </div>
          </div>
        </div>

        {/* Card 3: Revenue This Month */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Ingresos del Mes
            </span>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
              {formatCurrency(metrics.revenueThisMonth)}
            </span>
            <div
              className={`flex items-center text-xs font-bold font-mono mt-1 ${
                metrics.revenueDiffPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {metrics.revenueDiffPercent >= 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span>{Math.abs(metrics.revenueDiffPercent)}% vs mes ant.</span>
            </div>
          </div>
        </div>

        {/* Card 4: Pending Payments */}
        <div
          onClick={onViewOrders}
          className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 p-5 rounded-3xl space-y-3 shadow-xl cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Pendientes de Pago
            </span>
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-amber-400 font-mono">
              {metrics.countPending}
            </span>
            <span className="text-xs text-amber-300 font-medium underline">
              Ver pedidos &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart: Orders per Day (Last 30 Days) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Evolución de Pedidos (Últimos 30 Días)
              </h3>
              <p className="text-xs text-slate-400">
                Cantidad diaria de pedidos registrados
              </p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.dailyData}>
                <XAxis
                  dataKey="label"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '16px',
                    color: '#fff',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="pedidos"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 3 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: Payment Methods */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Métodos de Pago
            </h3>
            <p className="text-xs text-slate-400">Distribución de preferencias de clientes</p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.paymentMethodsData}>
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '16px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="pedidos" radius={[8, 8, 0, 0]}>
                  {metrics.paymentMethodsData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? '#10b981' : index === 1 ? '#0284c7' : '#f59e0b'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top 5 Products Ranking */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Top 5 Productos Más Vendidos
            </h3>
          </div>
          <span className="text-xs text-slate-400">Por facturación total</span>
        </div>

        {metrics.topProducts.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No hay datos de ventas aún.</p>
        ) : (
          <div className="space-y-3">
            {metrics.topProducts.map((p, idx) => {
              const maxRev = metrics.topProducts[0]?.total || 1;
              const percent = Math.min(100, Math.round((p.total / maxRev) * 100));

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">
                      {idx + 1}. {p.nombre}
                    </span>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-slate-400">{p.count} un.</span>
                      <strong className="text-emerald-400">{formatCurrency(p.total)}</strong>
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
