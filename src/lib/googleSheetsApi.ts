// Direct Google Sheets REST API Client for Module 4 Admin Panel

import { OrderPayload, AdminProduct, SheetsConfig, ApiResponse } from '../types';
import { sendOrderToGoogleSheets } from './sheetsService';

const SPREADSHEET_KEY = 'capilaris_sheet_id';
const SPREADSHEET_NAME_KEY = 'capilaris_sheet_name';
const ENDPOINT_OVERRIDE_KEY = 'capilaris_endpoint_override';

export const REQUIRED_PEDIDOS_HEADERS = [
  'numero_pedido',
  'fecha',
  'nombre',
  'whatsapp',
  'email',
  'ciudad',
  'producto',
  'cantidad',
  'precio_unitario',
  'total',
  'notas',
  'metodo_pago',
  'estado',
  'notas_internas',
];

export const REQUIRED_PRODUCTOS_HEADERS = ['id', 'nombre', 'precio', 'activo', 'descripcion', 'badge'];

export const REQUIRED_CONFIG_HEADERS = ['clave', 'valor'];

export interface DiagnosticResult {
  isValid: boolean;
  missingSheets: string[];
  missingHeaders: { sheet: string; missing: string[] }[];
  detectedOrdersCount: number;
}

/**
 * Local Storage Helpers for connected Spreadsheet
 */
export const getConnectedSpreadsheet = () => {
  return {
    id: localStorage.getItem(SPREADSHEET_KEY) || '',
    name: localStorage.getItem(SPREADSHEET_NAME_KEY) || '',
  };
};

export const saveConnectedSpreadsheet = (id: string, name: string) => {
  localStorage.setItem(SPREADSHEET_KEY, id);
  localStorage.setItem(SPREADSHEET_NAME_KEY, name);
};

export const clearConnectedSpreadsheet = () => {
  localStorage.removeItem(SPREADSHEET_KEY);
  localStorage.removeItem(SPREADSHEET_NAME_KEY);
};

export const getEndpointOverride = (): string => {
  return localStorage.getItem(ENDPOINT_OVERRIDE_KEY) || '';
};

export const saveEndpointOverride = (url: string) => {
  localStorage.setItem(ENDPOINT_OVERRIDE_KEY, url);
};

/**
 * Handles HTTP response errors for Sheets REST API
 */
async function handleSheetsApiResponse<T = any>(res: Response): Promise<{ ok: boolean; data?: T; status: number; error?: string }> {
  if (res.status === 401) {
    return { ok: false, status: 401, error: 'token_expirado' };
  }
  if (res.status === 403 || res.status === 404) {
    return { ok: false, status: res.status, error: 'hoja_no_encontrada' };
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, status: res.status, error: json.error?.message || 'Error en Google Sheets API' };
  }

  return { ok: true, status: 200, data: json };
}

/**
 * Diagnoses the spreadsheet structure (Sheets & Column Headers)
 */
