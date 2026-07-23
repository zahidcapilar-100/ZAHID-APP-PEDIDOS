// Supabase Edge Function: sync-notion
// Sincroniza un pedido de Supabase con Notion usando el mapeo de campos guardado
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { pedido_id, test } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Configuración de Supabase no disponible en Edge Function" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Obtener la conexión guardada de Notion
    const { data: conexion, error: conexionErr } = await supabase
      .from("notion_conexion")
      .select("*")
      .eq("id", 1)
      .single();

    if (conexionErr || !conexion || !conexion.access_token || !conexion.database_id) {
      const errorMsg = "Workspace o base de datos de Notion no conectada";
      if (pedido_id) {
        await supabase
          .from("pedidos")
          .update({ notion_sync: "error", notion_error: errorMsg })
          .eq("id", pedido_id);
      }
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Obtener datos del pedido
    let pedidoData: any = null;
    if (pedido_id) {
      const { data: pData, error: pErr } = await supabase
        .from("pedidos")
        .select("*")
        .eq("id", pedido_id)
        .single();

      if (pErr || !pData) {
        return new Response(
          JSON.stringify({ error: "Pedido no encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      pedidoData = pData;
    } else if (test) {
      // Pedido ficticio de prueba
      pedidoData = {
        numero_pedido: "TEST-001",
        nombre: "Cliente de Prueba",
        whatsapp: "+573000000000",
        email: "prueba@notion.com",
        ciudad: "Bogotá",
        producto: "Producto de Prueba Notion",
        cantidad: 1,
        precio_unitario: 50000,
        total: 50000,
        notas: "Pedido de prueba generado desde el panel de administración",
        metodo_pago: "transferencia",
        estado: "Pendiente de pago",
        created_at: new Date().toISOString(),
      };
    } else {
      return new Response(
        JSON.stringify({ error: "Se requiere pedido_id o flag test=true" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Consultar la estructura de la base de datos de Notion para auto-mapeo inteligente o mapeo guardado
    const dbRes = await fetch(`https://api.notion.com/v1/databases/${conexion.database_id}`, {
      headers: {
        "Authorization": `Bearer ${conexion.access_token}`,
        "Notion-Version": "2022-06-28",
      },
    });

    if (!dbRes.ok) {
      const errJson = await dbRes.json();
      const errMsg = "Error leyendo base de datos de Notion: " + (errJson.message || "");
      if (pedido_id) {
        await supabase
          .from("pedidos")
          .update({ notion_sync: "error", notion_error: errMsg })
          .eq("id", pedido_id);
      }
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dbData = await dbRes.json();
    const dbProperties = dbData.properties || {};

    const userMapeo = conexion.mapeo || {};

    // Construir los campos de la página de Notion
    const notionProperties: Record<string, any> = {};

    const getValueForAppKey = (appKey: string) => {
      switch (appKey) {
        case "numero_pedido": return pedidoData.numero_pedido;
        case "nombre": return pedidoData.nombre;
        case "whatsapp": return pedidoData.whatsapp;
        case "email": return pedidoData.email;
        case "ciudad": return pedidoData.ciudad;
        case "producto": return pedidoData.producto;
        case "cantidad": return pedidoData.cantidad;
        case "precio_unitario": return pedidoData.precio_unitario;
        case "total": return pedidoData.total;
        case "notas": return pedidoData.notas || "";
        case "metodo_pago": return pedidoData.metodo_pago;
        case "estado": return pedidoData.estado;
        case "fecha": return pedidoData.created_at;
        default: return "";
      }
    };

    // Recorrer las propiedades reales de la base de Notion
    for (const [propName, propDef] of Object.entries<any>(dbProperties)) {
      // Buscar qué campo de la app mapea a esta propiedad
      let mappedAppKey: string | null = null;
      for (const [appKey, targetPropName] of Object.entries(userMapeo)) {
        if (targetPropName === propName) {
          mappedAppKey = appKey;
          break;
        }
      }

      // Si no hay mapeo explícito, intentar coincidencia por nombre insensible a mayúsculas
      if (!mappedAppKey) {
        const lowerProp = propName.toLowerCase();
        if (lowerProp.includes("pedido") || lowerProp.includes("número") || lowerProp.includes("title") || propDef.type === "title") mappedAppKey = "numero_pedido";
        else if (lowerProp.includes("cliente") || lowerProp.includes("nombre")) mappedAppKey = "nombre";
        else if (lowerProp.includes("whatsapp") || lowerProp.includes("teléfono") || lowerProp.includes("phone")) mappedAppKey = "whatsapp";
        else if (lowerProp.includes("email") || lowerProp.includes("correo")) mappedAppKey = "email";
        else if (lowerProp.includes("ciudad") || lowerProp.includes("dirección")) mappedAppKey = "ciudad";
        else if (lowerProp.includes("producto")) mappedAppKey = "producto";
        else if (lowerProp.includes("cantidad")) mappedAppKey = "cantidad";
        else if (lowerProp.includes("total") || lowerProp.includes("precio")) mappedAppKey = "total";
        else if (lowerProp.includes("método") || lowerProp.includes("pago")) mappedAppKey = "metodo_pago";
        else if (lowerProp.includes("estado") || lowerProp.includes("status")) mappedAppKey = "estado";
        else if (lowerProp.includes("nota") || lowerProp.includes("observaciones")) mappedAppKey = "notas";
        else if (lowerProp.includes("fecha") || lowerProp.includes("date")) mappedAppKey = "fecha";
      }

      if (!mappedAppKey) continue;

      const rawVal = getValueForAppKey(mappedAppKey);
      if (rawVal === undefined || rawVal === null) continue;

      switch (propDef.type) {
        case "title":
          notionProperties[propName] = {
            title: [{ text: { content: String(rawVal) } }],
          };
          break;
        case "rich_text":
          notionProperties[propName] = {
            rich_text: [{ text: { content: String(rawVal) } }],
          };
          break;
        case "number":
          notionProperties[propName] = {
            number: Number(rawVal) || 0,
          };
          break;
        case "select":
          notionProperties[propName] = {
            select: { name: String(rawVal) },
          };
          break;
        case "status":
          notionProperties[propName] = {
            status: { name: String(rawVal) },
          };
          break;
        case "email":
          notionProperties[propName] = {
            email: String(rawVal),
          };
          break;
        case "phone_number":
          notionProperties[propName] = {
            phone_number: String(rawVal),
          };
          break;
        case "date":
          notionProperties[propName] = {
            date: { start: new Date(rawVal).toISOString() },
          };
          break;
        default:
          break;
      }
    }

    // Si ya existe notion_page_id, es un UPDATE en Notion. Si no, es un CREATE page.
    let pageId = pedidoData.notion_page_id;
    let notionRes: Response;

    if (pageId) {
      notionRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${conexion.access_token}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: notionProperties,
        }),
      });
    } else {
      notionRes = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${conexion.access_token}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parent: { database_id: conexion.database_id },
          properties: notionProperties,
        }),
      });
    }

    const notionData = await notionRes.json();

    if (!notionRes.ok) {
      const errorMsg = "Error en API Notion: " + (notionData.message || notionRes.statusText);
      if (pedido_id) {
        await supabase
          .from("pedidos")
          .update({ notion_sync: "error", notion_error: errorMsg })
          .eq("id", pedido_id);
      }
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: notionRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const createdPageId = notionData.id;

    // Si fue test, eliminar la página creada de prueba
    if (test && createdPageId) {
      await fetch(`https://api.notion.com/v1/blocks/${createdPageId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${conexion.access_token}`,
          "Notion-Version": "2022-06-28",
        },
      });

      return new Response(
        JSON.stringify({ success: true, message: "Prueba de conexión con Notion exitosa (página creada y eliminada)" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Actualizar estado en Supabase
    if (pedido_id) {
      await supabase
        .from("pedidos")
        .update({
          notion_sync: "ok",
          notion_page_id: createdPageId,
          notion_error: null,
        })
        .eq("id", pedido_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        notion_page_id: createdPageId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Error inesperado en sync-notion" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
