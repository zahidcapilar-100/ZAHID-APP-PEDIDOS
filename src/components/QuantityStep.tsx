import React from 'react';
import { ArrowRight, Minus, Plus, ShoppingBag } from 'lucide-react';
import { Product } from '../types';
import { formatCurrency } from '../config';

interface QuantityStepProps {
  stepNumber: number;
  product?: Product;
  quantity: number;
  onChangeQuantity: (qty: number) => void;
  onNext: () => void;
}

export const QuantityStep: React.FC<QuantityStepProps> = ({
  stepNumber,
  product,
  quantity,
  onChangeQuantity,
  onNext,
}) => {
  const unitPrice = product ? product.price : 0;
  const totalPrice = unitPrice * Math.max(1, quantity);

  const handleDecrement = () => {
    if (quantity > 1) {
      onChangeQuantity(quantity - 1);
    }
  };

  const handleIncrement = () => {
    onChangeQuantity(quantity + 1);
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-start gap-6 py-4">
      {/* Header */}
      <div className="space-y-2 text-left w-full">
        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider inline-block">
          Paso {stepNumber}
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight tracking-tight">
          ¿Cuántas unidades deseas solicitar? <span className="text-emerald-500">*</span>
        </h2>
        {product && (
          <div className="flex items-center gap-2 bg-slate-100/80 p-2.5 rounded-xl text-slate-700 text-sm font-medium">
            <ShoppingBag className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{product.name}</span>
            <span className="text-slate-400">•</span>
            <span className="font-bold text-slate-900">{formatCurrency(unitPrice)}/u</span>
          </div>
        )}
      </div>

      {/* Counter Controls */}
      <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center gap-6">
        <div className="flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={handleDecrement}
            disabled={quantity <= 1}
            className="w-14 h-14 rounded-2xl border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer"
            aria-label="Disminuir cantidad"
          >
            <Minus className="w-6 h-6" />
          </button>

          <span className="text-5xl font-extrabold text-slate-900 font-mono min-w-[70px] text-center">
            {quantity}
          </span>

          <button
            type="button"
            onClick={handleIncrement}
            className="w-14 h-14 rounded-2xl border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-all active:scale-95 cursor-pointer"
            aria-label="Aumentar cantidad"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* Quick select buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium mr-1">Rápido:</span>
          {[1, 2, 3, 5].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => onChangeQuantity(num)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                quantity === num
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {num} {num === 1 ? 'unidad' : 'unidades'}
            </button>
          ))}
        </div>

        {/* Subtotal Calculation */}
        <div className="w-full pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500">
            Total estimado ({quantity} x {formatCurrency(unitPrice)}):
          </span>
          <span className="text-2xl font-extrabold text-emerald-600">
            {formatCurrency(totalPrice)}
          </span>
        </div>
      </div>

      {/* Continue Button */}
      <div className="pt-2 w-full sm:w-auto">
        <button
          type="button"
          onClick={onNext}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-bold rounded-2xl shadow-md bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg active:scale-98 transition-all cursor-pointer"
        >
          <span>Continuar</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
