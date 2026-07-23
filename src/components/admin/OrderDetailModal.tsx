import React, { useState } from 'react';
import {
  X,
  MessageSquare,
  Copy,
  Check,
  Save,
  Loader2,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  Package,
  CreditCard,
  FileText,
  AlertCircle
} from 'lucide-react';
import { OrderPayload, OrderStatusType } from '../../types';
import { updateOrderStatus, updateOrderNotes } from '../../lib/sheetsService';

interface OrderDetailModalProps {
  order: OrderPayload | null;
  adminKey: string;
  onClose: () => void;
  onOrderUpdated: (updatedOrder: OrderPayload) => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Pendiente de pago': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  'Pagado': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  'Enviado': { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
  'Cancelado': { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
};

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  adminKey,
  onClose,
  onOrderUpdated,
}) => {
  if (!order) return null;

  const [currentStatus, setCurrentStatus] = useState<string>(order.estado || 'Pendiente de pago');
  const [internalNotes, setInternalNotes] = useState<string>(order.notas_internas || '');
  const [savingNotes, setSavingNotes] = useState<boolean>(false);
  const [savingStatus, setSavingStatus] = useState<boolean>(false);
  const [notesSuccess, setNotesSuccess] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleStatusChange = async (newStatus: string) => {
    setCurrentStatus(newStatus);
    setSavingStatus(true);
    setErrorMessage(null);

    const res = await updateOrderStatus(adminKey, order.numero_pedido, newStatus);
    setSavingStatus(false);

    if (res.ok) {
      onOrderUpdated({ ...order, estado: newStatus, notas_internas: internalNotes });
    } else {
      setCurrentStatus(order.estado); // Revert
      setErrorMessage('No se pudo actualizar el estado en Google Sheets.');
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    setErrorMessage(null);

    const res = await updateOrderNotes(adminKey, order.numero_pedido, internalNotes);
    setSavingNotes(false);

    if (res.ok) {
      setNotesSuccess(true);
      setTimeout(() => setNotesSuccess(false), 2500);
      onOrderUpdated({ ...order, estado: currentStatus, notas_internas: internalNotes });
    } else {
      setErrorMessage('No se pudieron guardar las notas internas.');
    }
  };

  const handleOpenWhatsApp = () => {
    const rawPhone = order.whatsapp.replace(/\D/g, '');
    const text = encodeURIComponent(
      `Hola ${order.nombre}, te saludamos de Capilaris & Care 👋. Te contactamos sobre tu pedido ${order.numero_pedido} de ${order.producto} (Total: ${formatCurrency(order.total)}).`
    );
    window.open(`https://wa.me/${rawPhone}?text=${text}`, '_blank');
  };

  const handleCopySummary = () => {
    const summaryText = `
🛍️ DETALLE DE PEDIDO ${order.numero_pedido}
----------------------------------------
Cliente: ${order.nombre}
WhatsApp: ${order.whatsapp}
Email: ${order.email}
Ciudad/Dirección: ${order.ciudad}

Producto: ${order.producto} (x${order.cantidad})
Precio Unitario: ${formatCurrency(order.precio_unitario)}
Total a Pagar: ${formatCurrency(order.total)}

Método de Pago: ${order.metodo_pago}
Estado: ${currentStatus}
Fecha: ${new Date(order.fecha).toLocaleString('es-CO')}
${order.notas ? `Notas del cliente: ${order.notas}` : ''}
    `.trim();

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 text-slate-100 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-extrabold text-white">
                {order.numero_pedido}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 font-bold rounded-full border ${
                  STATUS_COLORS[currentStatus]?.bg || 'bg-slate-800'
                } ${STATUS_COLORS[currentStatus]?.text || 'text-slate-300'} ${
                  STATUS_COLORS[currentStatus]?.border || 'border-slate-700'
                }`}
              >
                {currentStatus}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-mono">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              {new Date(order.fecha).toLocaleString('es-CO')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Customer & Shipping Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              Datos del Cliente
            </h4>
            <div className="text-sm space-y-1">
              <p className="font-bold text-white">{order.nombre}</p>
              <p className="text-xs text-slate-300 flex items-center gap-1.5 font-mono">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                {order.whatsapp}
              </p>
              <p className="text-xs text-slate-300 flex items-center gap-1.5 font-mono">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                {order.email}
              </p>
            </div>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              Dirección de Entrega
            </h4>
            <p className="text-xs text-slate-200 leading-relaxed font-mono">
              {order.ciudad}
            </p>
            {order.notas && (
              <div className="pt-2 border-t border-slate-700/60">
                <p className="text-[11px] font-semibold text-amber-300">
                  Nota del cliente: "{order.notas}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Product & Total Summary */}
        <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-emerald-400" />
            Detalle de Productos
          </h4>
          <div className="flex items-center justify-between text-sm py-2 border-b border-slate-700">
            <div>
              <span className="font-bold text-white">{order.producto}</span>
              <span className="text-xs text-slate-400 ml-2 font-mono">
                x{order.cantidad} @ {formatCurrency(order.precio_unitario)}
              </span>
            </div>
            <span className="font-bold font-mono text-white">
              {formatCurrency(order.total)}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm pt-1">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              Método de Pago: <strong className="text-slate-200 font-mono">{order.metodo_pago}</strong>
            </span>
            <div className="text-right">
              <span className="text-xs text-slate-400">Total a Pagar</span>
              <p className="text-2xl font-black text-emerald-400 font-mono">
                {formatCurrency(order.total)}
              </p>
            </div>
          </div>
        </div>

        {/* Status Change & Internal Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status Select */}
          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Cambiar Estado del Pedido
            </label>
            <div className="relative">
              <select
                value={currentStatus}
                disabled={savingStatus}
                onChange={(e) => handleStatusChange(e.target.value as OrderStatusType)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Pendiente de pago">Pendiente de pago</option>
                <option value="Pagado">Pagado</option>
                <option value="Enviado">Enviado</option>
                <option value="Cancelado">Cancelado</option>
              </select>
              {savingStatus && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                </div>
              )}
            </div>
          </div>

          {/* Internal Notes Editable */}
          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Notas Internas (Solo Admin)
              </label>
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
              >
                {savingNotes ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : notesSuccess ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                <span>{notesSuccess ? 'Guardado' : 'Guardar'}</span>
              </button>
            </div>
            <textarea
              rows={2}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Escribe anotaciones de despacho, guía de envío..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={handleCopySummary}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? '¡Copiado al portapapeles!' : 'Copiar Resumen'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-lg shadow-emerald-900/30"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Escribir por WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
