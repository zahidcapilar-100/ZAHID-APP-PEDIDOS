export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  category?: string;
  badge?: string;
  image?: string;
  iconName?: string;
}

export interface CountryCode {
  code: string;
  country: string;
  flag: string;
}

export type PaymentMethodType = 'transferencia' | 'link' | 'qr';

export interface OrderFormData {
  nombre: string;
  countryCode: string;
  whatsappNumber: string;
  email: string;
  ciudad: string;
  productoId: string;
  cantidad: number;
  notas: string;
  metodoPago: PaymentMethodType;
}

export interface OrderPayload {
  numero_pedido: string;
  nombre: string;
  whatsapp: string;
  email: string;
  ciudad: string;
  producto: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  notas: string;
  metodo_pago: PaymentMethodType;
  estado: string;
  fecha: string;
}

export interface BankDetails {
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  titular: string;
  documento: string; // NIT o CC
}

export interface PaymentLinkDetails {
  url: string;
  platformName: string;
}

export interface QrDetails {
  imageUrl: string;
  instructions: string;
}

export interface CompanyConfig {
  companyName: string;
  logoUrl: string;
  orderPrefix: string;
  whatsappNumber: string; // Number without + or spaces e.g. 573001234567
  currencySymbol: string;
  currencyCode: string;
  bankDetails: BankDetails;
  paymentLinkDetails: PaymentLinkDetails;
  qrDetails: QrDetails;
  products: Product[];
  countryCodes: CountryCode[];
}