export const diagnoseSpreadsheetStructure = async (
  spreadsheetId: string,
  accessToken: string
): Promise<DiagnosticResult> => {
  try {
    // 1. Get metadata to check sheet names
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}?includeGridData=false`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const meta = await handleSheetsApiResponse(metaRes);
    if (!meta.ok || !meta.data) {
      return {
        isValid: false,
        missingSheets: ['Pedidos', 'Productos', 'Configuración'],
        missingHeaders: [],
        detectedOrdersCount: 0,
      };
    }

    const existingSheets: string[] = (meta.data.sheets || []).map(
      (s: any) => s.properties?.title
    );

    const requiredSheets = ['Pedidos', 'Productos', 'Configuración'];
    const missingSheets = requiredSheets.filter((s) => !existingSheets.includes(s));

    // 2. Fetch headers for existing required sheets
    const rangesToFetch: string[] = [];
    if (existingSheets.includes('Pedidos')) rangesToFetch.push('Pedidos!1:1');
    if (existingSheets.includes('Productos')) rangesToFetch.push('Productos!1:1');
    if (existingSheets.includes('Configuración')) rangesToFetch.push('Configuración!1:1');

    const missingHeaders: { sheet: string; missing: string[] }[] = [];
    let detectedOrdersCount = 0;

    if (rangesToFetch.length > 0) {
      const rangesQuery = rangesToFetch.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');
      const headersRes = await fetch(
        `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values:batchGet?${rangesQuery}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const headersData = await handleSheetsApiResponse(headersRes);
      if (headersData.ok && headersData.data?.valueRanges) {
        const valueRanges = headersData.data.valueRanges;

        valueRanges.forEach((vr: any) => {
          const rangeStr: string = vr.range || '';
          const sheetName = rangeStr.split('!')[0].replace(/'/g, '');
          const row1: string[] = (vr.values && vr.values[0]) || [];
          const cleanRow1 = row1.map((h) => String(h).trim().toLowerCase());

          if (sheetName === 'Pedidos') {
            const missing = REQUIRED_PEDIDOS_HEADERS.filter(
              (req) => !cleanRow1.includes(req.toLowerCase())
            );
            if (missing.length > 0) {
              missingHeaders.push({ sheet: 'Pedidos', missing });
            }
          } else if (sheetName === 'Productos') {
            const missing = REQUIRED_PRODUCTOS_HEADERS.filter(
              (req) => !cleanRow1.includes(req.toLowerCase())
            );
            if (missing.length > 0) {
              missingHeaders.push({ sheet: 'Productos', missing });
            }
          } else if (sheetName === 'Configuración') {
            const missing = REQUIRED_CONFIG_HEADERS.filter(
              (req) => !cleanRow1.includes(req.toLowerCase())
            );
            if (missing.length > 0) {
              missingHeaders.push({ sheet: 'Configuración', missing });
            }
          }
        });
      }
    }

    // 3. Count orders if Pedidos sheet exists
    if (existingSheets.includes('Pedidos')) {
      const countRes = await fetch(
        `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/Pedidos!A2:A`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const countData = await handleSheetsApiResponse(countRes);
      if (countData.ok && countData.data?.values) {
        detectedOrdersCount = countData.data.values.filter((r: any) => r && r[0]).length;
      }
    }

    const isValid = missingSheets.length === 0 && missingHeaders.length === 0;

    return {
      isValid,
      missingSheets,
      missingHeaders,
      detectedOrdersCount,
    };
  } catch (err) {
    console.warn('Diagnostic error:', err);
    return {
      isValid: false,
      missingSheets: ['Pedidos', 'Productos', 'Configuración'],
      missingHeaders: [],
      detectedOrdersCount: 0,
    };
  }
};

/**
 * Automatically creates missing sheets and writes headers
 */
export const createSpreadsheetStructureAuto = async (
  spreadsheetId: string,
  accessToken: string
): Promise<DiagnosticResult> => {
  const currentDiag = await diagnoseSpreadsheetStructure(spreadsheetId, accessToken);

  // 1. Create missing sheets via batchUpdate
  if (currentDiag.missingSheets.length > 0) {
    const requests = currentDiag.missingSheets.map((title) => ({
      addSheet: {
        properties: { title },
      },
    }));

    await fetch(`https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });
  }

  // 2. Write headers for sheets using values.batchUpdate
  const dataToUpdate = [
    {
      range: 'Pedidos!A1:N1',
      values: [REQUIRED_PEDIDOS_HEADERS],
    },
    {
      range: 'Productos!A1:F1',
      values: [REQUIRED_PRODUCTOS_HEADERS],
    },
    {
      range: 'Configuración!A1:B1',
      values: [REQUIRED_CONFIG_HEADERS],
    },
  ];

  await fetch(`https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: dataToUpdate,
    }),
  });

  // 3. Seed default config if Configuración sheet was created
  if (currentDiag.missingSheets.includes('Configuración')) {
    const defaultConfigData = [
      ['banco', 'Bancolombia'],
      ['tipo_cuenta', 'Ahorros'],
      ['numero_cuenta', '123-456789-01'],
      ['titular', 'Capilaris Colombia SAS'],
      ['documento', 'NIT 901.234.567-8'],
      ['whatsapp', '573001234567'],
      ['link_pago', 'https://epayco.com/capilaris'],
      ['qr_url', ''],
    ];

    await fetch(`https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/Configuración!A2:B9`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        values: defaultConfigData,
      }),
    });
  }

  // 4. Seed default product if Productos was created
  if (currentDiag.missingSheets.includes('Productos')) {
    const defaultProducts = [
      [
        'prod-1',
        'Tónico Capilar Anticaída Capilaris 120ml',
        '89900',
        'TRUE',
        'Fórmula avanzada con extractos naturales y biotina',
        'Más Vendido',
      ],
      [
        'prod-2',
        'Shampoo Fortalecedor Capilaris 300ml',
        '55000',
        'TRUE',
        'Limpia suavemente estimulando el crecimiento',
        'Popular',
      ],
    ];

    await fetch(`https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/Productos!A2:F3`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        values: defaultProducts,
      }),
    });
  }

  return await diagnoseSpreadsheetStructure(spreadsheetId, accessToken);
};

