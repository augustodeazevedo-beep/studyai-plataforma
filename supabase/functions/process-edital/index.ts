import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.25.76/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const clampScore = (value: unknown, fallback = 3) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(5, Math.max(1, Math.round(numeric)));
};

const cleanText = (value: unknown, maxLength = 15000) =>
  String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);

const normalizeName = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

const requestSchema = z.object({
  editalText: z.string().trim().min(20).max(15000),
  targetExam: z.string().trim().max(180).nullish(),
  targetPosition: z.string().trim().max(180).nullish(),
  banca: z.string().trim().max(120).nullish(),
});

const extractedSubjectsSchema = z.object({
  subjects: z.array(z.object({
    name: z.string().trim().min(1).max(180),
    relevance: z.coerce.number().min(1).max(5),
    incidence: z.coerce.number().min(1).max(5),
    topics: z.array(z.string().trim().min(1).max(240)).default([]),
  })).min(1),
});

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

    const requestBody = requestSchema.safeParse(await req.json());
    if (!requestBody.success) {
      return new Response(JSON.stringify({ error: "Payload inválido para processar edital", details: requestBody.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { editalText, targetExam, targetPosition, banca } = requestBody.data;
    const edital = cleanText(editalText);

    const userContent = `Analise o seguinte conteúdo programático de edital. Concurso: ${targetExam || "não informado"}. Cargo: ${targetPosition || "não informado"}. Banca: ${banca || "não informada"}.\n\n${edital}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um especialista em concursos públicos brasileiros com profundo conhecimento de bancas organizadoras (CESPE/CEBRASPE, FGV, FCC, VUNESP, etc.).

Sua tarefa é extrair do edital:
1. Todas as DISCIPLINAS do conteúdo programático
2. Os TÓPICOS de cada disciplina
3. O grau de RELEVÂNCIA (1-5) de cada disciplina para o cargo, baseado no peso provável na prova
4. O grau de INCIDÊNCIA (1-5) de cada disciplina, baseado na frequência com que aparece em provas anteriores de cargos iguais ou semelhantes, especialmente da mesma banca organizadora. Se a banca não tiver histórico para aquele cargo, considere provas de outras bancas para cargos semelhantes.

Critérios para INCIDÊNCIA:
- 5: Cai em praticamente todas as provas (>90% das provas)
- 4: Frequente (70-90%)
- 3: Regular (40-70%)
- 2: Eventual (20-40%)
- 1: Raro (<20%)

Critérios para RELEVÂNCIA:
- 5: Peso muito alto na prova (muitas questões ou peso multiplicador)
- 4: Peso alto
- 3: Peso médio
- 2: Peso baixo
- 1: Peso muito baixo ou caráter apenas eliminatório`;

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
            description: "Extract subjects, topics, relevance and incidence from exam syllabus",
            parameters: {
              type: "object",
              properties: {
                subjects: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Nome da disciplina" },
                      relevance: { type: "number", description: "Relevância 1-5 (peso na prova)" },
                      incidence: { type: "number", description: "Incidência 1-5 (frequência em provas passadas)" },
                      topics: { type: "array", items: { type: "string" }, description: "Lista de tópicos específicos" },
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
      if (response.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const parsed = extractedSubjectsSchema.safeParse(JSON.parse(toolCall.function.arguments));
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "A IA retornou disciplinas em formato inválido", details: parsed.error.flatten().fieldErrors }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subjects = parsed.data.subjects;

    const { data: existingSubjectsData, error: existingSubjectsError } = await supabase
      .from("user_subjects")
      .select("id, name")
      .eq("user_id", user.id);
    if (existingSubjectsError) throw existingSubjectsError;

    const existingSubjects = new Map((existingSubjectsData || []).map((subject: any) => [normalizeName(subject.name), subject]));
    const summary = { insertedSubjects: 0, skippedSubjects: 0, insertedTopics: 0, skippedTopics: 0, insertedPlans: 0, skippedPlans: 0 };

    // Insert subjects and topics
    const insertedSubjects = [];
    for (const s of subjects) {
      const name = cleanText(s.name, 180);
      if (!name) continue;
      const relevance = clampScore(s.relevance);
      const incidence = clampScore(s.incidence);
      const { data: subjectData, error: subjectError } = await supabase
        .from("user_subjects")
        .insert({
          user_id: user.id,
          name,
          weight: relevance,
          incidence,
          knowledge_level: 1,
        })
        .select("id")
        .single();

      if (subjectError) throw subjectError;

      insertedSubjects.push({ ...s, name, relevance, incidence, id: subjectData.id });

      const topics = Array.isArray(s.topics) ? s.topics.map((t: unknown) => cleanText(t, 240)).filter(Boolean) : [];
      if (topics.length > 0) {
        const topicRows = topics.map((t: string, i: number) => ({
          user_id: user.id, subject_id: subjectData.id, name: t, order_index: i,
        }));
        const { error: topicsError } = await supabase.from("topics").insert(topicRows);
        if (topicsError) throw topicsError;
      }

      // Also create study_plan entry with incidence data
      const { error: planError } = await supabase.from("study_plan").insert({
        user_id: user.id,
        subject_id: subjectData.id,
        relevance,
        incidence,
        accuracy: 0,
        performance: 0,
        gap_score: 5,
        priority_score: (relevance + incidence) / 2,
        recommended_hours_weekly: Math.ceil((relevance + incidence) / 2),
      });
      if (planError) throw planError;
    }

    if (insertedSubjects.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhuma disciplina válida foi gerada pela IA." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, subjects: insertedSubjects }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-edital error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
