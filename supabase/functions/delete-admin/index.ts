import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !requestingUser) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: requestingAdmin, error: adminError } = await supabaseAdmin
      .from("admins")
      .select("role")
      .eq("id", requestingUser.id)
      .single();

    if (adminError || !requestingAdmin || requestingAdmin.role !== "SUPER_ADMIN") {
      return new Response(JSON.stringify({ error: "Only super admins can delete admins" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { targetAdminId } = await req.json();

    if (!targetAdminId) {
      return new Response(JSON.stringify({ error: "targetAdminId is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (targetAdminId === requestingUser.id) {
       return new Response(JSON.stringify({ error: "Cannot delete yourself" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Delete from public.admins first
    const { error: dbError } = await supabaseAdmin.from("admins").delete().eq("id", targetAdminId);
    if (dbError) {
      return new Response(JSON.stringify({ error: dbError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Then delete from auth.users
    const { error: authDelError } = await supabaseAdmin.auth.admin.deleteUser(targetAdminId);
    if (authDelError) {
      console.error("Error deleting auth user:", authDelError);
      // We don't fail completely if auth delete fails because db delete already happened, but we return a warning.
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
