/**
 * Algoritmo Adaptativo G-Force para Study.AI
 * 5 Vetores: Relevância, Incidência, Compreensão, Intensidade, Psique
 * 
 * Adaptado para o schema existente do Lovable:
 * - user_subjects (weight, knowledge_level, incidence)
 * - psyche_profiles / psyche_checkins (mood, stress, energy, focus)
 * - study_sessions, question_attempts, spaced_reviews
 */

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface Discipline {
  id: string;
  name: string;
  weight: number; // Relevância (1-5 from user_subjects.weight)
  incidence: number; // Incidência (1-5 from user_subjects.incidence)
  knowledgeLevel: number; // knowledge_level (1-5)
  dailyTimeMinutes: number; // Tempo dedicado (calculated from sessions)
  accuracyRate: number; // Taxa de acertos (0-100, from question_attempts)
}

export interface PsycheState {
  mood: number; // 1-5
  stress: number; // 1-5 (high = bad)
  energy: number; // 1-5
  focus: number; // 1-5
  sleepQuality: number; // 1-5
}

export interface GForceVector {
  relevance: number; // ×3 - weight in exam
  incidence: number; // ×2 - historical frequency
  comprehension: number; // ×2 (inverse - lower = higher priority)
  intensity: number; // ×1 - study dedication
  psyche: number; // ×2 (gap/lacuna)
}

export interface DisciplinePriority {
  disciplineId: string;
  disciplineName: string;
  gforceScore: number; // 0-100
  vectors: GForceVector;
  recommendation: string;
  suggestedDailyMinutes: number;
  priorityLevel: "critical" | "high" | "medium" | "low";
  urgencyMultiplier?: number; // 1.0–1.5 boost when exam is near and gap is high
}

export interface StudyRecommendation {
  disciplineId: string;
  disciplineName: string;
  priority: "critical" | "high" | "medium" | "low";
  reason: string;
  suggestedAction: string;
  estimatedMinutes: number;
}

// ============================================================================
// CÁLCULO DOS VETORES G-FORCE
// ============================================================================

/** Relevância: peso da disciplina no edital (1-5 → 0-100) */
function calculateRelevanceVector(weight: number): number {
  return Math.min(100, (weight / 5) * 100);
}

/** Incidência: frequência em provas históricas (1-5 → 0-100) */
function calculateIncidenceVector(incidence: number): number {
  return Math.min(100, (incidence / 5) * 100);
}

/** 
 * Compreensão: knowledge_level + accuracy (INVERSO)
 * Quanto menor a compreensão, maior a prioridade
 */
function calculateComprehensionVector(
  knowledgeLevel: number,
  accuracyRate: number
): number {
  const normalizedKnowledge = (knowledgeLevel / 5) * 100;
  const average = (normalizedKnowledge + accuracyRate) / 2;
  return 100 - average; // Inverse: low comprehension = high priority
}

/** Intensidade: ratio of actual vs recommended study time */
function calculateIntensityVector(
  dailyTimeMinutes: number,
  recommendedTimeMinutes: number = 60
): number {
  const ratio = Math.min(dailyTimeMinutes / Math.max(recommendedTimeMinutes, 1), 1);
  return ratio * 100;
}

/**
 * Psique: estado emocional e cognitivo (gap/lacuna)
 * Composite from mood, stress (inverted), energy, focus
 */
function calculatePsycheVector(psycheState: PsycheState | null): number {
  if (!psycheState) return 40; // Default: neutral gap

  const mood = psycheState.mood;
  const stressInv = 6 - psycheState.stress; // Invert: low stress = good
  const energy = psycheState.energy;
  const focus = psycheState.focus;
  const sleep = psycheState.sleepQuality;

  const avgScore = (mood + stressInv + energy + focus + sleep) / 5;
  // Gap: how far from optimal (5)
  return Math.max(0, (5 - avgScore) / 5 * 100);
}

/**
 * Calcula o Índice Psique (0-100, higher = better wellbeing)
 */
export function calculatePsycheIndex(psycheState: PsycheState | null): number {
  if (!psycheState) return 60;
  const mood = psycheState.mood;
  const stressInv = 6 - psycheState.stress;
  const energy = psycheState.energy;
  const focus = psycheState.focus;
  const sleep = psycheState.sleepQuality;
  return Math.round(((mood + stressInv + energy + focus + sleep) / 5) * 20);
}

// ============================================================================
// CÁLCULO DO SCORE G-FORCE
// ============================================================================

/**
 * Score final G-Force para uma disciplina
 * Fórmula: (R×3 + I×2 + C×2 + In×1 + P×2) / 10
 */
