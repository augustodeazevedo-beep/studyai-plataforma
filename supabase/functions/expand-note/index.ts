import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_NOTE_CONTENT_CHARS = 20_000;
const MAX_SUBJECT_NAME_CHARS = 120;

function getBackendConfig() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  return { url, key };
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

    const { noteContent, subjectName } = await req.json();
    if (typeof noteContent !== "string" || noteContent.trim().length === 0) {
      return jsonResponse({ error: "Note content required" }, 400);
    }
    if (noteContent.length > MAX_NOTE_CONTENT_CHARS) {
      return jsonResponse({ error: "Note content too large" }, 400);
    }
    if (subjectName !== undefined && (typeof subjectName !== "string" || subjectName.length > MAX_SUBJECT_NAME_CHARS)) {
      return jsonResponse({ error: "Invalid subject name" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um professor de concursos. Expanda a anotação do aluno com explicações detalhadas, exemplos práticos, macetes e dicas de prova. Mantenha o formato em markdown. Disciplina: " + (subjectName || "geral") },
          { role: "user", content: `Expanda esta anotação:\n\n${noteContent}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return jsonResponse({ error: "Limite de uso da IA atingido. Tente novamente em instantes." }, 429);
      if (response.status === 402) return jsonResponse({ error: "Créditos de IA insuficientes para expandir a anotação." }, 402);
      throw new Error(`AI error: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "Não foi possível expandir.";

    return jsonResponse({ success: true, content });
  } catch (e) {
    console.error("expand-note error:", e);
    return jsonResponse({ error: "Erro interno ao expandir anotação. Tente novamente." }, 500);
  }
});
