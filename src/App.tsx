/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ProgressBar } from './components/ProgressBar';
import { StepWrapper } from './components/StepWrapper';
import { TextStep } from './components/TextStep';
import { WhatsAppStep } from './components/WhatsAppStep';
import { ChoiceStep } from './components/ChoiceStep';
import { QuantityStep } from './components/QuantityStep';
import { SummaryStep } from './components/SummaryStep';
import { PaymentMethodStep } from './components/PaymentMethodStep';
import { PaymentScreen } from './components/PaymentScreen';
import { ConfigModal } from './components/ConfigModal';
import { OrderFormData, OrderPayload, PaymentMethodType, CompanyConfig } from './types';
import { APP_CONFIG, generateOrderNumber } from './config';

// Admin Imports
import { supabase, isSupabaseConfigured, savePublicOrder, fetchStoreConfig } from './lib/supabase';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminOrders } from './components/admin/AdminOrders';
import { AdminIntegrations } from './components/admin/AdminIntegrations';
import { AdminCallback } from './components/admin/AdminCallback';
import { AdminConfig } from './components/admin/AdminConfig';

const LOCAL_STORAGE_KEY = 'capilaris_order_draft_v1';
const LOCAL_STORAGE_ADMIN_USER = 'capilaris_admin_user_session_v1';