export function calculateGForceScore(vectors: GForceVector): number {
  const weightedSum =
    vectors.relevance * 3 +
    vectors.incidence * 2 +
    vectors.comprehension * 2 +
    vectors.intensity * 1 +
    vectors.psyche * 2;

  const totalWeight = 10; // 3+2+2+1+2
  return Math.min(Math.max(weightedSum / totalWeight, 0), 100);
}

// ============================================================================
// FUNÇÕES PRINCIPAIS
// ============================================================================

export function calculateDisciplinePriorities(
  disciplines: Discipline[],
  psycheState: PsycheState | null,
  examDate?: string | null
): DisciplinePriority[] {
  // Compute urgency multiplier from exam proximity
  let daysUntilExam: number | null = null;
  if (examDate) {
    const diff = new Date(examDate).getTime() - Date.now();
    daysUntilExam = Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
  }

  return disciplines.map((discipline) => {
    const vectors: GForceVector = {
      relevance: calculateRelevanceVector(discipline.weight),
      incidence: calculateIncidenceVector(discipline.incidence),
      comprehension: calculateComprehensionVector(
        discipline.knowledgeLevel,
        discipline.accuracyRate
      ),
      intensity: calculateIntensityVector(discipline.dailyTimeMinutes),
      psyche: calculatePsycheVector(psycheState),
    };

    let gforceScore = calculateGForceScore(vectors);

    // Urgency boost: if exam is near AND comprehension gap is high, amplify priority
    let urgencyMultiplier = 1;
    if (daysUntilExam !== null && daysUntilExam <= 90) {
      // Linear boost: at 90 days = 1.0, at 0 days = 1.5, scaled by comprehension gap
      const proximityFactor = (90 - daysUntilExam) / 90; // 0 → 1
      const gapFactor = vectors.comprehension / 100; // 0 → 1
      urgencyMultiplier = 1 + 0.5 * proximityFactor * gapFactor;
      gforceScore = Math.min(100, gforceScore * urgencyMultiplier);
    }

    const psycheScore = psycheState
      ? (psycheState.mood + (6 - psycheState.stress) + psycheState.energy + psycheState.focus + psycheState.sleepQuality) / 5
      : 3;

    const recommendation = generateRecommendation(discipline, vectors, gforceScore, psycheScore);
    const suggestedDailyMinutes = calculateSuggestedTime(discipline.dailyTimeMinutes, gforceScore, psycheScore);

    let priorityLevel: "critical" | "high" | "medium" | "low";
    if (gforceScore >= 75) priorityLevel = "critical";
    else if (gforceScore >= 50) priorityLevel = "high";
    else if (gforceScore >= 25) priorityLevel = "medium";
    else priorityLevel = "low";

    return {
      disciplineId: discipline.id,
      disciplineName: discipline.name,
      gforceScore: Math.round(gforceScore),
      vectors,
      recommendation,
      suggestedDailyMinutes,
      priorityLevel,
      urgencyMultiplier: Math.round(urgencyMultiplier * 100) / 100,
    };
  }).sort((a, b) => b.gforceScore - a.gforceScore);
}

export function getStudyRecommendations(
  priorities: DisciplinePriority[]
): StudyRecommendation[] {
  return priorities.map((priority) => {
    let reason: string;
    let suggestedAction: string;

    if (priority.priorityLevel === "critical") {
      reason = "Alta relevância + baixa compreensão = foco imediato";
      suggestedAction = "Dedique tempo extra hoje. Use técnica Pomodoro intensivo.";
    } else if (priority.priorityLevel === "high") {
      reason = "Relevância moderada com oportunidade de melhoria";
      suggestedAction = "Estude com atenção. Pratique questões.";
    } else if (priority.priorityLevel === "medium") {
      reason = "Disciplina com bom progresso. Mantenha consistência.";
      suggestedAction = "Revisão rápida. Flashcards ou resumos.";
    } else {
      reason = "Excelente compreensão. Foco em manutenção.";
      suggestedAction = "Revisão ocasional. Questões avançadas.";
    }

    return {
      disciplineId: priority.disciplineId,
      disciplineName: priority.disciplineName,
      priority: priority.priorityLevel,
      reason,
      suggestedAction,
      estimatedMinutes: priority.suggestedDailyMinutes,
    };
  });
}

function calculateSuggestedTime(
  currentTime: number,
  gforceScore: number,
  psycheScore: number
): number {
  let adjustedTime = currentTime || 30;

  if (gforceScore >= 75) adjustedTime = Math.round(adjustedTime * 1.5);
  else if (gforceScore >= 50) adjustedTime = Math.round(adjustedTime * 1.2);
  else if (gforceScore < 25) adjustedTime = Math.round(adjustedTime * 0.7);

  // Psyche adjustment
  if (psycheScore <= 2) adjustedTime = Math.round(adjustedTime * 0.6);
  else if (psycheScore === 3) adjustedTime = Math.round(adjustedTime * 0.8);
  else if (psycheScore >= 4) adjustedTime = Math.round(adjustedTime * 1.1);

  return Math.max(adjustedTime, 15);
}

