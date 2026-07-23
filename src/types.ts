export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  category?: string;
  badge?: string;
  image?: string;
  iconName?: string;
  activo?: boolean;
}

export interface CountryCode {
  code: string;
  country: string;
  flag: string;
}

export type PaymentMethodType = 'transferencia' | 'link' | 'qr';

export type OrderStatusType = 'Pendiente de pago' | 'Pagado' | 'Enviado' | 'Cancelado';

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
  metodo_pago: string;
  estado: string;
  fecha: string;
  notas_internas?: string;
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

export interface AdminProduct {
  id?: string;
  nombre: string;
  precio: number;
  activo: boolean;
}

export interface SheetsConfig {
  banco?: string;
  tipo_cuenta?: string;
  numero_cuenta?: string;
  titular?: string;
  documento?: string;
  whatsapp?: string;
  link_pago?: string;
  qr_url?: string;
  [key: string]: string | undefined;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  config?: SheetsConfig;
  productos?: AdminProduct[];
  pedidos?: OrderPayload[];
  error?: string;
  mensaje?: string;
  numero_pedido?: string;
}
