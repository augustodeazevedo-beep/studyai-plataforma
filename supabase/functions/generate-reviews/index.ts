import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SRS_INTERVALS = [1, 3, 7, 15, 30];

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function getBackendConfig() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  return { url, key };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Sessão inválida." }, 401);

    const { url: supabaseUrl, key: supabaseKey } = getBackendConfig();
    if (!supabaseUrl || !supabaseKey) return jsonResponse({ error: "Configuração interna indisponível." }, 500);
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return jsonResponse({ error: "Sessão inválida." }, 401);

    const { subject_id, performance_rating } = await req.json();
    if (typeof subject_id !== "string" || !/^[0-9a-f-]{36}$/i.test(subject_id)) return jsonResponse({ error: "Disciplina inválida." }, 400);
    if (performance_rating !== undefined && (typeof performance_rating !== "number" || !Number.isFinite(performance_rating) || performance_rating < 1 || performance_rating > 5)) return jsonResponse({ error: "Nota de desempenho inválida." }, 400);

    // Get last review for this subject
    const { data: lastReview } = await supabase
      .from("spaced_reviews")
      .select("*")
      .eq("user_id", user.id)
      .eq("subject_id", subject_id)
      .order("review_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Determine next interval
    let currentIntervalIndex = 0;
    if (lastReview) {
      const lastInterval = lastReview.interval_days;
      currentIntervalIndex = SRS_INTERVALS.indexOf(lastInterval);
      if (currentIntervalIndex === -1) currentIntervalIndex = 0;

      // Adjust based on performance (1-5 scale)
      if (performance_rating >= 4) {
        currentIntervalIndex = Math.min(currentIntervalIndex + 1, SRS_INTERVALS.length - 1);
      } else if (performance_rating <= 2) {
        currentIntervalIndex = Math.max(currentIntervalIndex - 1, 0);
      }
    }

    const nextInterval = SRS_INTERVALS[currentIntervalIndex];
    const today = new Date();
    const nextDate = new Date(today);
    nextDate.setDate(nextDate.getDate() + nextInterval);

    const { error: insertError } = await supabase.from("spaced_reviews").insert({
      user_id: user.id,
      subject_id,
      review_date: nextDate.toISOString().split("T")[0],
      interval_days: nextInterval,
      completed: false,
      performance_rating: performance_rating || 0,
      next_review_date: nextDate.toISOString().split("T")[0],
    });

    if (insertError) throw insertError;

    return jsonResponse({ success: true, next_review_date: nextDate.toISOString().split("T")[0], interval_days: nextInterval });
  } catch (e) {
    console.error("generate-reviews error:", e);
    return jsonResponse({ error: "Erro interno ao gerar revisão. Tente novamente." }, 500);
  }
});
