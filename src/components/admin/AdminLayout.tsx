import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Settings,
  LogOut,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  Menu,
  X,
  CheckCircle2,
  LucideIcon,
} from 'lucide-react';
import { APP_CONFIG } from '../../config';
import { OrderPayload, AdminProduct, SheetsConfig } from '../../types';
import {
  fetchAdminOrders,
  fetchAdminProducts,
  fetchAdminConfig,
} from '../../lib/sheetsService';

interface AdminLayoutProps {
  adminKey: string;
  currentTab: 'dashboard' | 'pedidos' | 'productos' | 'configuracion';
  onSelectTab: (tab: 'dashboard' | 'pedidos' | 'productos' | 'configuracion') => void;
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
  id: 'dashboard' | 'pedidos' | 'productos' | 'configuracion';
  label: string;
  icon: LucideIcon;
  count?: number;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  adminKey,
  currentTab,
  onSelectTab,
  onLogout,
  children,
}) => {
  const [showKey, setShowKey] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // State shared across views
  const [orders, setOrders] = useState<OrderPayload[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [config, setConfig] = useState<SheetsConfig>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState<number>(0);

  // Data fetching logic
  const loadAllData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);

      try {
        const [ordersRes, prodsRes, configRes] = await Promise.all([
          fetchAdminOrders(adminKey),
          fetchAdminProducts(adminKey),
          fetchAdminConfig(adminKey),
        ]);

        if (ordersRes.error === 'no_autorizado') {
          sessionStorage.removeItem('admin_key');
          onLogout();
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
      } catch (err: any) {
        setError('Sin conexión con Google Sheets. Reintentando...');
      } finally {
        setLoading(false);
      }
    },
    [adminKey, onLogout]
  );

  // Initial load
  useEffect(() => {
    loadAllData(false);
  }, [loadAllData]);

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
  ];

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
              Admin Panel
            </span>
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
          <div className="flex items-center gap-2 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Google Sheets conectado</span>
          </div>
          <p className="text-[10px] text-slate-600 font-mono">
            Módulo 3 • Capilaris Engine
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

            {/* Masked Key Display */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-400">
              <span>Clave: {showKey ? adminKey : '••••••••'}</span>
              <button
                onClick={() => setShowKey(!showKey)}
                className="text-slate-500 hover:text-slate-300 cursor-pointer ml-1"
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Logout */}
            <button
              onClick={onLogout}
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

        {/* Error / Connection Banner */}
        {error && (
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
