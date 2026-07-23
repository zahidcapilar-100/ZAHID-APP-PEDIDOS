import React from 'react';
import { ArrowRight, Check, Sparkles, ShoppingBag } from 'lucide-react';
import { Product } from '../types';
import { formatCurrency } from '../config';

interface ChoiceStepProps {
  stepNumber: number;
  products: Product[];
  selectedProductId: string;
  onSelectProduct: (productId: string) => void;
  onNext: () => void;
}

export const ChoiceStep: React.FC<ChoiceStepProps> = ({
  stepNumber,
  products,
  selectedProductId,
  onSelectProduct,
  onNext,
}) => {
  const isValid = !!selectedProductId;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-start gap-6 py-4">
      {/* Header */}
      <div className="space-y-2 text-left w-full">
        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider inline-block">
          Paso {stepNumber}
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight tracking-tight">
          Selecciona tu producto o tratamiento <span className="text-emerald-500">*</span>
        </h2>
        <p className="text-sm sm:text-base text-slate-600">
          Haz clic en la opción que deseas pedir hoy:
        </p>
      </div>

      {/* Visual Product Cards */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
        {products.map((prod) => {
          const isSelected = selectedProductId === prod.id;

          return (
            <div
              key={prod.id}
              onClick={() => onSelectProduct(prod.id)}
              className={`relative group rounded-2xl p-4 border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between bg-white ${
                isSelected
                  ? 'border-slate-900 ring-2 ring-slate-900/10 shadow-md bg-slate-50/50'
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              {/* Card Image and Header */}
              <div>
                <div className="relative w-full h-36 rounded-xl overflow-hidden bg-slate-100 mb-3">
                  {prod.image ? (
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                      <ShoppingBag className="w-10 h-10" />
                    </div>
                  )}

                  {/* Badge */}
                  {prod.badge && (
                    <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-md text-slate-900 text-xs font-bold px-2.5 py-1 rounded-lg shadow-xs border border-slate-200/60 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      {prod.badge}
                    </span>
                  )}

                  {/* Selection Radio Circle */}
                  <div
                    className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-white/80 border border-slate-300 text-transparent hover:border-slate-400'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  {prod.name}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 line-clamp-2">
                  {prod.description}
                </p>
              </div>

              {/* Price Tag */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Precio unitario
                </span>
                <span className="text-lg font-extrabold text-slate-900">
                  {formatCurrency(prod.price)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Continue Button */}
      <div className="pt-4 w-full sm:w-auto">
        <button
          type="button"
          onClick={() => {
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
