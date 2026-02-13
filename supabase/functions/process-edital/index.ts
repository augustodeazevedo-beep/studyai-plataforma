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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { editalText } = await req.json();
    if (!editalText || editalText.trim().length < 20) {
      return new Response(JSON.stringify({ error: "Texto do edital muito curto" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um especialista em concursos públicos brasileiros. Extraia do edital as disciplinas e seus tópicos de forma estruturada. Cada disciplina deve ter um nome claro e uma lista de tópicos específicos." },
          { role: "user", content: `Extraia disciplinas e tópicos do seguinte edital:\n\n${editalText.substring(0, 8000)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_subjects",
            description: "Extract subjects and topics from exam content",
            parameters: {
              type: "object",
              properties: {
                subjects: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      relevance: { type: "number", description: "1-5" },
                      incidence: { type: "number", description: "1-5" },
                      topics: { type: "array", items: { type: "string" } },
                    },
                    required: ["name", "topics"],
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
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const parsed = JSON.parse(toolCall.function.arguments);
    const subjects = parsed.subjects;

    // Insert subjects and topics
    for (const s of subjects) {
      const { data: subjectData, error: subjectError } = await supabase
        .from("user_subjects")
        .insert({ user_id: user.id, name: s.name, weight: s.relevance || 3, knowledge_level: 1 })
        .select("id")
        .single();

      if (subjectError) { console.error("Subject insert error:", subjectError); continue; }

      if (s.topics && s.topics.length > 0) {
        const topicRows = s.topics.map((t: string, i: number) => ({
          user_id: user.id, subject_id: subjectData.id, name: t, order_index: i,
        }));
        await supabase.from("topics").insert(topicRows);
      }
    }

    return new Response(JSON.stringify({ success: true, subjects }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-edital error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
