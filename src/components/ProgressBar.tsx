import React from 'react';
import { ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react';
import { APP_CONFIG } from '../config';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
  canGoBack: boolean;
  onReset?: () => void;
  isPaymentScreen?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStep,
  totalSteps,
  onBack,
  canGoBack,
  onReset,
  isPaymentScreen = false,
}) => {
  // Calculate percentage (0 to 100%)
  const progressPercent = isPaymentScreen
    ? 100
    : Math.min(100, Math.max(0, (currentStep / totalSteps) * 100));

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Top progress bar indicator */}
      <div className="w-full h-1.5 bg-slate-100 overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Back button or Logo */}
        <div className="flex items-center gap-2">
          {canGoBack && onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-xl transition-colors active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              aria-label="Volver al paso anterior"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700" />
              <span className="hidden sm:inline">Atrás</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {APP_CONFIG.logoUrl ? (
                <img
                  src={APP_CONFIG.logoUrl}
                  alt={APP_CONFIG.companyName}
                  className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
              <span className="font-bold text-slate-900 tracking-tight text-sm sm:text-base">
                {APP_CONFIG.companyName}
              </span>
            </div>
          )}
        </div>

        {/* Center: Step Counter Text */}
        <div className="text-center">
          {!isPaymentScreen ? (
            <div className="flex flex-col items-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                Paso {currentStep} de {totalSteps}
              </span>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              Pedido Confirmado
            </span>
          )}
        </div>

        {/* Right: Reset Action */}
        <div className="flex items-center gap-1.5">
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              title="Reiniciar formulario"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Reiniciar pedido"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
