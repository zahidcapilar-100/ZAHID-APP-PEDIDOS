import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Download,
  Filter,
  CheckSquare,
  Square,
  ArrowUpDown,
  Phone,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  X,
} from 'lucide-react';
import { OrderPayload, OrderStatusType } from '../../types';
import { updateOrderStatus } from '../../lib/sheetsService';
import { OrderDetailModal } from './OrderDetailModal';

interface AdminOrdersProps {
  orders: OrderPayload[];
  adminKey: string;
  loading: boolean;
  onRefresh: () => void;
}

const STATUS_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  'Pendiente de pago': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  'Pagado': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  'Enviado': { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
  'Cancelado': { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
};

export const AdminOrders: React.FC<AdminOrdersProps> = ({
  orders,
  adminKey,
  loading,
  onRefresh,
}) => {
  // Local mutable state for optimistic updates
  const [localOrders, setLocalOrders] = useState<OrderPayload[]>(orders);

  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  // Search input & Debounced search
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [methodFilter, setMethodFilter] = useState<string>('todos');
  const [productFilter, setProductFilter] = useState<string>('todos');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Sort state
  const [sortField, setSortField] = useState<keyof OrderPayload>('fecha');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 25;

  // Selection state for batch actions
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
  const [batchStatusLoading, setBatchStatusLoading] = useState<boolean>(false);

  // Modal detail
  const [activeModalOrder, setActiveModalOrder] = useState<OrderPayload | null>(null);

  // Unique list of products for filter
  const uniqueProducts = useMemo(() => {
    const set = new Set<string>();
    localOrders.forEach((o) => {
      if (o.producto) set.add(o.producto);
    });
    return Array.from(set);
  }, [localOrders]);

  // Filtering & Sorting
  const filteredOrders = useMemo(() => {
    return localOrders
      .filter((o) => {
        // Search text
        if (debouncedSearch) {
          const matchNum = o.numero_pedido?.toLowerCase().includes(debouncedSearch);
          const matchName = o.nombre?.toLowerCase().includes(debouncedSearch);
          const matchPhone = o.whatsapp?.toLowerCase().includes(debouncedSearch);
          const matchEmail = o.email?.toLowerCase().includes(debouncedSearch);
          if (!matchNum && !matchName && !matchPhone && !matchEmail) return false;
        }

        // Status
        if (statusFilter !== 'todos' && o.estado !== statusFilter) return false;

        // Payment Method
        if (methodFilter !== 'todos' && o.metodo_pago !== methodFilter) return false;

        // Product
        if (productFilter !== 'todos' && o.producto !== productFilter) return false;

        // Date range
        if (dateFrom) {
          const oDate = new Date(o.fecha).getTime();
          const fDate = new Date(dateFrom).getTime();
          if (oDate < fDate) return false;
        }
        if (dateTo) {
          const oDate = new Date(o.fecha).getTime();
          const tDate = new Date(`${dateTo}T23:59:59`).getTime();
          if (oDate > tDate) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === 'fecha') {
          valA = new Date(a.fecha).getTime() || 0;
          valB = new Date(b.fecha).getTime() || 0;
        } else if (sortField === 'total' || sortField === 'cantidad') {
          valA = Number(valA) || 0;
          valB = Number(valB) || 0;
        } else {
          valA = String(valA || '').toLowerCase();
          valB = String(valB || '').toLowerCase();
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [
    localOrders,
    debouncedSearch,
    statusFilter,
    methodFilter,
    productFilter,
    dateFrom,
    dateTo,
    sortField,
    sortDirection,
  ]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage]);

  // Handle Sort Toggle
  const handleSort = (field: keyof OrderPayload) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Inline Status Change (Optimistic)
  const handleSingleStatusChange = async (
    numeroPedido: string,
    newStatus: string
  ) => {
    // Save old state
    const previousOrders = [...localOrders];

    // Optimistic update
    setLocalOrders((prev) =>
      prev.map((o) => (o.numero_pedido === numeroPedido ? { ...o, estado: newStatus } : o))
    );

    const res = await updateOrderStatus(adminKey, numeroPedido, newStatus);
    if (!res.ok) {
      // Rollback
      setLocalOrders(previousOrders);
      alert('Error al actualizar estado en Google Sheets. Se ha revertido el cambio.');
    }
  };

  // Checkbox Selection
  const toggleSelectAll = () => {
    if (selectedNumbers.length === paginatedOrders.length) {
      setSelectedNumbers([]);
    } else {
      setSelectedNumbers(paginatedOrders.map((o) => o.numero_pedido));
    }
  };

  const toggleSelectOne = (num: string) => {
    setSelectedNumbers((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    );
  };

  // Batch Status Change
  const handleBatchStatusChange = async (newStatus: string) => {
    if (selectedNumbers.length === 0) return;

    setBatchStatusLoading(true);
    const previousOrders = [...localOrders];

    // Optimistic update
    setLocalOrders((prev) =>
      prev.map((o) =>
        selectedNumbers.includes(o.numero_pedido) ? { ...o, estado: newStatus } : o
      )
    );

    let failures = 0;
    for (const num of selectedNumbers) {
      const res = await updateOrderStatus(adminKey, num, newStatus);
      if (!res.ok) failures++;
    }

    setBatchStatusLoading(false);
    setSelectedNumbers([]);

    if (failures > 0) {
      alert(`Hubo un problema actualizando ${failures} pedidos en Google Sheets. Refrescando datos.`);
      onRefresh();
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) return;

    const headers = [
      'Número de pedido',
      'Fecha',
      'Nombre',
      'WhatsApp',
      'Email',
      'Ciudad / Dirección',
      'Producto',
      'Cantidad',
      'Precio Unitario',
      'Total',
      'Método de pago',
      'Estado',
      'Notas Cliente',
      'Notas Internas',
    ];

    const rows = filteredOrders.map((o) => [
      `"${o.numero_pedido}"`,
      `"${new Date(o.fecha).toLocaleString('es-CO')}"`,
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
      `"${(o.notas || '').replace(/"/g, '""')}"`,
      `"${(o.notas_internas || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pedidos_capilaris_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-4">
      {/* Search & Action Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-3 shadow-xl">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Global Search Bar */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por cliente, WhatsApp, email o número de pedido..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            disabled={filteredOrders.length === 0}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 text-xs font-bold rounded-2xl border border-slate-700 flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0 disabled:opacity-40"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Exportar CSV ({filteredOrders.length})</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="pt-2 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
          {/* Status Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Estado
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="todos">Todos los estados</option>
              <option value="Pendiente de pago">Pendiente de pago</option>
              <option value="Pagado">Pagado</option>
              <option value="Enviado">Enviado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          {/* Method Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Método de Pago
            </label>
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="todos">Todos los métodos</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Link de pago">Link de pago</option>
              <option value="QR">QR</option>
            </select>
          </div>

          {/* Product Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Producto
            </label>
            <select
              value={productFilter}
              onChange={(e) => {
                setProductFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="todos">Todos los productos</option>
              {uniqueProducts.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Desde
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Hasta
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
        </div>

        {/* Batch Actions Bar when items selected */}
        {selectedNumbers.length > 0 && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs animate-fadeIn">
            <span className="font-bold text-emerald-300">
              {selectedNumbers.length} pedido(s) seleccionado(s)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Cambiar estado a:</span>
              {(['Pendiente de pago', 'Pagado', 'Enviado', 'Cancelado'] as const).map(
                (st) => (
                  <button
                    key={st}
                    disabled={batchStatusLoading}
                    onClick={() => handleBatchStatusChange(st)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                  >
                    {st}
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* Orders Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider text-[10px] select-none">
              <tr>
                <th className="p-3 w-10 text-center">
                  <button onClick={toggleSelectAll} className="cursor-pointer">
                    {selectedNumbers.length > 0 &&
                    selectedNumbers.length === paginatedOrders.length ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600" />
                    )}
                  </button>
                </th>
                <th
                  onClick={() => handleSort('numero_pedido')}
                  className="p-3 cursor-pointer hover:text-white font-mono"
                >
                  <div className="flex items-center gap-1">
                    <span># Pedido</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('fecha')}
                  className="p-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Fecha</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('nombre')}
                  className="p-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Cliente</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  </div>
                </th>
                <th className="p-3">WhatsApp</th>
                <th className="p-3">Producto</th>
                <th className="p-3 text-right">Cant.</th>
                <th
                  onClick={() => handleSort('total')}
                  className="p-3 text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  </div>
                </th>
                <th className="p-3">Método</th>
                <th className="p-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans text-slate-200">
              {loading && paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    <span>Cargando pedidos de Google Sheets...</span>
                  </td>
                </tr>
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    No se encontraron pedidos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((o) => {
                  const isSelected = selectedNumbers.includes(o.numero_pedido);
                  const badgeStyle =
                    STATUS_BADGES[o.estado] || STATUS_BADGES['Pendiente de pago'];

                  return (
                    <tr
                      key={o.numero_pedido}
                      className={`h-[48px] hover:bg-slate-800/60 transition-colors cursor-pointer ${
                        isSelected ? 'bg-emerald-950/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td
                        className="p-3 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectOne(o.numero_pedido);
                        }}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-700 hover:text-slate-500" />
                        )}
                      </td>

                      {/* Number */}
                      <td
                        className="p-3 font-mono font-bold text-white hover:text-emerald-400"
                        onClick={() => setActiveModalOrder(o)}
                      >
                        {o.numero_pedido}
                      </td>

                      {/* Date */}
                      <td
                        className="p-3 text-slate-400 text-[11px] font-mono whitespace-nowrap"
                        onClick={() => setActiveModalOrder(o)}
                      >
                        {new Date(o.fecha).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Client */}
                      <td
                        className="p-3 font-semibold text-slate-100 max-w-[140px] truncate"
                        onClick={() => setActiveModalOrder(o)}
                      >
                        {o.nombre}
                      </td>

                      {/* WhatsApp quick link */}
                      <td className="p-3 font-mono text-[11px]">
                        <a
                          href={`https://wa.me/${o.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-slate-400 hover:text-emerald-400 hover:underline"
                        >
                          <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>{o.whatsapp}</span>
                        </a>
                      </td>

                      {/* Product */}
                      <td
                        className="p-3 text-slate-300 max-w-[150px] truncate"
                        onClick={() => setActiveModalOrder(o)}
                      >
                        {o.producto}
                      </td>

                      {/* Quantity */}
                      <td
                        className="p-3 text-right font-mono font-bold text-slate-300"
                        onClick={() => setActiveModalOrder(o)}
                      >
                        {o.cantidad}
                      </td>

                      {/* Total */}
                      <td
                        className="p-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap"
                        onClick={() => setActiveModalOrder(o)}
                      >
                        {formatCurrency(o.total)}
                      </td>

                      {/* Payment Method */}
                      <td
                        className="p-3 text-slate-400 text-[11px] whitespace-nowrap"
                        onClick={() => setActiveModalOrder(o)}
                      >
                        {o.metodo_pago}
                      </td>

                      {/* Status Dropdown */}
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={o.estado || 'Pendiente de pago'}
                          onChange={(e) =>
                            handleSingleStatusChange(o.numero_pedido, e.target.value)
                          }
                          className={`text-[11px] font-bold px-2 py-1 rounded-xl border cursor-pointer focus:outline-none ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                        >
                          <option value="Pendiente de pago" className="bg-slate-900 text-white">
                            Pendiente
                          </option>
                          <option value="Pagado" className="bg-slate-900 text-white">
                            Pagado
                          </option>
                          <option value="Enviado" className="bg-slate-900 text-white">
                            Enviado
                          </option>
                          <option value="Cancelado" className="bg-slate-900 text-white">
                            Cancelado
                          </option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Pagination */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Mostrando <strong>{paginatedOrders.length}</strong> de{' '}
            <strong>{filteredOrders.length}</strong> pedidos filtrados
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono px-2">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {activeModalOrder && (
        <OrderDetailModal
          order={activeModalOrder}
          adminKey={adminKey}
          onClose={() => setActiveModalOrder(null)}
          onOrderUpdated={(updated) => {
            setLocalOrders((prev) =>
              prev.map((o) => (o.numero_pedido === updated.numero_pedido ? updated : o))
            );
            setActiveModalOrder(updated);
          }}
        />
      )}
    </div>
  );
};
