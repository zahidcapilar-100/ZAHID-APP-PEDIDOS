import React, { useState, useEffect } from 'react';
import {
  fetchStoreConfig,
  updateStoreConfigInDB,
  fetchStoreProducts,
  saveStoreProducts,
} from '../../lib/supabase';
import { CompanyConfig, Product } from '../../types';
import { formatCurrency } from '../../config';
import {
  Settings,
  Building2,
  CreditCard,
  QrCode,
  MessageCircle,
  Package,
  Plus,
  Trash2,
  Edit2,
  Save,
  CheckCircle2,
  RefreshCw,
  Image,
} from 'lucide-react';

export const AdminConfig: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<CompanyConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  // Feedback states
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingProducts, setSavingProducts] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Editing Product Modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);

  useEffect(() => {
    loadStoreConfig();
  }, []);

  const loadStoreConfig = async () => {
    setLoading(true);
    const cfg = await fetchStoreConfig();
    const prods = await fetchStoreProducts();
    setConfig(cfg);
    setProducts(prods);
    setLoading(false);
  };

  const handleSaveBankAndCompanyDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setSavingConfig(true);
    setSuccessMsg('');

    await updateStoreConfigInDB(config);

    setSavingConfig(false);
    setSuccessMsg('¡Configuración de la tienda guardada correctamente!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleOpenNewProductModal = () => {
    setEditingProduct({
      id: `prod-${Date.now()}`,
      name: '',
      price: 50000,
      description: '',
      category: 'General',
      badge: '',
      image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&auto=format&fit=crop&q=80',
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !config) return;

    let updatedList = [...products];
    const index = updatedList.findIndex((p) => p.id === editingProduct.id);

    if (index >= 0) {
      updatedList[index] = editingProduct;
    } else {
      updatedList.push(editingProduct);
    }

    setProducts(updatedList);
    setSavingProducts(true);

    await saveStoreProducts(updatedList);
    await updateStoreConfigInDB({ products: updatedList });

    setSavingProducts(false);
    setShowProductModal(false);
    setEditingProduct(null);
    setSuccessMsg('¡Catálogo de productos actualizado!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('¿Deseas eliminar este producto del catálogo público?')) {
      const updatedList = products.filter((p) => p.id !== id);
      setProducts(updatedList);
      await saveStoreProducts(updatedList);
    }
  };

  if (loading || !config) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-xl w-64" />
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Configuración de Tienda y Productos
        </h2>
        <p className="text-xs text-slate-500">
          Modifica los precios, productos y datos bancarios que ven los clientes en el formulario público
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ==================================================================== */}
      /* SECTION 1: CATALOGO DE PRODUCTOS */
      /* ==================================================================== */
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Catálogo de Productos ({products.length})
              </h3>
              <p className="text-xs text-slate-500">
                Los clientes elegirán estos productos en el Paso 5 del formulario.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenNewProductModal}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Producto</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {products.map((p) => (
            <div
              key={p.id}
              className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 flex gap-3 justify-between items-start"
            >
              <img
                src={p.image || 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=100'}
                alt={p.name}
                className="w-14 h-14 object-cover rounded-xl border border-slate-200 shrink-0"
              />

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-xs truncate">{p.name}</h4>
                  {p.badge && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold shrink-0">
                      {p.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2">{p.description}</p>
                <span className="font-mono font-extrabold text-emerald-600 text-sm block">
                  {formatCurrency(p.price)}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(p);
                    setShowProductModal(true);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteProduct(p.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ==================================================================== */}
      /* SECTION 2: DATOS DE LA EMPRESA & WHATSAPP */
      /* ==================================================================== */
      <form onSubmit={handleSaveBankAndCompanyDetails} className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base border-b border-slate-100 pb-3">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <span>Datos Generales de la Empresa</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Nombre de la Empresa / Marca</label>
              <input
                type="text"
                required
                value={config.companyName}
                onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Prefijo de Número de Pedido</label>
              <input
                type="text"
                required
                value={config.orderPrefix}
                onChange={(e) => setConfig({ ...config, orderPrefix: e.target.value.toUpperCase() })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="font-bold text-slate-700 block">Número de WhatsApp Oficial (sin espacios ni +)</label>
              <input
                type="text"
                required
                value={config.whatsappNumber}
                onChange={(e) => setConfig({ ...config, whatsappNumber: e.target.value })}
                placeholder="573001234567"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        /* SECTION 3: DATOS PARA TRANSFERENCIA BANCARIA */
        /* ==================================================================== */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base border-b border-slate-100 pb-3">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            <span>Datos para Transferencia Bancaria</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Nombre del Banco</label>
              <input
                type="text"
                required
                value={config.bankDetails.banco}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    bankDetails: { ...config.bankDetails, banco: e.target.value },
                  })
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Tipo de Cuenta</label>
              <input
                type="text"
                required
                value={config.bankDetails.tipoCuenta}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    bankDetails: { ...config.bankDetails, tipoCuenta: e.target.value },
                  })
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Número de Cuenta</label>
              <input
                type="text"
                required
                value={config.bankDetails.numeroCuenta}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    bankDetails: { ...config.bankDetails, numeroCuenta: e.target.value },
                  })
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Titular de la Cuenta</label>
              <input
                type="text"
                required
                value={config.bankDetails.titular}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    bankDetails: { ...config.bankDetails, titular: e.target.value },
                  })
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        /* SECTION 4: LINK DE PAGO & CÓDIGO QR */
        /* ==================================================================== */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base border-b border-slate-100 pb-3">
            <QrCode className="w-5 h-5 text-emerald-600" />
            <span>Pasarela en Línea & Código QR</span>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">URL del Link de Pago</label>
              <input
                type="url"
                required
                value={config.paymentLinkDetails.url}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    paymentLinkDetails: { ...config.paymentLinkDetails, url: e.target.value },
                  })
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Instrucciones de Pago QR</label>
              <textarea
                rows={2}
                value={config.qrDetails.instructions}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    qrDetails: { ...config.qrDetails, instructions: e.target.value },
                  })
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Save Configuration Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingConfig}
            className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md"
          >
            {savingConfig ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Guardar Configuración General</span>
          </button>
        </div>
      </form>

      {/* Edit Product Modal */}
      {showProductModal && editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-4 animate-fadeIn">
            <h3 className="font-extrabold text-slate-900 text-base">
              Editar / Crear Producto
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Precio (COP)</label>
                <input
                  type="number"
                  required
                  value={editingProduct.price}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, price: Number(e.target.value) })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Descripción Breve</label>
                <textarea
                  rows={2}
                  value={editingProduct.description}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, description: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Insignia / Badge</label>
                  <input
                    type="text"
                    value={editingProduct.badge || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, badge: e.target.value })}
                    placeholder="Ej. Más Vendido 🌟"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Categoría</label>
                  <input
                    type="text"
                    value={editingProduct.category || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, category: e.target.value })
                    }
                    placeholder="Kits, Tratamientos"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">URL de Imagen</label>
                <input
                  type="url"
                  value={editingProduct.image || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowProductModal(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={savingProducts}
                  className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
