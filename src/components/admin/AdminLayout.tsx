import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Share2,
  Settings,
  LogOut,
  ExternalLink,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  ShieldCheck,
  Building2,
} from 'lucide-react';

interface AdminLayoutProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  userEmail: string;
  onLogout: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentPath,
  onNavigate,
  userEmail,
  onLogout,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    {
      id: '/admin',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Métricas e indicadores generales',
    },
    {
      id: '/admin/pedidos',
      label: 'Pedidos',
      icon: ShoppingBag,
      description: 'Gestión y estado de pedidos',
    },
    {
      id: '/admin/integraciones',
      label: 'Notion Sync',
      icon: Share2,
      description: 'Conexión con workspace Notion',
    },
    {
      id: '/admin/configuracion',
      label: 'Configuración',
      icon: Settings,
      description: 'Productos, precios y datos bancarios',
    },
  ];

  const handleNavClick = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col md:flex-row antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-sm">
            C&C
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-100">
            Panel Capilaris
          </span>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-300 hover:text-white rounded-lg bg-slate-800"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out md:translate-x-0 md:static ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-slate-950 flex items-center justify-center font-extrabold text-sm shadow-md">
              C&C
            </div>
            <div>
              <h1 className="font-extrabold text-white text-sm tracking-tight leading-none">
                Capilaris Admin
              </h1>
              <span className="text-[11px] text-emerald-400 font-medium tracking-wide">
                Módulo 2 • Backend
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Menú Principal
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentPath === item.id ||
              (item.id === '/admin/pedidos' && currentPath.startsWith('/admin/pedidos'));

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'
                  }`}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-200" />}
              </button>
            );
          })}

          <div className="pt-6 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Formulario Público
          </div>

          <button
            type="button"
            onClick={() => handleNavClick('/')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer border border-dashed border-slate-700/60"
          >
            <ExternalLink className="w-4 h-4 text-emerald-400" />
            <span className="flex-1 text-left">Ver Formulario Cliente</span>
          </button>
        </nav>

        {/* Sidebar Footer User Info & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="truncate">
                <p className="font-semibold text-slate-200 truncate text-[11px]">
                  {userEmail || 'admin@capilaris.com'}
                </p>
                <p className="text-[10px] text-slate-400">Administrador</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              title="Cerrar sesión"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Desktop Bar */}
        <header className="hidden md:flex items-center justify-between h-14 px-6 bg-white border-b border-slate-200 shadow-xs sticky top-0 z-30">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span>Panel de Control</span>
            <span className="text-slate-300">/</span>
            <span className="font-bold text-slate-900">
              {navItems.find(
                (n) => n.id === currentPath || (n.id === '/admin/pedidos' && currentPath.startsWith('/admin/pedidos'))
              )?.label || 'Sección'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Conexión activa
            </span>

            <div className="h-4 w-px bg-slate-200" />

            <div className="text-xs text-slate-600 font-medium flex items-center gap-2">
              <span className="text-slate-400">Sesión:</span>
              <span className="font-bold text-slate-800">{userEmail}</span>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-red-700 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          </div>
        </header>

        {/* Dynamic Screen View Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
