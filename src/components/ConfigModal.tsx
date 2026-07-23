import React, { useState } from 'react';
import { X, ExternalLink, Code, Database, Check, AlertCircle, Save } from 'lucide-react';
import { APP_CONFIG } from '../config';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  webhookUrl: string;
  onUpdateWebhookUrl: (url: string) => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  webhookUrl,
  onUpdateWebhookUrl,
}) => {
  const [inputUrl, setInputUrl] = useState(webhookUrl);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateWebhookUrl(inputUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-900 text-white rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                Configuración de la Tienda & Notion
              </h3>
              <p className="text-xs text-slate-500">
                Webhook de integración e información de sincronización
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Webhook Configuration Section */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            URL del Webhook (Make.com / n8n / Zapier / Notion)
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://hook.us1.make.com/your-notion-webhook-id"
              className="flex-1 px-4 py-2.5 text-xs font-mono rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none"
            />
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              {saved ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
              <span>{saved ? 'Guardado' : 'Guardar'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Esta URL recibe el payload JSON al confirmar el pedido para guardar en la base de datos de Notion. Configúrala en <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">.env.example</code> como <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">VITE_WEBHOOK_URL</code>.
          </p>
        </div>

        {/* Notion Schema Mapping Reference */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Code className="w-4 h-4 text-emerald-600" />
              Esquema de Propiedades en Notion
            </span>
            <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
              Tipos exactos
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-slate-400">Title:</span> <span className="font-bold text-slate-800">Número de pedido</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-slate-400">Text:</span> <span className="font-bold text-slate-800">Nombre</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-slate-400">Phone:</span> <span className="font-bold text-slate-800">WhatsApp</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-slate-400">Email:</span> <span className="font-bold text-slate-800">Email</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-slate-400">Text:</span> <span className="font-bold text-slate-800">Ciudad</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-slate-400">Select:</span> <span className="font-bold text-slate-800">Producto</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-slate-400">Number:</span> <span className="font-bold text-slate-800">Cantidad</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-slate-400">Number:</span> <span className="font-bold text-slate-800">Precio unitario</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-slate-400">Number:</span> <span className="font-bold text-slate-800">Total</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-slate-400">Text:</span> <span className="font-bold text-slate-800">Notas</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200 col-span-2">
              <span className="text-slate-400">Select:</span> <span className="font-bold text-slate-800">Método de pago</span> <span className="text-[10px] text-slate-400">(transferencia / link / qr)</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200 col-span-2">
              <span className="text-slate-400">Select:</span> <span className="font-bold text-slate-800">Estado</span> <span className="text-[10px] text-slate-400">(Pendiente de pago)</span>
            </div>
          </div>
        </div>

        {/* Centralized config note */}
        <div className="text-xs text-slate-500 bg-emerald-50 text-emerald-900 p-3 rounded-2xl border border-emerald-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            Los precios, banco, titular, link de pago e imagen QR están centralizados en el archivo <code className="bg-emerald-100 font-mono font-bold px-1 rounded">src/config.ts</code>.
          </span>
        </div>

        {/* Modal Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
