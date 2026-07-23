// Supabase Edge Function: notion-bases
// Lista las bases de datos disponibles en el workspace y sus propiedades
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    let accessToken = "";
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body.access_token) accessToken = body.access_token;
      } catch {
        // Ignorar
      }
    }

    if (!accessToken && supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data } = await supabase.from("notion_conexion").select("access_token").eq("id", 1).single();
      if (data && data.access_token) {
        accessToken = data.access_token;
      }
    }

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "No hay conexión con Notion configurada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Consultar /v1/search filtrando por object = database
    const searchRes = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: {
          value: "database",
          property: "object",
        },
        page_size: 100,
      }),
    });

    if (!searchRes.ok) {
      const errData = await searchRes.json();
      return new Response(
        JSON.stringify({ error: "Error de Notion: " + (errData.message || searchRes.statusText) }),
        { status: searchRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchData = await searchRes.json();
    const databases = (searchData.results || []).map((db: any) => ({
      id: db.id,
      title: db.title?.[0]?.plain_text || "Sin título",
      icon: db.icon?.emoji || db.icon?.external?.url || null,
      properties: Object.keys(db.properties || {}).map((propName) => ({
        name: propName,
        type: db.properties[propName].type,
        id: db.properties[propName].id,
      })),
      raw_properties: db.properties,
    }));

    return new Response(
      JSON.stringify({ databases }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Error consultando bases de datos de Notion" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
