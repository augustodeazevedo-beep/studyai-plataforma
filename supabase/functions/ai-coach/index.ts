import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { STUDY_AI_BASE_PROMPT, buildPsycheContext } from "../_shared/study-ai-base-prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_SUBJECTS = 80;
const MAX_PLAN_ROWS = 80;

function getBackendConfig() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  return { url, key };
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Sessão inválida." }, 401);

    const { url, key } = getBackendConfig();
    if (!url || !key) return jsonResponse({ error: "Configuração interna indisponível." }, 500);
    const supabase = createClient(url, key, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonResponse({ error: "Sessão inválida." }, 401);

    const [profileRes, subjectsRes, sessionsRes, attemptsRes, planRes, psycheRes, checkinsRes, reviewsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_subjects").select("*").eq("user_id", user.id).limit(MAX_SUBJECTS),
      supabase.from("study_sessions").select("*").eq("user_id", user.id).order("started_at", { ascending: false }).limit(30),
      supabase.from("question_attempts").select("*, questions(subject_id, difficulty)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("study_plan").select("*").eq("user_id", user.id).limit(MAX_PLAN_ROWS),
      supabase.from("psyche_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("psyche_checkins").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(7),
      supabase.from("spaced_reviews").select("*").eq("user_id", user.id).order("review_date", { ascending: false }).limit(20),
    ]);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const psycheContext = buildPsycheContext(psycheRes.data, checkinsRes.data || []);

    const context = {
      profile: profileRes.data,
      subjects: subjectsRes.data || [],
      recentSessions: sessionsRes.data || [],
      recentAttempts: attemptsRes.data || [],
      studyPlan: planRes.data || [],
      recentReviews: reviewsRes.data || [],
    };

    const systemPrompt = `${STUDY_AI_BASE_PROMPT}

FUNÇÃO ATUAL: Coach.IA — Conselheiro Estratégico e Motor de Decisão
Você está atuando como coach estratégico de estudos para concursos públicos brasileiros.

${psycheContext}

INSTRUÇÕES ESPECÍFICAS:
Analise os dados do aluno e forneça um conselho estratégico personalizado seguindo a arquitetura Study.AI:

1. DIAGNÓSTICO G-FORCE: Identifique os desalinhamentos entre Real e Ideal nos 5 vetores para cada disciplina.
2. PRÓXIMA AÇÃO: Recomende a ação de maior ganho esperado com menor custo cognitivo no estado emocional atual.
3. ANÁLISE DO RITMO: Avalie se o ritmo atual é sustentável e compatível com a data da prova.
4. PONTOS DE ATENÇÃO: Identifique disciplinas com lacunas críticas (alta relevância + baixo domínio).
5. AJUSTE PSIQUE: Se o estado emocional estiver comprometido, priorize consistência sobre volume. Use linguagem empática.
6. FRASE MOTIVACIONAL: Encerre com uma frase que valide o esforço e incentive a persistência.

Formato: markdown estruturado. Seja direto, motivador e específico. Justifique cada recomendação em termos dos vetores G-Force.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Dados completos do aluno:\n${JSON.stringify(context, null, 2)}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return jsonResponse({ error: "Limite de uso da IA atingido. Tente novamente em instantes." }, 429);
      if (response.status === 402) return jsonResponse({ error: "Créditos de IA insuficientes para gerar orientação." }, 402);
      throw new Error(`AI error: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "Não foi possível gerar conselho.";

    await supabase.from("ai_coaching_history").insert({ user_id: user.id, content });

    return jsonResponse({ success: true, content });
  } catch (e) {
    console.error("ai-coach error:", e);
    return jsonResponse({ error: "Erro interno ao gerar orientação. Tente novamente." }, 500);
  }
});
