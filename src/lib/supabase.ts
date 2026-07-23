import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { OrderPayload, Product, CompanyConfig, PaymentMethodType } from '../types';
import { APP_CONFIG } from '../config';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' && 
  !supabaseUrl.includes('placeholder')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Local storage keys for fallback/offline mode
const LS_PEDIDOS = 'capilaris_pedidos_v2';
const LS_NOTION = 'capilaris_notion_conexion_v2';
const LS_PRODUCTOS = 'capilaris_productos_v2';
const LS_CONFIG = 'capilaris_configuracion_v2';

export interface DBOrder {
  id: string;
  numero_pedido: string;
  nombre: string;
  whatsapp: string;
  email: string;
  ciudad: string;
  producto: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  notas?: string;
  metodo_pago: PaymentMethodType;
  estado: string;
  notion_sync: 'pendiente' | 'ok' | 'error';
  notion_page_id?: string;
  notion_error?: string;
  created_at: string;
  updated_at: string;
}

export interface NotionConexion {
  id: number;
  access_token?: string;
  workspace_name?: string;
  workspace_icon?: string;
  bot_id?: string;
  database_id?: string;
  mapeo?: Record<string, string>;
  conectado_en?: string;
}

// ============================================================================
// PEDIDOS (ORDERS) MANAGEMENT
// ============================================================================

