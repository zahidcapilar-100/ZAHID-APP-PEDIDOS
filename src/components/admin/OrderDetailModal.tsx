import React, { useState } from 'react';
import { DBOrder, updateOrderNotesInDB, updateOrderStatusInDB } from '../../lib/supabase';
import { formatCurrency, buildWhatsAppMessage, APP_CONFIG } from '../../config';
import {
  X,
  MessageCircle,
  ExternalLink,
  Save,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
  FileText,
  User,
  MapPin,
  Package,
  CreditCard,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

interface OrderDetailModalProps {
  order: DBOrder | null;
  onClose: () => void;
  onOrderUpdated: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  onClose,
  onOrderUpdated,
}) => {
  if (!order) return null;

  const [notes, setNotes] = useState(order.notas || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(order.estado);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    await updateOrderNotesInDB(order.id, notes);
    setSavingNotes(false);
    onOrderUpdated();
  };

  const handleStatusChange = async (newStatus: string) => {
    setCurrentStatus(newStatus);
    setUpdatingStatus(true);
    await updateOrderStatusInDB(order.id, newStatus);
    setUpdatingStatus(false);
    onOrderUpdated();
  };

  // Pre-filled WhatsApp link
  const waMessage = buildWhatsAppMessage(
    order.numero_pedido,
    order.nombre,
    order.producto,
    order.cantidad,
    order.total,
    order.metodo_pago
  );
  const whatsappUrl = `https://wa.me/${order.whatsapp.replace(/\D/g, '')}?text=${waMessage}`;

  // Notion Page URL if exists
  const notionPageUrl = order.notion_page_id
    ? `https://notion.so/${order.notion_page_id.replace(/-/g, '')}`
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Detalle del Pedido
              </span>
              <span className="px-2.5 py-0.5 bg-slate-900 text-white font-mono font-extrabold text-xs rounded-md">
                {order.numero_pedido}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">
              {order.nombre}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-sm">
          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
              <span>Abrir WhatsApp con el cliente</span>
            </a>

            {notionPageUrl ? (
              <a
                href={notionPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer border border-slate-300"
              >
                <ExternalLink className="w-4 h-4 text-slate-600" />
                <span>Ver en Notion</span>
              </a>
            ) : (
              <span className="py-2.5 px-3 bg-slate-100 text-slate-500 text-xs font-medium rounded-xl">
                No sincronizado con Notion
              </span>
            )}
          </div>

          {/* Status Selector */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Estado del Pedido
              </span>
              <p className="text-xs text-slate-400">
                Al cambiar el estado se actualizará automáticamente en Notion.
              </p>
            </div>

            <select
              value={currentStatus}
              disabled={updatingStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
            >
              <option value="Pendiente de pago">⏳ Pendiente de pago</option>
              <option value="Pagado">✅ Pagado</option>
              <option value="Enviado">🚚 Enviado</option>
              <option value="Cancelado">❌ Cancelado</option>
            </select>
          </div>

          {/* Customer & Shipping Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase">
                <User className="w-4 h-4 text-emerald-600" />
                <span>Información del Cliente</span>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-900">{order.nombre}</p>
                <p className="text-xs font-mono text-slate-600">{order.whatsapp}</p>
                <p className="text-xs text-slate-600">{order.email}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Dirección de Envío</span>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-800">{order.ciudad}</p>
                <p className="text-xs text-slate-500">
                  Registrado el {new Date(order.created_at).toLocaleString('es-CO')}
                </p>
              </div>
            </div>
          </div>

          {/* Product and Payment Summary */}
          <div className="p-4 rounded-2xl border-2 border-slate-900 bg-white space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-900" />
                <span className="font-bold text-slate-900">Resumen del Producto</span>
              </div>
              <span className="text-xs font-bold bg-slate-100 px-2.5 py-1 rounded-md capitalize">
                Pago: {order.metodo_pago}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <div>
                <p className="font-bold text-slate-900">{order.producto}</p>
                <p className="text-xs text-slate-500">
                  {order.cantidad} x {formatCurrency(order.precio_unitario)}
                </p>
              </div>
              <span className="text-lg font-extrabold text-emerald-600 font-mono">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>

          {/* Internal Notes Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Notas Internas del Equipo (No visible para el cliente)
              </label>
              {savingNotes && (
                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Guardando...
                </span>
              )}
            </div>

            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Escribe observaciones de empaque, guía de transportadora o datos de confirmación de pago..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
            />

            <button
              type="button"
              onClick={handleSaveNotes}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Notas Internas</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
