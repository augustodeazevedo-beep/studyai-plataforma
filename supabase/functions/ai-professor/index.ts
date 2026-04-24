import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { STUDY_AI_BASE_PROMPT, buildPsycheContext } from "../_shared/study-ai-base-prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 4_000;
const ALLOWED_ROLES = new Set(["user", "assistant", "system"]);

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeMessages(messages: unknown[]) {
  return messages.slice(-MAX_MESSAGES).map((message) => {
    if (!message || typeof message !== "object") throw new Error("Invalid message format");
    const record = message as Record<string, unknown>;
    if (typeof record.content !== "string") throw new Error("Invalid message content");
    const role = typeof record.role === "string" && ALLOWED_ROLES.has(record.role) ? record.role : "user";
    return { role, content: record.content.slice(0, MAX_MESSAGE_CHARS) };
  });
}

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

    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return jsonResponse({ error: "Messages required" }, 400);
    }
    const safeMessages = normalizeMessages(messages);

    const [profileRes, subjectsRes, topicsRes, psycheRes, checkinsRes, planRes] = await Promise.all([
      supabase.from("profiles").select("target_exam, target_position, daily_hours, study_days, exam_date, banca").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_subjects").select("name, knowledge_level, weight").eq("user_id", user.id),
      supabase.from("topics").select("name, subject_id, completed").eq("user_id", user.id).limit(200),
      supabase.from("psyche_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("psyche_checkins").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("study_plan").select("*").eq("user_id", user.id),
    ]);

    const profile = profileRes.data;
    const subjects = (subjectsRes.data || []).map((s: any) => `${s.name} (nível ${s.knowledge_level}/5, peso ${s.weight})`).join("; ");
    const psycheContext = buildPsycheContext(psycheRes.data, checkinsRes.data || []);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `${STUDY_AI_BASE_PROMPT}

FUNÇÃO ATUAL: Professor.IA — Chat Pedagógico
Você está atuando como professor especialista em concursos públicos brasileiros.

CONTEXTO DO ALUNO:
- Concurso: "${profile?.target_exam || "não definido"}", Cargo: "${profile?.target_position || "não definido"}", Banca: "${profile?.banca || "não definida"}"
- Data da prova: ${profile?.exam_date || "não definida"}
- Dedicação: ${profile?.daily_hours || 2}h/dia, dias: ${(profile?.study_days || []).join(", ") || "não definidos"}
- Disciplinas: ${subjects || "não definidas"}

${psycheContext}

INSTRUÇÕES ESPECÍFICAS:
- Responda em português, seja didático, use exemplos práticos.
- Se a pergunta for sobre legislação, cite artigos relevantes.
- Adapte a profundidade e o ritmo da explicação ao estado Psique do aluno.
- Em dias de baixa energia/foco, prefira explicações mais curtas e diretas.
- Sempre que pertinente, relacione o conteúdo com a relevância e incidência no edital.
- Use linguagem empática e sem tom punitivo.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...safeMessages],
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
    console.error("ai-professor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
