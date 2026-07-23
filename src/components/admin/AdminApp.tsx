import React, { useState, useEffect } from 'react';
import { AdminLogin } from './AdminLogin';
import { AdminLayout } from './AdminLayout';
import { AdminDashboard } from './AdminDashboard';
import { AdminOrders } from './AdminOrders';
import { AdminProducts } from './AdminProducts';
import { AdminConfig } from './AdminConfig';

export function AdminApp() {
  const [adminKey, setAdminKey] = useState<string | null>(() => {
    return sessionStorage.getItem('admin_key');
  });

  const [currentTab, setCurrentTab] = useState<'dashboard' | 'pedidos' | 'productos' | 'configuracion'>(() => {
    const path = window.location.pathname;
    if (path.includes('/admin/pedidos')) return 'pedidos';
    if (path.includes('/admin/productos')) return 'productos';
    if (path.includes('/admin/configuracion')) return 'configuracion';
    return 'dashboard';
  });

  // Listen to popstate for URL changes
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.includes('/admin/pedidos')) setCurrentTab('pedidos');
      else if (path.includes('/admin/productos')) setCurrentTab('productos');
      else if (path.includes('/admin/configuracion')) setCurrentTab('configuracion');
      else setCurrentTab('dashboard');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectTab = (tab: 'dashboard' | 'pedidos' | 'productos' | 'configuracion') => {
    setCurrentTab(tab);
    const targetPath = tab === 'dashboard' ? '/admin' : `/admin/${tab}`;
    window.history.pushState({}, '', targetPath);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_key');
    setAdminKey(null);
  };

  // Guard: If not logged in, render login view
  if (!adminKey) {
    return <AdminLogin onSuccess={(key) => setAdminKey(key)} />;
  }

  return (
    <AdminLayout
      adminKey={adminKey}
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
              adminKey={adminKey}
              loading={loading}
              onRefresh={refreshData}
            />
          );
        }

        if (currentTab === 'productos') {
          return (
            <AdminProducts
              products={products}
              adminKey={adminKey}
              loading={loading}
              onRefresh={refreshData}
            />
          );
        }

        if (currentTab === 'configuracion') {
          return (
            <AdminConfig
              config={config}
              adminKey={adminKey}
              loading={loading}
              onRefresh={refreshData}
            />
          );
        }

        return null;
      }}
    </AdminLayout>
  );
}

export default AdminApp;
