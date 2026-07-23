import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Settings,
  LogOut,
  RefreshCw,
  AlertTriangle,
  Menu,
  X,
  CheckCircle2,
  LucideIcon,
  FileSpreadsheet,
  Clock,
  ShieldCheck,
  User,
} from 'lucide-react';
import { APP_CONFIG } from '../../config';
import { OrderPayload, AdminProduct, SheetsConfig } from '../../types';
import {
  getAdminSession,
  revokeGoogleToken,
  requestGoogleToken,
  saveAdminSession,
  AdminSession,
  getAuthConfig,
} from '../../lib/googleAuth';
import {
  getConnectedSpreadsheet,
  fetchOrdersFromSheetsApi,
  fetchProductsFromSheetsApi,
  fetchConfigFromSheetsApi,
} from '../../lib/googleSheetsApi';
import {
  fetchAdminOrders,
  fetchAdminProducts,
  fetchAdminConfig,
} from '../../lib/sheetsService';

export type AdminTab = 'dashboard' | 'pedidos' | 'productos' | 'configuracion' | 'conexion';

interface AdminLayoutProps {
  session: AdminSession;
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  onLogout: () => void;
  children: (props: {
    orders: OrderPayload[];
    products: AdminProduct[];
    config: SheetsConfig;
    loading: boolean;
    error: string | null;
    refreshData: () => Promise<void>;
  }) => React.ReactNode;
}

interface NavItem {
  id: AdminTab;
  label: string;
  icon: LucideIcon;
  count?: number;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  session,
  currentTab,
  onSelectTab,
  onLogout,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // State shared across views
  const [orders, setOrders] = useState<OrderPayload[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [config, setConfig] = useState<SheetsConfig>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState<number>(0);

  // Session Expiration Warning
  const [showExpiryWarning, setShowExpiryWarning] = useState<boolean>(false);
  const [renewingToken, setRenewingToken] = useState<boolean>(false);

  const connectedSheet = getConnectedSpreadsheet();

  // Data fetching logic
  const loadAllData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);

      const activeSession = getAdminSession() || session;
      const sheet = getConnectedSpreadsheet();

