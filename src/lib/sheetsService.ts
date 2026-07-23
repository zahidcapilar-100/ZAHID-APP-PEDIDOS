import { OrderPayload, CompanyConfig } from '../types';

const PENDING_ORDER_KEY = 'pedido_pendiente';

// Helper to delay execution
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface SubmitResult {
  success: boolean;
  numero_pedido?: string;
  error?: string;
}

/**
 * Saves pending order payload into localStorage before attempting network request
 */
export const savePendingOrder = (payload: OrderPayload): void => {
  try {
    localStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Could not save pending order to localStorage:', err);
  }
};

/**
 * Retrieves pending order from localStorage if any exists
 */
export const getPendingOrder = (): OrderPayload | null => {
  try {
    const data = localStorage.getItem(PENDING_ORDER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

/**
 * Clears pending order from localStorage upon successful sync
 */
export const clearPendingOrder = (): void => {
  try {
    localStorage.removeItem(PENDING_ORDER_KEY);
  } catch (err) {
    console.warn('Could not remove pending order from localStorage:', err);
  }
};

/**
 * Sends order to Google Apps Script Web App with automatic retries.
 * CRITICAL: Uses headers: { 'Content-Type': 'text/plain;charset=utf-8' }
 * to prevent CORS preflight OPTIONS rejection by Google Apps Script.
 */
export const sendOrderToGoogleSheets = async (
  payload: OrderPayload,
  endpointUrl?: string
): Promise<SubmitResult> => {
  const endpoint =
    endpointUrl ||
    (import.meta.env.VITE_SHEETS_ENDPOINT as string) ||
    '';

  // Always save backup to localStorage first
  savePendingOrder(payload);

  if (!endpoint) {
    console.warn('VITE_SHEETS_ENDPOINT is not configured.');
    // If no endpoint is configured yet, we still return success or friendly error
    // so client can send via WhatsApp seamlessly
  }

  const maxAttempts = 3; // Initial + 2 retries
  const delays = [0, 1000, 3000]; // 0s, 1s, 3s

  let lastError = 'No se pudo conectar con la hoja de cálculo.';

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (delays[attempt] > 0) {
      await sleep(delays[attempt]);
    }

    try {
      if (!endpoint) break;

      const response = await fetch(endpoint, {
        method: 'POST',
        // CRITICAL HEADER TO PREVENT CORS PREFLIGHT
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const textResponse = await response.text();
        let jsonRes: any = {};
        try {
          jsonRes = JSON.parse(textResponse);
        } catch {
          // In case Apps Script returned plain text or non-json ok response
          jsonRes = { ok: true };
        }

        if (jsonRes.ok !== false) {
          // Success! Clear backup
          clearPendingOrder();
          return {
            success: true,
            numero_pedido: jsonRes.numero_pedido || payload.numero_pedido,
          };
        } else {
          lastError = jsonRes.error || 'Respuesta negativa de la hoja de cálculo.';
        }
      } else {
        lastError = `Servidor devolvió código de estado ${response.status}.`;
      }
    } catch (err: any) {
      lastError = err?.message || 'Error de red o conexión.';
      console.warn(`Attempt ${attempt + 1} to send order failed:`, err);
    }
  }

  // If all retries fail, pending order remains in localStorage
  return {
    success: false,
    error: lastError,
  };
};

/**
 * Optional: Fetch config from Google Sheets endpoint (?accion=config)
 */
export const fetchConfigFromGoogleSheets = async (
  endpointUrl?: string
): Promise<Partial<CompanyConfig> | null> => {
  const endpoint =
    endpointUrl ||
    (import.meta.env.VITE_SHEETS_ENDPOINT as string) ||
    '';

  if (!endpoint) return null;

  try {
    const res = await fetch(`${endpoint}?accion=config`, {
      method: 'GET',
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.ok) {
        return data.config || null;
      }
    }
  } catch (err) {
    console.warn('Could not fetch config from Google Sheets:', err);
  }

  return null;
};
