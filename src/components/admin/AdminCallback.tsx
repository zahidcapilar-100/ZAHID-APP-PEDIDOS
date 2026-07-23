import React, { useEffect, useState } from 'react';
import { exchangeNotionOAuthCode } from '../../lib/notionService';
import { saveNotionConexion } from '../../lib/supabase';
import { CheckCircle2, AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

interface AdminCallbackProps {
  onNavigate: (path: string) => void;
}

export const AdminCallback: React.FC<AdminCallbackProps> = ({ onNavigate }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');

  useEffect(() => {
    processOAuthCallback();
  }, []);

  const processOAuthCallback = async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error');

    if (errorParam) {
      setStatus('error');
      setErrorMessage(`Notion devolvió un error: ${errorParam}`);
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMessage('No se encontró el código de autorización "code" en la URL.');
      return;
    }

    const redirectUri = `${window.location.origin}/admin/integraciones/callback`;

    const res = await exchangeNotionOAuthCode(code, redirectUri);

    if (!res.success) {
      setStatus('error');
      setErrorMessage(res.error || 'Error al intercambiar el código con Notion.');
      return;
    }

    // Save details in DB / storage
    await saveNotionConexion({
      workspace_name: res.workspace_name,
      workspace_icon: res.workspace_icon,
      bot_id: res.bot_id,
      database_id: res.database_id,
    });

    setWorkspaceName(res.workspace_name || 'Notion Workspace');
    setStatus('success');

    // Auto redirect back to integrations after 2 seconds
    setTimeout(() => {
      onNavigate('/admin/integraciones');
    }, 2000);
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-md w-full space-y-5">
        {status === 'loading' && (
          <div className="space-y-4">
            <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
            <h3 className="font-extrabold text-slate-900 text-lg">
              Conectando con Notion...
            </h3>
            <p className="text-xs text-slate-500">
              Intercambiando código de autorización y registrando las credenciales.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-lg">
              ¡Conexión Exitosa!
            </h3>
            <p className="text-xs text-slate-600">
              Se ha vinculado correctamente el workspace <strong>{workspaceName}</strong>.
            </p>
            <p className="text-[11px] text-slate-400">
              Redirigiendo a la configuración de integración...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-lg">
              Error en la Integración
            </h3>
            <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 font-mono">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => onNavigate('/admin/integraciones')}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a Integraciones</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
