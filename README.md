# Capilaris & Care — Módulo 2: Backend y Panel de Administración

Sistema conversacional de captura de pedidos tipo Typeform integrado con **Supabase**, **Notion API / Edge Functions**, y **Panel de Administración `/admin`**.

---

## 🏛️ Arquitectura del Sistema

1. **Formulario Público (`/`)**:
   - Captura de pedidos paso a paso con validaciones en tiempo real.
   - Guarda inmediatamente el pedido en Supabase (`pedidos`).
   - Invoca la Edge Function `sync-notion` que crea o actualiza la fila en Notion usando credenciales guardadas.
   - Si la sincronización falla, el pedido se preserva con `notion_sync = 'error'` y `notion_error`. **Nunca se pierde el pedido**. El cliente ve su confirmación exitosa con las opciones de pago sin mostrarle errores internos de Notion.

2. **Panel de Administración (`/admin`)**:
   - Protegido con **Supabase Auth** (Email + Contraseña).
   - **`/admin` (Dashboard)**: Métricas clave (pedidos hoy, del mes, ingresos COP, pendientes de pago), gráficos interactivos (Recharts) y alerta de errores de sincronización.
   - **`/admin/pedidos` (Listado)**: Búsqueda debounced (300ms), filtros combinados, paginación, cambio de estado en línea con actualización optimista y reintento masivo de sincronización con Notion.
   - **`/admin/pedidos/:id` (Detalle)**: Botón directo "Abrir WhatsApp con el cliente", enlace "Ver en Notion", historial y editor de notas internas.
   - **`/admin/integraciones` (Conexión Notion)**: Flujo OAuth público de Notion + Conexión manual con token `secret_...`, selector de bases de datos, tabla de mapeo de campos (`JSONB`) y botón "Probar conexión".
   - **`/admin/configuracion` (Tienda y Productos)**: Edición de precios, catálogo de productos (almacenado en tabla `productos` de Supabase) y datos bancarios.

---

## 🚀 Guía de Despliegue y Configuración en Supabase

### 1. Crear el Proyecto en Supabase
1. Ingresa a [supabase.com](https://supabase.com) y crea un nuevo proyecto.
2. Copia la `Project URL` y la `anon key` en tu archivo `.env`:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key
   ```

### 2. Ejecutar las Migraciones de Base de Datos
1. Ve al menú **SQL Editor** en la consola de Supabase.
2. Copia y ejecuta el contenido del archivo `/supabase/migrations/01_initial_schema.sql`.
3. Esto creará:
   - Tabla `pedidos` con restricciones `CHECK` y políticas **RLS** (INSERT público para anon, lectura/edición solo para autenticados).
   - Tabla `notion_conexion` con restricción de única fila (`id = 1`) y acceso RLS exclusivo para autenticados.
   - Tablas `productos` y `configuracion_tienda`.
   - Triggers automáticos para `updated_at`.

### 3. Crear Usuario Administrador en Supabase Auth
1. Ve a **Authentication -> Users** en Supabase.
2. Haz clic en **Add User -> Create User**.
3. Ingresa el email y la contraseña con la que ingresarás a `/admin`.

---

## 🔗 Registrar la Integración Pública en Notion

1. Visita [notion.so/my-integrations](https://www.notion.so/my-integrations).
2. Haz clic en **New integration**.
3. Configura:
   - **Type**: Public integration
   - **Name**: Capilaris Pedidos Sync
   - **Redirect URIs**: `https://tu-dominio.com/admin/integraciones/callback` (o `http://localhost:3000/admin/integraciones/callback` para desarrollo).
4. Guarda y copia el **Client ID** y el **Client Secret**.

---

## ⚡ Despliegue de Edge Functions en Supabase

Instala la CLI de Supabase si no la tienes y despliega las 4 Edge Functions:

```bash
# 1. Iniciar sesión en la CLI
npx supabase login

# 2. Vincular el proyecto
npx supabase link --project-ref tu-project-ref

# 3. Configurar secrets en Supabase
npx supabase secrets set NOTION_CLIENT_ID="tu-notion-client-id"
npx supabase secrets set NOTION_CLIENT_SECRET="tu-notion-client-secret"
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"

# 4. Desplegar las Edge Functions
npx supabase functions deploy notion-oauth
npx supabase functions deploy notion-validar
npx supabase functions deploy notion-bases
npx supabase functions deploy sync-notion
```

---

## 🔐 Variables de Entorno (.env)

```env
# Frontend
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
VITE_NOTION_CLIENT_ID=tu-notion-client-id
VITE_NOTION_REDIRECT_URI=http://localhost:3000/admin/integraciones/callback

# Edge Functions Secrets (Supabase)
NOTION_CLIENT_SECRET=tu-notion-client-secret
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```