export default function App() {
  // Path Router State
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  const [adminUserEmail, setAdminUserEmail] = useState<string | null>(() => {
    return localStorage.getItem(LOCAL_STORAGE_ADMIN_USER);
  });

  // Dynamic Store Config
  const [storeConfig, setStoreConfig] = useState<CompanyConfig>(APP_CONFIG);

  // Form State
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [direction, setDirection] = useState<'next' | 'back'>('next');
  const [isPaymentScreen, setIsPaymentScreen] = useState<boolean>(false);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);

  // Webhook URL
  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    return (
      (import.meta.env.VITE_WEBHOOK_URL as string) ||
      'https://hook.us1.make.com/your-notion-webhook-id'
    );
  });

  // Form Data state
  const [formData, setFormData] = useState<OrderFormData>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return {
      nombre: '',
      countryCode: '+57',
      whatsappNumber: '',
      email: '',
      ciudad: '',
      productoId: storeConfig.products[0]?.id || 'prod-1',
      cantidad: 1,
      notas: '',
      metodoPago: 'transferencia',
    };
  });

  // Order Submission State
  const [orderPayload, setOrderPayload] = useState<OrderPayload | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [webhookErrorMsg, setWebhookErrorMsg] = useState<string>('');

  // Handle Browser Back/Forward buttons and Path sync
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Load Dynamic Store Config and Supabase Auth State
  useEffect(() => {
    fetchStoreConfig().then((cfg) => {
      if (cfg) {
        setStoreConfig(cfg);
        if (!formData.productoId && cfg.products.length > 0) {
          setFormData((prev) => ({ ...prev, productoId: cfg.products[0].id }));
        }
      }
    });

    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
          setAdminUserEmail(data.session.user.email || 'admin@capilaris.com');
          localStorage.setItem(
            LOCAL_STORAGE_ADMIN_USER,
            data.session.user.email || 'admin@capilaris.com'
          );
        }
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setAdminUserEmail(session.user.email || 'admin@capilaris.com');
          localStorage.setItem(
            LOCAL_STORAGE_ADMIN_USER,
            session.user.email || 'admin@capilaris.com'
          );
        } else if (_event === 'SIGNED_OUT') {
          setAdminUserEmail(null);
          localStorage.removeItem(LOCAL_STORAGE_ADMIN_USER);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  // Custom Navigation function
  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Logout Handler
  const handleLogout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setAdminUserEmail(null);
    localStorage.removeItem(LOCAL_STORAGE_ADMIN_USER);
    navigateTo('/admin/login');
  };

  // Selected Product helper
  const selectedProduct =
    storeConfig.products.find((p) => p.id === formData.productoId) ||
    storeConfig.products[0] ||
    APP_CONFIG.products[0];

  // Navigation handlers for public form
  const handleNextStep = () => {
    setDirection('next');
    if (currentStep < 9) {
      setCurrentStep((prev) => prev + 1);
    } else if (currentStep === 9) {
      submitOrderAndProceed();
    }
  };

  const handleBackStep = () => {
    if (currentStep > 1) {
      setDirection('back');
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleEditStep = (stepNumber: number) => {
    setDirection('back');
    setCurrentStep(stepNumber);
  };

  const handleResetOrder = () => {
    setDirection('next');
    setCurrentStep(1);
    setIsPaymentScreen(false);
    setOrderPayload(null);
    setWebhookStatus('idle');
    setFormData({
      nombre: '',
      countryCode: '+57',
      whatsappNumber: '',
      email: '',
      ciudad: '',
      productoId: storeConfig.products[0]?.id || 'prod-1',
      cantidad: 1,
      notas: '',
      metodoPago: 'transferencia',
    });
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  // Submit order to Supabase and invoke Notion Sync
  const submitOrderAndProceed = async (overrideFormData?: OrderFormData) => {
    const dataToSubmit = overrideFormData || formData;
    const prod =
      storeConfig.products.find((p) => p.id === dataToSubmit.productoId) ||
      storeConfig.products[0] ||
      APP_CONFIG.products[0];

    const unitPrice = prod ? prod.price : 0;
    const qty = Math.max(1, dataToSubmit.cantidad);
    const total = unitPrice * qty;
    const numeroPedido = generateOrderNumber();
    const formattedWhatsApp = `${dataToSubmit.countryCode}${dataToSubmit.whatsappNumber.replace(
      /\D/g,
      ''
    )}`;

    const payload: OrderPayload = {
      numero_pedido: numeroPedido,
      nombre: dataToSubmit.nombre.trim(),
      whatsapp: formattedWhatsApp,
      email: dataToSubmit.email.trim(),
      ciudad: dataToSubmit.ciudad.trim(),
      producto: prod ? prod.name : 'Producto General',
      cantidad: qty,
      precio_unitario: unitPrice,
      total: total,
      notas: dataToSubmit.notas.trim(),
      metodo_pago: dataToSubmit.metodoPago,
      estado: 'Pendiente de pago',
      fecha: new Date().toISOString(),
    };

    setOrderPayload(payload);
    setIsPaymentScreen(true);
    setWebhookStatus('loading');
    setWebhookErrorMsg('');

    // Save order via Supabase & sync Notion
    const res = await savePublicOrder(payload);

    if (res.success) {
      setWebhookStatus('success');
    } else {
      setWebhookStatus('error');
      setWebhookErrorMsg(res.notionError || 'Error procesando el pedido.');
    }
  };

  // Public Form Validations
  const validateStep1Name = (val: string) => {
    if (val.trim().length < 3) return 'Ingresa tu nombre completo (mínimo 3 caracteres).';
    return null;
  };

  const validateStep3Email = (val: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!val.trim()) return 'El correo electrónico es obligatorio.';
    if (!emailRegex.test(val.trim())) return 'Ingresa un correo electrónico válido (ejemplo@correo.com).';
    return null;
  };

  const validateStep4Address = (val: string) => {
    if (val.trim().length < 5) return 'Ingresa la ciudad y la dirección completa de entrega.';
    return null;
  };

  // ============================================================================
  // ADMIN PANEL ROUTER BRANCH
  // ============================================================================
  if (currentPath.startsWith('/admin')) {
    // 1. OAuth Callback View
    if (currentPath === '/admin/integraciones/callback') {
      return (
        <AdminLayout
          currentPath={currentPath}
          onNavigate={navigateTo}
          userEmail={adminUserEmail || 'admin@capilaris.com'}
          onLogout={handleLogout}
        >
          <AdminCallback onNavigate={navigateTo} />
        </AdminLayout>
      );
    }

    // 2. Unauthenticated Admin -> Login
    if (!adminUserEmail && currentPath !== '/admin/login') {
      return <AdminLogin onSuccess={(email) => {
        setAdminUserEmail(email);
        localStorage.setItem(LOCAL_STORAGE_ADMIN_USER, email);
        navigateTo('/admin');
      }} />;
    }

    if (currentPath === '/admin/login') {
      return <AdminLogin onSuccess={(email) => {
        setAdminUserEmail(email);
        localStorage.setItem(LOCAL_STORAGE_ADMIN_USER, email);
        navigateTo('/admin');
      }} />;
    }

    // 3. Authenticated Admin Views
    return (
      <AdminLayout
        currentPath={currentPath}
        onNavigate={navigateTo}
        userEmail={adminUserEmail || 'admin@capilaris.com'}
        onLogout={handleLogout}
      >
        {currentPath === '/admin' && (
          <AdminDashboard
            onNavigateToOrders={(filterSync) =>
              navigateTo(`/admin/pedidos${filterSync ? `?sync=${filterSync}` : ''}`)
            }
          />
        )}

        {currentPath.startsWith('/admin/pedidos') && (
          <AdminOrders
            initialSyncFilter={new URLSearchParams(window.location.search).get('sync') || 'todos'}
          />
        )}

        {currentPath === '/admin/integraciones' && <AdminIntegrations />}

        {currentPath === '/admin/configuracion' && <AdminConfig />}
      </AdminLayout>
    );
  }

  // ============================================================================
  // PUBLIC CONVERSATIONAL FORM (CLIENT VIEW)
  // ============================================================================
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Fixed Header with Progress Bar */}
      <ProgressBar
        currentStep={currentStep}
        totalSteps={9}
        canGoBack={currentStep > 1 && !isPaymentScreen}
        onBack={handleBackStep}
        onReset={handleResetOrder}
        onOpenConfig={() => navigateTo('/admin')}
        isPaymentScreen={isPaymentScreen}
      />

      {/* Main Content Body */}
      <main className="flex-1 flex flex-col justify-center items-center w-full">
        {isPaymentScreen ? (
          <div className="w-full px-4 py-8 max-w-2xl mx-auto mt-12 animate-fadeIn">
            <PaymentScreen
              orderPayload={orderPayload}
              formData={formData}
              product={selectedProduct}
              webhookStatus={webhookStatus}
              webhookErrorMsg={webhookErrorMsg}
              onRetryWebhook={() => submitOrderAndProceed()}
              onResetOrder={handleResetOrder}
            />
          </div>
        ) : (
          <StepWrapper stepKey={currentStep} direction={direction}>
            {/* Paso 1 — Nombre completo */}
            {currentStep === 1 && (
              <TextStep
                stepNumber={1}
                question="¿Cuál es tu nombre completo?"
                subtitle="Escribe tu nombre y apellido para identificar tu pedido."
                placeholder="Ej. Juan Pérez González"
                value={formData.nombre}
                onChange={(val) => setFormData((prev) => ({ ...prev, nombre: val }))}
                onNext={handleNextStep}
                validate={validateStep1Name}
                type="text"
              />
            )}

            {/* Paso 2 — WhatsApp */}
            {currentStep === 2 && (
              <WhatsAppStep
                stepNumber={2}
                countryCode={formData.countryCode}
                phoneValue={formData.whatsappNumber}
                onCountryCodeChange={(code) =>
                  setFormData((prev) => ({ ...prev, countryCode: code }))
                }
                onPhoneChange={(phone) =>
                  setFormData((prev) => ({ ...prev, whatsappNumber: phone }))
                }
                onNext={handleNextStep}
              />
            )}

            {/* Paso 3 — Correo electrónico */}
            {currentStep === 3 && (
              <TextStep
                stepNumber={3}
                question="¿Cuál es tu correo electrónico?"
                subtitle="Te enviaremos la factura digital y el código de seguimiento."
                placeholder="ejemplo@correo.com"
                value={formData.email}
                onChange={(val) => setFormData((prev) => ({ ...prev, email: val }))}
                onNext={handleNextStep}
                validate={validateStep3Email}
                type="email"
              />
            )}

            {/* Paso 4 — Ciudad / Dirección de entrega */}
            {currentStep === 4 && (
              <TextStep
                stepNumber={4}
                question="¿A qué ciudad y dirección enviamos tu pedido?"
                subtitle="Indica ciudad, barrio, dirección exacta y número de casa o apartamento."
                placeholder="Ej. Bogotá, Chapinero - Calle 67 #10-20 Apt 401"
                value={formData.ciudad}
                onChange={(val) => setFormData((prev) => ({ ...prev, ciudad: val }))}
                onNext={handleNextStep}
                validate={validateStep4Address}
                type="text"
              />
            )}

            {/* Paso 5 — Producto o servicio */}
            {currentStep === 5 && (
              <ChoiceStep
                stepNumber={5}
                products={storeConfig.products}
                selectedProductId={formData.productoId}
                onSelectProduct={(id) =>
                  setFormData((prev) => ({ ...prev, productoId: id }))
                }
                onNext={handleNextStep}
              />
            )}

            {/* Paso 6 — Cantidad */}
            {currentStep === 6 && (
              <QuantityStep
                stepNumber={6}
                product={selectedProduct}
                quantity={formData.cantidad}
                onChangeQuantity={(qty) =>
                  setFormData((prev) => ({ ...prev, cantidad: qty }))
                }
                onNext={handleNextStep}
              />
            )}

            {/* Paso 7 — Notas del pedido */}
            {currentStep === 7 && (
              <TextStep
                stepNumber={7}
                question="¿Alguna instrucción adicional o nota especial?"
                subtitle="Opcional. Ej. 'Dejar en portería' o 'Empacar para regalo'."
                placeholder="Escribe aquí tus observaciones para la entrega..."
                value={formData.notas}
                onChange={(val) => setFormData((prev) => ({ ...prev, notas: val }))}
                onNext={handleNextStep}
                type="textarea"
                maxLength={300}
                required={false}
              />
            )}

            {/* Paso 8 — Resumen del pedido */}
            {currentStep === 8 && (
              <SummaryStep
                stepNumber={8}
                formData={formData}
                product={selectedProduct}
                onEditStep={handleEditStep}
                onConfirm={handleNextStep}
              />
            )}

            {/* Paso 9 — Método de pago */}
            {currentStep === 9 && (
              <PaymentMethodStep
                stepNumber={9}
                selectedMethod={formData.metodoPago}
                onSelectMethod={(method: PaymentMethodType) =>
                  setFormData((prev) => ({ ...prev, metodoPago: method }))
                }
                onNext={handleNextStep}
                isSubmitting={webhookStatus === 'loading'}
              />
            )}
          </StepWrapper>
        )}
      </main>

      {/* Legacy Config Drawer fallback */}
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        webhookUrl={webhookUrl}
        onUpdateWebhookUrl={(url) => setWebhookUrl(url)}
      />
    </div>
  );
}
