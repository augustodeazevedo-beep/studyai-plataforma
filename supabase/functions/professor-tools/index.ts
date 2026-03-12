import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOOL_PROMPTS: Record<string, string> = {
  flashcards: `Crie flashcards de estudo sobre o tema solicitado. Gere entre 5 e 10 flashcards, cada um com frente (pergunta objetiva) e verso (resposta concisa e precisa). Foque em conceitos que caem em provas de concurso.`,
  mindmap: `Crie um mapa mental estruturado sobre o tema solicitado. Use formato hierárquico com tópico central, ramificações principais e sub-ramificações. Use markdown com indentação para representar a hierarquia. Inclua conexões entre conceitos quando relevante.`,
  quiz: `Crie um simulado com 5 questões de múltipla escolha (A-E) sobre o tema solicitado, no estilo de provas de concurso público brasileiro. Cada questão deve ter enunciado claro, 5 alternativas, gabarito e explicação detalhada da resposta correta. Indique a dificuldade (fácil/médio/difícil).`,
  summary: `Crie um resumo completo e estruturado sobre o tema solicitado, otimizado para estudo de concurso público. Inclua: conceitos-chave, distinções importantes, jurisprudência relevante (se aplicável), macetes e dicas de prova. Use markdown com títulos, listas e destaques.`,
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

    const { tool, topic, subjectName } = await req.json();
    if (!tool || !topic) throw new Error("Tool and topic required");

    const toolPrompt = TOOL_PROMPTS[tool];
    if (!toolPrompt) throw new Error("Invalid tool: " + tool);

    const [profileRes, subjectsRes] = await Promise.all([
      supabase.from("profiles").select("target_exam, target_position").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_subjects").select("name").eq("user_id", user.id),
    ]);

    const profile = profileRes.data;
    const subjects = (subjectsRes.data || []).map((s: any) => s.name).join(", ");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um professor especialista em concursos públicos brasileiros. O aluno estuda para "${profile?.target_exam || "concurso"}" cargo "${profile?.target_position || "geral"}". Disciplinas do aluno: ${subjects || "não definidas"}.

${toolPrompt}

Responda sempre em português. Seja preciso e didático.`;

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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
