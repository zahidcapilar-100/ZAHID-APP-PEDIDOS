import React, { useState, useEffect } from 'react';
import { DBOrder, fetchAdminOrders } from '../../lib/supabase';
import { formatCurrency } from '../../config';
import {
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Clock,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Layers,
  Award,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
} from 'recharts';

interface AdminDashboardProps {
  onNavigateToOrders: (filterSync?: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateToOrders,
}) => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<DBOrder[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    const { orders: fetched } = await fetchAdminOrders({ pageSize: 500 });
    setOrders(fetched);
    setLoading(false);
  };

  // Metrics Calculations
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const pedidosHoy = orders.filter(
    (o) => new Date(o.created_at).getTime() >= startOfToday
  ).length;

  const pedidosMes = orders.filter(
    (o) => new Date(o.created_at).getTime() >= startOfMonth
  ).length;

  const ingresosMes = orders
    .filter((o) => new Date(o.created_at).getTime() >= startOfMonth)
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  const pendientesPago = orders.filter(
    (o) => o.estado === 'Pendiente de pago'
  ).length;

  const notionErrorsCount = orders.filter(
    (o) => o.notion_sync === 'error'
  ).length;

  // Chart Data: Last 30 Days Orders
  const last30DaysData: { date: string; count: number; total: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const displayLabel = `${d.getDate()}/${d.getMonth() + 1}`;

    const daysOrders = orders.filter(
      (o) => o.created_at.split('T')[0] === dateStr
    );

    last30DaysData.push({
      date: displayLabel,
      count: daysOrders.length,
      total: daysOrders.reduce((sum, o) => sum + Number(o.total || 0), 0),
    });
  }

  // Payment Method Breakdown
  const paymentMethodsMap: Record<string, number> = {
    transferencia: 0,
    link: 0,
    qr: 0,
  };
  orders.forEach((o) => {
    if (paymentMethodsMap[o.metodo_pago] !== undefined) {
      paymentMethodsMap[o.metodo_pago] += 1;
    }
  });

  const paymentData = [
    { name: 'Transferencia', key: 'transferencia', value: paymentMethodsMap.transferencia, color: '#059669' },
    { name: 'Link de Pago', key: 'link', value: paymentMethodsMap.link, color: '#0284c7' },
    { name: 'Código QR', key: 'qr', value: paymentMethodsMap.qr, color: '#7c3aed' },
  ];

  // Top Products
  const productCountMap: Record<string, { count: number; revenue: number }> = {};
  orders.forEach((o) => {
    if (!productCountMap[o.producto]) {
      productCountMap[o.producto] = { count: 0, revenue: 0 };
    }
    productCountMap[o.producto].count += Number(o.cantidad || 1);
    productCountMap[o.producto].revenue += Number(o.total || 0);
  });

  const topProducts = Object.entries(productCountMap)
    .map(([name, stat]) => ({ name, ...stat }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-xl w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-2xl" />
          ))}
        </div>
        <div className="h-72 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notion Error Alert Banner */}
      {notionErrorsCount > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-amber-900">
                Atención: Hay {notionErrorsCount} pedido(s) con error de sincronización
              </h3>
              <p className="text-xs text-amber-800">
                No se pudieron enviar automáticamente a tu workspace de Notion. Puedes reintentar la sincronización.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToOrders('error')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs active:scale-95"
          >
            <span>Ver pedidos con error</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Dashboard General
          </h2>
          <p className="text-xs text-slate-500">
            Resumen en tiempo real de ventas, pagos y sincronización
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadDashboardData()}
          className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-all cursor-pointer self-start sm:self-auto"
        >
          Actualizar Datos
        </button>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pedidos Hoy */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Pedidos de Hoy
            </span>
            <span className="text-3xl font-extrabold text-slate-900 font-mono">
              {pedidosHoy}
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold block">
              + Registrados hoy
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Pedidos Mes */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Pedidos del Mes
            </span>
            <span className="text-3xl font-extrabold text-slate-900 font-mono">
              {pedidosMes}
            </span>
            <span className="text-[11px] text-slate-500 font-medium block">
              Acumulado mes actual
            </span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Ingresos Mes */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Ingresos del Mes
            </span>
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              {formatCurrency(ingresosMes)}
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold block">
              Suma total ventas
            </span>
          </div>
          <div className="p-3 bg-slate-900 text-emerald-400 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Pendientes Pago */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Pendientes de Pago
            </span>
            <span className="text-3xl font-extrabold text-amber-600 font-mono">
              {pendientesPago}
            </span>
            <span className="text-[11px] text-amber-700 font-medium block">
              Por confirmar voucher
            </span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Line Chart: Pedidos por día (últimos 30 días) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">
              Tendencia de Pedidos (Últimos 30 días)
            </h3>
            <p className="text-xs text-slate-500">
              Cantidad de pedidos recibidos por fecha
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={last30DaysData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  color: '#fff',
                  border: 'none',
                  fontSize: '12px',
                }}
                formatter={(val: any) => [`${val} pedidos`, 'Cantidad']}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#059669"
                strokeWidth={3}
                dot={{ r: 3, fill: '#059669' }}
                activeDot={{ r: 6, fill: '#10b981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Methods Breakdown + Top 5 Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Chart */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <h3 className="font-extrabold text-slate-900 text-base">
              Métodos de Pago Utilizados
            </h3>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`${val} pedidos`, 'Total']}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {paymentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Best Sellers */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="font-extrabold text-slate-900 text-base">
              Top Productos Más Vendidos
            </h3>
          </div>

          <div className="space-y-3">
            {topProducts.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center italic">
                Aún no hay suficientes registros de ventas para calcular el ranking.
              </p>
            ) : (
              topProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-mono font-extrabold text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-slate-900 text-xs truncate max-w-[200px] sm:max-w-[260px]">
                        {p.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {p.count} unidades vendidas
                      </p>
                    </div>
                  </div>

                  <span className="font-extrabold text-emerald-600 font-mono text-xs">
                    {formatCurrency(p.revenue)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
