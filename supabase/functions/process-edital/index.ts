import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const parseScoreNumber = (value: unknown) => {
  if (typeof value === "string") return Number(value.trim().replace(",", "."));
  return Number(value);
};

const clampScore = (value: unknown, fallback = 3) => {
  const numeric = parseScoreNumber(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(5, Math.max(1, Math.round(numeric)));
};

const scoreSchema = z.preprocess(
  (value) => clampScore(value),
  z.number().int().min(1).max(5),
);

const cleanText = (value: unknown, maxLength = 15000) =>
  String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);

const normalizeName = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

const requestSchema = z.object({
  editalText: z.string().trim().min(20, "editalText deve conter texto válido").max(15000),
  targetExam: z.string().trim().max(180).nullish(),
  targetPosition: z.string().trim().max(180).nullish(),
  banca: z.string().trim().max(120).nullish(),
  submissionId: z.string().uuid().optional(),
  forceReprocess: z.boolean().optional().default(false),
});

const sourceSchema = z.object({
  title: z.string().trim().max(180).optional().default("Fonte pública"),
  url: z.string().trim().max(600).optional().default(""),
  note: z.string().trim().max(280).optional().default(""),
});

const extractedSubjectsSchema = z.object({
  subjects: z.array(z.object({
    name: z.string().trim().min(1).max(180),
    relevance: scoreSchema,
    incidence: scoreSchema,
    relevanceReason: z.string().trim().max(360).optional().default(""),
    incidenceReason: z.string().trim().max(360).optional().default(""),
    sources: z.array(sourceSchema).optional().default([]),
    topics: z.array(z.union([
      z.string().trim().min(1).max(240),
      z.object({ name: z.string().trim().min(1).max(240) }),
    ])).default([]),
  })).min(1),
});

type DetailItem = {
  name: string;
  subject?: string;
  reason: string;
  previous?: Record<string, number | string | null>;
  next?: Record<string, number | string | null>;
  sources?: Array<{ title?: string; url?: string; note?: string }>;
};

type ProcessingSummary = {
  counts: {
    insertedSubjects: number;
    skippedSubjects: number;
    updatedSubjects: number;
    insertedTopics: number;
    skippedTopics: number;
    insertedPlans: number;
    skippedPlans: number;
    updatedPlans: number;
  };
  subjects: { inserted: DetailItem[]; skipped: DetailItem[]; updated: DetailItem[] };
  topics: { inserted: DetailItem[]; skipped: DetailItem[] };
  plans: { inserted: DetailItem[]; skipped: DetailItem[]; updated: DetailItem[] };
  research: { status: "consulted" | "not_configured" | "failed"; summary: string; citations: string[]; queryHints: string[] };
};

const createSummary = (): ProcessingSummary => ({
  counts: {
    insertedSubjects: 0,
    skippedSubjects: 0,
    updatedSubjects: 0,
    insertedTopics: 0,
    skippedTopics: 0,
    insertedPlans: 0,
    skippedPlans: 0,
    updatedPlans: 0,
  },
  subjects: { inserted: [], skipped: [], updated: [] },
  topics: { inserted: [], skipped: [] },
  plans: { inserted: [], skipped: [], updated: [] },
  research: { status: "not_configured", summary: "", citations: [], queryHints: [] },
});

const pushDetail = (summary: ProcessingSummary, path: "subjects.inserted" | "subjects.skipped" | "subjects.updated" | "topics.inserted" | "topics.skipped" | "plans.inserted" | "plans.skipped" | "plans.updated", item: DetailItem) => {
  const [group, bucket] = path.split(".") as ["subjects" | "topics" | "plans", string];
  (summary[group] as any)[bucket].push(item);
};

const buildPriority = (relevance: number, incidence: number) => Number(((relevance + incidence) / 2).toFixed(2));