// ============================================================================
// ADMIN SHEETS DATA ACCESS
// ============================================================================

/**
 * Fetch all orders from Pedidos sheet
 */
export const fetchOrdersFromSheetsApi = async (
  spreadsheetId: string,
  accessToken: string
): Promise<ApiResponse<OrderPayload[]>> => {
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/Pedidos!A:N`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const parsed = await handleSheetsApiResponse(res);
    if (!parsed.ok) {
      return { ok: false, error: parsed.error };
    }

    const rows: string[][] = parsed.data.values || [];
    if (rows.length <= 1) {
      return { ok: true, pedidos: [] };
    }

    // Row 1 is header. Map rows 2+
    const pedidos: OrderPayload[] = rows.slice(1).map((r) => ({
      numero_pedido: r[0] || '',
      fecha: r[1] || new Date().toISOString(),
      nombre: r[2] || '',
      whatsapp: r[3] || '',
      email: r[4] || '',
      ciudad: r[5] || '',
      producto: r[6] || '',
      cantidad: Number(r[7]) || 1,
      precio_unitario: Number(r[8]) || 0,
      total: Number(r[9]) || 0,
      notas: r[10] || '',
      metodo_pago: r[11] || 'Transferencia',
      estado: r[12] || 'Pendiente de pago',
      notas_internas: r[13] || '',
    }));

    return { ok: true, pedidos };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al conectar con Sheets API' };
  }
};

/**
 * Update order status cell
 */
export const updateOrderStatusSheetsApi = async (
  spreadsheetId: string,
  accessToken: string,
  numeroPedido: string,
  estado: string
): Promise<ApiResponse> => {
  try {
    // Get column A to find row index
    const resCol = await fetch(
      `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/Pedidos!A:A`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const colData = await handleSheetsApiResponse(resCol);
    if (!colData.ok || !colData.data?.values) {
      return { ok: false, error: 'No se pudo leer la lista de pedidos.' };
    }

    const rows: string[][] = colData.data.values;
    const rowIndex = rows.findIndex((r) => r[0] && r[0].trim() === numeroPedido.trim());

    if (rowIndex === -1) {
      return { ok: false, error: `Pedido ${numeroPedido} no encontrado.` };
    }

    const sheetRowNumber = rowIndex + 1; // 1-based index

    // Estado is column M (13th column)
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/Pedidos!M${sheetRowNumber}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [[estado]],
        }),
      }
    );

    const updateData = await handleSheetsApiResponse(updateRes);
    if (!updateData.ok) {
      return { ok: false, error: updateData.error };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error de actualización de estado' };
  }
};

/**
 * Update order internal notes cell
 */
export const updateOrderNotesSheetsApi = async (
  spreadsheetId: string,
  accessToken: string,
  numeroPedido: string,
  notasInternas: string
): Promise<ApiResponse> => {
  try {
    const resCol = await fetch(
      `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/Pedidos!A:A`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const colData = await handleSheetsApiResponse(resCol);
    if (!colData.ok || !colData.data?.values) {
      return { ok: false, error: 'No se pudo leer la lista de pedidos.' };
    }

    const rows: string[][] = colData.data.values;
    const rowIndex = rows.findIndex((r) => r[0] && r[0].trim() === numeroPedido.trim());

    if (rowIndex === -1) {
      return { ok: false, error: `Pedido ${numeroPedido} no encontrado.` };
    }

    const sheetRowNumber = rowIndex + 1;

    // Notas internas is column N (14th column)
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/Pedidos!N${sheetRowNumber}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [[notasInternas]],
        }),
      }
    );

    const updateData = await handleSheetsApiResponse(updateRes);
    return { ok: updateData.ok, error: updateData.error };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error de actualización de notas' };
  }
};

/**
 * Fetch all products from Productos sheet
 */
export const fetchProductsFromSheetsApi = async (
  spreadsheetId: string,
  accessToken: string
): Promise<ApiResponse<AdminProduct[]>> => {
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/Productos!A:F`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const parsed = await handleSheetsApiResponse(res);
    if (!parsed.ok) return { ok: false, error: parsed.error };

    const rows: string[][] = parsed.data.values || [];
    if (rows.length <= 1) return { ok: true, productos: [] };

    const productos: AdminProduct[] = rows.slice(1).map((r) => ({
      id: r[0] || '',
      nombre: r[1] || '',
      precio: Number(r[2]) || 0,
      activo: String(r[3]).toUpperCase() === 'TRUE',
    }));

    return { ok: true, productos };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al leer productos' };
  }
};

