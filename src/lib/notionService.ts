import { supabase, isSupabaseConfigured } from './supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export interface NotionDatabaseProp {
  name: string;
  type: string;
  id: string;
}

export interface NotionDatabaseInfo {
  id: string;
  title: string;
  icon?: string;
  properties: NotionDatabaseProp[];
  raw_properties?: Record<string, any>;
}

/**
 * Exchange OAuth authorization code for Notion access token via notion-oauth Edge Function
 */
export async function exchangeNotionOAuthCode(code: string, redirectUri: string): Promise<{
  success: boolean;
  workspace_name?: string;
  workspace_icon?: string;
  bot_id?: string;
  database_id?: string;
  error?: string;
}> {
  if (isSupabaseConfigured) {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/notion-oauth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ code, redirect_uri: redirectUri }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Error al intercambiar código con Notion' };
      }

      return {
        success: true,
        workspace_name: data.workspace_name,
        workspace_icon: data.workspace_icon,
        bot_id: data.bot_id,
        database_id: data.database_id,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de red invocando notion-oauth' };
    }
  }

  // Simulated fallback for local dev / preview without Supabase Edge Functions deployed
  return {
    success: true,
    workspace_name: 'Capilaris & Care Workspace (Demo Notion)',
    workspace_icon: '🌿',
    bot_id: 'bot-demo-notion-123',
    database_id: 'db-demo-pedidos-456',
  };
}

/**
 * Validate a manual Notion secret token and optional database ID via notion-validar Edge Function
 */
export async function validateNotionManualToken(token: string, databaseId?: string): Promise<{
  valid: boolean;
  workspace_name?: string;
  database_name?: string;
  properties?: Record<string, any>;
  error?: string;
}> {
  if (isSupabaseConfigured) {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/notion-validar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ token, database_id: databaseId }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { valid: false, error: data.error || 'Error al validar token' };
      }

      return {
        valid: true,
        workspace_name: data.workspace_name,
        database_name: data.database_name,
        properties: data.properties,
      };
    } catch (err: any) {
      return { valid: false, error: err.message || 'Error de red en notion-validar' };
    }
  }

  // Local fallback simulation
  if (!token.startsWith('secret_') && token.length < 10) {
    return { valid: false, error: 'El token debe comenzar con "secret_" o ser un token válido de integración.' };
  }

  return {
    valid: true,
    workspace_name: 'Workspace Notion Conectado (Manual)',
    database_name: databaseId ? 'Base de Datos de Pedidos (Manual)' : 'Búsqueda por defecto',
  };
}

/**
 * List available Notion databases and properties via notion-bases Edge Function
 */
export async function fetchNotionDatabases(token?: string): Promise<{
  databases: NotionDatabaseInfo[];
  error?: string;
}> {
  if (isSupabaseConfigured) {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/notion-bases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ access_token: token }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { databases: [], error: data.error || 'Error consultando bases de datos' };
      }

      return { databases: data.databases || [] };
    } catch (err: any) {
      return { databases: [], error: err.message || 'Error de red consultando notion-bases' };
    }
  }

  // Fallback demo databases schema matching standard Notion DBs
  return {
    databases: [
      {
        id: 'db-pedidos-notion-01',
        title: '📦 Pedidos Tienda Web (Oficial)',
        icon: '📦',
        properties: [
          { name: 'Número de Pedido', type: 'title', id: 'p1' },
          { name: 'Cliente', type: 'rich_text', id: 'p2' },
          { name: 'WhatsApp', type: 'phone_number', id: 'p3' },
          { name: 'Email', type: 'email', id: 'p4' },
          { name: 'Ciudad', type: 'rich_text', id: 'p5' },
          { name: 'Producto', type: 'select', id: 'p6' },
          { name: 'Cantidad', type: 'number', id: 'p7' },
          { name: 'Total', type: 'number', id: 'p8' },
          { name: 'Método de Pago', type: 'select', id: 'p9' },
          { name: 'Estado', type: 'status', id: 'p10' },
          { name: 'Notas', type: 'rich_text', id: 'p11' },
          { name: 'Fecha', type: 'date', id: 'p12' },
        ],
      },
      {
        id: 'db-clientes-notion-02',
        title: '👥 Registro General de Clientes',
        icon: '👥',
        properties: [
          { name: 'Nombre Completo', type: 'title', id: 'c1' },
          { name: 'Correo Electrónico', type: 'email', id: 'c2' },
          { name: 'Teléfono Contacto', type: 'phone_number', id: 'c3' },
          { name: 'Ubicación / Ciudad', type: 'rich_text', id: 'c4' },
        ],
      },
    ],
  };
}

/**
 * Test Notion connection by creating and immediately deleting a sample test row
 */
export async function testNotionConnection(): Promise<{ success: boolean; message?: string; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/sync-notion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ test: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Prueba de conexión fallida' };
      }

      return {
        success: true,
        message: data.message || 'Prueba de conexión exitosa: se creó y eliminó un pedido de prueba en Notion.',
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error invocando sync-notion' };
    }
  }

  // Simulated fallback
  await new Promise((r) => setTimeout(r, 600));
  return {
    success: true,
    message: 'Prueba de conexión con Notion simulada correctamente. ¡El mapeo de campos está activo!',
  };
}
