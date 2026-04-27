import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { STUDY_AI_BASE_PROMPT, buildPsycheContext } from "../_shared/study-ai-base-prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const [profileRes, subjectsRes, sessionsRes, attemptsRes, psycheRes, checkinsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_subjects").select("*").eq("user_id", user.id),
      supabase.from("study_sessions").select("*").eq("user_id", user.id),
      supabase.from("question_attempts").select("*, questions(subject_id)").eq("user_id", user.id),
      supabase.from("psyche_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("psyche_checkins").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    ]);

    const profile = profileRes.data;
    const subjects = subjectsRes.data || [];
    const sessions = sessionsRes.data || [];
    const attempts = attemptsRes.data || [];

    if (subjects.length === 0) {
      return new Response(JSON.stringify({ error: "No subjects found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const psycheContext = buildPsycheContext(psycheRes.data, checkinsRes.data || []);

    const subjectSummaries = subjects.map((s: any) => {
      const subjectSessions = sessions.filter((ss: any) => ss.subject_id === s.id);
      const totalHours = subjectSessions.reduce((acc: number, ss: any) => acc + (ss.duration_minutes || 0), 0) / 60;
      const subjectAttempts = attempts.filter((a: any) => a.questions?.subject_id === s.id);
      const correctAttempts = subjectAttempts.filter((a: any) => a.is_correct).length;
      const accuracyRate = subjectAttempts.length > 0 ? (correctAttempts / subjectAttempts.length) * 100 : 0;
      const lastStudied = subjectSessions.length > 0
        ? subjectSessions.sort((a: any, b: any) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0].started_at
        : null;

      return {
        id: s.id,
        name: s.name,
        knowledge_level: s.knowledge_level,
        weight: s.weight,
        total_hours_studied: Math.round(totalHours * 10) / 10,
        accuracy_rate: Math.round(accuracyRate),
        total_attempts: subjectAttempts.length,
        last_studied: lastStudied,
      };
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `${STUDY_AI_BASE_PROMPT}

FUNÇÃO ATUAL: Motor de Planejamento — Geração do Plano de Estudos G-Force

${psycheContext}

INSTRUÇÕES ESPECÍFICAS:
Analise os dados do aluno e calcule os 5 vetores para cada disciplina, seguindo a arquitetura G-Force:
- Relevância (0-10): peso do tema para o concurso "${profile?.target_exam || "geral"}" cargo "${profile?.target_position || "geral"}"
- Incidência (0-10): frequência histórica em provas de concursos similares (banca: ${profile?.banca || "não definida"})
- Acurácia (0-10): baseado no knowledge_level informado e accuracy_rate real
- Desempenho (0-10): baseado em horas estudadas, acertos e consistência
- Lacuna/Gap (0-10): risco de esquecimento baseado no tempo desde última revisão + carga cognitiva disponível (considere estado Psique)

Calcule priority_score como: (relevancia*3 + incidencia*2 + (10-acuracia)*2 + (10-desempenho)*1 + lacuna*2) / 10

Recomende horas semanais proporcionais à prioridade com base em ${profile?.daily_hours || 2}h/dia × ${(profile?.study_days || []).length || 5} dias.

IMPORTANTE: Se o estado Psique indicar estresse elevado ou baixa energia, reduza levemente as horas recomendadas e priorize disciplinas de maior impacto (alta relevância + alta incidência) para maximizar ganho com menor desgaste.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Dados das disciplinas do aluno:\n${JSON.stringify(subjectSummaries, null, 2)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_study_plan",
            description: "Create a prioritized study plan with 5 vectors per subject",
            parameters: {
              type: "object",
              properties: {
                plan: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      subject_id: { type: "string" },
                      relevance: { type: "number" },
                      incidence: { type: "number" },
                      accuracy: { type: "number" },
                      performance: { type: "number" },
                      gap_score: { type: "number" },
                      priority_score: { type: "number" },
                      recommended_hours_weekly: { type: "number" },
                    },
                    required: ["subject_id", "relevance", "incidence", "accuracy", "performance", "gap_score", "priority_score", "recommended_hours_weekly"],
                  },
                },
              },
              required: ["plan"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_study_plan" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const planData = JSON.parse(toolCall.function.arguments);
    const plan = planData.plan;

    await supabase.from("study_plan").delete().eq("user_id", user.id);

    const rows = plan.map((p: any) => ({
      user_id: user.id,
      subject_id: p.subject_id,
      priority_score: p.priority_score,
      relevance: p.relevance,
      incidence: p.incidence,
      accuracy: p.accuracy,
      performance: p.performance,
      gap_score: p.gap_score,
      recommended_hours_weekly: p.recommended_hours_weekly,
    }));

    const { error: insertError } = await supabase.from("study_plan").insert(rows);
    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, plan: rows }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-study-plan error:", e);
    return new Response(JSON.stringify({ error: "Erro interno ao gerar plano de estudos. Tente novamente." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