/**
 * Save product to Productos sheet
 */
export const saveProductToSheetsApi = async (
  spreadsheetId: string,
  accessToken: string,
  product: { nombre: string; precio: number; activo: boolean; original_nombre?: string }
): Promise<ApiResponse> => {
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/Productos!A:F`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const parsed = await handleSheetsApiResponse(res);
    if (!parsed.ok) return { ok: false, error: parsed.error };

    const rows: string[][] = parsed.data.values || [];
    const targetName = (product.original_nombre || product.nombre).trim().toLowerCase();

    const rowIndex = rows.findIndex(
      (r, idx) => idx > 0 && r[1] && r[1].trim().toLowerCase() === targetName
    );

    const activeStr = product.activo ? 'TRUE' : 'FALSE';
    const prodId = rowIndex > 0 ? rows[rowIndex][0] : `prod-${Date.now()}`;

    const newRow = [
      prodId,
      product.nombre.trim(),
      String(product.precio),
      activeStr,
      'Producto Capilaris',
      '',
    ];

    if (rowIndex > 0) {
      // Update existing row
      const sheetRowNumber = rowIndex + 1;
      const updateRes = await fetch(
        `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/Productos!A${sheetRowNumber}:F${sheetRowNumber}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: [newRow] }),
        }
      );
      const updateData = await handleSheetsApiResponse(updateRes);
      return { ok: updateData.ok, error: updateData.error };
    } else {
      // Append new row
      const appendRes = await fetch(
        `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/Productos!A:F:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: [newRow] }),
        }
      );
      const appendData = await handleSheetsApiResponse(appendRes);
      return { ok: appendData.ok, error: appendData.error };
    }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al guardar producto' };
  }
};

/**
 * Delete product from Productos sheet
 */
export const deleteProductFromSheetsApi = async (
  spreadsheetId: string,
  accessToken: string,
  nombre: string
): Promise<ApiResponse> => {
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/Productos!A:F`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const parsed = await handleSheetsApiResponse(res);
    if (!parsed.ok) return { ok: false, error: parsed.error };

    const rows: string[][] = parsed.data.values || [];
    const rowIndex = rows.findIndex(
      (r, idx) => idx > 0 && r[1] && r[1].trim().toLowerCase() === nombre.trim().toLowerCase()
    );

    if (rowIndex === -1) {
      return { ok: false, error: 'Producto no encontrado.' };
    }

    const sheetRowNumber = rowIndex + 1;
    // Clear the row
    const clearRes = await fetch(
      `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/Productos!A${sheetRowNumber}:F${sheetRowNumber}:clear`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const clearData = await handleSheetsApiResponse(clearRes);
    return { ok: clearData.ok, error: clearData.error };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al eliminar producto' };
  }
};

/**
 * Fetch configuration key-values from Configuración sheet
 */
export const fetchConfigFromSheetsApi = async (
  spreadsheetId: string,
  accessToken: string
): Promise<ApiResponse<SheetsConfig>> => {
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/Configuración!A:B`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const parsed = await handleSheetsApiResponse(res);
    if (!parsed.ok) return { ok: false, error: parsed.error };

    const rows: string[][] = parsed.data.values || [];
    const config: SheetsConfig = {};

    rows.slice(1).forEach((r) => {
      if (r[0]) {
        config[r[0].trim()] = r[1] || '';
      }
    });

    return { ok: true, config };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al leer configuración' };
  }
};

/**
 * Save configuration to Configuración sheet
 */
export const saveConfigToSheetsApi = async (
  spreadsheetId: string,
  accessToken: string,
  config: SheetsConfig
): Promise<ApiResponse> => {
  try {
    const configRows = Object.keys(config).map((key) => [key, config[key] || '']);

    const updateRes = await fetch(
      `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/Configuración!A2:B20?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: configRows }),
      }
    );

    const updateData = await handleSheetsApiResponse(updateRes);
    return { ok: updateData.ok, error: updateData.error };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al guardar configuración' };
  }
};

