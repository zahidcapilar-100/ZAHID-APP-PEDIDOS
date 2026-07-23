import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { APP_CONFIG } from '../../config';
import { adminLogin } from '../../lib/sheetsService';

interface AdminLoginProps {
  onSuccess: (key: string) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Por favor ingresa la clave de acceso.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await adminLogin(password.trim());
      if (res.ok) {
        sessionStorage.setItem('admin_key', password.trim());
        onSuccess(password.trim());
      } else {
        setError('Clave de acceso incorrecta o no autorizada.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error de conexión con Google Sheets.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 select-none">
      {/* Background Subtle Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-900 to-slate-900 -z-10" />

      <div className="w-full max-w-md bg-slate-800/90 border border-slate-700/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 mb-1 shadow-inner">
            {APP_CONFIG.logoUrl ? (
              <img
                src={APP_CONFIG.logoUrl}
                alt={APP_CONFIG.companyName}
                className="w-10 h-10 rounded-xl object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <Lock className="w-7 h-7" />
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {APP_CONFIG.companyName}
          </h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400/90">
            Panel de Administración
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-300 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Clave de Acceso
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu clave de acceso..."
                autoFocus
                disabled={loading}
                className="w-full px-4 py-3.5 bg-slate-900/80 border border-slate-700 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-900/30"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verificando...</span>
              </>
            ) : (
              <>
                <span>Ingresar al Panel</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-700/50 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/70" />
          <span>Acceso cifrado directo a Google Sheets</span>
        </div>
      </div>
    </div>
  );
};
