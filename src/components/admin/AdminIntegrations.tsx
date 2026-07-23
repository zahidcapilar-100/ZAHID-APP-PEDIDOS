import React, { useState, useEffect } from 'react';
import { fetchNotionConexion, saveNotionConexion, disconnectNotionConexion, NotionConexion } from '../../lib/supabase';
import {
  fetchNotionDatabases,
  validateNotionManualToken,
  testNotionConnection,
  NotionDatabaseInfo,
} from '../../lib/notionService';
import {
  Share2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Sliders,
  Trash2,
  Sparkles,
  Database,
  Lock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export const AdminIntegrations: React.FC = () => {
  const [conexion, setConexion] = useState<NotionConexion | null>(null);
  const [loading, setLoading] = useState(true);

  // Manual Token Form state
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [manualDbId, setManualDbId] = useState('');
  const [manualValidating, setManualValidating] = useState(false);
  const [manualError, setManualError] = useState('');

  // Connected state databases & mapping
  const [databases, setDatabases] = useState<NotionDatabaseInfo[]>([]);
  const [selectedDbId, setSelectedDbId] = useState<string>('');
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [savingMapping, setSavingMapping] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; msg?: string; error?: string } | null>(null);

  // Notion Client ID & Redirect URI
  const clientId = import.meta.env.VITE_NOTION_CLIENT_ID || '1de2bf1e-b873-80b1-8408-0037a3ca9bf1';
  const redirectUri =
    import.meta.env.VITE_NOTION_REDIRECT_URI ||
    `${window.location.origin}/admin/integraciones/callback`;

  const notionOAuthUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(
    redirectUri
  )}`;

  // List of app fields to map
  const APP_FIELDS = [
    { key: 'numero_pedido', label: 'Número de Pedido', expectedType: ['title', 'rich_text'] },
    { key: 'nombre', label: 'Nombre del Cliente', expectedType: ['rich_text', 'title'] },
    { key: 'whatsapp', label: 'Teléfono / WhatsApp', expectedType: ['phone_number', 'rich_text'] },
    { key: 'email', label: 'Correo Electrónico', expectedType: ['email', 'rich_text'] },
    { key: 'ciudad', label: 'Ciudad / Dirección', expectedType: ['rich_text'] },
    { key: 'producto', label: 'Producto', expectedType: ['select', 'rich_text'] },
    { key: 'cantidad', label: 'Cantidad', expectedType: ['number'] },
    { key: 'precio_unitario', label: 'Precio Unitario', expectedType: ['number'] },
    { key: 'total', label: 'Total ($)', expectedType: ['number'] },
    { key: 'notas', label: 'Notas / Observaciones', expectedType: ['rich_text'] },
    { key: 'metodo_pago', label: 'Método de Pago', expectedType: ['select', 'rich_text'] },
    { key: 'estado', label: 'Estado del Pedido', expectedType: ['status', 'select', 'rich_text'] },
    { key: 'fecha', label: 'Fecha de Creación', expectedType: ['date', 'rich_text'] },
  ];

  useEffect(() => {
    loadConexionAndDatabases();
  }, []);

  const loadConexionAndDatabases = async () => {
    setLoading(true);
    const conn = await fetchNotionConexion();
    setConexion(conn);

    if (conn && conn.access_token) {
      setSelectedDbId(conn.database_id || '');
      setMapping(conn.mapeo || {});

      const { databases: dbList } = await fetchNotionDatabases(conn.access_token);
      setDatabases(dbList);

      if (!conn.database_id && dbList.length > 0) {
        setSelectedDbId(dbList[0].id);
      }
    }
    setLoading(false);
  };

  // Manual Connection submit
  const handleSaveManualConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;

    setManualValidating(true);
    setManualError('');

    const res = await validateNotionManualToken(manualToken.trim(), manualDbId.trim() || undefined);

    if (!res.valid) {
      setManualError(res.error || 'Token o ID de base de datos no válido.');
      setManualValidating(false);
      return;
    }

    await saveNotionConexion({
      access_token: manualToken.trim(),
      workspace_name: res.workspace_name || 'Workspace Manual',
      database_id: manualDbId.trim() || undefined,
    });

    setManualValidating(false);
    setShowManualForm(false);
    loadConexionAndDatabases();
  };

  // Database change handler
  const handleDatabaseChange = async (newDbId: string) => {
    setSelectedDbId(newDbId);
    await saveNotionConexion({ database_id: newDbId });
  };

  // Mapping Property Selection
  const handleMappingChange = (appKey: string, targetPropName: string) => {
    setMapping((prev) => ({
      ...prev,
      [appKey]: targetPropName,
    }));
  };

  // Save Mapping
  const handleSaveMapping = async () => {
    setSavingMapping(true);
    await saveNotionConexion({ mapeo: mapping, database_id: selectedDbId });
    setSavingMapping(false);
  };

  // Test Connection
  const handleTestConnection = async () => {
    setTestingConn(true);
    setTestResult(null);
    const res = await testNotionConnection();
    setTestResult({
      success: res.success,
      msg: res.message,
      error: res.error,
    });
    setTestingConn(false);
  };

  // Disconnect Workspace
  const handleDisconnect = async () => {
    if (confirm('¿Estás seguro de desconectar el workspace de Notion? Los nuevos pedidos dejarán de sincronizarse.')) {
      await disconnectNotionConexion();
      setConexion(null);
      setDatabases([]);
      setMapping({});
    }
  };

  const selectedDbInfo = databases.find((d) => d.id === selectedDbId);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-xl w-64" />
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  const isConnected = Boolean(conexion && conexion.access_token);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Integración con Notion
        </h2>
        <p className="text-xs text-slate-500">
          Sincroniza automáticamente los pedidos recibidos con tu base de datos en Notion
        </p>
      </div>

      {!isConnected ? (
        /* ==================================================================== */
        /* STATE 1: DESCONECTADO */
        /* ==================================================================== */
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-xs text-center space-y-6">
          {/* Notion Logo Icon */}
          <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-md">
            <Share2 className="w-8 h-8 text-emerald-400" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-xl font-extrabold text-slate-900">
              Conecta tu Workspace de Notion
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Al conectar Notion, cada pedido completado en la web creará automáticamente una página en tu base de datos elegida con todos los campos del cliente.
            </p>
          </div>

          {/* OAuth Connect Button */}
          <div className="pt-2">
            <a
              href={notionOAuthUrl}
              className="inline-flex items-center gap-3 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm rounded-2xl shadow-md transition-all cursor-pointer active:scale-98 hover:shadow-lg"
            >
              <span>Conectar con Notion</span>
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </a>
          </div>

          {/* Discrete Manual Token Link */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowManualForm(!showManualForm)}
              className="text-xs font-bold text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
            >
              {showManualForm
                ? 'Ocultar conexión manual'
                : 'Conectar manualmente con un token de integración secret_...'}
            </button>
          </div>

          {/* Manual Token Form */}
          {showManualForm && (
            <form
              onSubmit={handleSaveManualConnection}
              className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left max-w-md mx-auto space-y-4 animate-fadeIn"
            >
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>Configuración de Token Manual</span>
              </div>

              {manualError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{manualError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase block">
                  Token Secreto de Integración
                </label>
                <input
                  type="password"
                  required
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase block">
                  ID de la Base de Datos (Opcional)
                </label>
                <input
                  type="text"
                  value={manualDbId}
                  onChange={(e) => setManualDbId(e.target.value)}
                  placeholder="Ej. 182a3b4c5d6e7f8g..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={manualValidating}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {manualValidating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Validar y Guardar Conexión</span>
                )}
              </button>
            </form>
          )}
        </div>
      ) : (
        /* ==================================================================== */
        /* STATE 2: CONECTADO */
        /* ==================================================================== */
        <div className="space-y-6">
          {/* Connection Info Banner */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xl shrink-0">
                {conexion?.workspace_icon || '🌿'}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {conexion?.workspace_name || 'Workspace Notion'}
                  </h3>
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold border border-emerald-300">
                    Conectado
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Conectado el {new Date(conexion?.conectado_en || Date.now()).toLocaleDateString('es-CO')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDisconnect}
              className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Desconectar workspace</span>
            </button>
          </div>

          {/* Database Selector */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Base de Datos Destino</span>
            </div>
            <p className="text-xs text-slate-500">
              Selecciona en qué base de datos de Notion se insertarán los pedidos de la tienda.
            </p>

            <select
              value={selectedDbId}
              onChange={(e) => handleDatabaseChange(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {databases.length === 0 ? (
                <option value="">Cargando o buscando bases de datos...</option>
              ) : (
                databases.map((db) => (
                  <option key={db.id} value={db.id}>
                    {db.icon ? `${db.icon} ` : ''}{db.title} ({db.properties.length} propiedades)
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Mapeo de Campos Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Mapeo de Campos (App ↔ Notion)
                </h3>
                <p className="text-xs text-slate-500">
                  Asigna cada campo del formulario público a la propiedad correspondiente en Notion.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveMapping}
                disabled={savingMapping}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
              >
                {savingMapping ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sliders className="w-3.5 h-3.5" />}
                <span>Guardar Mapeo</span>
              </button>
            </div>

            {/* Mapping Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Campo del Pedido (App)</th>
                    <th className="py-2.5 px-3">Propiedad en Notion</th>
                    <th className="py-2.5 px-3">Estado Mapeo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {APP_FIELDS.map((f) => {
                    const currentPropName = mapping[f.key] || '';
                    const matchedProp = selectedDbInfo?.properties.find((p) => p.name === currentPropName);
                    const typeMismatch =
                      matchedProp && !f.expectedType.includes(matchedProp.type);

                    return (
                      <tr key={f.key} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-800 block">{f.label}</span>
                          <span className="text-[10px] text-slate-400 font-mono">[{f.key}]</span>
                        </td>

                        <td className="py-3 px-3">
                          <select
                            value={currentPropName}
                            onChange={(e) => handleMappingChange(f.key, e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
                          >
                            <option value="">-- Sin mapear --</option>
                            {selectedDbInfo?.properties.map((p) => (
                              <option key={p.id} value={p.name}>
                                {p.name} ({p.type})
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-3 px-3">
                          {typeMismatch ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                              <span>Tipo ({matchedProp?.type}) diferido</span>
                            </span>
                          ) : currentPropName ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span>Correcto</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Auto-detectar</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Test Connection Button */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm">
                Probar Conexión con Notion
              </h4>
              <p className="text-xs text-slate-500">
                Crea un pedido de prueba ficticio en Notion y lo elimina inmediatamente para verificar que el token y los campos tengan permisos de escritura.
              </p>
            </div>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConn}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shrink-0"
            >
              {testingConn ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Probando...
                </span>
              ) : (
                <span>Probar Conexión</span>
              )}
            </button>
          </div>

          {/* Test Result Banner */}
          {testResult && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-center gap-3 animate-fadeIn ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <div>
                <p className="font-bold">
                  {testResult.success ? '¡Prueba Exitosa!' : 'Falló la prueba de conexión'}
                </p>
                <p>{testResult.msg || testResult.error}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
