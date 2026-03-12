import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { COGNOS_BASE_PROMPT, buildPsycheContext } from "../_shared/cognos-base-prompt.ts";

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

    const { mode, dailyMinutes, startDate, subjectIds } = await req.json();

    const [subjectsRes, topicsRes, planRes, psycheRes, checkinsRes, sessionsRes] = await Promise.all([
      supabase.from("user_subjects").select("*").eq("user_id", user.id).in("id", subjectIds || []),
      supabase.from("topics").select("*").eq("user_id", user.id),
      supabase.from("study_plan").select("*").eq("user_id", user.id),
      supabase.from("psyche_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("psyche_checkins").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("study_sessions").select("subject_id, duration_minutes, started_at").eq("user_id", user.id).order("started_at", { ascending: false }).limit(50),
    ]);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const psycheContext = buildPsycheContext(psycheRes.data, checkinsRes.data || []);

    const context = {
      mode, dailyMinutes, startDate,
      subjects: subjectsRes.data || [],
      topics: topicsRes.data || [],
      studyPlan: planRes.data || [],
      recentSessions: sessionsRes.data || [],
    };

    const prompt = mode === "predict_date"
      ? `Com ${dailyMinutes} min/dia a partir de ${startDate}, preveja a data de conclusão para cada disciplina selecionada. Considere a prioridade G-Force, quantidade de tópicos, nível de compreensão atual e o estado Psique do aluno.`
      : `Para concluir todas as disciplinas até ${startDate}, calcule quantos minutos por dia o aluno precisa estudar. Distribua por disciplina usando os vetores G-Force. Se a carga for excessiva para o estado Psique atual, indique isso e sugira ajustes realistas.`;

    const systemPrompt = `${COGNOS_BASE_PROMPT}

FUNÇÃO ATUAL: Previsor.IA — Previsão de Ciclos de Estudo

${psycheContext}

INSTRUÇÕES ESPECÍFICAS:
- Gere previsões realistas baseadas nos dados reais do aluno, não em cenários ideais.
- Considere o estado Psique: se o aluno está sob estresse, ajuste as previsões para um ritmo sustentável.
- Inclua margem de segurança (10-20%) para dias improdutivos.
- Justifique a previsão em termos dos vetores G-Force.
- Se a previsão indicar impossibilidade (tempo insuficiente), seja honesto mas empático: sugira priorização estratégica das disciplinas de maior impacto.
- Responda em markdown formatado.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${prompt}\n\nDados:\n${JSON.stringify(context, null, 2)}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "Não foi possível gerar previsão.";

    return new Response(JSON.stringify({ success: true, content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("predict-cycle error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