export async function savePublicOrder(payload: OrderPayload): Promise<{
  success: boolean;
  orderId?: string;
  notionSyncStatus: 'pendiente' | 'ok' | 'error';
  notionError?: string;
}> {
  // 1. If Supabase is configured, save directly to Supabase DB
  if (supabase) {
    try {
      const { data: dbOrder, error: insertError } = await supabase
        .from('pedidos')
        .insert({
          numero_pedido: payload.numero_pedido,
          nombre: payload.nombre,
          whatsapp: payload.whatsapp,
          email: payload.email,
          ciudad: payload.ciudad,
          producto: payload.producto,
          cantidad: payload.cantidad,
          precio_unitario: payload.precio_unitario,
          total: payload.total,
          notas: payload.notas || null,
          metodo_pago: payload.metodo_pago,
          estado: 'Pendiente de pago',
          notion_sync: 'pendiente',
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error insertando pedido en Supabase:', insertError);
        throw insertError;
      }

      const orderId = dbOrder?.id;

      // 2. Trigger sync-notion Edge Function
      try {
        const syncRes = await fetch(`${supabaseUrl}/functions/v1/sync-notion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ pedido_id: orderId }),
        });

        if (syncRes.ok) {
          const syncData = await syncRes.json();
          return {
            success: true,
            orderId,
            notionSyncStatus: 'ok',
          };
        } else {
          const syncErr = await syncRes.json().catch(() => ({}));
          return {
            success: true,
            orderId,
            notionSyncStatus: 'error',
            notionError: syncErr.error || 'Error en Edge Function sync-notion',
          };
        }
      } catch (err: any) {
        return {
          success: true,
          orderId,
          notionSyncStatus: 'error',
          notionError: err.message || 'No se pudo invocar sync-notion',
        };
      }
    } catch (err: any) {
      console.warn('Fallback a almacenamiento local por error de red:', err);
    }
  }

  // Fallback in local storage mode
  const localId = `local-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const localOrder: DBOrder = {
    id: localId,
    numero_pedido: payload.numero_pedido,
    nombre: payload.nombre,
    whatsapp: payload.whatsapp,
    email: payload.email,
    ciudad: payload.ciudad,
    producto: payload.producto,
    cantidad: payload.cantidad,
    precio_unitario: payload.precio_unitario,
    total: payload.total,
    notas: payload.notas,
    metodo_pago: payload.metodo_pago,
    estado: 'Pendiente de pago',
    notion_sync: 'pendiente',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const existing: DBOrder[] = JSON.parse(localStorage.getItem(LS_PEDIDOS) || '[]');
    localStorage.setItem(LS_PEDIDOS, JSON.stringify([localOrder, ...existing]));
  } catch {
    // Ignore
  }

  return {
    success: true,
    orderId: localId,
    notionSyncStatus: 'pendiente',
  };
}

export async function fetchAdminOrders(filters?: {
  search?: string;
  estado?: string;
  metodoPago?: string;
  notionSync?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ orders: DBOrder[]; totalCount: number }> {
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 25;

  if (supabase) {
    try {
      let query = supabase
        .from('pedidos')
        .select('*', { count: 'exact' });

      if (filters?.estado && filters.estado !== 'todos') {
        query = query.eq('estado', filters.estado);
      }
      if (filters?.metodoPago && filters.metodoPago !== 'todos') {
        query = query.eq('metodo_pago', filters.metodoPago);
      }
      if (filters?.notionSync && filters.notionSync !== 'todos') {
        query = query.eq('notion_sync', filters.notionSync);
      }
      if (filters?.search && filters.search.trim()) {
        const s = `%${filters.search.trim()}%`;
        query = query.or(`nombre.ilike.${s},whatsapp.ilike.${s},email.ilike.${s},numero_pedido.ilike.${s}`);
      }

      const fromIndex = (page - 1) * pageSize;
      const toIndex = fromIndex + pageSize - 1;

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(fromIndex, toIndex);

      if (!error && data) {
        return { orders: data as DBOrder[], totalCount: count || 0 };
      }
    } catch (err) {
      console.warn('Error leyendo de Supabase, usando fallback local:', err);
    }
  }

  // Local Storage Fallback
  let localOrders: DBOrder[] = [];
  try {
    localOrders = JSON.parse(localStorage.getItem(LS_PEDIDOS) || '[]');
  } catch {
    localOrders = [];
  }

  // Apply filters
  let filtered = [...localOrders];
  if (filters?.estado && filters.estado !== 'todos') {
    filtered = filtered.filter((o) => o.estado === filters.estado);
  }
  if (filters?.metodoPago && filters.metodoPago !== 'todos') {
    filtered = filtered.filter((o) => o.metodo_pago === filters.metodoPago);
  }
  if (filters?.notionSync && filters.notionSync !== 'todos') {
    filtered = filtered.filter((o) => o.notion_sync === filters.notionSync);
  }
  if (filters?.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    filtered = filtered.filter(
      (o) =>
        o.nombre.toLowerCase().includes(q) ||
        o.whatsapp.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        o.numero_pedido.toLowerCase().includes(q)
    );
  }

  const totalCount = filtered.length;
  const start = (page - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  return { orders: paginated, totalCount };
}

export async function updateOrderStatusInDB(
  orderId: string,
  newStatus: string
): Promise<boolean> {
  if (supabase) {
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ estado: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (!error) {
        // Trigger Notion sync update asynchronously
        fetch(`${supabaseUrl}/functions/v1/sync-notion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ pedido_id: orderId }),
        }).catch(() => {});
        return true;
      }
    } catch (err) {
      console.warn('Error actualizando pedido en Supabase:', err);
    }
  }

  // Local Storage update
  try {
    const localOrders: DBOrder[] = JSON.parse(localStorage.getItem(LS_PEDIDOS) || '[]');
    const updated = localOrders.map((o) =>
      o.id === orderId
        ? { ...o, estado: newStatus, updated_at: new Date().toISOString() }
        : o
    );
    localStorage.setItem(LS_PEDIDOS, JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
}

export async function updateOrderNotesInDB(
  orderId: string,
  notes: string
): Promise<boolean> {
  if (supabase) {
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ notas: notes, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (!error) return true;
    } catch (err) {
      console.warn('Error guardando notas en Supabase:', err);
    }
  }

  try {
    const localOrders: DBOrder[] = JSON.parse(localStorage.getItem(LS_PEDIDOS) || '[]');
    const updated = localOrders.map((o) =>
      o.id === orderId ? { ...o, notas: notes } : o
    );
    localStorage.setItem(LS_PEDIDOS, JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
}

export async function retryNotionSyncOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
  if (supabase) {
    try {
      const syncRes = await fetch(`${supabaseUrl}/functions/v1/sync-notion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ pedido_id: orderId }),
      });

      if (syncRes.ok) {
        return { success: true };
      } else {
        const errJson = await syncRes.json().catch(() => ({}));
        return { success: false, error: errJson.error || 'Error reintentando sincronización' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de red en sync-notion' };
    }
  }

  // Local simulation
  try {
    const localOrders: DBOrder[] = JSON.parse(localStorage.getItem(LS_PEDIDOS) || '[]');
    const updated = localOrders.map((o) =>
      o.id === orderId
        ? { ...o, notion_sync: 'ok' as const, notion_error: undefined }
        : o
    );
    localStorage.setItem(LS_PEDIDOS, JSON.stringify(updated));
    return { success: true };
  } catch {
    return { success: false, error: 'Error actualizando almacenamiento local' };
  }
}

// ============================================================================
// NOTION CONEXION MANAGEMENT
// ============================================================================

export async function fetchNotionConexion(): Promise<NotionConexion | null> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('notion_conexion')
        .select('*')
        .eq('id', 1)
        .single();

      if (!error && data) {
        return data as NotionConexion;
      }
    } catch (err) {
      console.warn('Error leyendo notion_conexion:', err);
    }
  }

  try {
    const saved = localStorage.getItem(LS_NOTION);
    if (saved) return JSON.parse(saved);
  } catch {
    // Ignore
  }

  return null;
}

export async function saveNotionConexion(conexionData: Partial<NotionConexion>): Promise<boolean> {
  if (supabase) {
    try {
      const { error } = await supabase
        .from('notion_conexion')
        .upsert({
          id: 1,
          ...conexionData,
          conectado_en: new Date().toISOString(),
        });

      if (!error) return true;
    } catch (err) {
      console.warn('Error guardando notion_conexion:', err);
    }
  }

  try {
    const existing = JSON.parse(localStorage.getItem(LS_NOTION) || '{}');
    const updated = { ...existing, id: 1, ...conexionData, conectado_en: new Date().toISOString() };
    localStorage.setItem(LS_NOTION, JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
}

export async function disconnectNotionConexion(): Promise<boolean> {
  if (supabase) {
    try {
      const { error } = await supabase
        .from('notion_conexion')
        .delete()
        .eq('id', 1);

      if (!error) return true;
    } catch (err) {
      console.warn('Error eliminando conexion notion:', err);
    }
  }

  try {
    localStorage.removeItem(LS_NOTION);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// STORE PRODUCTS & CONFIG MANAGEMENT
// ============================================================================

export async function fetchStoreProducts(): Promise<Product[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('activo', true)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((p: any) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          description: p.description || '',
          category: p.category || '',
          badge: p.badge || '',
          image: p.image || '',
        }));
      }
    } catch (err) {
      console.warn('Error cargando productos de Supabase:', err);
    }
  }

  try {
    const saved = localStorage.getItem(LS_PRODUCTOS);
    if (saved) return JSON.parse(saved);
  } catch {
    // Ignore
  }

  return APP_CONFIG.products;
}

export async function saveStoreProducts(products: Product[]): Promise<boolean> {
  if (supabase) {
    try {
      const upsertRows = products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        description: p.description,
        category: p.category,
        badge: p.badge,
        image: p.image,
        activo: true,
      }));

      const { error } = await supabase.from('productos').upsert(upsertRows);
      if (!error) return true;
    } catch (err) {
      console.warn('Error guardando productos en Supabase:', err);
    }
  }

  try {
    localStorage.setItem(LS_PRODUCTOS, JSON.stringify(products));
    return true;
  } catch {
    return false;
  }
}

