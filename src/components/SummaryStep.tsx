import React from 'react';
import { ArrowRight, Edit3, User, Phone, Mail, MapPin, ShoppingBag, Hash, FileText, CheckCircle2 } from 'lucide-react';
import { OrderFormData, Product } from '../types';
import { formatCurrency } from '../config';

interface SummaryStepProps {
  stepNumber: number;
  formData: OrderFormData;
  product?: Product;
  onEditStep: (step: number) => void;
  onConfirm: () => void;
}

export const SummaryStep: React.FC<SummaryStepProps> = ({
  stepNumber,
  formData,
  product,
  onEditStep,
  onConfirm,
}) => {
  const unitPrice = product ? product.price : 0;
  const quantity = Math.max(1, formData.cantidad);
  const total = unitPrice * quantity;

  const items = [
    {
      label: 'Nombre completo',
      value: formData.nombre,
      icon: User,
      step: 1,
    },
    {
      label: 'WhatsApp',
      value: `${formData.countryCode} ${formData.whatsappNumber}`,
      icon: Phone,
      step: 2,
    },
    {
      label: 'Correo electrónico',
      value: formData.email,
      icon: Mail,
      step: 3,
    },
    {
      label: 'Ciudad / Dirección de entrega',
      value: formData.ciudad,
      icon: MapPin,
      step: 4,
    },
    {
      label: 'Producto seleccionado',
      value: product ? product.name : 'No seleccionado',
      subValue: product ? `${formatCurrency(product.price)} c/u` : '',
      icon: ShoppingBag,
      step: 5,
    },
    {
      label: 'Cantidad',
      value: `${quantity} ${quantity === 1 ? 'unidad' : 'unidades'}`,
      icon: Hash,
      step: 6,
    },
    {
      label: 'Notas adicionales',
      value: formData.notas.trim() || 'Sin notas especiales',
      icon: FileText,
      step: 7,
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
          Resumen de tu pedido
        </h2>
        <p className="text-sm sm:text-base text-slate-600">
          Por favor verifica que la información sea correcta antes de continuar al pago:
        </p>
      </div>

      {/* Editable Order Summary Card */}
      <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden divide-y divide-slate-100">
        {items.map((item, idx) => {
          const IconComp = item.icon;

          return (
            <div
              key={idx}
              className="p-4 sm:p-4.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors group"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-slate-200/70 transition-colors shrink-0 mt-0.5">
                  <IconComp className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {item.label}
                  </p>
                  <p className="text-base font-bold text-slate-900 truncate">
                    {item.value}
                  </p>
                  {item.subValue && (
                    <p className="text-xs text-emerald-600 font-medium">{item.subValue}</p>
                  )}
                </div>
              </div>

              {/* Edit button returning to that step */}
              <button
                type="button"
                onClick={() => onEditStep(item.step)}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer active:scale-95"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar</span>
              </button>
            </div>
          );
        })}

        {/* Calculated Total Section */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-300 font-semibold">
              Total a pagar
            </p>
            <p className="text-xs text-slate-400">
              {quantity} x {formatCurrency(unitPrice)}
            </p>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
            {formatCurrency(total)}
          </p>
        </div>
      </div>

      {/* Continue to Payment Method Button */}
      <div className="pt-2 w-full">
        <button
          type="button"
          onClick={onConfirm}
          className="w-full inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-bold rounded-2xl shadow-md bg-emerald-600 text-white hover:bg-emerald-500 hover:shadow-lg active:scale-98 transition-all cursor-pointer"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>Elegir Método de Pago</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
