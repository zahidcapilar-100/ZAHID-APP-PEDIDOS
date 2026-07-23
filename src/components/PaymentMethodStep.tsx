import React from 'react';
import { ArrowRight, Landmark, Link as LinkIcon, QrCode, CheckCircle, ShieldCheck } from 'lucide-react';
import { PaymentMethodType } from '../types';

interface PaymentMethodStepProps {
  stepNumber: number;
  selectedMethod: PaymentMethodType;
  onSelectMethod: (method: PaymentMethodType) => void;
  onNext: () => void;
  isSubmitting?: boolean;
}

export const PaymentMethodStep: React.FC<PaymentMethodStepProps> = ({
  stepNumber,
  selectedMethod,
  onSelectMethod,
  onNext,
  isSubmitting = false,
}) => {
  const methods = [
    {
      id: 'transferencia' as PaymentMethodType,
      title: 'Transferencia Bancaria',
      subtitle: 'Bancolombia, Nequi, Daviplata o PSE',
      description: 'Te daremos los datos de cuenta para realizar la transferencia y adjuntar tu comprobante por WhatsApp.',
      icon: Landmark,
      badge: 'Más Utilizado',
    },
    {
      id: 'link' as PaymentMethodType,
      title: 'Link de Pago en Línea',
      subtitle: 'Tarjeta de crédito, débito o pse',
      description: 'Paga de forma inmediata y segura a través de nuestra pasarela de pagos oficial.',
      icon: LinkIcon,
      badge: 'Pago Rápido',
    },
    {
      id: 'qr' as PaymentMethodType,
      title: 'Código QR Bancario',
      subtitle: 'Escanear desde tu App Móvil',
      description: 'Generaremos un código QR listo para que escanees desde la aplicación móvil de tu banco.',
      icon: QrCode,
      badge: '100% Seguro',
    },
  ];

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-start gap-6 py-4">
      {/* Header */}
      <div className="space-y-2 text-left w-full">
        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider inline-block">
          Paso {stepNumber}
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight tracking-tight">
          ¿Cómo prefieres realizar tu pago? <span className="text-emerald-500">*</span>
        </h2>
        <p className="text-sm sm:text-base text-slate-600">
          Elige la opción que te resulte más cómoda. Tu pedido quedará registrado de inmediato.
        </p>
      </div>

      {/* 3 Large Payment Cards */}
      <div className="w-full space-y-3.5">
        {methods.map((method) => {
          const isSelected = selectedMethod === method.id;
          const IconComp = method.icon;

          return (
            <div
              key={method.id}
              onClick={() => onSelectMethod(method.id)}
              className={`p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex items-start gap-4 bg-white relative ${
                isSelected
                  ? 'border-emerald-600 ring-2 ring-emerald-600/10 shadow-md bg-emerald-50/20'
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              {/* Icon Container */}
              <div
                className={`p-3 rounded-xl transition-colors ${
                  isSelected
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                <IconComp className="w-6 h-6" />
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {method.title}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                    {method.badge}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  {method.subtitle}
                </p>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {method.description}
                </p>
              </div>

              {/* Radio Indicator */}
              <div
                className={`absolute top-5 right-5 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 border border-slate-300 text-transparent'
                }`}
              >
                <CheckCircle className="w-4 h-4 fill-emerald-600 text-white" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Security note */}
      <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100/80 px-3.5 py-2 rounded-xl w-full">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Tus datos son procesados de forma confidencial y segura.</span>
      </div>

      {/* Submit / Finish Order Button */}
      <div className="pt-2 w-full">
        <button
          type="button"
          onClick={onNext}
          disabled={isSubmitting}
          className="w-full inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-bold rounded-2xl shadow-md bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg active:scale-98 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait"
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Registrando tu pedido...</span>
            </>
          ) : (
            <>
              <span>Confirmar y Ver Instrucciones de Pago</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
