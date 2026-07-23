import React, { useState, useEffect, useTransition } from 'react';
import { DBOrder, fetchAdminOrders, updateOrderStatusInDB, retryNotionSyncOrder } from '../../lib/supabase';
import { formatCurrency } from '../../config';
import { OrderDetailModal } from './OrderDetailModal';
import {
  Search,
  Filter,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  MoreHorizontal,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface AdminOrdersProps {
  initialSyncFilter?: string;
}

export const AdminOrders: React.FC<AdminOrdersProps> = ({ initialSyncFilter }) => {
  const [orders, setOrders] = useState<DBOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [filterMetodo, setFilterMetodo] = useState('todos');
  const [filterSync, setFilterSync] = useState(initialSyncFilter || 'todos');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Selected Order for Modal
  const [selectedOrder, setSelectedOrder] = useState<DBOrder | null>(null);

  // Sync Retry Loading States
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [bulkRetrying, setBulkRetrying] = useState(false);

  // Debounce search term 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadOrders();
  }, [debouncedSearch, filterEstado, filterMetodo, filterSync, currentPage]);

  const loadOrders = async () => {
    setLoading(true);
    const { orders: fetched, totalCount: total } = await fetchAdminOrders({
      search: debouncedSearch,
      estado: filterEstado,
      metodoPago: filterMetodo,
      notionSync: filterSync,
      page: currentPage,
      pageSize,
    });
    setOrders(fetched);
    setTotalCount(total);
    setLoading(false);
  };

  // Inline Status Change with Optimistic Update
  const handleInlineStatusChange = async (orderId: string, newStatus: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, estado: newStatus } : o))
    );
    await updateOrderStatusInDB(orderId, newStatus);
  };

  // Single Sync Retry
  const handleRetrySingleSync = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRetryingId(orderId);
    await retryNotionSyncOrder(orderId);
    setRetryingId(null);
    loadOrders();
  };

  // Bulk Retry for all errored orders
  const handleBulkRetrySync = async () => {
    const errorOrders = orders.filter((o) => o.notion_sync === 'error');
    if (errorOrders.length === 0) return;

    setBulkRetrying(true);
    for (const ord of errorOrders) {
      await retryNotionSyncOrder(ord.id);
    }
    setBulkRetrying(false);
    loadOrders();
  };

  // Export CSV respecting current filters
  const handleExportCSV = () => {
    if (orders.length === 0) return;

    const headers = [
      'Numero Pedido',
      'Fecha',
      'Cliente',
      'WhatsApp',
      'Email',
      'Ciudad',
      'Producto',
      'Cantidad',
      'Precio Unitario',
      'Total',
      'Metodo Pago',
      'Estado',
      'Notion Sync',
      'Notas',
    ];

    const rows = orders.map((o) => [
      `"${o.numero_pedido}"`,
      `"${new Date(o.created_at).toLocaleString('es-CO')}"`,
      `"${o.nombre.replace(/"/g, '""')}"`,
      `"${o.whatsapp}"`,
      `"${o.email}"`,
      `"${o.ciudad.replace(/"/g, '""')}"`,
      `"${o.producto.replace(/"/g, '""')}"`,
      o.cantidad,
      o.precio_unitario,
      o.total,
      `"${o.metodo_pago}"`,
      `"${o.estado}"`,
      `"${o.notion_sync}"`,
      `"${(o.notas || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `pedidos_capilaris_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Page Header & CSV Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Gestión de Pedidos
          </h2>
          <p className="text-xs text-slate-500">
            Total de {totalCount} pedidos registrados en la plataforma
          </p>
        </div>

        <div className="flex items-center gap-3">
          {orders.some((o) => o.notion_sync === 'error') && (
            <button
              type="button"
              onClick={handleBulkRetrySync}
              disabled={bulkRetrying}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${bulkRetrying ? 'animate-spin' : ''}`} />
              <span>Reintentar errores ({orders.filter((o) => o.notion_sync === 'error').length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Filters and Search Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative col-span-1 sm:col-span-2 lg:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, WhatsApp, email o #pedido..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>

          {/* Filter Estado */}
          <select
            value={filterEstado}
            onChange={(e) => {
              setFilterEstado(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="todos">Todos los Estados</option>
            <option value="Pendiente de pago">⏳ Pendiente de pago</option>
            <option value="Pagado">✅ Pagado</option>
            <option value="Enviado">🚚 Enviado</option>
            <option value="Cancelado">❌ Cancelado</option>
          </select>

          {/* Filter Método Pago */}
          <select
            value={filterMetodo}
            onChange={(e) => {
              setFilterMetodo(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="todos">Todos los Métodos de Pago</option>
            <option value="transferencia">Transferencia Bancaria</option>
            <option value="link">Link de Pago</option>
            <option value="qr">Código QR</option>
          </select>

          {/* Filter Notion Sync */}
          <select
            value={filterSync}
            onChange={(e) => {
              setFilterSync(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="todos">Cualquier Estado Sync Notion</option>
            <option value="ok">🟢 Sincronizado (OK)</option>
            <option value="error">🔴 Error de Sincronización</option>
            <option value="pendiente">🟡 Pendiente de Sincronizar</option>
          </select>
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4"># Pedido / Fecha</th>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4">Producto / Cant.</th>
                <th className="py-3.5 px-4">Total</th>
                <th className="py-3.5 px-4">Método Pago</th>
                <th className="py-3.5 px-4">Estado Pedido</th>
                <th className="py-3.5 px-4 text-center">Sync Notion</th>
                <th className="py-3.5 px-4 text-right">Acción</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="py-4 px-4 bg-slate-50/50">
                      <div className="h-4 bg-slate-200 rounded-md w-full" />
                    </td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Search className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="font-bold text-slate-700">No se encontraron pedidos</p>
                      <p className="text-xs text-slate-500">
                        Intenta ajustar los filtros de búsqueda o restablecer las opciones.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr
                    key={ord.id}
                    onClick={() => setSelectedOrder(ord)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer h-12"
                  >
                    {/* # Pedido / Fecha */}
                    <td className="py-3 px-4 font-mono">
                      <span className="font-extrabold text-slate-900 block">
                        {ord.numero_pedido}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-sans">
                        {new Date(ord.created_at).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>

                    {/* Cliente */}
                    <td className="py-3 px-4 max-w-[180px] truncate">
                      <span className="font-bold text-slate-800 block truncate">
                        {ord.nombre}
                      </span>
                      <span className="text-[10px] text-slate-500 block font-mono truncate">
                        {ord.whatsapp}
                      </span>
                    </td>

                    {/* Producto */}
                    <td className="py-3 px-4 max-w-[200px] truncate">
                      <span className="font-medium text-slate-900 block truncate">
                        {ord.producto}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Cantidad: {ord.cantidad}
                      </span>
                    </td>

                    {/* Total */}
                    <td className="py-3 px-4 font-mono font-extrabold text-slate-900">
                      {formatCurrency(ord.total)}
                    </td>

                    {/* Método de Pago */}
                    <td className="py-3 px-4 capitalize font-medium text-slate-600">
                      {ord.metodo_pago === 'transferencia' ? 'Transferencia' : ord.metodo_pago}
                    </td>

                    {/* Estado Dropdown */}
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={ord.estado}
                        onChange={(e) => handleInlineStatusChange(ord.id, e.target.value)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border focus:outline-none cursor-pointer ${
                          ord.estado === 'Pagado'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : ord.estado === 'Enviado'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : ord.estado === 'Cancelado'
                            ? 'bg-red-50 text-red-800 border-red-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        <option value="Pendiente de pago">⏳ Pendiente</option>
                        <option value="Pagado">✅ Pagado</option>
                        <option value="Enviado">🚚 Enviado</option>
                        <option value="Cancelado">❌ Cancelado</option>
                      </select>
                    </td>

                    {/* Notion Sync Dot Status */}
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      {ord.notion_sync === 'ok' && (
                        <span
                          title="Sincronizado correctamente con Notion"
                          className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-bold"
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>OK</span>
                        </span>
                      )}

                      {ord.notion_sync === 'error' && (
                        <div className="inline-flex items-center gap-1">
                          <span
                            title={ord.notion_error || 'Error de sincronización con Notion'}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-md text-[10px] font-bold"
                          >
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span>Error</span>
                          </span>

                          <button
                            type="button"
                            onClick={(e) => handleRetrySingleSync(ord.id, e)}
                            title="Reintentar sincronización con Notion"
                            className="p-1 text-slate-400 hover:text-amber-600 rounded-md hover:bg-amber-50 transition-colors"
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${retryingId === ord.id ? 'animate-spin' : ''}`}
                            />
                          </button>
                        </div>
                      )}

                      {ord.notion_sync === 'pendiente' && (
                        <span
                          title="Pendiente de enviar a Notion"
                          className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 rounded-md text-[10px] font-bold"
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <span>Pendiente</span>
                        </span>
                      )}
                    </td>

                    {/* Action Button */}
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(ord)}
                        className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Mostrando página {currentPage} de {totalPages} ({totalCount} registros totales)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-mono font-bold text-slate-800 px-2">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onOrderUpdated={loadOrders}
      />
    </div>
  );
};
