-- ============================================================================
-- MIGRACIÓN DE BASE DE DATOS PARA SUPABASE (MÓDULO 2 - SISTEMA DE PEDIDOS & NOTION)
-- ============================================================================

-- 1. TABLA DE PEDIDOS
create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero_pedido text unique not null,
  nombre text not null,
  whatsapp text not null,
  email text not null,
  ciudad text not null,
  producto text not null,
  cantidad int not null default 1,
  precio_unitario numeric not null,
  total numeric not null,
  notas text,
  metodo_pago text not null check (metodo_pago in ('transferencia','link','qr')),
  estado text not null default 'Pendiente de pago',
  notion_sync text not null default 'pendiente' check (notion_sync in ('pendiente','ok','error')),
  notion_page_id text,
  notion_error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. TABLA DE CONEXIÓN CON NOTION (SOLO 1 FILA)
create table if not exists public.notion_conexion (
  id int primary key default 1,
  access_token text,
  workspace_name text,
  workspace_icon text,
  bot_id text,
  database_id text,
  mapeo jsonb,
  conectado_en timestamptz,
  constraint solo_una_fila check (id = 1)
);

-- 3. TABLA DE PRODUCTOS (CONFIGURABLE DESDE EL PANEL)
create table if not exists public.productos (
  id text primary key,
  name text not null,
  price numeric not null,
  description text,
  category text,
  badge text,
  image text,
  activo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. TABLA DE CONFIGURACIÓN DE LA TIENDA
create table if not exists public.configuracion_tienda (
  id int primary key default 1,
  company_name text not null default 'Capilaris & Care',
  logo_url text,
  order_prefix text default 'DGZ',
  whatsapp_number text default '573001234567',
  currency_symbol text default '$',
  currency_code text default 'COP',
  bank_details jsonb,
  payment_link_details jsonb,
  qr_details jsonb,
  updated_at timestamptz default now(),
  constraint solo_una_config check (id = 1)
);

-- ============================================================================
-- TRIGGER PARA ACTUALIZAR updated_at AUTOMÁTICAMENTE
-- ============================================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_pedidos_updated_at on public.pedidos;
create trigger set_pedidos_updated_at
  before update on public.pedidos
  for each row execute function public.handle_updated_at();

drop trigger if exists set_productos_updated_at on public.productos;
create trigger set_productos_updated_at
  before update on public.productos
  for each row execute function public.handle_updated_at();

drop trigger if exists set_config_updated_at on public.configuracion_tienda;
create trigger set_config_updated_at
  before update on public.configuracion_tienda
  for each row execute function public.handle_updated_at();

-- ============================================================================
-- POLÍTICAS DE SEGURIDAD RLS (ROW LEVEL SECURITY)
-- ============================================================================
alter table public.pedidos enable row level security;
alter table public.notion_conexion enable row level security;
alter table public.productos enable row level security;
alter table public.configuracion_tienda enable row level security;

-- POLÍTICAS TABLA PEDIDOS:
-- 1. INSERT permitido para rol público anon (para enviar pedidos desde el formulario)
drop policy if exists "Permitir crear pedidos publicos" on public.pedidos;
create policy "Permitir crear pedidos publicos"
  on public.pedidos for insert
  to anon, authenticated
  with check (true);

-- 2. SELECT, UPDATE, DELETE solo para usuarios autenticados (Admin)
drop policy if exists "Permitir lectura y modificacion solo a autenticados" on public.pedidos;
create policy "Permitir lectura y modificacion solo a autenticados"
  on public.pedidos for all
  to authenticated
  using (true)
  with check (true);

-- POLÍTICAS TABLA NOTION_CONEXION:
-- Acceso exclusivo para usuarios autenticados (el access_token NUNCA se expone al cliente anon)
drop policy if exists "Notion conexion solo autenticados" on public.notion_conexion;
create policy "Notion conexion solo autenticados"
  on public.notion_conexion for all
  to authenticated
  using (true)
  with check (true);

-- POLÍTICAS TABLA PRODUCTOS:
-- Publico puede leer productos; solo autenticados pueden modificar
drop policy if exists "Lectura publica de productos" on public.productos;
create policy "Lectura publica de productos"
  on public.productos for select
  to anon, authenticated
  using (true);

drop policy if exists "Edicion de productos solo autenticados" on public.productos;
create policy "Edicion de productos solo autenticados"
  on public.productos for all
  to authenticated
  using (true)
  with check (true);

-- POLÍTICAS TABLA CONFIGURACION_TIENDA:
-- Publico puede leer configuracion; solo autenticados pueden actualizar
drop policy if exists "Lectura publica de configuracion" on public.configuracion_tienda;
create policy "Lectura publica de configuracion"
  on public.configuracion_tienda for select
  to anon, authenticated
  using (true);

drop policy if exists "Edicion de configuracion solo autenticados" on public.configuracion_tienda;
create policy "Edicion de configuracion solo autenticados"
  on public.configuracion_tienda for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================================
-- SEED DE DATOS INICIALES
-- ============================================================================
insert into public.configuracion_tienda (
  id, company_name, logo_url, order_prefix, whatsapp_number, currency_symbol, currency_code,
  bank_details, payment_link_details, qr_details
) values (
  1,
  'Capilaris & Care',
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=120&auto=format&fit=crop&q=80',
  'DGZ',
  '573001234567',
  '$',
  'COP',
  '{"banco": "Bancolombia", "tipoCuenta": "Ahorros", "numeroCuenta": "123-456789-01", "titular": "Capilaris & Care S.A.S.", "documento": "NIT 901.234.567-8"}'::jsonb,
  '{"url": "https://checkout.wompi.co/l/capilaris-payment-link", "platformName": "Wompi / Bold / Mercado Pago"}'::jsonb,
  '{"imageUrl": "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 200 200\" fill=\"%230f172a\"><rect width=\"200\" height=\"200\" fill=\"%23ffffff\"/><path d=\"M20,20h60v60h-60zM30,30v40h40v-40zM40,40h20v20h-20zM120,20h60v60h-60zM130,30v40h40v-40zM140,40h20v20h-20zM20,120h60v60h-60zM30,130v40h40v-40zM40,140h20v20h-20zM90,20h20v30h-20zM90,60h20v30h-20zM100,100h20v20h-20zM20,90h40v20h-40zM70,90h20v40h-20zM120,90h20v20h-20zM150,90h30v20h-30zM90,140h30v20h-30zM130,120h20v30h-20zM160,120h20v50h-20zM110,170h30v10h-30zM150,180h30v10h-30z\"/></svg>", "instructions": "Escanea el código QR desde la app móvil de tu banco para realizar el pago al instante."}'::jsonb
) on conflict (id) do nothing;

insert into public.productos (id, name, price, description, category, badge, image)
values 
  ('prod-1', 'Kit Crecimiento Capilar Intensivo', 149000, 'Shampoo Estimulante + Acondicionador + Tónico Capilar de 120ml con Biotina.', 'Kits', 'Más Vendido 🌟', 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&auto=format&fit=crop&q=80'),
  ('prod-2', 'Tónico Anti-caída Profesional (120ml)', 79000, 'Fórmula concentrada con Minoxidil vegetal y Romero orgánico.', 'Tratamientos', 'Recomendado 💧', 'https://images.unsplash.com/photo-1608248597260-264639d671c6?w=400&auto=format&fit=crop&q=80'),
  ('prod-3', 'Suero Reparador de Puntas (60ml)', 59000, 'Nutrición profunda con aceite puro de Argán y Keratina concentrada.', 'Tratamientos', 'Brillo Extremo ✨', 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&auto=format&fit=crop&q=80'),
  ('prod-4', 'Cepillo Masajeador de Cuero Cabelludo', 35000, 'Cerdas de silicona médica ergonómicas para reactivar el folículo capilar.', 'Accesorios', 'Complemento 🌿', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&auto=format&fit=crop&q=80')
on conflict (id) do nothing;
