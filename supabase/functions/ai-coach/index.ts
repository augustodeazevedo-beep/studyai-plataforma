import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const [profileRes, subjectsRes, sessionsRes, attemptsRes, planRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_subjects").select("*").eq("user_id", user.id),
      supabase.from("study_sessions").select("*").eq("user_id", user.id).order("started_at", { ascending: false }).limit(30),
      supabase.from("question_attempts").select("*, questions(subject_id)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("study_plan").select("*").eq("user_id", user.id),
    ]);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const context = {
      profile: profileRes.data,
      subjects: subjectsRes.data || [],
      recentSessions: sessionsRes.data || [],
      recentAttempts: attemptsRes.data || [],
      studyPlan: planRes.data || [],
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: `Você é um coach estratégico de estudos para concursos públicos brasileiros. Analise os dados do aluno e forneça um conselho estratégico personalizado em português. Seja direto, motivador e específico. Inclua: 1) Análise do ritmo atual 2) Pontos fortes e fracos 3) Recomendações práticas 4) Uma frase motivacional. Formato: texto corrido em markdown.` },
          { role: "user", content: `Dados do aluno:\n${JSON.stringify(context, null, 2)}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "Não foi possível gerar conselho.";

    // Save to history
    await supabase.from("ai_coaching_history").insert({ user_id: user.id, content });

    return new Response(JSON.stringify({ success: true, content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