export async function fetchStoreConfig(): Promise<CompanyConfig> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('configuracion_tienda')
        .select('*')
        .eq('id', 1)
        .single();

      if (!error && data) {
        const prods = await fetchStoreProducts();
        return {
          companyName: data.company_name || APP_CONFIG.companyName,
          logoUrl: data.logo_url || APP_CONFIG.logoUrl,
          orderPrefix: data.order_prefix || APP_CONFIG.orderPrefix,
          whatsappNumber: data.whatsapp_number || APP_CONFIG.whatsappNumber,
          currencySymbol: data.currency_symbol || APP_CONFIG.currencySymbol,
          currencyCode: data.currency_code || APP_CONFIG.currencyCode,
          bankDetails: data.bank_details || APP_CONFIG.bankDetails,
          paymentLinkDetails: data.payment_link_details || APP_CONFIG.paymentLinkDetails,
          qrDetails: data.qr_details || APP_CONFIG.qrDetails,
          products: prods,
          countryCodes: APP_CONFIG.countryCodes,
        };
      }
    } catch (err) {
      console.warn('Error leyendo configuracion_tienda:', err);
    }
  }

  try {
    const saved = localStorage.getItem(LS_CONFIG);
    if (saved) return JSON.parse(saved);
  } catch {
    // Ignore
  }

  return APP_CONFIG;
}

export async function updateStoreConfigInDB(newConfig: Partial<CompanyConfig>): Promise<boolean> {
  if (supabase) {
    try {
      const { error } = await supabase.from('configuracion_tienda').upsert({
        id: 1,
        company_name: newConfig.companyName,
        logo_url: newConfig.logoUrl,
        order_prefix: newConfig.orderPrefix,
        whatsapp_number: newConfig.whatsappNumber,
        currency_symbol: newConfig.currencySymbol,
        currency_code: newConfig.currencyCode,
        bank_details: newConfig.bankDetails,
        payment_link_details: newConfig.paymentLinkDetails,
        qr_details: newConfig.qrDetails,
      });

      if (!error) return true;
    } catch (err) {
      console.warn('Error actualizando configuracion_tienda:', err);
    }
  }

  try {
    const current = await fetchStoreConfig();
    const updated = { ...current, ...newConfig };
    localStorage.setItem(LS_CONFIG, JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
}
