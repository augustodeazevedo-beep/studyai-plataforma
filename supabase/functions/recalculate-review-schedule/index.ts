import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const bodySchema = z.object({
  trigger: z.enum(["study_session", "psyche_checkin", "manual", "scheduled"]).default("manual"),
  subjectId: z.string().uuid().optional().nullable(),
  topicId: z.string().uuid().optional().nullable(),
});

const toDate = (value?: string | null) => value ? new Date(value) : null;
const daysBetween = (from?: string | null, to = new Date()) => {
  const date = toDate(from);
  if (!date) return 999;
  return Math.max(0, Math.floor((to.getTime() - date.getTime()) / 86400000));
};
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const isoDatePlus = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const psycheScore = (profile: any, checkins: any[]) => {
  const latest = checkins?.[0] || {};
  const mood = Number(latest.mood ?? profile?.current_mood ?? 3);
  const stress = Number(latest.stress ?? profile?.stress_level ?? 3);
  const energy = Number(latest.energy ?? profile?.motivation_level ?? 3);
  const focus = Number(latest.focus ?? profile?.focus_capacity ?? 3);
  const sleep = Number(profile?.sleep_quality ?? 3);
  return Math.round(((mood + (6 - stress) + energy + focus + sleep) / 5) * 20);
};

const nextInterval = (comprehension: number, risk: number, psyche: number) => {
  if (risk >= 82 || comprehension <= 2) return 1;
  if (risk >= 68 || psyche < 45) return 3;
  if (risk >= 52 || comprehension <= 3) return 7;
  if (risk >= 35) return 15;
  return 30;
};