const buildResearchQueries = (targetExam?: string | null, targetPosition?: string | null, banca?: string | null) => {
  const exam = cleanText(targetExam, 120) || "concurso público";
  const position = cleanText(targetPosition, 120) || "cargo semelhante";
  const board = cleanText(banca, 80) || "banca organizadora";
  return [
    `site da banca ${board} provas anteriores ${position} ${exam}`,
    `${board} edital anterior conteúdo programático ${position} ${exam}`,
    `${board} provas gabaritos ${position} disciplinas mais cobradas`,
  ];
};

const getPublicResearchContext = async (targetExam?: string | null, targetPosition?: string | null, banca?: string | null) => {
  const queryHints = buildResearchQueries(targetExam, targetPosition, banca);
  const apiKey = Deno.env.get("PERPLEXITY_API_KEY");
  if (!apiKey) {
    return {
      status: "not_configured" as const,
      summary: `Consulta pública externa não configurada no backend. Use as seguintes buscas para auditoria humana: ${queryHints.join(" | ")}`,
      citations: [] as string[],
      queryHints,
    };
  }

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "sonar",
        temperature: 0.1,
        max_tokens: 1800,
        messages: [
          { role: "system", content: "Você pesquisa concursos públicos brasileiros em fontes abertas e resume evidências objetivas, priorizando páginas oficiais de bancas, provas, gabaritos e editais anteriores." },
          { role: "user", content: `Pesquise evidências públicas para estimar relevância e incidência de disciplinas. Concurso: ${targetExam || "não informado"}. Cargo: ${targetPosition || "não informado"}. Banca: ${banca || "não informada"}. Priorize: ${queryHints.join("; ")}. Responda em português com achados curtos e fontes.` },
        ],
      }),
    });

    if (!response.ok) throw new Error(`research status ${response.status}`);
    const data = await response.json();
    return {
      status: "consulted" as const,
      summary: cleanText(data.choices?.[0]?.message?.content || "Consulta pública realizada sem resumo estruturado.", 3500),
      citations: Array.isArray(data.citations) ? data.citations.slice(0, 12).map((url: unknown) => String(url)) : [],
      queryHints,
    };
  } catch (error) {
    console.error("public research failed:", error);
    return {
      status: "failed" as const,
      summary: "A consulta pública externa falhou; o processamento seguirá com o edital e os critérios técnicos declarados.",
      citations: [] as string[],
      queryHints,
    };
  }
};

const parseTopics = (topics: Array<string | { name: string }>) => {
  const seen = new Set<string>();
  return topics.map((topic) => cleanText(typeof topic === "string" ? topic : topic.name, 240)).filter((topic) => {
    if (!topic) return false;
    const key = normalizeName(topic);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const logScoreNormalization = (submissionId: string, userId: string, subjectName: unknown, field: "relevance" | "incidence", original: unknown, normalized: number) => {
  const numeric = parseScoreNumber(original);
  const discrepant = !Number.isFinite(numeric) || numeric < 1 || numeric > 5 || Math.round(numeric) !== numeric || typeof original === "string";
  if (!discrepant) return;

  console.warn("process-edital-score-normalization", JSON.stringify({
    submissionId,
    userId,
    subject: cleanText(subjectName, 120) || "sem nome",
    field,
    originalType: typeof original,
    originalValue: typeof original === "string" || typeof original === "number" ? original : "non_numeric",
    normalized,
    reason: !Number.isFinite(numeric) ? "default_safe_score" : numeric < 1 || numeric > 5 ? "out_of_range_clamped" : typeof original === "string" ? "numeric_string_converted" : "rounded_to_integer",
  }));
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Sessão não autenticada." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      console.error("process-edital configuration error: missing backend URL or publishable key");
      return jsonResponse({ error: "Configuração temporariamente indisponível para processar edital. Tente novamente em alguns minutos." }, 503);
    }
    const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: authHeader } } });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return jsonResponse({ error: "Sessão inválida." }, 401);

    const requestBody = requestSchema.safeParse(await req.json());
    if (!requestBody.success) {
      return jsonResponse({ error: "Payload inválido para processar edital", details: requestBody.error.flatten().fieldErrors }, 400);
    }

    const { editalText, targetExam, targetPosition, banca, forceReprocess } = requestBody.data;
    const edital = cleanText(editalText);
    const research = await getPublicResearchContext(targetExam, targetPosition, banca);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é especialista em concursos públicos brasileiros e no algoritmo G-Force da Study.AI.
