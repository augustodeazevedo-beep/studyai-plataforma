/**
 * Planner Adaptation Engine
 *
 * Conecta os 5 vetores G-Force ao calendário, às revisões SRS e ao estado
 * psíquico do usuário em tempo real, com trilha de auditoria por usuário.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  buildDisciplinesFromData,
  buildPsycheState,
  calculateDisciplinePriorities,
  priorityToPlanRow,
  type DisciplinePriority,
  type PsycheState,
} from "./adaptive-algorithm";

export type PsycheMode = "low" | "neutral" | "good";
export type QueueItemType = "review" | "questions" | "study" | "flashcards" | "planned";

export interface PlannerAuditInput {
  userId: string;
  eventType: string;
  eventSource: string;
  subjectId?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  explanation: string;
  metadata?: Record<string, unknown> | null;
}

export interface ForgettingRisk {
  subjectId: string;
  subjectName: string;
  riskScore: number;
  daysSinceTouch: number;
  daysUntilReview: number | null;
  comprehensionAvg: number;
  accuracyRate: number;
  reason: string;
}

export interface NowQueueItem {
  id: string;
  type: QueueItemType;
  subjectId: string | null;
  subjectName: string;
  title: string;
  durationMinutes: number;
  priority: number;
  reason: string;
  loadHint: string;
  blockId?: string | null;
}

export interface NextActionSuggestion {
  subjectId: string | null;
  subjectName: string;
  durationMinutes: number;
  priorityLevel: "critical" | "high" | "medium" | "low";
  reason: string;
  loadHint: string;
}

export interface DailyAdaptationResult {
  mode: PsycheMode;
  blocksAffected: number;
  message: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const dayDiff = (fromISO: string | null | undefined, to = new Date()) => {
  if (!fromISO) return 999;
  const from = new Date(fromISO);
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86400000));
};

export function classifyPsycheMode(state: PsycheState | null): PsycheMode {
  if (!state) return "neutral";
  const score = (state.mood + (6 - state.stress) + state.energy + state.focus) / 4;
  if (score <= 2.4) return "low";
  if (score >= 4) return "good";
  return "neutral";
}

export function adaptivePomodoroMinutes(state: PsycheState | null, attentionSpan = 25): number {
  const mode = classifyPsycheMode(state);
  if (mode === "low") return Math.max(10, Math.round(attentionSpan * 0.6));
  if (mode === "good") return Math.min(60, Math.round(attentionSpan * 1.4));
  return attentionSpan;
}

export async function logPlannerEvent(input: PlannerAuditInput) {
  const payload = {
    user_id: input.userId,
    event_type: input.eventType,
    event_source: input.eventSource,
    subject_id: input.subjectId || null,
    before_state: input.beforeState || null,
    after_state: input.afterState || null,
    explanation: input.explanation,
    metadata: input.metadata || null,
  };
  await (supabase as any).from("planner_audit_logs").insert(payload);
}

async function getPlanSnapshot(userId: string) {
  const { data } = await supabase
    .from("study_plan")
    .select("subject_id, priority_score, recommended_hours_weekly, gap_score, performance, accuracy")
    .eq("user_id", userId);
  return data || [];
}

export async function recalculateAndPersistPlan(
  userId: string,
  audit?: Partial<Omit<PlannerAuditInput, "userId" | "beforeState" | "afterState">>
): Promise<DisciplinePriority[]> {
  const before = await getPlanSnapshot(userId);
  const [subRes, sesRes, attRes, psyRes, checkRes, profRes] = await Promise.all([
    supabase.from("user_subjects").select("*").eq("user_id", userId),
    supabase.from("study_sessions").select("*").eq("user_id", userId),
    supabase.from("question_attempts").select("*, questions(subject_id)").eq("user_id", userId),
    supabase.from("psyche_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("psyche_checkins").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
    supabase.from("profiles").select("exam_date").eq("user_id", userId).maybeSingle(),
  ]);

  const subjects = subRes.data || [];
  if (subjects.length === 0) return [];

  const disciplines = buildDisciplinesFromData(subjects, sesRes.data || [], attRes.data || []);
  const psycheState = buildPsycheState(psyRes.data, checkRes.data || []);
  const priorities = calculateDisciplinePriorities(disciplines, psycheState, profRes.data?.exam_date || null);

  await supabase.from("study_plan").delete().eq("user_id", userId);
  const rows = priorities.map((p) => priorityToPlanRow(p, userId));
  if (rows.length > 0) await supabase.from("study_plan").insert(rows);

  const after = rows.map((row) => ({
    subject_id: row.subject_id,
    priority_score: row.priority_score,
    recommended_hours_weekly: row.recommended_hours_weekly,
    gap_score: row.gap_score,
    performance: row.performance,
    accuracy: row.accuracy,
  }));

  if (audit) {
    await logPlannerEvent({
      userId,
      eventType: audit.eventType || "gforce_recalculation",
      eventSource: audit.eventSource || "auto",
      subjectId: audit.subjectId || null,
      beforeState: { plan: before },
      afterState: { plan: after },
      explanation: audit.explanation || "G-Force recalculado automaticamente com base nos dados mais recentes de estudo, performance e Psique.",
      metadata: { changedSubjects: priorities.length, ...(audit.metadata || {}) },
    });
  }

  return priorities;
}

export function calculateForgettingRisks(args: {
  subjects: any[];
  sessions: any[];
  attempts: any[];
  reviews: any[];
  plan: any[];
}): ForgettingRisk[] {
  const now = new Date();
  return args.subjects.map((subject) => {
    const subjectSessions = args.sessions.filter((s) => s.subject_id === subject.id);
    const subjectAttempts = args.attempts.filter((a) => a.questions?.subject_id === subject.id);
    const subjectReviews = args.reviews.filter((r) => r.subject_id === subject.id);
    const planRow = args.plan.find((p) => p.subject_id === subject.id);

    const lastSessionAt = subjectSessions.map((s) => s.started_at).sort().at(-1);
    const lastReviewAt = subjectReviews.filter((r) => r.completed).map((r) => r.review_date).sort().at(-1);
    const lastTouch = [lastSessionAt, lastReviewAt].filter(Boolean).sort().at(-1) as string | undefined;
    const daysSinceTouch = dayDiff(lastTouch, now);

    const pendingReviews = subjectReviews.filter((r) => !r.completed).sort((a, b) => String(a.review_date).localeCompare(String(b.review_date)));
    const nextReview = pendingReviews[0];
    const daysUntilReview = nextReview ? Math.ceil((new Date(nextReview.review_date).getTime() - now.getTime()) / 86400000) : null;

    const comprehensionAvg = subjectSessions.length
      ? subjectSessions.reduce((acc, s) => acc + (s.comprehension_rating || 3), 0) / subjectSessions.length
      : subject.knowledge_level || 3;
    const correct = subjectAttempts.filter((a) => a.is_correct).length;
    const accuracyRate = subjectAttempts.length ? (correct / subjectAttempts.length) * 100 : 50;
    const priorityScore = Number(planRow?.priority_score || 4) * 10;

    const memoryPressure = Math.min(100, (daysSinceTouch / Math.max(nextReview?.interval_days || 7, 1)) * 55);
    const comprehensionPressure = Math.max(0, (5 - comprehensionAvg) * 12);
    const accuracyPressure = Math.max(0, 70 - accuracyRate) * 0.35;
    const duePressure = daysUntilReview === null ? 10 : daysUntilReview <= 0 ? 35 : daysUntilReview <= 2 ? 20 : 0;
    const priorityPressure = priorityScore * 0.25;
    const riskScore = Math.min(100, Math.round(memoryPressure + comprehensionPressure + accuracyPressure + duePressure + priorityPressure));

    const reasons = [];
    if (daysUntilReview !== null && daysUntilReview <= 0) reasons.push("revisão vencida");
    if (daysUntilReview !== null && daysUntilReview <= 2) reasons.push("janela SRS próxima");
    if (daysSinceTouch >= 7) reasons.push("muitos dias sem contato");
    if (comprehensionAvg <= 3) reasons.push("compreensão frágil");
    if (accuracyRate < 70) reasons.push("acurácia abaixo do ideal");

    return {
      subjectId: subject.id,
      subjectName: subject.name,
      riskScore,
      daysSinceTouch,
      daysUntilReview,
      comprehensionAvg: Math.round(comprehensionAvg * 10) / 10,
      accuracyRate: Math.round(accuracyRate),
      reason: reasons.join("; ") || "manutenção preventiva",
    };
  }).sort((a, b) => b.riskScore - a.riskScore);
}

export async function enforceForgettingCurve(userId: string, dateISO = todayISO()): Promise<ForgettingRisk[]> {
  const [subRes, sesRes, attRes, revRes, planRes, psyRes, checkRes] = await Promise.all([
    supabase.from("user_subjects").select("*").eq("user_id", userId),
    supabase.from("study_sessions").select("*").eq("user_id", userId),
    supabase.from("question_attempts").select("*, questions(subject_id)").eq("user_id", userId),
    supabase.from("spaced_reviews").select("*").eq("user_id", userId),
    supabase.from("study_plan").select("*").eq("user_id", userId),
    supabase.from("psyche_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("psyche_checkins").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
  ]);
  const risks = calculateForgettingRisks({ subjects: subRes.data || [], sessions: sesRes.data || [], attempts: attRes.data || [], reviews: revRes.data || [], plan: planRes.data || [] });
  const mode = classifyPsycheMode(buildPsycheState(psyRes.data, checkRes.data || []));
  const urgent = risks.filter((risk) => risk.riskScore >= 65 || (risk.daysUntilReview !== null && risk.daysUntilReview <= 0)).slice(0, 3);

  for (const risk of urgent) {
    const { data: existing } = await (supabase as any)
      .from("study_calendar_blocks")
      .select("id")
      .eq("user_id", userId)
      .eq("subject_id", risk.subjectId)
      .eq("block_date", dateISO)
      .in("block_type", ["review", "srs"])
      .maybeSingle();

    if (!existing) {
      await (supabase as any).from("study_calendar_blocks").insert({
        user_id: userId,
        subject_id: risk.subjectId,
        block_date: dateISO,
        duration_minutes: mode === "low" ? 15 : 30,
        material_name: `Revisão SRS antecipada — risco ${risk.riskScore}`,
        order_index: 0,
        block_type: "review",
        cognitive_load: mode === "low" ? "low" : "medium",
        auto_generated: true,
        source: "forgetting_curve",
      });
    }
  }

  if (urgent.length > 0) {
    await logPlannerEvent({
      userId,
      eventType: "forgetting_curve_adjustment",
      eventSource: "auto",
      beforeState: null,
      afterState: { anticipated: urgent },
      explanation: "Revisões antecipadas foram priorizadas para reduzir risco de esquecimento antes da queda da curva.",
      metadata: { dateISO, count: urgent.length },
    });
  }

  return risks;
}

export async function buildNowQueue(userId: string): Promise<NowQueueItem[]> {
  const dateISO = todayISO();
  const [subRes, sesRes, attRes, revRes, planRes, blockRes, psyRes, checkRes] = await Promise.all([
    supabase.from("user_subjects").select("*").eq("user_id", userId),
    supabase.from("study_sessions").select("*").eq("user_id", userId),
    supabase.from("question_attempts").select("*, questions(subject_id)").eq("user_id", userId),
    supabase.from("spaced_reviews").select("*").eq("user_id", userId),
    supabase.from("study_plan").select("*, user_subjects(name)").eq("user_id", userId).order("priority_score", { ascending: false }),
    supabase.from("study_calendar_blocks").select("*, user_subjects(name)").eq("user_id", userId).eq("block_date", dateISO).order("order_index"),
    supabase.from("psyche_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("psyche_checkins").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
  ]);

  const psycheState = buildPsycheState(psyRes.data, checkRes.data || []);
  const mode = classifyPsycheMode(psycheState);
  const risks = calculateForgettingRisks({ subjects: subRes.data || [], sessions: sesRes.data || [], attempts: attRes.data || [], reviews: revRes.data || [], plan: planRes.data || [] });
  const items: NowQueueItem[] = [];

  risks.filter((r) => r.riskScore >= 55 || (r.daysUntilReview !== null && r.daysUntilReview <= 0)).slice(0, 4).forEach((risk) => {
    items.push({
      id: `review-${risk.subjectId}`,
      type: mode === "low" ? "flashcards" : "review",
      subjectId: risk.subjectId,
      subjectName: risk.subjectName,
      title: mode === "low" ? "Revisão leve agora" : "Revisão antecipada agora",
      durationMinutes: mode === "low" ? 15 : 30,
      priority: 100 + risk.riskScore,
      reason: `${risk.reason} · risco ${risk.riskScore}/100`,
      loadHint: mode === "low" ? "Use flashcards ou leitura de resumo, sem carga pesada." : "Revisão ativa antes da queda da memória.",
    });
  });

  (planRes.data || []).slice(0, 4).forEach((row: any) => {
    items.push({
      id: `gforce-${row.subject_id}`,
      type: mode === "low" ? "flashcards" : "study",
      subjectId: row.subject_id,
      subjectName: row.user_subjects?.name || "Disciplina",
      title: "Próxima Ação G-Force",
      durationMinutes: Math.max(15, Math.round(((row.recommended_hours_weekly || 1) * 60) / 5)),
      priority: Number(row.priority_score || 0) * 10,
      reason: "Alta prioridade combinando relevância, incidência, lacuna, intensidade e Psique.",
      loadHint: mode === "low" ? "Formato leve para preservar constância." : "Leitura ativa + questões de fixação.",
    });
  });

  (blockRes.data || []).forEach((block: any) => {
    items.push({
      id: `block-${block.id}`,
      type: "planned",
      subjectId: block.subject_id,
      subjectName: block.user_subjects?.name || "Bloco planejado",
      title: block.material_name || "Bloco do dia",
      durationMinutes: block.duration_minutes || 30,
      priority: 60 - (block.order_index || 0),
      reason: "Bloco previsto para hoje, mantido na fila para não perder ritmo.",
      loadHint: block.cognitive_load === "low" ? "Carga leve." : "Siga o tempo planejado.",
      blockId: block.id,
    });
  });

  return items.sort((a, b) => b.priority - a.priority).slice(0, 8);
}

export async function goToSuggestedBlock(userId: string, item: Pick<NowQueueItem, "subjectId" | "durationMinutes" | "title" | "type">): Promise<string | null> {
  if (!item.subjectId) return null;
  const dateISO = todayISO();
  const blockType = item.type === "review" || item.type === "flashcards" ? "review" : "study";
  const { data: existing } = await supabase
    .from("study_calendar_blocks")
    .select("id")
    .eq("user_id", userId)
    .eq("subject_id", item.subjectId)
    .eq("block_date", dateISO)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data, error } = await (supabase as any).from("study_calendar_blocks").insert({
    user_id: userId,
    subject_id: item.subjectId,
    block_date: dateISO,
    duration_minutes: item.durationMinutes || 30,
    material_name: item.title,
    order_index: 0,
    block_type: blockType,
    cognitive_load: item.type === "flashcards" ? "low" : "medium",
    auto_generated: true,
    source: "now_queue",
  }).select("id").single();

  if (error) return null;
  await logPlannerEvent({
    userId,
    eventType: "suggested_block_created",
    eventSource: "go_to_block",
    subjectId: item.subjectId,
    beforeState: null,
    afterState: { blockId: data.id, dateISO, durationMinutes: item.durationMinutes, type: item.type },
    explanation: "Bloco criado automaticamente a partir da Fila Agora/Próxima Ação G-Force para iniciar sem perder ritmo.",
  });
  return data.id;
}

export async function applyDailyAdaptation(userId: string, dateISO: string = todayISO()): Promise<DailyAdaptationResult> {
  const [blockRes, profRes, checkRes] = await Promise.all([
    supabase.from("study_calendar_blocks").select("*").eq("user_id", userId).eq("block_date", dateISO),
    supabase.from("psyche_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("psyche_checkins").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1),
  ]);

  const blocks = blockRes.data || [];
  if (blocks.length === 0) return { mode: "neutral", blocksAffected: 0, message: "Sem blocos hoje para adaptar." };

  const psycheState = buildPsycheState(profRes.data, checkRes.data || []);
  const mode = classifyPsycheMode(psycheState);
  const attentionSpan = profRes.data?.attention_span_minutes || 50;
  const isTDAH = profRes.data?.has_neurodivergence && /TDAH/i.test(profRes.data?.neurodivergence_type || "");
  let affected = 0;

  for (const block of blocks) {
    let newDuration = block.duration_minutes;
    if (mode === "low") newDuration = Math.max(15, Math.round(block.duration_minutes * 0.6));
    else if (mode === "good") newDuration = Math.min(180, Math.round(block.duration_minutes * 1.15));

    if (isTDAH && newDuration > attentionSpan * 1.5) {
      const chunks = Math.ceil(newDuration / attentionSpan);
      const chunkDuration = Math.round(newDuration / chunks);
      await (supabase as any).from("study_calendar_blocks").update({ duration_minutes: chunkDuration, material_name: `${block.material_name || "Estudo"} (1/${chunks})`, cognitive_load: "low", source: "psyche_adaptation" }).eq("id", block.id);
      const extras = Array.from({ length: chunks - 1 }, (_, i) => ({
        user_id: userId,
        subject_id: block.subject_id,
        block_date: dateISO,
        duration_minutes: chunkDuration,
        material_name: `${block.material_name || "Estudo"} (${i + 2}/${chunks})`,
        order_index: block.order_index + i + 1,
        block_type: block.block_type || "study",
        cognitive_load: "low",
        auto_generated: true,
        source: "psyche_adaptation",
      }));
      if (extras.length > 0) await (supabase as any).from("study_calendar_blocks").insert(extras);
      affected++;
      continue;
    }

    if (newDuration !== block.duration_minutes) {
      await (supabase as any).from("study_calendar_blocks").update({ duration_minutes: newDuration, cognitive_load: mode === "low" ? "low" : "medium", source: "psyche_adaptation" }).eq("id", block.id);
      affected++;
    }
  }

  const message = mode === "low"
    ? `Detectei sobrecarga emocional. Reduzi ${affected} bloco(s) de hoje em 40% — foque em revisão leve, sem culpa.`
    : mode === "good"
      ? `Você está com ótima energia! Ampliei ${affected} bloco(s) em 15% — aproveite o momento.`
      : "Estado neutro: cronograma de hoje mantido.";

  if (affected > 0) {
    await logPlannerEvent({
      userId,
      eventType: "psyche_calendar_adaptation",
      eventSource: "psyche_checkin",
      beforeState: { blocksBefore: blocks.length },
      afterState: { blocksAffected: affected, mode },
      explanation: message,
      metadata: { dateISO },
    });
  }

  return { mode, blocksAffected: affected, message };
}

export function pickNextAction(priorities: DisciplinePriority[], psycheState: PsycheState | null): NextActionSuggestion | null {
  if (priorities.length === 0) return null;
  const mode = classifyPsycheMode(psycheState);
  let target = priorities[0];
  if (mode === "low") {
    const lighter = priorities.find((p) => p.vectors.comprehension < 50 && p.vectors.relevance > 60);
    if (lighter) target = lighter;
  }

  const loadHint = mode === "low"
    ? "Modo leve: prefira flashcards ou revisão de tópicos já vistos."
    : mode === "good"
      ? "Modo intensivo: aproveite para enfrentar tópico novo ou questões difíceis."
      : "Sessão padrão: leitura ativa + 5 questões.";

  return {
    subjectId: target.disciplineId,
    subjectName: target.disciplineName,
    durationMinutes: target.suggestedDailyMinutes,
    priorityLevel: target.priorityLevel,
    reason: target.recommendation,
    loadHint,
  };
}
