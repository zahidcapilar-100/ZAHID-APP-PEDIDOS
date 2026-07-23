// Supabase Edge Function: notion-validar
// Valida un token manual de Notion e ID de base de datos
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
    const { token, database_id } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "El token de integración es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Validar token llamando a /v1/users/me
    const userRes = await fetch("https://api.notion.com/v1/users/me", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
      },
    });

    if (!userRes.ok) {
      const errData = await userRes.json();
      return new Response(
        JSON.stringify({ error: "Token inválido de Notion: " + (errData.message || "No autorizado") }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userData = await userRes.json();
    const botName = userData.name || "Integración Manual Notion";

    let dbTitle = "Base de datos verificada";
    let dbProperties = {};

    // 2. Validar database_id si fue provisto
    if (database_id) {
      const dbRes = await fetch(`https://api.notion.com/v1/databases/${database_id}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Notion-Version": "2022-06-28",
        },
      });

      if (!dbRes.ok) {
        const errData = await dbRes.json();
        return new Response(
          JSON.stringify({ error: "ID de base de datos no encontrado o sin acceso para este token: " + (errData.message || "") }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const dbData = await dbRes.json();
      dbTitle = dbData.title?.[0]?.plain_text || "Base de Datos Notion";
      dbProperties = dbData.properties || {};
    }

    // Guardar o actualizar en Supabase DB
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase
        .from("notion_conexion")
        .upsert({
          id: 1,
          access_token: token,
          workspace_name: botName,
          database_id: database_id || null,
          conectado_en: new Date().toISOString(),
        });
    }

    return new Response(
      JSON.stringify({
        valid: true,
        workspace_name: botName,
        database_name: dbTitle,
        properties: dbProperties,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Error al validar conexión" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
