import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { STUDY_AI_BASE_PROMPT, buildPsycheContext } from "../_shared/study-ai-base-prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_SUBJECT_IDS = 50;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_MODES = new Set(["predict_date", "calculate_rhythm"]);
const SCORE_FIELDS = ["weight", "incidence", "knowledge_level", "relevance_score", "incidence_score", "comprehension_score"];

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function badRequest(correlationId: string, details: Record<string, unknown>) {
  return jsonResponse({ error: "Dados inválidos para gerar previsão.", correlationId, details }, 400);
}

function validateRequestBody(body: unknown, correlationId: string) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false as const, response: badRequest(correlationId, { body: "Request body must be an object" }) };
  }

  const value = body as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const mode = typeof value.mode === "string" ? value.mode : "";
  const dailyMinutes = value.dailyMinutes;
  const startDate = typeof value.startDate === "string" ? value.startDate : "";
  const subjectIds = value.subjectIds;

  if (!ALLOWED_MODES.has(mode)) errors.mode = "Use predict_date or calculate_rhythm";
  if (typeof dailyMinutes !== "number" || !Number.isFinite(dailyMinutes) || !Number.isInteger(dailyMinutes) || dailyMinutes < 15 || dailyMinutes > 1_440) {
    errors.dailyMinutes = "Must be an integer between 15 and 1440";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || Number.isNaN(Date.parse(`${startDate}T00:00:00.000Z`))) {
    errors.startDate = "Must be a valid date in YYYY-MM-DD format";
  }
  if (!Array.isArray(subjectIds) || subjectIds.length === 0 || subjectIds.length > MAX_SUBJECT_IDS) {
    errors.subjectIds = `Must include 1 to ${MAX_SUBJECT_IDS} subject ids`;
  } else if (!subjectIds.every((id) => typeof id === "string" && UUID_REGEX.test(id))) {
    errors.subjectIds = "All subject ids must be valid UUIDs";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false as const, response: badRequest(correlationId, errors) };
  }

  return { ok: true as const, data: { mode, dailyMinutes, startDate, subjectIds: subjectIds as string[] } };
}

function sanitizeScore(value: unknown, fallback = 3) {
  const score = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(score)) return { value: fallback, changed: true };
  const clamped = Math.min(5, Math.max(1, score));
  return { value: Number(clamped.toFixed(1)), changed: clamped !== score };
}

function sanitizeRows<T extends Record<string, unknown>>(rows: T[], correlationId: string, source: string) {
  const discrepancies: Array<Record<string, unknown>> = [];
  const sanitized = rows.map((row) => {
    const next = { ...row };
    for (const field of SCORE_FIELDS) {
      if (!(field in next)) continue;
      const result = sanitizeScore(next[field]);
      if (result.changed) discrepancies.push({ source, id: next.id, field, previous: next[field], next: result.value });
      next[field] = result.value;
    }
    return next;
  });
  if (discrepancies.length > 0) console.warn("predict-cycle score normalization", { correlationId, discrepancies });
  return { sanitized, discrepancies };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const correlationId = crypto.randomUUID();
  let userId: string | null = null;
  let logEvent: (level: string, stage: string, message: string, metadata?: Record<string, unknown>) => Promise<void> = async (level, stage, message, metadata = {}) => {
    console[level === "error" ? "error" : level === "warn" ? "warn" : "log"]("predict-cycle", { correlationId, stage, message, ...metadata });
  };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      console.error("predict-cycle configuration error: missing backend URL or publishable key");
      return jsonResponse({ error: "Configuração interna indisponível. Tente novamente em instantes." }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    logEvent = async (level, stage, message, metadata = {}) => {
      const safeMetadata = JSON.parse(JSON.stringify(metadata, (_key, value) => typeof value === "string" && value.length > 500 ? `${value.slice(0, 500)}…` : value));
      console[level === "error" ? "error" : level === "warn" ? "warn" : "log"]("predict-cycle", { correlationId, userId, level, stage, message, metadata: safeMetadata });
      if (!userId) return;
      const { error } = await supabase.from("predict_cycle_logs").insert({ user_id: userId, correlation_id: correlationId, level, stage, message, metadata: safeMetadata });
      if (error) console.warn("predict-cycle persistent log failed", { correlationId, stage, error: error.message });
    };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    userId = user.id;

    let rawBody: unknown;
    try { rawBody = await req.json(); } catch { await logEvent("warn", "request_parse", "Invalid JSON body"); return badRequest(correlationId, { body: "Invalid JSON" }); }
    const parsed = validateRequestBody(rawBody, correlationId);
    if (!parsed.ok) { await logEvent("warn", "request_validation", "Invalid predict-cycle request", { details: await parsed.response.clone().json() }); return parsed.response; }
    const { mode, dailyMinutes, startDate, subjectIds } = parsed.data;
    await logEvent("info", "request_validated", "Predict-cycle request validated", { mode, dailyMinutes, startDate, subjectCount: subjectIds.length });

    const [subjectsRes, topicsRes, planRes, psycheRes, checkinsRes, sessionsRes] = await Promise.all([
      supabase.from("user_subjects").select("*").eq("user_id", user.id).in("id", subjectIds),
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

    const systemPrompt = `${STUDY_AI_BASE_PROMPT}

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
    return new Response(JSON.stringify({ error: "Erro interno ao gerar previsão. Tente novamente." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
