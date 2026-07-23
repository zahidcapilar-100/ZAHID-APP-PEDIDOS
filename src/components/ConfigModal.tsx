import React, { useState } from 'react';
import { X, FileSpreadsheet, Check, Save, Info } from 'lucide-react';
import { APP_CONFIG } from '../config';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetsEndpoint: string;
  onUpdateSheetsEndpoint: (url: string) => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  sheetsEndpoint,
  onUpdateSheetsEndpoint,
}) => {
  const [inputUrl, setInputUrl] = useState(sheetsEndpoint);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateSheetsEndpoint(inputUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-600 text-white rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                Integración con Google Sheets
              </h3>
              <p className="text-xs text-slate-500">
                Endpoint Web App de Google Apps Script
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

        {/* Sheets Endpoint Input */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            URL del Web App de Google Apps Script
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/{{ID}}/exec"
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
            Configurada también en <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">.env.example</code> como <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">VITE_SHEETS_ENDPOINT</code>.
          </p>
        </div>

        {/* Google Sheets Column Mapping */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Columnas de la pestaña "Pedidos" (Fila 1)
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              13 columnas exactas
            </span>
          </div>

          <p className="text-[11px] text-slate-600">
            Asegúrate de tener estos encabezados en la primera fila de tu hoja en este orden exacto:
          </p>

          <div className="text-[11px] font-mono bg-white p-3 rounded-xl border border-slate-200 leading-relaxed text-slate-800">
            Número de pedido | Fecha | Nombre | WhatsApp | Email | Ciudad | Producto | Cantidad | Precio unitario | Total | Notas | Método de pago | Estado
          </div>
        </div>

        {/* Centralized config note */}
        <div className="text-xs text-slate-500 bg-emerald-50 text-emerald-900 p-3 rounded-2xl border border-emerald-200 flex items-start gap-2">
          <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            Los precios, banco, titular, link de pago e imagen QR están configurados en <code className="bg-emerald-100 font-mono font-bold px-1 rounded">src/config.ts</code>.
          </span>
        </div>

        {/* Modal Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
