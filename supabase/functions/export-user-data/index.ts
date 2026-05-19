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

    // Use the authenticated user's token so RLS is enforced automatically
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const tables = [
      "profiles", "user_subjects", "topics", "study_sessions",
      "study_plan", "study_calendar_blocks", "study_materials",
      "flashcards", "spaced_reviews", "questions", "question_attempts",
      "user_notes", "user_achievements", "ai_coaching_history",
      "reminders", "psyche_profiles", "psyche_checkins", "planner_audit_logs",
    ];

    const exportData: Record<string, unknown[]> = {};

    for (const table of tables) {
      const { data } = await userClient.from(table).select("*").eq("user_id", user.id);
      exportData[table] = data || [];
    }

    const result = {
      exported_at: new Date().toISOString(),
      user_email: user.email,
      user_id: user.id,
      data: exportData,
    };

    return new Response(JSON.stringify(result, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="studyai-data-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
