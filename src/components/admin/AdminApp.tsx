import React, { useState, useEffect } from 'react';
import { AdminLogin } from './AdminLogin';
import { AdminLayout, AdminTab } from './AdminLayout';
import { AdminDashboard } from './AdminDashboard';
import { AdminOrders } from './AdminOrders';
import { AdminProducts } from './AdminProducts';
import { AdminConfig } from './AdminConfig';
import { AdminConexion } from './AdminConexion';
import { getAdminSession, clearAdminSession, AdminSession } from '../../lib/googleAuth';

export function AdminApp() {
  const [session, setSession] = useState<AdminSession | null>(() => getAdminSession());

  const [currentTab, setCurrentTab] = useState<AdminTab>(() => {
    const path = window.location.pathname;
    if (path.includes('/admin/pedidos')) return 'pedidos';
    if (path.includes('/admin/productos')) return 'productos';
    if (path.includes('/admin/configuracion')) return 'configuracion';
    if (path.includes('/admin/conexion')) return 'conexion';
    return 'dashboard';
  });

  // Listen to popstate for URL changes
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.includes('/admin/pedidos')) setCurrentTab('pedidos');
      else if (path.includes('/admin/productos')) setCurrentTab('productos');
      else if (path.includes('/admin/configuracion')) setCurrentTab('configuracion');
      else if (path.includes('/admin/conexion')) setCurrentTab('conexion');
      else setCurrentTab('dashboard');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectTab = (tab: AdminTab) => {
    setCurrentTab(tab);
    const targetPath = tab === 'dashboard' ? '/admin' : `/admin/${tab}`;
    window.history.pushState({}, '', targetPath);
  };

  const handleLogout = () => {
    clearAdminSession();
    setSession(null);
  };

  // Guard: If no active session, render Google OAuth login view
  if (!session) {
    return <AdminLogin onSuccess={(newSession) => setSession(newSession)} />;
  }

  return (
    <AdminLayout
      session={session}
      currentTab={currentTab}
      onSelectTab={handleSelectTab}
      onLogout={handleLogout}
    >
      {({ orders, products, config, loading, refreshData }) => {
        if (currentTab === 'dashboard') {
          return (
            <AdminDashboard
              orders={orders}
              loading={loading}
              onViewOrders={() => handleSelectTab('pedidos')}
            />
          );
        }

        if (currentTab === 'pedidos') {
          return (
            <AdminOrders
              orders={orders}
              adminKey={session.token}
              loading={loading}
              onRefresh={refreshData}
            />
          );
        }

        if (currentTab === 'productos') {
          return (
            <AdminProducts
              products={products}
              adminKey={session.token}
              loading={loading}
              onRefresh={refreshData}
            />
          );
        }

        if (currentTab === 'configuracion') {
          return (
            <AdminConfig
              config={config}
              adminKey={session.token}
              loading={loading}
              onRefresh={refreshData}
            />
          );
        }

        if (currentTab === 'conexion') {
          return <AdminConexion onSpreadsheetChanged={refreshData} />;
        }

        return null;
      }}
    </AdminLayout>
  );
}

export default AdminApp;
