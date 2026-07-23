import { OrderPayload, Product, AdminProduct, SheetsConfig, ApiResponse } from '../types';
import { getAdminSession } from './googleAuth';
import {
  getConnectedSpreadsheet,
  updateOrderStatusSheetsApi,
  updateOrderNotesSheetsApi,
  saveProductToSheetsApi,
  deleteProductFromSheetsApi,
  saveConfigToSheetsApi,
} from './googleSheetsApi';

const PENDING_ORDER_KEY = 'capilaris_pedido_pendiente';

// Helper to delay execution
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface SubmitResult {
  success: boolean;
  numero_pedido?: string;
  error?: string;
}

/**
 * Gets configured Google Apps Script Web App Endpoint URL
 */
export const getSheetsEndpoint = (): string => {
  const url = (import.meta.env.VITE_SHEETS_ENDPOINT as string) || '';
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (
    trimmed.includes('YOUR_APPS_SCRIPT_ID') ||
    trimmed.includes('YOUR_') ||
    trimmed.includes('YOUR-') ||
    !trimmed.startsWith('http')
  ) {
    return '';
  }
  return trimmed;
};

// LocalStorage helpers for pending backup
export const savePendingOrder = (payload: OrderPayload): void => {
  try {
    localStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Could not save pending order to localStorage:', err);
  }
};

