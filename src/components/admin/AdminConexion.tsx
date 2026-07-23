import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  FolderOpen,
  Wrench,
  Send,
  Loader2,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import {
  getConnectedSpreadsheet,
  saveConnectedSpreadsheet,
  clearConnectedSpreadsheet,
  getEndpointOverride,
  saveEndpointOverride,
  diagnoseSpreadsheetStructure,
  createSpreadsheetStructureAuto,
  testEndpointOrderSheetsApi,
  DiagnosticResult,
} from '../../lib/googleSheetsApi';
import { showGooglePicker, getAdminSession } from '../../lib/googleAuth';
import { getSheetsEndpoint } from '../../lib/sheetsService';

interface AdminConexionProps {
  onSpreadsheetChanged?: () => void;
}

export const AdminConexion: React.FC<AdminConexionProps> = ({ onSpreadsheetChanged }) => {
  const session = getAdminSession();
  const [spreadsheet, setSpreadsheet] = useState(() => getConnectedSpreadsheet());
  const [endpointUrl, setEndpointUrl] = useState(() => getEndpointOverride() || getSheetsEndpoint());

  const [diagnosing, setDiagnosing] = useState<boolean>(false);
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);

  const [creatingAuto, setCreatingAuto] = useState<boolean>(false);
  const [autoMsg, setAutoMsg] = useState<string | null>(null);

  const [testingEndpoint, setTestingEndpoint] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Run diagnosis whenever spreadsheet changes or component mounts
  useEffect(() => {
    if (spreadsheet.id && session?.token) {
      runDiagnosis(spreadsheet.id, session.token);
    } else {
      setDiagnostic(null);
    }
  }, [spreadsheet.id]);

  const runDiagnosis = async (sheetId: string, token: string) => {
    setDiagnosing(true);
    const result = await diagnoseSpreadsheetStructure(sheetId, token);
    setDiagnostic(result);
    setDiagnosing(false);
  };

  const handleOpenPicker = () => {
    if (!session?.token) {
      alert('Tu sesión ha expirado. Inicia sesión de nuevo.');
      return;
    }

    showGooglePicker(
      session.token,
      (selected) => {
        saveConnectedSpreadsheet(selected.id, selected.name);
        setSpreadsheet(selected);
        if (onSpreadsheetChanged) onSpreadsheetChanged();
      },
      () => {
        console.log('Picker cancelled');
      }
    );
  };

  const handleCreateAutoStructure = async () => {
    if (!spreadsheet.id || !session?.token) return;
    setCreatingAuto(true);
    setAutoMsg(null);

    try {
      const newDiag = await createSpreadsheetStructureAuto(spreadsheet.id, session.token);
      setDiagnostic(newDiag);
      if (newDiag.isValid) {
        setAutoMsg('¡Estructura creada correctamente! Pestañas y encabezados configurados.');
      } else {
        setAutoMsg('Se ejecutó la creación, pero algunos elementos aún requieren atención.');
      }
      if (onSpreadsheetChanged) onSpreadsheetChanged();
    } catch (err: any) {
      setAutoMsg(`Error al crear la estructura: ${err.message || err}`);
    } finally {
      setCreatingAuto(false);
    }
  };

  const handleSaveEndpoint = () => {
    saveEndpointOverride(endpointUrl.trim());
    alert('Endpoint guardado correctamente.');
    if (onSpreadsheetChanged) onSpreadsheetChanged();
  };

  const handleTestEndpoint = async () => {
    if (!spreadsheet.id || !session?.token) {
      alert('Primero conecta una hoja de cálculo.');
      return;
    }
    if (!endpointUrl || !endpointUrl.startsWith('http')) {
      alert('Ingresa una URL válida de Apps Script Web App.');
      return;
    }

    setTestingEndpoint(true);
    setTestResult(null);

    const result = await testEndpointOrderSheetsApi(spreadsheet.id, session.token, endpointUrl.trim());
    setTestResult(result);
    setTestingEndpoint(false);

    if (result.success) {
      // Refresh diagnosis
      runDiagnosis(spreadsheet.id, session.token);
    }
  };

  const handleDisconnect = () => {
    if (confirm('¿Estás seguro de desconectar esta hoja de cálculo del panel?')) {
      clearConnectedSpreadsheet();
      setSpreadsheet({ id: '', name: '' });
      setDiagnostic(null);
      if (onSpreadsheetChanged) onSpreadsheetChanged();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Conexión con Google Sheets</h2>
          <p className="text-xs text-slate-400">
            Administra la hoja de cálculo de Google donde se almacenan tus pedidos y productos.
          </p>
        </div>
      </div>

      {/* DISCONNECTED STATE */}
      {!spreadsheet.id ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-12 text-center space-y-6 shadow-2xl">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
            <FileSpreadsheet className="w-10 h-10" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-extrabold text-white">Sin Hoja de Cálculo Conectada</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Conecta la hoja de cálculo de Google donde se guardan tus pedidos, productos y configuración de la tienda Capilaris.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleOpenPicker}
              className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2.5 mx-auto transition-all cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Conectar hoja de Google Sheets</span>
            </button>
          </div>
        </div>
      ) : (
        /* CONNECTED STATE */
        <div className="space-y-6">
          {/* Main Connected Status Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 shrink-0">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-extrabold text-white text-base">{spreadsheet.name}</h3>
                    <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full font-bold text-[10px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Conectada
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    ID: {spreadsheet.id}
                  </p>
                  {session?.user?.email && (
                    <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-300">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>Cuenta: {session.user.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`https://docs.google.com/spreadsheets/d/${spreadsheet.id}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Abrir en Google Sheets</span>
                </a>

                <button
                  onClick={handleOpenPicker}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
                  <span>Cambiar de hoja</span>
                </button>

                <button
                  onClick={handleDisconnect}
                  className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-xl border border-rose-500/30 transition-colors cursor-pointer"
                  title="Desconectar hoja"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Diagnostic Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-emerald-400" />
                  <span>Diagnóstico de Estructura</span>
                </h4>

                <button
                  onClick={() => session?.token && runDiagnosis(spreadsheet.id, session.token)}
                  disabled={diagnosing}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${diagnosing ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>Verificar estructura</span>
                </button>
              </div>

              {diagnosing ? (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Verificando pestañas y encabezados...</span>
                </div>
              ) : diagnostic ? (
                <div className="space-y-3">
                  {diagnostic.isValid ? (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between text-xs text-emerald-300">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div>
                          <p className="font-bold">¡Estructura de la hoja válida y completa!</p>
                          <p className="text-[11px] text-emerald-300/80">
                            Pestañas 'Pedidos', 'Productos' y 'Configuración' detectadas. Se encontraron{' '}
                            <strong>{diagnostic.detectedOrdersCount}</strong> pedidos registrados.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3 text-xs text-amber-300">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-amber-200">
                            La hoja requiere completar su estructura:
                          </p>
                          <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-amber-300/90 font-mono">
                            {diagnostic.missingSheets.map((s) => (
                              <li key={s}>Falta la pestaña: '{s}'</li>
                            ))}
                            {diagnostic.missingHeaders.map((mh) => (
                              <li key={mh.sheet}>
                                En '{mh.sheet}' faltan encabezados: {mh.missing.join(', ')}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <button
                        onClick={handleCreateAutoStructure}
                        disabled={creatingAuto}
                        className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {creatingAuto ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Wrench className="w-4 h-4" />
                        )}
                        <span>Crear estructura automáticamente</span>
                      </button>
                    </div>
                  )}

                  {autoMsg && (
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300">
                      {autoMsg}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {/* Endpoint Web App Settings */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-4 shadow-2xl">
            <div>
              <h3 className="font-extrabold text-white text-base">Endpoint del Formulario Público (Apps Script Web App)</h3>
              <p className="text-xs text-slate-400">
                El formulario público envía los pedidos a través de esta URL Web App de Google Apps Script.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="url"
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleSaveEndpoint}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 shrink-0 cursor-pointer"
                >
                  Guardar Endpoint
                </button>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleTestEndpoint}
                  disabled={testingEndpoint || !endpointUrl}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {testingEndpoint ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Probar Endpoint con Pedido de Prueba</span>
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-4 rounded-2xl text-xs border ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <p className="font-bold">{testResult.success ? '¡Prueba Exitosa!' : 'Prueba Fallida'}</p>
                  <p className="text-[11px] mt-1 leading-relaxed">{testResult.message}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
