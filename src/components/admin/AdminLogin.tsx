import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Lock, Mail, ShieldAlert, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

interface AdminLoginProps {
  onSuccess: (email: string) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('admin@capilaris.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setErrorMessage(error.message || 'Credenciales incorrectas.');
          setLoading(false);
          return;
        }

        if (data.user) {
          onSuccess(data.user.email || email);
          return;
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Error al iniciar sesión con Supabase.');
        setLoading(false);
        return;
      }
    }

    // Demo/Offline Mode fallback
    setTimeout(() => {
      onSuccess(email || 'admin@capilaris.com');
      setLoading(false);
    }, 400);
  };

  const handleDemoAccess = () => {
    onSuccess('admin@capilaris.com');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Background Subtle Accent Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950 pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xl mx-auto shadow-lg shadow-emerald-500/20">
            C&C
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Panel de Administración
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Acceso seguro para gestión de pedidos y sincronización con Notion
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          {!isSupabaseConfigured && (
            <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-2xl p-3.5 text-xs text-emerald-200 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">Modo Demo Activo</p>
                <p className="text-[11px] text-emerald-300">
                  Puedes ingresar con cualquier correo y contraseña o usar el botón de acceso rápido.
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-950/60 border border-red-500/40 text-red-200 rounded-2xl p-3.5 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@capilaris.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required={isSupabaseConfigured}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/10 active:scale-98"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Iniciar Sesión</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Direct Demo Access Button */}
          <div className="pt-3 border-t border-slate-700/60 text-center">
            <button
              type="button"
              onClick={handleDemoAccess}
              className="text-xs font-bold text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer py-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Acceso directo sin contraseña (Demostración)</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-center text-slate-500">
          Capilaris & Care • Sistema de Gestión Módulo 2
        </p>
      </div>
    </div>
  );
};