export const getPendingOrder = (): OrderPayload | null => {
  try {
    const data = localStorage.getItem(PENDING_ORDER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const clearPendingOrder = (): void => {
  try {
    localStorage.removeItem(PENDING_ORDER_KEY);
  } catch (err) {
    console.warn('Could not remove pending order from localStorage:', err);
  }
};

/**
 * Generic helper for POST requests to Google Apps Script
 * USES 'text/plain;charset=utf-8' header to bypass CORS preflight!
 */
async function postToSheets<T = any>(
  body: object,
  endpointUrl?: string
): Promise<ApiResponse<T>> {
  const endpoint = endpointUrl || getSheetsEndpoint();

  if (!endpoint || endpoint.includes('YOUR_APPS_SCRIPT_ID') || endpoint.includes('YOUR_')) {
    return { ok: false, error: 'Endpoint de Google Sheets no configurado.' };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let jsonRes: any = {};
    try {
      jsonRes = JSON.parse(text);
    } catch {
      jsonRes = { ok: response.ok };
    }

    if (jsonRes.error === 'no_autorizado') {
      return { ok: false, error: 'no_autorizado', mensaje: 'Clave de administración inválida.' };
    }

    return jsonRes;
  } catch (err: any) {
    console.warn('postToSheets notice:', err?.message || err);
    return { ok: false, error: err?.message || 'Error de red con Google Sheets' };
  }
}

/**
 * Generic helper for GET requests to Google Apps Script
 */
async function getFromSheets<T = any>(
  queryParams: Record<string, string>,
  endpointUrl?: string
): Promise<ApiResponse<T>> {
  const endpoint = endpointUrl || getSheetsEndpoint();

  if (!endpoint || endpoint.includes('YOUR_APPS_SCRIPT_ID') || endpoint.includes('YOUR_')) {
    return { ok: false, error: 'Endpoint de Google Sheets no configurado.' };
  }

  try {
    const url = new URL(endpoint);
    Object.keys(queryParams).forEach((key) => {
      url.searchParams.append(key, queryParams[key]);
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
    });

    const text = await response.text();
    let jsonRes: any = {};
    try {
      jsonRes = JSON.parse(text);
    } catch {
      jsonRes = { ok: response.ok };
    }

    if (jsonRes.error === 'no_autorizado') {
      return { ok: false, error: 'no_autorizado', mensaje: 'Clave de administración inválida.' };
    }

    return jsonRes;
  } catch (err: any) {
    console.warn('getFromSheets notice:', err?.message || err);
    return { ok: false, error: err?.message || 'Error de red con Google Sheets' };
  }
}

/**
 * Public: Sends order to Google Sheets Web App with automatic retries.
 */
export const sendOrderToGoogleSheets = async (
  payload: OrderPayload,
  endpointUrl?: string
): Promise<SubmitResult> => {
  savePendingOrder(payload);

  const maxAttempts = 3;
  const delays = [0, 1000, 2500];
  let lastError = 'No se pudo conectar con la hoja de cálculo.';

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (delays[attempt] > 0) {
      await sleep(delays[attempt]);
    }

    const res = await postToSheets({ accion: 'crear_pedido', ...payload }, endpointUrl);

    if (res.ok) {
      clearPendingOrder();
      return {
        success: true,
        numero_pedido: res.numero_pedido || payload.numero_pedido,
      };
    } else {
      lastError = res.error || 'Respuesta negativa de la hoja de cálculo.';
    }
  }

  return {
    success: false,
    error: lastError,
  };
};

/**
 * Public: Fetch active products for customer order form
 */
export const fetchPublicProducts = async (
  endpointUrl?: string
): Promise<Product[] | null> => {
  const res = await getFromSheets({ accion: 'productos' }, endpointUrl);
  if (res.ok && Array.isArray(res.productos) && res.productos.length > 0) {
    return res.productos.map((p, idx) => ({
      id: p.id || `sheet-prod-${idx}`,
      name: p.nombre,
      price: Number(p.precio) || 0,
      description: 'Producto registrado en tienda',
      activo: true,
    }));
  }
  return null;
};

/**
 * Public: Fetch payment/store configuration
 */
export const fetchPublicConfig = async (
  endpointUrl?: string
): Promise<SheetsConfig | null> => {
  const res = await getFromSheets({ accion: 'config_publica' }, endpointUrl);
  if (res.ok && res.config) {
    return res.config;
  }
  return null;
};

// ============================================================================
// ADMIN PANEL API CALLS (Module 4 Google OAuth & Direct Sheets REST API)
// ============================================================================

/**
 * Admin: Update order status
 */
export const updateOrderStatus = async (
  clave: string,
  numero_pedido: string,
  estado: string,
  endpointUrl?: string
): Promise<ApiResponse> => {
  const sheet = getConnectedSpreadsheet();
  const session = getAdminSession();

  if (sheet.id && session?.token) {
    return await updateOrderStatusSheetsApi(sheet.id, session.token, numero_pedido, estado);
  }

  return await postToSheets(
    { accion: 'actualizar_estado', clave, numero_pedido, estado },
    endpointUrl
  );
};

/**
 * Admin: Update internal notes
 */
export const updateOrderNotes = async (
  clave: string,
  numero_pedido: string,
  notas_internas: string,
  endpointUrl?: string
): Promise<ApiResponse> => {
  const sheet = getConnectedSpreadsheet();
  const session = getAdminSession();

  if (sheet.id && session?.token) {
    return await updateOrderNotesSheetsApi(sheet.id, session.token, numero_pedido, notas_internas);
  }

  return await postToSheets(
    { accion: 'actualizar_notas', clave, numero_pedido, notas_internas },
    endpointUrl
  );
};

/**
 * Admin: Fetch all orders
 */
export const fetchAdminOrders = async (
  clave: string,
  endpointUrl?: string
): Promise<ApiResponse<OrderPayload[]>> => {
  return await getFromSheets<OrderPayload[]>({ accion: 'pedidos', clave }, endpointUrl);
};

/**
 * Admin: Fetch all products (active and inactive)
 */
export const fetchAdminProducts = async (
  clave: string,
  endpointUrl?: string
): Promise<ApiResponse<AdminProduct[]>> => {
  return await getFromSheets<AdminProduct[]>({ accion: 'productos_admin', clave }, endpointUrl);
};

/**
 * Admin: Create or edit product
 */
export const saveAdminProduct = async (
  clave: string,
  product: { nombre: string; precio: number; activo: boolean; original_nombre?: string },
  endpointUrl?: string
): Promise<ApiResponse> => {
  const sheet = getConnectedSpreadsheet();
  const session = getAdminSession();

  if (sheet.id && session?.token) {
    return await saveProductToSheetsApi(sheet.id, session.token, product);
  }

  return await postToSheets(
    { accion: 'guardar_producto', clave, ...product },
    endpointUrl
  );
};

/**
 * Admin: Delete product
 */
export const deleteAdminProduct = async (
  clave: string,
  nombre: string,
  endpointUrl?: string
): Promise<ApiResponse> => {
  const sheet = getConnectedSpreadsheet();
  const session = getAdminSession();

  if (sheet.id && session?.token) {
    return await deleteProductFromSheetsApi(sheet.id, session.token, nombre);
  }

  return await postToSheets(
    { accion: 'eliminar_producto', clave, nombre },
    endpointUrl
  );
};

/**
 * Admin: Fetch store configuration
 */
export const fetchAdminConfig = async (
  clave: string,
  endpointUrl?: string
): Promise<ApiResponse<SheetsConfig>> => {
  return await getFromSheets({ accion: 'config', clave }, endpointUrl);
};

/**
 * Admin: Save configuration
 */
export const saveAdminConfig = async (
  clave: string,
  config: SheetsConfig,
  endpointUrl?: string
): Promise<ApiResponse> => {
  const sheet = getConnectedSpreadsheet();
  const session = getAdminSession();

  if (sheet.id && session?.token) {
    return await saveConfigToSheetsApi(sheet.id, session.token, config);
  }

  return await postToSheets(
    { accion: 'guardar_config', clave, config },
    endpointUrl
  );
};

/**
 * Admin: Change access key (Legacy / WebApp fallback)
 */
export const changeAdminKey = async (
  clave: string,
  nuevaClave: string,
  endpointUrl?: string
): Promise<ApiResponse> => {
  return await postToSheets(
    { accion: 'cambiar_clave', clave, nueva_clave: nuevaClave },
    endpointUrl
  );
};