function generateRecommendation(
  discipline: Discipline,
  vectors: GForceVector,
  gforceScore: number,
  psycheScore: number
): string {
  const parts: string[] = [];

  if (vectors.relevance > 70) parts.push("Alta relevância no edital");
  if (vectors.incidence > 70) parts.push("Frequente em provas");
  if (vectors.comprehension > 60) parts.push("Compreensão baixa — foco necessário");
  if (vectors.intensity < 50) parts.push("Tempo dedicado insuficiente");

  if (psycheScore <= 2) parts.push("Bem-estar baixo — estudar com calma");
  else if (psycheScore >= 4) parts.push("Ótimo bem-estar — aproveite!");

  return parts.join(". ") || "Continue com consistência";
}

/**
 * Distribui o tempo diário proporcional aos scores G-Force
 */
export function applyScheduleAdjustments(
  priorities: DisciplinePriority[],
  totalDailyMinutes: number = 480
): Record<string, number> {
  const totalScore = priorities.reduce((sum, p) => sum + p.gforceScore, 0);
  if (totalScore === 0) return {};

  const adjustments: Record<string, number> = {};
  priorities.forEach((priority) => {
    adjustments[priority.disciplineId] = Math.round(
      totalDailyMinutes * (priority.gforceScore / totalScore)
    );
  });

  return adjustments;
}

/**
 * Builds Discipline objects from existing Supabase data
 */
export function buildDisciplinesFromData(
  subjects: any[],
  sessions: any[],
  attempts: any[]
): Discipline[] {
  return subjects.map((s) => {
    // Calculate daily time from sessions in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSessions = sessions.filter(
      (sess) => sess.subject_id === s.id && new Date(sess.started_at) >= thirtyDaysAgo
    );
    const totalMinutes = recentSessions.reduce((sum: number, sess: any) => sum + (sess.duration_minutes || 0), 0);
    const dailyTimeMinutes = Math.round(totalMinutes / 30);

    // Calculate accuracy from attempts
    const subAttempts = attempts.filter((a: any) => a.questions?.subject_id === s.id);
    const correct = subAttempts.filter((a: any) => a.is_correct).length;
    const accuracyRate = subAttempts.length > 0 ? (correct / subAttempts.length) * 100 : 50;

    return {
      id: s.id,
      name: s.name,
      weight: s.weight || 3,
      incidence: s.incidence || 3,
      knowledgeLevel: s.knowledge_level || 3,
      dailyTimeMinutes,
      accuracyRate,
    };
  });
}

/**
 * Builds PsycheState from existing profile + checkins
 */
export function buildPsycheState(
  psycheProfile: any | null,
  recentCheckins: any[] = []
): PsycheState | null {
  if (recentCheckins.length > 0) {
    const latest = recentCheckins[0];
    return {
      mood: latest.mood || 3,
      stress: latest.stress || 3,
      energy: latest.energy || 3,
      focus: latest.focus || 3,
      sleepQuality: psycheProfile?.sleep_quality || 3,
    };
  }

  if (psycheProfile) {
    return {
      mood: psycheProfile.current_mood || 3,
      stress: psycheProfile.stress_level || 3,
      energy: psycheProfile.motivation_level || 3,
      focus: psycheProfile.focus_capacity || 3,
      sleepQuality: psycheProfile.sleep_quality || 3,
    };
  }

  return null;
}

/**
 * Maps a DisciplinePriority to a study_plan row payload (deterministic, no AI).
 * Used for instant recalculations triggered by sessions, attempts or check-ins.
 */
export function priorityToPlanRow(p: DisciplinePriority, userId: string) {
  // Convert 0-100 vectors back to the 0-10 scale used in study_plan
  return {
    user_id: userId,
    subject_id: p.disciplineId,
    priority_score: Math.round(p.gforceScore) / 10, // study_plan uses 0-10 numeric
    relevance: Math.round(p.vectors.relevance) / 10,
    incidence: Math.round(p.vectors.incidence) / 10,
    accuracy: Math.round(100 - p.vectors.comprehension) / 10, // mastery, not gap
    performance: Math.round(p.vectors.intensity) / 10,
    gap_score: Math.round(p.vectors.comprehension) / 10,
    recommended_hours_weekly: Math.round((p.suggestedDailyMinutes * 5) / 60 * 10) / 10,
  };
}
