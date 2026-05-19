import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user with their token
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // SOFT DELETE: schedule account deletion in 30 days instead of deleting immediately.
    // This allows users to cancel by logging in again within the grace period.
    //
    // IMPORTANT: the following columns must exist on the "profiles" table.
    // Create them via a Supabase migration if not yet present:
    //   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deletion_scheduled_at timestamptz;
    //   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
    const scheduledDeletionDate = new Date();
    scheduledDeletionDate.setDate(scheduledDeletionDate.getDate() + 30);

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        deletion_scheduled_at: scheduledDeletionDate.toISOString(),
        status: "pending_deletion",
      })
      .eq("id", user.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Erro ao agendar exclusão de conta" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      message: "Account scheduled for deletion in 30 days. You can cancel by logging in again.",
      scheduled_at: scheduledDeletionDate.toISOString(),
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
