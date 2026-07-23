import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, AlertCircle } from 'lucide-react';

interface TextStepProps {
  stepNumber: number;
  question: string;
  subtitle?: string;
  placeholder?: string;
  value: string;
  type?: 'text' | 'email' | 'textarea';
  onChange: (value: string) => void;
  onNext: () => void;
  validate?: (val: string) => string | null;
  maxLength?: number;
  required?: boolean;
}

export const TextStep: React.FC<TextStepProps> = ({
  stepNumber,
  question,
  subtitle,
  placeholder,
  value,
  type = 'text',
  onChange,
  onNext,
  validate,
  maxLength,
  required = true,
}) => {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
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

  // Validation logic
  const errorMsg = validate ? validate(value) : null;
  const isValid = !errorMsg;

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      setTouched(true);
      if (isValid) {
        onNext();
      }
    }
  };

  const handleBlur = () => {
    setTouched(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value);
    if (!touched) setTouched(true);
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-start gap-6 py-4">
      {/* Question Header */}
      <div className="space-y-2 text-left w-full">
        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider inline-block">
          Paso {stepNumber}
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight tracking-tight">
          {question} {required && <span className="text-emerald-500">*</span>}
        </h2>
        {subtitle && (
          <p className="text-sm sm:text-base text-slate-600 font-normal">
            {subtitle}
          </p>
        )}
      </div>

      {/* Input Field Area */}
      <div className="w-full relative space-y-2">
        {type === 'textarea' ? (
          <div className="relative">
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={value}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder={placeholder}
              maxLength={maxLength || 300}
              rows={4}
              className={`w-full px-4 py-3.5 text-lg rounded-2xl border bg-white shadow-xs transition-all duration-200 outline-none resize-none ${
                touched && errorMsg
                  ? 'border-red-300 ring-2 ring-red-100 text-slate-900 placeholder:text-slate-400'
                  : 'border-slate-300 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 text-slate-900'
              }`}
            />
            {maxLength && (
              <div className="text-right text-xs text-slate-400 font-mono mt-1">
                {value.length} / {maxLength}
              </div>
            )}
          </div>
        ) : (
          <div className="relative flex items-center">
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type={type}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              placeholder={placeholder}
              className={`w-full px-5 py-4 text-xl sm:text-2xl font-medium rounded-2xl border bg-white shadow-xs transition-all duration-200 outline-none ${
                touched && errorMsg
                  ? 'border-red-300 ring-2 ring-red-100 text-slate-900 placeholder:text-slate-300'
                  : 'border-slate-300 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 text-slate-900'
              }`}
            />
            {value.trim().length > 0 && isValid && (
              <div className="absolute right-4 text-emerald-500 bg-emerald-50 p-1.5 rounded-full">
                <Check className="w-5 h-5" />
              </div>
            )}
          </div>
        )}

        {/* Real-time Inline Error Message */}
        {touched && errorMsg && (
          <div className="flex items-center gap-1.5 text-sm font-medium text-red-600 pt-1 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="text-xs text-slate-400 pt-1 flex items-center justify-between">
          <span>Presiona <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 border border-slate-300 rounded-md text-slate-600">Enter ↵</kbd> para avanzar</span>
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
