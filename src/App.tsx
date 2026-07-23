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
import {
  sendOrderToGoogleSheets,
  fetchConfigFromGoogleSheets,
  getPendingOrder,
} from './lib/sheetsService';

const LOCAL_STORAGE_KEY = 'capilaris_order_draft_v2';

export default function App() {
  // Store Config (Can be augmented from Sheets)
  const [storeConfig] = useState<CompanyConfig>(APP_CONFIG);

  // Form Navigation State
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [direction, setDirection] = useState<'next' | 'back'>('next');
  const [isPaymentScreen, setIsPaymentScreen] = useState<boolean>(false);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);

  // Google Sheets Endpoint Web App URL
  const [sheetsEndpoint, setSheetsEndpoint] = useState<string>(() => {
    return (
      (import.meta.env.VITE_SHEETS_ENDPOINT as string) ||
      ''
    );
  });

  // Form Data state with LocalStorage draft memory
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

  // Persist draft to localStorage on form changes
  useEffect(() => {
    if (!isPaymentScreen) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formData));
      } catch {
        // Ignore
      }
    }
  }, [formData, isPaymentScreen]);

  // Check for existing pending order in localStorage on mount
  useEffect(() => {
    const pending = getPendingOrder();
    if (pending) {
      console.log('Detected pending order in localStorage:', pending.numero_pedido);
    }

    // Try reading remote configuration if endpoint is present
    if (sheetsEndpoint) {
      fetchConfigFromGoogleSheets(sheetsEndpoint);
    }
  }, [sheetsEndpoint]);

  // Selected Product helper
  const selectedProduct =
    storeConfig.products.find((p) => p.id === formData.productoId) ||
    storeConfig.products[0] ||
    APP_CONFIG.products[0];

  // Navigation handlers
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

  // Submit order to Google Sheets
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

    const paymentMethodMap: Record<PaymentMethodType, string> = {
      transferencia: 'Transferencia',
      link: 'Link de pago',
      qr: 'QR',
    };

    const payload: OrderPayload = {
      numero_pedido: numeroPedido,
      fecha: new Date().toISOString(),
      nombre: dataToSubmit.nombre.trim(),
      whatsapp: formattedWhatsApp,
      email: dataToSubmit.email.trim(),
      ciudad: dataToSubmit.ciudad.trim(),
      producto: prod ? prod.name : 'Producto General',
      cantidad: qty,
      precio_unitario: unitPrice,
      total: total,
      notas: dataToSubmit.notas.trim(),
      metodo_pago: paymentMethodMap[dataToSubmit.metodoPago] || 'Transferencia',
      estado: 'Pendiente de pago',
    };

    setOrderPayload(payload);
    setIsPaymentScreen(true);
    setWebhookStatus('loading');
    setWebhookErrorMsg('');

    // Send order to Google Sheets Web App endpoint
    const result = await sendOrderToGoogleSheets(payload, sheetsEndpoint);

    if (result.success) {
      setWebhookStatus('success');
    } else {
      setWebhookStatus('error');
      setWebhookErrorMsg(
        result.error ||
          'No se pudo conectar con Google Sheets. Puedes enviarnos el pedido por WhatsApp.'
      );
    }
  };

  // Step Validations
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Fixed Header with Progress Bar */}
      <ProgressBar
        currentStep={currentStep}
        totalSteps={9}
        canGoBack={currentStep > 1 && !isPaymentScreen}
        onBack={handleBackStep}
        onReset={handleResetOrder}
        onOpenConfig={() => setIsConfigOpen(true)}
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
              onRetryWebhook={() => {
                if (orderPayload) {
                  setWebhookStatus('loading');
                  sendOrderToGoogleSheets(orderPayload, sheetsEndpoint).then((res) => {
                    if (res.success) setWebhookStatus('success');
                    else {
                      setWebhookStatus('error');
                      setWebhookErrorMsg(res.error || 'Fallo de reintento.');
                    }
                  });
                } else {
                  submitOrderAndProceed();
                }
              }}
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

      {/* Google Sheets Config Modal */}
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        sheetsEndpoint={sheetsEndpoint}
        onUpdateSheetsEndpoint={(url) => setSheetsEndpoint(url)}
      />
    </div>
  );
}