Extraia disciplinas e tópicos do edital, sugerindo apenas os vetores Relevância e Incidência.
Relevância = peso/importância da matéria no edital atual, sempre em escala inteira de 1 a 5.
Incidência = recorrência histórica em provas anteriores ou semelhantes do mesmo cargo/banca, sempre em escala inteira de 1 a 5.
Nunca retorne valores menores que 1 ou maiores que 5 para Relevância ou Incidência.
Não estime Compreensão, Psique ou Intensidade: esses vetores vêm de registros do usuário no Arsenal, Planner e Bem Estar.
Use o contexto de pesquisa pública quando disponível; se as fontes forem insuficientes, informe justificativa conservadora.
Retorne fontes públicas resumidas quando houver URLs/citações no contexto.`;

    const userContent = `Concurso: ${targetExam || "não informado"}. Cargo: ${targetPosition || "não informado"}. Banca: ${banca || "não informada"}.

Contexto de consulta pública:
Status: ${research.status}
Resumo: ${research.summary}
Citações: ${research.citations.join("\n") || "sem URLs disponíveis"}
Buscas sugeridas: ${research.queryHints.join(" | ")}

Edital:
${edital}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_subjects",
            description: "Extrai disciplinas, tópicos, relevância, incidência, justificativas e fontes públicas do edital.",
            parameters: {
              type: "object",
              properties: {
                subjects: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      relevance: { type: "number", minimum: 1, maximum: 5 },
                      incidence: { type: "number", minimum: 1, maximum: 5 },
                      relevanceReason: { type: "string" },
                      incidenceReason: { type: "string" },
                      sources: { type: "array", items: { type: "object", properties: { title: { type: "string" }, url: { type: "string" }, note: { type: "string" } } } },
                      topics: { type: "array", items: { type: "string" } },
                    },
                    required: ["name", "relevance", "incidence", "topics"],
                  },
                },
              },
              required: ["subjects"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_subjects" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return jsonResponse({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }, 429);
      if (response.status === 402) return jsonResponse({ error: "Créditos insuficientes para análise com IA." }, 402);
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("A IA não retornou dados estruturados.");

    const parsed = extractedSubjectsSchema.safeParse(JSON.parse(toolCall.function.arguments));
    if (!parsed.success) {
      return jsonResponse({ error: "A IA retornou disciplinas em formato inválido", details: parsed.error.flatten().fieldErrors }, 422);
    }

    const { data: existingSubjectsData, error: existingSubjectsError } = await supabase
      .from("user_subjects")
      .select("id, name, weight, incidence, knowledge_level")
      .eq("user_id", user.id);
    if (existingSubjectsError) throw existingSubjectsError;

    const existingSubjects = new Map((existingSubjectsData || []).map((subject: any) => [normalizeName(subject.name), subject]));
    const summary = createSummary();
    summary.research = research;
    const processedSubjects = [];

    for (const extracted of parsed.data.subjects) {
      const name = cleanText(extracted.name, 180);
      if (!name) continue;

      const relevance = clampScore(extracted.relevance);
      const incidence = clampScore(extracted.incidence);
      const subjectKey = normalizeName(name);
      let subjectData = existingSubjects.get(subjectKey) as any;
      const sources = extracted.sources?.length ? extracted.sources : research.citations.slice(0, 3).map((url: string) => ({ title: "Fonte pública consultada", url, note: "Referência usada para estimar incidência/relevância" }));

      if (subjectData && forceReprocess) {
        const previous = { relevance: Number(subjectData.weight ?? 0), incidence: Number(subjectData.incidence ?? 0) };
        const { data: updatedSubject, error: updateSubjectError } = await supabase
          .from("user_subjects")
          .update({ weight: relevance, incidence })
          .eq("id", subjectData.id)
          .select("id, name, weight, incidence, knowledge_level")
          .single();
        if (updateSubjectError) throw updateSubjectError;
        subjectData = updatedSubject;
        existingSubjects.set(subjectKey, subjectData);
        summary.counts.updatedSubjects += 1;
        pushDetail(summary, "subjects.updated", { name, reason: "Reprocessamento ativado: relevância/incidência recalculadas.", previous, next: { relevance, incidence }, sources });
      } else if (subjectData) {
        summary.counts.skippedSubjects += 1;
        pushDetail(summary, "subjects.skipped", { name, reason: "Disciplina equivalente já existia no Arsenal.", next: { relevance: Number(subjectData.weight ?? 0), incidence: Number(subjectData.incidence ?? 0) }, sources });
      } else {
        const insertPayload = { user_id: user.id, name, weight: relevance, incidence, knowledge_level: 1 };
        const { data: insertedSubject, error: subjectError } = await supabase
          .from("user_subjects")
          .insert(insertPayload)
          .select("id, name, weight, incidence, knowledge_level")
          .single();

        if (subjectError) {
          if ((subjectError as any).code !== "23505") throw subjectError;
          const { data: racedSubject, error: racedSubjectError } = await supabase
            .from("user_subjects")
            .select("id, name, weight, incidence, knowledge_level")
            .eq("user_id", user.id);
          if (racedSubjectError) throw racedSubjectError;
          subjectData = (racedSubject || []).find((subject: any) => normalizeName(subject.name) === subjectKey);
          if (!subjectData) throw subjectError;
          summary.counts.skippedSubjects += 1;
          pushDetail(summary, "subjects.skipped", { name, reason: "Disciplina equivalente foi criada em processamento simultâneo.", next: { relevance: Number(subjectData.weight ?? 0), incidence: Number(subjectData.incidence ?? 0) }, sources });
        } else {
          subjectData = insertedSubject;
          summary.counts.insertedSubjects += 1;
          pushDetail(summary, "subjects.inserted", { name, reason: "Nova disciplina identificada no edital.", next: { relevance, incidence }, sources });
        }
        existingSubjects.set(subjectKey, subjectData);
      }

      processedSubjects.push({ ...extracted, id: subjectData.id, name, relevance, incidence, sources });
      for (const source of sources.filter((source: any) => source.url).slice(0, 3)) {
        await supabase.from("public_source_audits").insert({ user_id: user.id, subject_id: subjectData.id, source_url: source.url, source_title: source.title || "Fonte pública", source_note: source.note || "Referência pública usada para Relevância/Incidência", origin: "process-edital", copyright_assessment: "Fonte pública usada como referência de incidência/relevância; sem reprodução integral de conteúdo protegido.", storage_notes: "Armazenados apenas metadados, disciplina, pontuação e referência da fonte." });
      }

      const { data: existingTopicsData, error: existingTopicsError } = await supabase
        .from("topics")
        .select("id, name, order_index")
        .eq("user_id", user.id)
        .eq("subject_id", subjectData.id);
      if (existingTopicsError) throw existingTopicsError;

      const existingTopicNames = new Set((existingTopicsData || []).map((topic: any) => normalizeName(topic.name)));
      let nextOrderIndex = Math.max(-1, ...(existingTopicsData || []).map((topic: any) => Number(topic.order_index) || 0)) + 1;
      for (const topicName of parseTopics(extracted.topics)) {
        const topicKey = normalizeName(topicName);
        if (existingTopicNames.has(topicKey)) {
          summary.counts.skippedTopics += 1;
          pushDetail(summary, "topics.skipped", { name: topicName, subject: name, reason: "Tópico equivalente já existia nesta disciplina." });
          continue;
        }

        const { data: insertedTopic, error: topicError } = await supabase.from("topics").insert({ user_id: user.id, subject_id: subjectData.id, name: topicName, order_index: nextOrderIndex }).select("id").single();
        if (topicError) {
          if ((topicError as any).code !== "23505") throw topicError;
          summary.counts.skippedTopics += 1;
          pushDetail(summary, "topics.skipped", { name: topicName, subject: name, reason: "Tópico equivalente foi criado em processamento simultâneo." });
        } else {
          existingTopicNames.add(topicKey);
          nextOrderIndex += 1;
          summary.counts.insertedTopics += 1;
          pushDetail(summary, "topics.inserted", { name: topicName, subject: name, reason: "Novo tópico identificado no edital." });
          for (const source of sources.filter((source: any) => source.url).slice(0, 3)) {
            await supabase.from("public_source_audits").insert({ user_id: user.id, subject_id: subjectData.id, topic_id: insertedTopic?.id || null, source_url: source.url, source_title: source.title || "Fonte pública", source_note: source.note || "Referência pública usada para Relevância/Incidência", origin: "process-edital", copyright_assessment: "Fonte pública usada como referência de incidência/relevância; sem reprodução integral de conteúdo protegido.", storage_notes: "Armazenados apenas metadados, tema, pontuação e referência da fonte." });
          }
        }
      }

      const priorityScore = buildPriority(relevance, incidence);
      const planPayload = {
        relevance,
        incidence,
        priority_score: priorityScore,
        recommended_hours_weekly: Math.ceil(priorityScore),
        gap_score: 5,
      };
      const { data: existingPlan, error: existingPlanError } = await supabase
        .from("study_plan")
        .select("id, relevance, incidence, priority_score, recommended_hours_weekly")
        .eq("user_id", user.id)
        .eq("subject_id", subjectData.id)
        .maybeSingle();
      if (existingPlanError) throw existingPlanError;

      if (existingPlan && forceReprocess) {
        const previous = {
          relevance: Number(existingPlan.relevance ?? 0),
          incidence: Number(existingPlan.incidence ?? 0),
          priority: Number(existingPlan.priority_score ?? 0),
        };
        const { error: updatePlanError } = await supabase
          .from("study_plan")
          .update(planPayload)
          .eq("id", existingPlan.id);
        if (updatePlanError) throw updatePlanError;
        summary.counts.updatedPlans += 1;
        pushDetail(summary, "plans.updated", { name, reason: "Plano recalculado com os novos vetores Relevância/Incidência.", previous, next: { relevance, incidence, priority: priorityScore } });
      } else if (existingPlan) {
        summary.counts.skippedPlans += 1;
        pushDetail(summary, "plans.skipped", { name, reason: "Plano já existia para esta disciplina.", next: { relevance: Number(existingPlan.relevance ?? 0), incidence: Number(existingPlan.incidence ?? 0), priority: Number(existingPlan.priority_score ?? 0) } });
      } else {
        const { error: planError } = await supabase.from("study_plan").insert({
          user_id: user.id,
          subject_id: subjectData.id,
          ...planPayload,
          accuracy: 0,
          performance: 0,
        });
        if (planError) {
          if ((planError as any).code !== "23505") throw planError;
          summary.counts.skippedPlans += 1;
          pushDetail(summary, "plans.skipped", { name, reason: "Plano equivalente foi criado em processamento simultâneo." });
        } else {
          summary.counts.insertedPlans += 1;
          pushDetail(summary, "plans.inserted", { name, reason: "Plano inicial criado a partir do edital.", next: { relevance, incidence, priority: priorityScore } });
        }
      }
    }

    const insertedTotal = summary.counts.insertedSubjects + summary.counts.insertedTopics + summary.counts.insertedPlans;
    const updatedTotal = summary.counts.updatedSubjects + summary.counts.updatedPlans;
    const message = insertedTotal === 0 && updatedTotal === 0
      ? "Nenhum item novo foi inserido; este edital parece já ter sido processado."
      : forceReprocess
        ? "Edital reprocessado sem duplicar registros."
        : "Edital processado com deduplicação ativa.";

    return jsonResponse({ success: true, subjects: processedSubjects, summary, message });
  } catch (e) {
    console.error("process-edital error:", e);
    return jsonResponse({ error: "Erro interno ao processar edital. Tente novamente." }, 500);
  }
});