/**
 * Sends a test order to the public Apps Script endpoint, confirms it arrived in the sheet, then deletes the test row.
 */
export const testEndpointOrderSheetsApi = async (
  spreadsheetId: string,
  accessToken: string,
  endpointUrl: string
): Promise<{ success: boolean; message: string }> => {
  const testNumber = `TEST-${Math.floor(1000 + Math.random() * 9000)}`;

  const testPayload = {
    numero_pedido: testNumber,
    fecha: new Date().toISOString(),
    nombre: 'Prueba de Conexión Admin',
    whatsapp: '573000000000',
    email: 'prueba@capilaris.com',
    ciudad: 'Prueba Sistema',
    producto: 'Producto Test',
    cantidad: 1,
    precio_unitario: 1000,
    total: 1000,
    notas: 'Prueba de diagnóstico de WebApp Apps Script',
    metodo_pago: 'Transferencia',
    estado: 'Pendiente de pago',
  };

  // 1. Submit test order to endpoint
  const sendRes = await sendOrderToGoogleSheets(testPayload, endpointUrl);
  if (!sendRes.success) {
    return {
      success: false,
      message: `Error al enviar pedido de prueba al Apps Script: ${sendRes.error}`,
    };
  }

  // 2. Wait 1 second and check if row arrived in Pedidos!A:A
  await new Promise((r) => setTimeout(r, 1500));

  const colRes = await fetch(
    `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/Pedidos!A:A`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const colData = await handleSheetsApiResponse(colRes);
  if (!colData.ok || !colData.data?.values) {
    return {
      success: false,
      message: 'El pedido de prueba se envió, pero no se pudo leer la hoja para confirmar su registro.',
    };
  }

  const rows: string[][] = colData.data.values;
  const rowIndex = rows.findIndex((r) => r[0] && r[0].trim() === testNumber);

  if (rowIndex === -1) {
    return {
      success: false,
      message: 'El pedido de prueba fue enviado pero no se encontró en la hoja. Verifica la URL de Apps Script.',
    };
  }

  // 3. Delete / Clear the test row from Pedidos
  const sheetRowNumber = rowIndex + 1;
  await fetch(
    `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/Pedidos!A${sheetRowNumber}:N${sheetRowNumber}:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  return {
    success: true,
    message: '¡Prueba exitosa! El pedido de prueba fue enviado por el WebApp de Apps Script, confirmado en la hoja y limpiado correctamente.',
  };
};