async function upsertSchedule(supabase: any, row: any) {
  let query = supabase.from("topic_review_schedules").select("id").eq("user_id", row.user_id);
  query = row.topic_id ? query.eq("topic_id", row.topic_id) : query.eq("subject_id", row.subject_id).is("topic_id", null);
  const { data: existing, error: lookupError } = await query.maybeSingle();
  if (lookupError) throw lookupError;
  if (existing?.id) {
    const { error } = await supabase.from("topic_review_schedules").update(row).eq("id", existing.id);
    if (error) throw error;
    return "updated";
  }
  const { error } = await supabase.from("topic_review_schedules").insert(row);
  if (error) throw error;
  return "inserted";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Sessão não autenticada." }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Sessão inválida." }, 401);

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Payload inválido", details: parsed.error.flatten().fieldErrors }, 400);

    const [subjectsRes, topicsRes, sessionsRes, reviewsRes, planRes, profileRes, checkinsRes] = await Promise.all([
      supabase.from("user_subjects").select("id, name, knowledge_level, weight, incidence").eq("user_id", user.id),
      supabase.from("topics").select("id, subject_id, name, completed").eq("user_id", user.id),
      supabase.from("study_sessions").select("id, subject_id, topic_id, started_at, duration_minutes, comprehension_rating").eq("user_id", user.id),
      supabase.from("spaced_reviews").select("id, subject_id, topic_id, review_date, completed, performance_rating, interval_days").eq("user_id", user.id),
      supabase.from("study_plan").select("subject_id, priority_score, relevance, incidence, gap_score, performance").eq("user_id", user.id),
      supabase.from("psyche_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("psyche_checkins").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    ]);

    for (const result of [subjectsRes, topicsRes, sessionsRes, reviewsRes, planRes, profileRes, checkinsRes]) if (result.error) throw result.error;

    const subjects = subjectsRes.data || [];
    const topics = topicsRes.data || [];
    const sessions = sessionsRes.data || [];
    const reviews = reviewsRes.data || [];
    const plan = planRes.data || [];
    const psique = psycheScore(profileRes.data, checkinsRes.data || []);
    const targets = topics.length > 0
      ? topics.map((topic: any) => ({ subject: subjects.find((s: any) => s.id === topic.subject_id), topic }))
      : subjects.map((subject: any) => ({ subject, topic: null }));

    let inserted = 0;
    let updated = 0;
    const suggestions = [];

    for (const target of targets) {
      if (!target.subject) continue;
      if (parsed.data.subjectId && target.subject.id !== parsed.data.subjectId) continue;
      if (parsed.data.topicId && target.topic?.id !== parsed.data.topicId) continue;

      const relevantSessions = sessions.filter((s: any) => target.topic ? s.topic_id === target.topic.id : s.subject_id === target.subject.id);
      const relevantReviews = reviews.filter((r: any) => target.topic ? r.topic_id === target.topic.id : r.subject_id === target.subject.id);
      const planRow: any = plan.find((p: any) => p.subject_id === target.subject.id) || {};
      const lastSession = relevantSessions.map((s: any) => s.started_at).sort().at(-1) || null;
      const lastReview = relevantReviews.filter((r: any) => r.completed).map((r: any) => r.review_date).sort().at(-1) || null;
      const lastTouch = [lastSession, lastReview].filter(Boolean).sort().at(-1) || null;
      const daysSince = daysBetween(lastTouch);
      const comprehension = relevantSessions.length
        ? relevantSessions.reduce((sum: number, s: any) => sum + Number(s.comprehension_rating || 3), 0) / relevantSessions.length
        : Number(target.subject.knowledge_level || 3);
      const totalMinutes14d = relevantSessions.filter((s: any) => daysBetween(s.started_at) <= 14).reduce((sum: number, s: any) => sum + Number(s.duration_minutes || 0), 0);
      const intensity = clamp(Math.round((totalMinutes14d / 180) * 100), 0, 100);
      const priority = Number(planRow.priority_score || ((Number(target.subject.weight || 3) + Number(target.subject.incidence || 3)) / 2));
      const memoryPressure = clamp((daysSince / 30) * 55, 0, 55);
      const comprehensionPressure = clamp((5 - comprehension) * 12, 0, 48);
      const lowIntensityPressure = clamp(35 - intensity * 0.35, 0, 35);
      const priorityPressure = clamp(priority * 4, 0, 25);
      const psychePressure = psique < 55 ? 12 : psique > 75 ? -5 : 0;
      const risk = Math.round(clamp(memoryPressure + comprehensionPressure + lowIntensityPressure + priorityPressure + psychePressure, 0, 100));
      const interval = nextInterval(comprehension, risk, psique);
      const row = {
        user_id: user.id,
        subject_id: target.subject.id,
        topic_id: target.topic?.id || null,
        forgetting_risk: risk,
        comprehension_score: Math.round(comprehension * 20),
        intensity_score: intensity,
        psyche_score: psique,
        interval_days: interval,
        last_studied_at: lastSession,
        last_reviewed_at: lastReview,
        next_review_at: isoDatePlus(interval),
        status: risk >= 70 ? "urgent" : risk >= 45 ? "pending" : "maintenance",
        recommendation: risk >= 70 ? "Revisar em ciclo curto com recuperação ativa." : risk >= 45 ? "Agendar revisão preventiva antes da queda da memória." : "Manter revisão espaçada de manutenção.",
      };
      const result = await upsertSchedule(supabase, row);
      if (result === "inserted") inserted += 1; else updated += 1;
      suggestions.push({ subject: target.subject.name, topic: target.topic?.name || null, ...row });

      const dueSoon = risk >= 65;
      if (dueSoon) {
        const reviewDate = isoDatePlus(interval);
        const { data: existingReview } = await supabase.from("spaced_reviews").select("id").eq("user_id", user.id).eq("subject_id", target.subject.id).eq("review_date", reviewDate).maybeSingle();
        if (!existingReview) {
          await supabase.from("spaced_reviews").insert({ user_id: user.id, subject_id: target.subject.id, topic_id: target.topic?.id || null, review_date: reviewDate, interval_days: interval, completed: false, performance_rating: 0 });
        }
      }
    }

    await supabase.from("planner_audit_logs").insert({
      user_id: user.id,
      subject_id: parsed.data.subjectId || null,
      event_type: "review_schedule_recalculated",
      event_source: parsed.data.trigger,
      explanation: "Agenda de revisão recalculada pela curva do esquecimento, risco de lacuna, compreensão, intensidade e Psique.",
      after_state: { inserted, updated, suggestions: suggestions.slice(0, 20) },
      metadata: { trigger: parsed.data.trigger, topicId: parsed.data.topicId || null },
    });

    return json({ success: true, inserted, updated, suggestions });
  } catch (error) {
    console.error("recalculate-review-schedule error:", error);
    return json({ error: error instanceof Error ? error.message : "Erro ao recalcular revisões" }, 500);
  }
});
