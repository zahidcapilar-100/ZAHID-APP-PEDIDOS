import React, { useState } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  DollarSign,
  AlertCircle,
  X,
  Save,
} from 'lucide-react';
import { AdminProduct } from '../../types';
import { saveAdminProduct, deleteAdminProduct } from '../../lib/sheetsService';

interface AdminProductsProps {
  products: AdminProduct[];
  adminKey: string;
  loading: boolean;
  onRefresh: () => void;
}

export const AdminProducts: React.FC<AdminProductsProps> = ({
  products,
  adminKey,
  loading,
  onRefresh,
}) => {
  const [editingProduct, setEditingProduct] = useState<{
    original_nombre?: string;
    nombre: string;
    precio: number | string;
    activo: boolean;
  } | null>(null);

  const [saving, setSaving] = useState(false);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleOpenCreate = () => {
    setEditingProduct({
      nombre: '',
      precio: '',
      activo: true,
    });
    setErrorMessage(null);
  };

  const handleOpenEdit = (p: AdminProduct) => {
    setEditingProduct({
      original_nombre: p.nombre,
      nombre: p.nombre,
      precio: p.precio,
      activo: p.activo,
    });
    setErrorMessage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    if (!editingProduct.nombre.trim()) {
      setErrorMessage('El nombre del producto es obligatorio.');
      return;
    }

    const numericPrice = Number(editingProduct.precio);
    if (isNaN(numericPrice) || numericPrice < 0) {
      setErrorMessage('Ingresa un precio válido mayor o igual a 0.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    const res = await saveAdminProduct(adminKey, {
      original_nombre: editingProduct.original_nombre,
      nombre: editingProduct.nombre.trim(),
      precio: numericPrice,
      activo: editingProduct.activo,
    });

    setSaving(false);

    if (res.ok) {
      setEditingProduct(null);
      onRefresh();
    } else {
      setErrorMessage(res.error || 'Error al guardar producto en Google Sheets.');
    }
  };

  const handleDelete = async (nombre: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar el producto "${nombre}"?`)) return;

    setDeletingName(nombre);
    const res = await deleteAdminProduct(adminKey, nombre);
    setDeletingName(null);

    if (res.ok) {
      onRefresh();
    } else {
      alert(res.error || 'No se pudo eliminar el producto.');
    }
  };

  const handleToggleActive = async (p: AdminProduct) => {
    await saveAdminProduct(adminKey, {
      original_nombre: p.nombre,
      nombre: p.nombre,
      precio: p.precio,
      activo: !p.activo,
    });
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            Catálogo de Productos en Google Sheets
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Los precios y productos activos se leen en tiempo real en el formulario público.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-2xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-900/30 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Producto</span>
        </button>
      </div>

      {/* Product Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">Nombre del Producto</th>
                <th className="p-4 text-right">Precio Unitario</th>
                <th className="p-4 text-center">Estado en Tienda</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans text-slate-200">
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    <span>Cargando hoja "Productos"...</span>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    No hay productos registrados en la pestaña "Productos". Haz clic en "Nuevo Producto" para agregar.
                  </td>
                </tr>
              ) : (
                products.map((p, idx) => (
                  <tr key={idx} className="h-[48px] hover:bg-slate-800/60 transition-colors">
                    <td className="p-4 font-bold text-white text-sm">
                      {p.nombre}
                    </td>

                    <td className="p-4 text-right font-mono font-bold text-emerald-400 text-sm">
                      {formatCurrency(p.precio)}
                    </td>

                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleActive(p)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          p.activo
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {p.activo ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Activo</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Inactivo</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                        title="Editar producto"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(p.nombre)}
                        disabled={deletingName === p.nombre}
                        className="p-2 text-rose-400 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                        title="Eliminar producto"
                      >
                        {deletingName === p.nombre ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Create Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-slate-100 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="font-extrabold text-white text-base">
                {editingProduct.original_nombre ? 'Editar Producto' : 'Nuevo Producto'}
              </h4>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-slate-400">
                  Nombre del Producto
                </label>
                <input
                  type="text"
                  value={editingProduct.nombre}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, nombre: e.target.value })
                  }
                  placeholder="Ej. Kit Capilar Intensivo 300ml"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-slate-400">
                  Precio (COP)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={editingProduct.precio}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, precio: e.target.value })
                    }
                    placeholder="Ej. 120000"
                    className="w-full pl-9 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <DollarSign className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="activoCheckbox"
                  checked={editingProduct.activo}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, activo: e.target.checked })
                  }
                  className="w-4 h-4 text-emerald-600 bg-slate-950 border-slate-800 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="activoCheckbox" className="text-xs font-bold text-slate-200 cursor-pointer">
                  Producto visible y activo en el formulario público
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-900/30"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{saving ? 'Guardando...' : 'Guardar en Sheets'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
