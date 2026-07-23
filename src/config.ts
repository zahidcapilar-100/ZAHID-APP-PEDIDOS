import { CompanyConfig } from './types';

// ============================================================================
// CONFIGURACIÓN PRINCIPAL Y CENTRALIZADA DE LA TIENDA Y DATOS DE PAGO
// Modifica este archivo para cambiar precios, productos, datos bancarios o
// información de la empresa sin tocar el código fuente de la aplicación.
// ============================================================================

export const APP_CONFIG: CompanyConfig = {
  companyName: 'Capilaris & Care',
  logoUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=120&auto=format&fit=crop&q=80',
  orderPrefix: 'DGZ',
  whatsappNumber: '573001234567', // Número con indicativo de país, sin espacios ni signo +
  currencySymbol: '$',
  currencyCode: 'COP',

  // DATOS PARA TRANSFERENCIA BANCARIA (Paso Final)
  bankDetails: {
    banco: 'Bancolombia',
    tipoCuenta: 'Ahorros',
    numeroCuenta: '123-456789-01',
    titular: 'Capilaris & Care S.A.S.',
    documento: 'NIT 901.234.567-8',
  },

  // DATOS PARA LINK DE PAGO
  paymentLinkDetails: {
    url: 'https://checkout.wompi.co/l/capilaris-payment-link',
    platformName: 'Wompi / Bold / Mercado Pago',
  },

  // DATOS PARA CÓDIGO QR
  qrDetails: {
    // Código QR en SVG en embebido para garantizar que siempre cargue sin requerir internet externo
    imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="%230f172a"><rect width="200" height="200" fill="%23ffffff"/><path d="M20,20h60v60h-60zM30,30v40h40v-40zM40,40h20v20h-20zM120,20h60v60h-60zM130,30v40h40v-40zM140,40h20v20h-20zM20,120h60v60h-60zM30,130v40h40v-40zM40,140h20v20h-20zM90,20h20v30h-20zM90,60h20v30h-20zM100,100h20v20h-20zM20,90h40v20h-40zM70,90h20v40h-20zM120,90h20v20h-20zM150,90h30v20h-30zM90,140h30v20h-30zM130,120h20v30h-20zM160,120h20v50h-20zM110,170h30v10h-30zM150,180h30v10h-30z"/></svg>',
    instructions: 'Escanea el código QR desde la app móvil de tu banco (Bancolombia, Nequi, Daviplata) para realizar el pago al instante.',
  },

  // CATÁLOGO DE PRODUCTOS / SERVICIOS
  products: [
    {
      id: 'prod-1',
      name: 'Kit Crecimiento Capilar Intensivo',
      price: 149000,
      description: 'Shampoo Estimulante + Acondicionador + Tónico Capilar de 120ml con Biotina.',
      badge: 'Más Vendido 🌟',
      category: 'Kits',
      image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&auto=format&fit=crop&q=80',
    },
    {
      id: 'prod-2',
      name: 'Tónico Anti-caída Profesional (120ml)',
      price: 79000,
      description: 'Fórmula concentrada con Minoxidil vegetal y Romero orgánico.',
      badge: 'Recomendado 💧',
      category: 'Tratamientos',
      image: 'https://images.unsplash.com/photo-1608248597260-264639d671c6?w=400&auto=format&fit=crop&q=80',
    },
    {
      id: 'prod-3',
      name: 'Suero Reparador de Puntas (60ml)',
      price: 59000,
      description: 'Nutrición profunda con aceite puro de Argán y Keratina concentrada.',
      badge: 'Brillo Extremo ✨',
      category: 'Tratamientos',
      image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&auto=format&fit=crop&q=80',
    },
    {
      id: 'prod-4',
      name: 'Cepillo Masajeador de Cuero Cabelludo',
      price: 35000,
      description: 'Cerdas de silicona médica ergonómicas para reactivar el folículo capilar.',
      badge: 'Complemento 🌿',
      category: 'Accesorios',
      image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&auto=format&fit=crop&q=80',
    },
  ],

  // INDICATIVOS BANDERAS Y PAÍSES (WhatsApp)
  countryCodes: [
    { code: '+57', country: 'Colombia', flag: '🇨🇴' },
    { code: '+52', country: 'México', flag: '🇲🇽' },
    { code: '+51', country: 'Perú', flag: '🇵🇪' },
    { code: '+54', country: 'Argentina', flag: '🇦🇷' },
    { code: '+56', country: 'Chile', flag: '🇨🇱' },
    { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
    { code: '+1', country: 'Estados Unidos', flag: '🇺🇸' },
    { code: '+34', country: 'España', flag: '🇪🇸' },
  ],
};

// Formateador de moneda en pesos colombianos / formato local
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: APP_CONFIG.currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Generador de número de pedido único: PED-{{PREFIJO}}- + timestamp corto
export const generateOrderNumber = (): string => {
  const prefix = APP_CONFIG.orderPrefix || 'DGZ';
  const timestampShort = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `PED-${prefix}-${timestampShort}`;
};

// Formateador de mensaje prellenado para WhatsApp
export const buildWhatsAppMessage = (
  orderNumber: string,
  customerName: string,
  productName: string,
  quantity: number,
  total: number,
  paymentMethod: string
): string => {
  const methodLabel =
    paymentMethod === 'transferencia'
      ? 'Transferencia bancaria'
      : paymentMethod === 'link'
      ? 'Link de pago'
      : 'Código QR';

  const text =
    `Hola ${APP_CONFIG.companyName}! 👋\n\n` +
    `Acabo de realizar un pedido en la web:\n` +
    `📌 *Pedido:* ${orderNumber}\n` +
    `👤 *Cliente:* ${customerName}\n` +
    `🛍️ *Producto:* ${productName} (x${quantity})\n` +
    `💰 *Total:* ${formatCurrency(total)}\n` +
    `💳 *Método de pago:* ${methodLabel}\n\n` +
    `Adjunto mi comprobante de pago para confirmación. ¡Muchas gracias!`;

  return encodeURIComponent(text);
};
