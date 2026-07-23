import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageCircle,
  Download,
  RotateCcw,
  AlertTriangle,
  Building2,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { OrderFormData, OrderPayload, Product } from '../types';
import { APP_CONFIG, buildWhatsAppMessage, formatCurrency } from '../config';

interface PaymentScreenProps {
  orderPayload: OrderPayload | null;
  formData: OrderFormData;
  product?: Product;
  webhookStatus: 'idle' | 'loading' | 'success' | 'error';
  webhookErrorMsg?: string;
  onRetryWebhook: () => void;
  onResetOrder: () => void;
}

export const PaymentScreen: React.FC<PaymentScreenProps> = ({
  orderPayload,
  formData,
  product,
  webhookStatus,
  webhookErrorMsg,
  onRetryWebhook,
  onResetOrder,
}) => {
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!orderPayload) {
    return (
      <div className="w-full max-w-lg mx-auto text-center py-12 space-y-4">
        <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-600 font-medium">Cargando instrucciones de pago...</p>
      </div>
    );
  }

  const { numero_pedido, total, metodo_pago, nombre, cantidad } = orderPayload;
  const productName = product ? product.name : orderPayload.producto;

  // Build WhatsApp URL with pre-filled message
  const waEncodedMessage = buildWhatsAppMessage(
    numero_pedido,
    nombre,
    productName,
    cantidad,
    total,
    metodo_pago
  );
  const whatsappUrl = `https://wa.me/${APP_CONFIG.whatsappNumber}?text=${waEncodedMessage}`;

  // Copy Account Number
  const handleCopyAccount = () => {
    navigator.clipboard.writeText(APP_CONFIG.bankDetails.numeroCuenta);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  // Copy Payment Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(APP_CONFIG.paymentLinkDetails.url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Download QR Code
  const handleDownloadQR = () => {
    const link = document.createElement('a');
    link.href = APP_CONFIG.qrDetails.imageUrl;
    link.download = `QR-Pago-${numero_pedido}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-6 py-2">
      {/* Webhook Error Banner with Retry (Does NOT lose data) */}
      {webhookStatus === 'error' && (
        <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">No pudimos registrar tu pedido automáticamente</p>
              <p className="text-xs text-amber-700">
                {webhookErrorMsg || 'Error de conexión con el servidor de la tienda.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRetryWebhook}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0"
          >
            Reintentar envío
          </button>
        </div>
      )}

      {/* Success Badge & Order Header */}
      <div className="text-center space-y-2 w-full">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold tracking-wide">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>¡PEDIDO REGISTRADO EXITOSAMENTE!</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Instrucciones de Pago
        </h1>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between gap-4 mt-3">
          <div className="text-left">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Número de Pedido
            </span>
            <span className="text-base font-extrabold text-slate-900 font-mono">
              {numero_pedido}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total a Pagar
            </span>
            <span className="text-xl font-extrabold text-emerald-600 font-mono">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* METHOD A: TRANSFERENCIA BANCARIA */}
      {/* ==================================================================== */}
      {metodo_pago === 'transferencia' && (
        <div className="w-full space-y-5">
          {/* Bank Details Card */}
          <div className="bg-white rounded-2xl border-2 border-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-900 text-white rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">
                    {APP_CONFIG.bankDetails.banco}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cuenta de {APP_CONFIG.bankDetails.tipoCuenta}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md">
                Oficial
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 text-xs">Número de Cuenta:</span>
                <span className="font-mono font-extrabold text-slate-900 text-base">
                  {APP_CONFIG.bankDetails.numeroCuenta}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-slate-100">
                <span className="text-slate-500 text-xs">Titular:</span>
                <span className="font-semibold text-slate-800">
                  {APP_CONFIG.bankDetails.titular}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-slate-100">
                <span className="text-slate-500 text-xs">Documento / NIT:</span>
                <span className="font-mono text-slate-700">
                  {APP_CONFIG.bankDetails.documento}
                </span>
              </div>
            </div>

            {/* Copy Account Button */}
            <button
              type="button"
              onClick={handleCopyAccount}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Copy className="w-4 h-4" />
              <span>{copiedAccount ? '¡Copiado al portapapeles!' : 'Copiar número de cuenta'}</span>
            </button>
          </div>

          <p className="text-sm text-center text-slate-600">
            Realiza la transferencia y envíanos el comprobante por WhatsApp para confirmar tu pedido.
          </p>

          {/* WhatsApp Button */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base rounded-2xl shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer active:scale-98 hover:shadow-lg"
          >
            <MessageCircle className="w-5 h-5 fill-white text-emerald-600" />
            <span>Enviar Comprobante por WhatsApp</span>
          </a>
        </div>
      )}

      {/* ==================================================================== */}
      {/* METHOD B: LINK DE PAGO */}
      {/* ==================================================================== */}
      {metodo_pago === 'link' && (
        <div className="w-full space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-center space-y-4">
            <p className="text-sm font-medium text-slate-600">
              Haz clic en el botón a continuación para pagar en línea de forma segura ({APP_CONFIG.paymentLinkDetails.platformName}):
            </p>

            {/* Main Pay Link Button */}
            <a
              href={APP_CONFIG.paymentLinkDetails.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-lg rounded-2xl shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer active:scale-98"
            >
              <span>Ir a Pagar Ahora ({formatCurrency(total)})</span>
              <ExternalLink className="w-5 h-5" />
            </a>

            {/* Link Text and Copy Button */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-xs bg-slate-50 p-2.5 rounded-xl">
              <span className="font-mono text-slate-500 truncate flex-1 text-left">
                {APP_CONFIG.paymentLinkDetails.url}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-2.5 py-1 bg-white border border-slate-300 font-bold text-slate-700 rounded-lg hover:bg-slate-100 shrink-0 cursor-pointer"
              >
                {copiedLink ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>

            <p className="text-xs text-slate-500 italic">
              Una vez completes el pago recibirás la confirmación por WhatsApp.
            </p>
          </div>

          {/* Secondary WhatsApp Button */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
            <span>¿Tienes dudas? Escríbenos a WhatsApp</span>
          </a>
        </div>
      )}

      {/* ==================================================================== */}
      {/* METHOD C: CÓDIGO QR */}
      {/* ==================================================================== */}
      {metodo_pago === 'qr' && (
        <div className="w-full space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col items-center text-center space-y-4">
            {/* White QR Container with Padding min 240x240 */}
            <div className="bg-white p-4 rounded-2xl border-2 border-slate-900 shadow-md min-w-[240px] min-h-[240px] flex items-center justify-center">
              <img
                src={APP_CONFIG.qrDetails.imageUrl}
                alt="Código QR de Pago"
                className="w-56 h-56 object-contain"
              />
            </div>

            {/* Download QR Button */}
            <button
              type="button"
              onClick={handleDownloadQR}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Imagen QR</span>
            </button>

            <p className="text-sm text-slate-600 max-w-md">
              {APP_CONFIG.qrDetails.instructions}
            </p>
          </div>

          {/* WhatsApp Button */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base rounded-2xl shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer active:scale-98"
          >
            <MessageCircle className="w-5 h-5 fill-white text-emerald-600" />
            <span>Enviar Comprobante por WhatsApp</span>
          </a>
        </div>
      )}

      {/* Discrete Restart / New Order Button */}
      <div className="pt-6 border-t border-slate-200 w-full text-center">
        <button
          type="button"
          onClick={onResetOrder}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Hacer otro pedido</span>
        </button>
      </div>
    </div>
  );
};
