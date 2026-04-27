import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { STUDY_AI_BASE_PROMPT, buildPsycheContext } from "../_shared/study-ai-base-prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOOL_PROMPTS: Record<string, string> = {
  flashcards: `FORMATO: Flashcards de Revisão SRS
Crie entre 5 e 10 flashcards sobre o tema solicitado. Cada flashcard deve ter frente (pergunta objetiva) e verso (resposta concisa e precisa).
- Foque em conceitos de alta relevância e incidência para o edital do aluno.
- Adapte a complexidade ao nível de compreensão do aluno naquele tópico.
- Se o estado Psique indicar baixa energia, crie flashcards mais curtos e diretos.
- Ordene do mais fundamental ao mais avançado (respeitando pré-requisitos).`,

  mindmap: `FORMATO: Mapa Mental Estruturado
Crie um mapa mental hierárquico sobre o tema solicitado usando markdown com indentação.
- Tópico central → ramificações principais → sub-ramificações → detalhes-chave.
- Destaque conexões entre conceitos e pré-requisitos.
- Priorize os pontos de maior incidência e relevância no edital.
- Inclua macetes e âncoras de memória quando pertinente.
- Adapte a profundidade ao nível de compreensão do aluno.`,

  quiz: `FORMATO: Simulado Estilo Prova de Concurso
Crie 5 questões de múltipla escolha (A-E) no estilo da banca do aluno.
- Cada questão deve ter: enunciado claro, 5 alternativas, gabarito e explicação detalhada.
- Indique a dificuldade (fácil/médio/difícil) e a relevância do tema no edital.
- Distribua as dificuldades: 1 fácil, 2 médias, 2 difíceis (ajuste se Psique estiver baixo: 2 fáceis, 2 médias, 1 difícil).
- Nas explicações, relacione com conceitos-chave e indique tópicos para revisão.`,

  summary: `FORMATO: Resumo Estruturado para Concurso
Crie um resumo completo e otimizado sobre o tema solicitado.
- Estruture com: conceitos-chave, distinções importantes, jurisprudência relevante (se aplicável), macetes e dicas de prova.
- Use markdown com títulos, listas e destaques para facilitar a revisão.
- Priorize os aspectos de maior incidência e relevância.
- Adapte a extensão ao nível de compreensão do aluno (mais detalhado se iniciante, mais focado se avançado).
- Inclua ao final um "checkpoint de compreensão" com 2-3 perguntas rápidas.`,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { tool, topic, subjectName } = await req.json();
    if (!tool || !topic) throw new Error("Tool and topic required");

    const toolPrompt = TOOL_PROMPTS[tool];
    if (!toolPrompt) throw new Error("Invalid tool: " + tool);

    const [profileRes, subjectsRes, psycheRes, checkinsRes, planRes] = await Promise.all([
      supabase.from("profiles").select("target_exam, target_position, banca, daily_hours, exam_date").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_subjects").select("name, knowledge_level, weight").eq("user_id", user.id),
      supabase.from("psyche_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("psyche_checkins").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
      supabase.from("study_plan").select("subject_id, relevance, incidence, accuracy, performance").eq("user_id", user.id),
    ]);

    const profile = profileRes.data;
    const subjects = (subjectsRes.data || []).map((s: any) => `${s.name} (nível ${s.knowledge_level}/5, peso ${s.weight})`).join("; ");
    const psycheContext = buildPsycheContext(psycheRes.data, checkinsRes.data || []);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `${STUDY_AI_BASE_PROMPT}

FUNÇÃO ATUAL: Professor.IA — Geração de Material Didático
Você está gerando material de estudo personalizado para o aluno.

CONTEXTO DO ALUNO:
- Concurso: "${profile?.target_exam || "não definido"}", Cargo: "${profile?.target_position || "não definido"}", Banca: "${profile?.banca || "não definida"}"
- Data da prova: ${profile?.exam_date || "não definida"}
- Disciplinas: ${subjects || "não definidas"}

${psycheContext}

${toolPrompt}

Responda sempre em português. Seja preciso, didático e adapte ao estado atual do aluno.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${subjectName ? `Disciplina: ${subjectName}. ` : ""}Tema: ${topic}` },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("professor-tools error:", e);
    return new Response(JSON.stringify({ error: "Erro interno ao gerar material. Tente novamente." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
