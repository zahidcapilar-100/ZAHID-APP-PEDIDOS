import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, AlertCircle, Phone } from 'lucide-react';
import { APP_CONFIG } from '../config';

interface WhatsAppStepProps {
  stepNumber: number;
  countryCode: string;
  phoneValue: string;
  onCountryCodeChange: (code: string) => void;
  onPhoneChange: (phone: string) => void;
  onNext: () => void;
}

export const WhatsAppStep: React.FC<WhatsAppStepProps> = ({
  stepNumber,
  countryCode,
  phoneValue,
  onCountryCodeChange,
  onPhoneChange,
  onNext,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [touched, setTouched] = useState(false);

  // Autofocus input on step mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [stepNumber]);

  // Validation: Digits only, minimum 10 digits
  const cleanPhone = phoneValue.replace(/\D/g, '');
  let errorMsg: string | null = null;

  if (phoneValue.trim() === '') {
    errorMsg = 'El número de WhatsApp es obligatorio.';
  } else if (cleanPhone.length < 10) {
    errorMsg = 'Ingresa un número válido de al menos 10 dígitos.';
  }

  const isValid = !errorMsg;

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Keep only numbers and spaces/hyphens for typing display
    const rawVal = e.target.value;
    const digitsOnly = rawVal.replace(/\D/g, '');
    onPhoneChange(digitsOnly);
    if (!touched) setTouched(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setTouched(true);
      if (isValid) {
        onNext();
      }
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-start gap-6 py-4">
      {/* Header */}
      <div className="space-y-2 text-left w-full">
        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider inline-block">
          Paso {stepNumber}
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight tracking-tight">
          ¿Cuál es tu número de WhatsApp? <span className="text-emerald-500">*</span>
        </h2>
        <p className="text-sm sm:text-base text-slate-600">
          Te enviaremos las actualizaciones de tu pedido y el recibo de compra.
        </p>
      </div>

      {/* Input Group with Country Code Selector */}
      <div className="w-full space-y-2">
        <div className="flex items-center gap-2">
          {/* Country Code Select Dropdown */}
          <div className="relative shrink-0">
            <select
              value={countryCode}
              onChange={(e) => onCountryCodeChange(e.target.value)}
              className="appearance-none bg-white border border-slate-300 rounded-2xl px-4 py-4 text-base font-bold text-slate-800 shadow-xs hover:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-900/10 cursor-pointer pr-8"
            >
              {APP_CONFIG.countryCodes.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
              ▼
            </div>
          </div>

          {/* Phone Input */}
          <div className="relative flex-1 flex items-center">
            <div className="absolute left-4 text-slate-400 pointer-events-none">
              <Phone className="w-5 h-5" />
            </div>
            <input
              ref={inputRef}
              type="tel"
              value={phoneValue}
              onChange={handlePhoneInputChange}
              onKeyDown={handleKeyDown}
              onBlur={() => setTouched(true)}
              placeholder="310 123 4567"
              className={`w-full pl-12 pr-12 py-4 text-xl sm:text-2xl font-medium rounded-2xl border bg-white shadow-xs transition-all duration-200 outline-none ${
                touched && errorMsg
                  ? 'border-red-300 ring-2 ring-red-100 text-slate-900 placeholder:text-slate-300'
                  : 'border-slate-300 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 text-slate-900'
              }`}
            />
            {isValid && cleanPhone.length >= 10 && (
              <div className="absolute right-4 text-emerald-500 bg-emerald-50 p-1.5 rounded-full">
                <Check className="w-5 h-5" />
              </div>
            )}
          </div>
        </div>

        {/* Validation Error */}
        {touched && errorMsg && (
          <div className="flex items-center gap-1.5 text-sm font-medium text-red-600 pt-1 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="text-xs text-slate-400 pt-1 flex items-center justify-between">
          <span>Solo números, sin espacios ni guiones</span>
          <span>Presiona <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 border border-slate-300 rounded-md text-slate-600">Enter ↵</kbd></span>
        </div>
      </div>

      {/* Continue Button */}
      <div className="pt-4 w-full sm:w-auto">
        <button
          type="button"
          onClick={() => {
            setTouched(true);
            if (isValid) onNext();
          }}
          disabled={!isValid}
          className={`w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-bold rounded-2xl shadow-md transition-all duration-300 cursor-pointer ${
            isValid
              ? 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg active:scale-98'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-70'
          }`}
        >
          <span>Continuar</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