      try {
        if (sheet.id && activeSession?.token) {
          // Direct Google Sheets REST API
          const [ordersRes, prodsRes, configRes] = await Promise.all([
            fetchOrdersFromSheetsApi(sheet.id, activeSession.token),
            fetchProductsFromSheetsApi(sheet.id, activeSession.token),
            fetchConfigFromSheetsApi(sheet.id, activeSession.token),
          ]);

          // Handle token expired
          if (
            ordersRes.error === 'token_expirado' ||
            prodsRes.error === 'token_expirado' ||
            configRes.error === 'token_expirado'
          ) {
            setShowExpiryWarning(true);
            setError('Tu sesión de Google expiró. Haz clic en "Renovar" arriba.');
            setLoading(false);
            return;
          }

          if (ordersRes.ok && Array.isArray(ordersRes.pedidos)) {
            setOrders(ordersRes.pedidos);
          }
          if (prodsRes.ok && Array.isArray(prodsRes.productos)) {
            setProducts(prodsRes.productos);
          }
          if (configRes.ok && configRes.config) {
            setConfig(configRes.config);
          }

          setError(null);
          setLastUpdated(new Date());
        } else {
          // Fallback to Web App Apps Script endpoint
          const [ordersRes, prodsRes, configRes] = await Promise.all([
            fetchAdminOrders('demo_key'),
            fetchAdminProducts('demo_key'),
            fetchAdminConfig('demo_key'),
          ]);

          if (ordersRes.ok && Array.isArray(ordersRes.pedidos)) setOrders(ordersRes.pedidos);
          if (prodsRes.ok && Array.isArray(prodsRes.productos)) setProducts(prodsRes.productos);
          if (configRes.ok && configRes.config) setConfig(configRes.config);

          setError(null);
          setLastUpdated(new Date());
        }
      } catch (err: any) {
        setError('Error al conectar con Google Sheets API.');
      } finally {
        setLoading(false);
      }
    },
    [session]
  );

  // Initial load
  useEffect(() => {
    loadAllData(false);
  }, [loadAllData]);

  // Session Expiration Monitoring Check (warn 5 mins before expiresAt)
  useEffect(() => {
    const checkExpiration = () => {
      const currentSess = getAdminSession() || session;
      if (!currentSess) return;

      const msRemaining = currentSess.expiresAt - Date.now();
      // If less than 5 minutes (300,000 ms) remaining, show warning
      if (msRemaining < 300000 && msRemaining > 0) {
        setShowExpiryWarning(true);
      } else if (msRemaining <= 0) {
        onLogout();
      } else {
        setShowExpiryWarning(false);
      }
    };

    const interval = setInterval(checkExpiration, 15000);
    checkExpiration();
    return () => clearInterval(interval);
  }, [session, onLogout]);

  // Handle Token Silent/Prompt Renewal
  const handleRenewToken = async () => {
    setRenewingToken(true);
    try {
      const newToken = await requestGoogleToken('');
      const updatedSession: AdminSession = {
        ...session,
        token: newToken,
        expiresAt: Date.now() + 3500 * 1000,
      };
      saveAdminSession(updatedSession);
      setShowExpiryWarning(false);
      setError(null);
      await loadAllData(false);
    } catch (err) {
      console.warn('Failed to renew token automatically:', err);
      // Fallback with select_account
      try {
        const newToken = await requestGoogleToken('select_account');
        const updatedSession: AdminSession = {
          ...session,
          token: newToken,
          expiresAt: Date.now() + 3500 * 1000,
        };
        saveAdminSession(updatedSession);
        setShowExpiryWarning(false);
        setError(null);
        await loadAllData(false);
      } catch (e) {
        alert('No se pudo renovar el token. Inicia sesión de nuevo.');
        onLogout();
      }
    } finally {
      setRenewingToken(false);
    }
  };

  // Seconds ago timer
  useEffect(() => {
    const interval = setInterval(() => {
      const secs = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000);
      setSecondsAgo(secs);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Auto-polling every 45s (Page Visibility API aware)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (!timer) {
        timer = setInterval(() => {
          if (!document.hidden) {
            loadAllData(true);
          }
        }, 45000);
      }
    };

    const stopPolling = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        loadAllData(true);
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadAllData]);

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pedidos', label: 'Pedidos', icon: ShoppingBag, count: orders.length },
    { id: 'productos', label: 'Productos', icon: Package },
    { id: 'configuracion', label: 'Configuración', icon: Settings },
    { id: 'conexion', label: 'Conexión de Hoja', icon: FileSpreadsheet },
  ];

  const handleUserLogout = async () => {
    if (session.token) {
      await revokeGoogleToken(session.token);
    }
    onLogout();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-emerald-500 selection:text-white">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 shrink-0 sticky top-0 h-screen z-30">
        {/* Brand */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          {APP_CONFIG.logoUrl ? (
            <img
              src={APP_CONFIG.logoUrl}
              alt={APP_CONFIG.companyName}
              className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-700"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-extrabold text-sm">
              C
            </div>
          )}
          <div>
            <h1 className="font-extrabold text-white text-sm tracking-tight leading-tight">
              {APP_CONFIG.companyName}
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">
              Admin Panel Google OAuth
            </span>
          </div>
        </div>

        {/* User Account Info Card */}
        <div className="p-3 mx-3 my-2 bg-slate-950 border border-slate-800/80 rounded-2xl flex items-center gap-2.5">
          {session.user.picture ? (
            <img
              src={session.user.picture}
              alt={session.user.name}
              className="w-8 h-8 rounded-full border border-slate-700 shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-xs shrink-0">
              <User className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{session.user.name}</p>
            <p className="text-[10px] text-slate-400 font-mono truncate">{session.user.email}</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      isActive ? 'bg-emerald-800/80 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 space-y-2">
          {connectedSheet.id ? (
            <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-semibold truncate">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{connectedSheet.name}</span>
            </div>
          ) : (
            <button
              onClick={() => onSelectTab('conexion')}
              className="text-[11px] text-amber-400 font-semibold hover:underline flex items-center gap-1"
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Conectar hoja de Sheets</span>
            </button>
          )}
          <p className="text-[10px] text-slate-600 font-mono">
            Módulo 4 • Google OAuth & Sheets API
          </p>
        </div>
      </aside>

      {/* Main Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          {/* Mobile menu trigger */}
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="font-extrabold text-sm text-white">{APP_CONFIG.companyName}</span>
          </div>

          {/* Desktop header title */}
          <div className="hidden md:block">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              {navItems.find((n) => n.id === currentTab)?.label}
            </h2>
          </div>

          {/* Right Header Status Actions */}
          <div className="flex items-center gap-3">
            {/* Last updated indicator */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/50">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                Actualizado hace {secondsAgo}s
              </span>
            </div>

            {/* Manual refresh */}
            <button
              onClick={() => loadAllData(false)}
              disabled={loading}
              title="Refrescar datos de la hoja"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/60 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            {/* Account Email Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="max-w-[150px] truncate">{session.user.email}</span>
            </div>

            {/* Logout */}
            <button
              onClick={handleUserLogout}
              className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-b border-slate-800 p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold ${
                    currentTab === item.id
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Token Expiration Banner */}
        {showExpiryWarning && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between text-xs text-amber-300 animate-fadeIn">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Tu sesión de Google vencerá pronto. Renueva para mantener el acceso continuo.</span>
            </div>
            <button
              onClick={handleRenewToken}
              disabled={renewingToken}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
            >
              {renewingToken ? 'Renovando...' : 'Renovar Sesión'}
            </button>
          </div>
        )}

        {/* Error Banner */}
        {error && !showExpiryWarning && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => loadAllData(false)}
              className="font-bold underline text-amber-400 hover:text-amber-200 cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Main View Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children({
            orders,
            products,
            config,
            loading,
            error,
            refreshData: () => loadAllData(false),
          })}
        </main>
      </div>
    </div>
  );
};
