/**
 * Planner Adaptation Engine
 * 
 * Conecta os 5 vetores G-Force ao calendário de estudos e ao estado psíquico
 * do usuário em TEMPO REAL (sem chamadas de IA — apenas regras determinísticas).
 * 
 * Responsabilidades:
 *  - Recalcular study_plan após eventos (sessões, tentativas, check-ins)
 *  - Aplicar "modo leve" em dias de baixa Psique (reduz duração e prioriza revisão)
 *  - Aplicar "modo intensivo" em dias de boa Psique
 *  - Auto-fragmentar blocos longos para perfis TDAH (attention_span_minutes)
 *  - Calcular Pomodoro adaptativo
 *  - Sugerir a "Próxima Ação" com base no priority_score
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

// ============================================================================
// PSYCHE → ACTIONS
// ============================================================================

export type PsycheMode = "low" | "neutral" | "good";

export function classifyPsycheMode(state: PsycheState | null): PsycheMode {
  if (!state) return "neutral";
  const score = (state.mood + (6 - state.stress) + state.energy + state.focus) / 4;
  if (score <= 2.4) return "low";
  if (score >= 4) return "good";
  return "neutral";
}

/** Pomodoro length adapted to psyche + ND profile */
export function adaptivePomodoroMinutes(
  state: PsycheState | null,
  attentionSpan: number = 25
): number {
  const mode = classifyPsycheMode(state);
  if (mode === "low") return Math.max(10, Math.round(attentionSpan * 0.6));
  if (mode === "good") return Math.min(60, Math.round(attentionSpan * 1.4));
  return attentionSpan;
}

// ============================================================================
// RECÁLCULO DETERMINÍSTICO DO STUDY_PLAN (sem IA)
// ============================================================================

/**
 * Lê dados frescos do banco, recalcula prioridades G-Force e faz upsert em study_plan.
 * Deve ser chamado após: nova sessão, nova tentativa de questão, novo check-in psíquico.
 */
export async function recalculateAndPersistPlan(userId: string): Promise<DisciplinePriority[]> {
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
  const examDate = profRes.data?.exam_date || null;

  const priorities = calculateDisciplinePriorities(disciplines, psycheState, examDate);

  // Upsert: delete + insert (study_plan has no unique key on subject_id)
  await supabase.from("study_plan").delete().eq("user_id", userId);
  const rows = priorities.map((p) => priorityToPlanRow(p, userId));
  if (rows.length > 0) {
    await supabase.from("study_plan").insert(rows);
  }

  return priorities;
}

// ============================================================================
// ADAPTAÇÃO DIÁRIA DOS BLOCOS DO CALENDÁRIO
// ============================================================================

export interface DailyAdaptationResult {
  mode: PsycheMode;
  blocksAffected: number;
  message: string;
}

/**
 * Após um check-in psíquico, ajusta blocos de HOJE conforme estado:
 *  - Modo "low": reduz duração em 40%, mínimo 15min — sinaliza foco em revisão
 *  - Modo "good": amplia em 15% — sugere desafio
 *  - Modo "neutral": não altera
 * 
 * Também auto-fragmenta blocos > attention_span (perfil TDAH) em sub-blocos.
 */
export async function applyDailyAdaptation(
  userId: string,
  dateISO: string = new Date().toISOString().slice(0, 10)
): Promise<DailyAdaptationResult> {
  const [blockRes, profRes, checkRes] = await Promise.all([
    supabase.from("study_calendar_blocks").select("*").eq("user_id", userId).eq("block_date", dateISO),
    supabase.from("psyche_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("psyche_checkins").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1),
  ]);

  const blocks = blockRes.data || [];
  if (blocks.length === 0) {
    return { mode: "neutral", blocksAffected: 0, message: "Sem blocos hoje para adaptar." };
  }

  const psycheState = buildPsycheState(profRes.data, checkRes.data || []);
  const mode = classifyPsycheMode(psycheState);
  const attentionSpan = profRes.data?.attention_span_minutes || 50;
  const isTDAH = profRes.data?.has_neurodivergence && /TDAH/i.test(profRes.data?.neurodivergence_type || "");

  let affected = 0;

  for (const block of blocks) {
    let newDuration = block.duration_minutes;

    if (mode === "low") {
      newDuration = Math.max(15, Math.round(block.duration_minutes * 0.6));
    } else if (mode === "good") {
      newDuration = Math.min(180, Math.round(block.duration_minutes * 1.15));
    }

    // TDAH auto-fragmentation: if a single block exceeds attention span ×1.5, split
    if (isTDAH && newDuration > attentionSpan * 1.5) {
      const chunks = Math.ceil(newDuration / attentionSpan);
      const chunkDuration = Math.round(newDuration / chunks);

      // Update original to first chunk
      await supabase.from("study_calendar_blocks")
        .update({ duration_minutes: chunkDuration, material_name: `${block.material_name || "Estudo"} (1/${chunks})` })
        .eq("id", block.id);

      // Insert remaining chunks
      const extras = Array.from({ length: chunks - 1 }, (_, i) => ({
        user_id: userId,
        subject_id: block.subject_id,
        block_date: dateISO,
        duration_minutes: chunkDuration,
        material_name: `${block.material_name || "Estudo"} (${i + 2}/${chunks})`,
        order_index: block.order_index + i + 1,
      }));
      if (extras.length > 0) await supabase.from("study_calendar_blocks").insert(extras);
      affected++;
      continue;
    }

    if (newDuration !== block.duration_minutes) {
      await supabase.from("study_calendar_blocks")
        .update({ duration_minutes: newDuration })
        .eq("id", block.id);
      affected++;
    }
  }

  let message: string;
  if (mode === "low") {
    message = `Detectei sobrecarga emocional. Reduzi ${affected} bloco(s) de hoje em 40% — foque em revisão leve, sem culpa. 💚`;
  } else if (mode === "good") {
    message = `Você está com ótima energia! Ampliei ${affected} bloco(s) em 15% — aproveite o momento. ⚡`;
  } else {
    message = "Estado neutro: cronograma de hoje mantido.";
  }

  return { mode, blocksAffected: affected, message };
}

// ============================================================================
// PRÓXIMA AÇÃO RECOMENDADA
// ============================================================================

export interface NextActionSuggestion {
  subjectName: string;
  durationMinutes: number;
  priorityLevel: "critical" | "high" | "medium" | "low";
  reason: string;
  loadHint: string;
}

export function pickNextAction(
  priorities: DisciplinePriority[],
  psycheState: PsycheState | null
): NextActionSuggestion | null {
  if (priorities.length === 0) return null;
  const mode = classifyPsycheMode(psycheState);

  // In low mode, prefer something with higher mastery (less cognitive load) but still relevant
  let target = priorities[0];
  if (mode === "low") {
    const lighter = priorities.find(
      (p) => p.vectors.comprehension < 50 && p.vectors.relevance > 60
    );
    if (lighter) target = lighter;
  }

  const loadHint =
    mode === "low"
      ? "Modo leve: prefira flashcards ou revisão de tópicos já vistos."
      : mode === "good"
      ? "Modo intensivo: aproveite para enfrentar tópico novo ou questões difíceis."
      : "Sessão padrão: leitura ativa + 5 questões.";

  return {
    subjectName: target.disciplineName,
    durationMinutes: target.suggestedDailyMinutes,
    priorityLevel: target.priorityLevel,
    reason: target.recommendation,
    loadHint,
  };
}