// Supabase Edge Function: notion-oauth
// Intercambia el parametro 'code' del flujo OAuth por access_token en Notion
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
    const { code, redirect_uri } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: "El código de autorización es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientId = Deno.env.get("NOTION_CLIENT_ID") || "";
    const clientSecret = Deno.env.get("NOTION_CLIENT_SECRET") || "";

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "Secrets NOTION_CLIENT_ID o NOTION_CLIENT_SECRET no configurados en Edge Function" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = "Basic " + btoa(`${clientId}:${clientSecret}`);

    const tokenResponse = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirect_uri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return new Response(
        JSON.stringify({ error: tokenData.error || tokenData.message || "Error al obtener token de Notion" }),
        { status: tokenResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save to Supabase notion_conexion table using service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { error: dbError } = await supabase
        .from("notion_conexion")
        .upsert({
          id: 1,
          access_token: tokenData.access_token,
          workspace_name: tokenData.workspace_name,
          workspace_icon: tokenData.workspace_icon || null,
          bot_id: tokenData.bot_id,
          database_id: tokenData.duplicated_template_id || null,
          conectado_en: new Date().toISOString(),
        });

      if (dbError) {
        console.error("Error guardando conexion en DB:", dbError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        workspace_name: tokenData.workspace_name,
        workspace_icon: tokenData.workspace_icon,
        bot_id: tokenData.bot_id,
        database_id: tokenData.duplicated_template_id || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Error interno en notion-oauth" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
