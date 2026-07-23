import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Loader2,
  Key,
  Building2,
  CreditCard,
  QrCode,
  Link,
  CheckCircle,
  AlertCircle,
  Eye,
  ShieldAlert,
} from 'lucide-react';
import { SheetsConfig } from '../../types';
import { saveAdminConfig, changeAdminKey } from '../../lib/sheetsService';

interface AdminConfigProps {
  config: SheetsConfig;
  adminKey: string;
  loading: boolean;
  onRefresh: () => void;
}

export const AdminConfig: React.FC<AdminConfigProps> = ({
  config,
  adminKey,
  loading,
  onRefresh,
}) => {
  // Form fields state
  const [formData, setFormData] = useState<SheetsConfig>({
    banco: '',
    tipo_cuenta: '',
    numero_cuenta: '',
    titular: '',
    documento: '',
    whatsapp: '',
    link_pago: '',
    qr_url: '',
    ...config,
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      ...config,
    }));
  }, [config]);

  // Saving state
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // Password change state
  const [newKey, setNewKey] = useState('');
  const [confirmKey, setConfirmKey] = useState('');
  const [changingKey, setChangingKey] = useState(false);
  const [keySuccess, setKeySuccess] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  // Active preview tab
  const [previewTab, setPreviewTab] = useState<'transferencia' | 'link' | 'qr'>('transferencia');

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigError(null);

    const res = await saveAdminConfig(adminKey, formData);
    setSavingConfig(false);

    if (res.ok) {
      setConfigSuccess(true);
      setTimeout(() => setConfigSuccess(false), 3000);
      onRefresh();
    } else {
      setConfigError(res.error || 'Error guardando configuración en Google Sheets.');
    }
  };

  const handleChangeKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || newKey.length < 4) {
      setKeyError('La nueva clave debe tener al menos 4 caracteres.');
      return;
    }
    if (newKey !== confirmKey) {
      setKeyError('Las claves no coinciden.');
      return;
    }

    setChangingKey(true);
    setKeyError(null);

    const res = await changeAdminKey(adminKey, newKey.trim());
    setChangingKey(false);

    if (res.ok) {
      setKeySuccess(true);
      sessionStorage.setItem('admin_key', newKey.trim());
      setNewKey('');
      setConfirmKey('');
      setTimeout(() => setKeySuccess(false), 3000);
    } else {
      setKeyError(res.error || 'No se pudo actualizar la clave en Google Sheets.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Config Form (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        {/* Payment & Bank Configuration Form */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">
                Datos de Pago y Contacto
              </h3>
              <p className="text-xs text-slate-400">
                Guarda directamente en la hoja de cálculo "Configuración"
              </p>
            </div>
          </div>

          {configError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{configError}</span>
            </div>
          )}

          {configSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2 text-emerald-300 text-xs">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Configuración guardada exitosamente en Google Sheets.</span>
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Banco */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-slate-400">
                  Banco
                </label>
                <input
                  type="text"
                  value={formData.banco || ''}
                  onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                  placeholder="Ej. Bancolombia"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Tipo de cuenta */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-slate-400">
                  Tipo de Cuenta
                </label>
                <input
                  type="text"
                  value={formData.tipo_cuenta || ''}
                  onChange={(e) => setFormData({ ...formData, tipo_cuenta: e.target.value })}
                  placeholder="Ej. Ahorros"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Número de cuenta */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-slate-400">
                  Número de Cuenta
                </label>
                <input
                  type="text"
                  value={formData.numero_cuenta || ''}
                  onChange={(e) => setFormData({ ...formData, numero_cuenta: e.target.value })}
                  placeholder="Ej. 123-456789-01"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Titular */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-slate-400">
                  Titular de la Cuenta
                </label>
                <input
                  type="text"
                  value={formData.titular || ''}
                  onChange={(e) => setFormData({ ...formData, titular: e.target.value })}
                  placeholder="Ej. Capilaris & Care S.A.S."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Documento NIT/CC */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-slate-400">
                  Documento (NIT / CC)
                </label>
                <input
                  type="text"
                  value={formData.documento || ''}
                  onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                  placeholder="Ej. NIT 901.234.567-8"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* WhatsApp de Atención */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-slate-400">
                  WhatsApp Oficial (Sin + ni espacios)
                </label>
                <input
                  type="text"
                  value={formData.whatsapp || ''}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="Ej. 573001234567"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Link de Pago Bold / Wompi */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase text-slate-400">
                URL Link de Pago (Bold / Wompi / MercadoPago)
              </label>
              <input
                type="url"
                value={formData.link_pago || ''}
                onChange={(e) => setFormData({ ...formData, link_pago: e.target.value })}
                placeholder="https://bold.co/p/tu-link"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* QR Image URL */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase text-slate-400">
                URL Imagen Código QR
              </label>
              <input
                type="url"
                value={formData.qr_url || ''}
                onChange={(e) => setFormData({ ...formData, qr_url: e.target.value })}
                placeholder="https://i.imgur.com/tu-qr.png"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingConfig}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-900/30"
              >
                {savingConfig ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Guardar Cambios en Sheets</span>
              </button>
            </div>
          </form>
        </div>

        {/* Change Admin Password Card */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-5 shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">
                Cambiar Clave de Acceso al Panel
              </h3>
              <p className="text-xs text-slate-400">
                Actualiza la Script Property `CLAVE_ADMIN` en Google Apps Script
              </p>
            </div>
          </div>

          {keyError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{keyError}</span>
            </div>
          )}

          {keySuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2 text-emerald-300 text-xs">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Clave cambiada exitosamente. Se ha actualizado tu sesión.</span>
            </div>
          )}

          <form onSubmit={handleChangeKey} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-slate-400">
                  Nueva Clave
                </label>
                <input
                  type="password"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="Mínimo 4 caracteres..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-slate-400">
                  Confirmar Nueva Clave
                </label>
                <input
                  type="password"
                  value={confirmKey}
                  onChange={(e) => setConfirmKey(e.target.value)}
                  placeholder="Repite la nueva clave..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={changingKey}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-2xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-900/30"
              >
                {changingKey ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Key className="w-4 h-4" />
                )}
                <span>Actualizar Clave Admin</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Column: Live Preview of Payment Screens (5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-xl sticky top-24">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">
                Vista Previa de Pago en Vivo
              </h4>
            </div>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-mono">
              Cliente final
            </span>
          </div>

          {/* Preview Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setPreviewTab('transferencia')}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                previewTab === 'transferencia'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Transferencia
            </button>
            <button
              onClick={() => setPreviewTab('link')}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                previewTab === 'link'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Link
            </button>
            <button
              onClick={() => setPreviewTab('qr')}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                previewTab === 'qr'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              QR
            </button>
          </div>

          {/* Live Preview Screen Card */}
          <div className="bg-white text-slate-900 rounded-2xl p-5 border border-slate-200 shadow-inner space-y-4 animate-fadeIn">
            {previewTab === 'transferencia' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-xs">
                  <CreditCard className="w-4 h-4" />
                  <span>Transferencia Bancaria</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Banco:</span>
                    <strong className="text-slate-900">{formData.banco || 'Bancolombia'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tipo:</span>
                    <strong className="text-slate-900">{formData.tipo_cuenta || 'Ahorros'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Número:</span>
                    <strong className="text-emerald-700">{formData.numero_cuenta || '123-456789-01'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Titular:</span>
                    <strong className="text-slate-900">{formData.titular || 'Capilaris & Care'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Documento:</span>
                    <strong className="text-slate-900">{formData.documento || 'NIT 901.234.567-8'}</strong>
                  </div>
                </div>
              </div>
            )}

            {previewTab === 'link' && (
              <div className="space-y-3 text-center py-2">
                <div className="flex items-center justify-center gap-2 text-emerald-700 font-extrabold text-xs">
                  <Link className="w-4 h-4" />
                  <span>Pasarela de Pago Online</span>
                </div>
                <p className="text-xs text-slate-600">
                  El cliente pagará mediante tarjeta, PSE o Baloto en:
                </p>
                <div className="p-3 bg-slate-100 rounded-xl font-mono text-[11px] text-emerald-800 truncate font-bold border border-slate-200">
                  {formData.link_pago || 'https://bold.co/p/capilaris'}
                </div>
              </div>
            )}

            {previewTab === 'qr' && (
              <div className="space-y-3 text-center">
                <div className="flex items-center justify-center gap-2 text-emerald-700 font-extrabold text-xs">
                  <QrCode className="w-4 h-4" />
                  <span>Pago con Código QR</span>
                </div>
                <div className="w-36 h-36 mx-auto bg-slate-100 border border-slate-200 rounded-xl p-2 flex items-center justify-center">
                  {formData.qr_url ? (
                    <img
                      src={formData.qr_url}
                      alt="QR preview"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="text-slate-400 text-[10px] text-center">
                      Inserta URL de imagen QR arriba
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 text-center">
              Así se visualizará la información en el paso 10 del cliente.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
