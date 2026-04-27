import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { checkAchievements } from "@/lib/checkAchievements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, Pause, RotateCcw, Star, Plus, ChevronLeft, ChevronRight, GripVertical, Trash2, Sparkles, Zap, Heart, ListChecks, ClipboardList, ArrowRight, SearchCheck, CheckCircle2, History, TimerReset } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isToday, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  recalculateAndPersistPlan,
  pickNextAction,
  adaptivePomodoroMinutes,
  classifyPsycheMode,
  buildNowQueue,
  enforceForgettingCurve,
  goToSuggestedBlock,
  logPlannerEvent,
  type NextActionSuggestion,
  type NowQueueItem,
} from "@/lib/planner-adaptation";
import { buildPsycheState, type PsycheState } from "@/lib/adaptive-algorithm";
import { Badge } from "@/components/ui/badge";

interface PlannerTabProps { userId: string; }

interface CalendarBlock {
  id: string;
  user_id: string;
  subject_id: string | null;
  block_date: string;
  duration_minutes: number;
  material_name: string | null;
  order_index: number;
  subject_name?: string;
  block_type?: string;
  cognitive_load?: string;
  auto_generated?: boolean;
  source?: string;
}

interface DueReview {
  id: string;
  subject_id: string | null;
  topic_id: string | null;
  review_date: string;
  interval_days: number;
  performance_rating: number | null;
  subject_name?: string;
  topic_name?: string;
  forgetting_risk?: number;
  recommendation?: string;
  priority_label?: string;
  priority_rank?: number;
  estimated_minutes?: number;
  review_type?: "leitura" | "flashcards" | "questoes";
  edital_relevant?: boolean;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const inferReviewType = (recommendation: string, risk: number, priorityRank: number): DueReview["review_type"] => {
  const text = recommendation.toLowerCase();
  if (/quest|simulado|acurácia|erro|desempenho/.test(text) || (priorityRank === 1 && risk >= 80)) return "questoes";
  if (/flashcard|resumo|leve|memoriz/.test(text) || (priorityRank === 3 && risk < 55)) return "flashcards";
  return "leitura";
};

const estimateReviewMinutes = (args: { risk: number; priorityRank: number; hasTopic: boolean; daysUntilDue: number; reviewType: DueReview["review_type"] }) => {
  const typeBase = args.reviewType === "questoes" ? 22 : args.reviewType === "leitura" ? 16 : 10;
  const scopeMinutes = args.hasTopic ? 2 : 6;
  const urgencyMinutes = args.daysUntilDue === 0 ? 5 : args.daysUntilDue <= 2 ? 3 : 0;
  const priorityMultiplier = args.priorityRank === 1 ? 1.25 : args.priorityRank === 2 ? 1.1 : 0.9;
  const riskMinutes = Math.min(10, Math.max(0, args.risk * 0.1));
  return Math.max(8, Math.min(45, Math.round(((typeBase + scopeMinutes + urgencyMinutes + riskMinutes) * priorityMultiplier) / 5) * 5));
};

const PlannerTab = ({ userId }: PlannerTabProps) => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [pomodoroMinutes, setPomodoroMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [editingPomodoro, setEditingPomodoro] = useState(false);
  const [draggedBlock, setDraggedBlock] = useState<CalendarBlock | null>(null);
  const [nextAction, setNextAction] = useState<NextActionSuggestion | null>(null);
  const [psycheState, setPsycheStateLocal] = useState<PsycheState | null>(null);
  const [psycheProfile, setPsycheProfile] = useState<any>(null);
  const [studyProfile, setStudyProfile] = useState<any>(null);
  const [nowQueue, setNowQueue] = useState<NowQueueItem[]>([]);
  const [dueReviews, setDueReviews] = useState<DueReview[]>([]);
  const [selectedReviewIds, setSelectedReviewIds] = useState<string[]>([]);
  const [reviewScope, setReviewScope] = useState<"all" | "current_edital">("current_edital");
  const [reviewsPaused, setReviewsPaused] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null);
  const [plannerView, setPlannerView] = useState<"calendar" | "reviews" | "queue" | "audit">("calendar");

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<CalendarBlock | null>(null);
  const [editForm, setEditForm] = useState({ subject_id: "", duration_minutes: "60", material_name: "" });

  // Add block modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addDate, setAddDate] = useState<string>("");

  // Quick session form
  const [sessionForm, setSessionForm] = useState({ subject_id: "", topic_id: "", material_name: "", pages_start: "", pages_end: "", duration_minutes: "60", comprehension_rating: 3 });

  const loadData = useCallback(async () => {
    const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const heatmapStart = format(ninetyDaysAgo, "yyyy-MM-dd");
    const today = format(new Date(), "yyyy-MM-dd");
    const sevenDaysAhead = format(addDays(new Date(), 7), "yyyy-MM-dd");

    const [subRes, topicRes, sesRes, blockRes, psyRes, checkRes, profileRes, planRes, queueData, reviewRes, scheduleRes, auditRes] = await Promise.all([
      supabase.from("user_subjects").select("*").eq("user_id", userId),
      supabase.from("topics").select("*").eq("user_id", userId).order("order_index"),
      supabase.from("study_sessions").select("*, user_subjects(name), topics(name)").eq("user_id", userId).gte("started_at", heatmapStart).order("started_at", { ascending: false }),
      supabase.from("study_calendar_blocks").select("*, user_subjects(name)").eq("user_id", userId).gte("block_date", monthStart).lte("block_date", monthEnd).order("order_index"),
      supabase.from("psyche_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("psyche_checkins").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
      supabase.from("profiles").select("target_exam, target_position, banca").eq("user_id", userId).maybeSingle(),
      supabase.from("study_plan").select("*, user_subjects(name)").eq("user_id", userId).order("priority_score", { ascending: false }),
      buildNowQueue(userId),
      (supabase as any).from("spaced_reviews").select("*, user_subjects(name), topics(name)").eq("user_id", userId).eq("completed", false).gte("review_date", today).lte("review_date", sevenDaysAhead),
      (supabase as any).from("topic_review_schedules").select("subject_id, topic_id, forgetting_risk, recommendation").eq("user_id", userId),
      (supabase as any).from("planner_audit_logs").select("*, user_subjects(name)").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
    ]);
    setSubjects(subRes.data || []);
    setTopics(topicRes.data || []);
    setSessions(sesRes.data || []);
    setBlocks((blockRes.data || []).map((b: any) => ({ ...b, subject_name: b.user_subjects?.name })));
    setPsycheProfile(psyRes.data);
    setStudyProfile(profileRes.data);
    setNowQueue(queueData || []);
    const schedules = scheduleRes.data || [];
    const planData = planRes.data || [];
    const planSubjectIds = new Set(planData.map((row: any) => row.subject_id).filter(Boolean));
    const reviews = (reviewRes.data || []).map((review: any) => {
      const schedule = schedules.find((item: any) => item.topic_id ? item.topic_id === review.topic_id : item.subject_id === review.subject_id && !item.topic_id);
      const risk = Number(schedule?.forgetting_risk || 0);
      const recommendation = schedule?.recommendation || "Revisão espaçada recomendada para reduzir lacuna de memória.";
      const daysUntilDue = Math.max(0, Math.ceil((new Date(`${review.review_date}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000));
      const priorityRank = risk >= 75 || daysUntilDue === 0 ? 1 : risk >= 55 || daysUntilDue <= 2 ? 2 : 3;
      const reviewType = inferReviewType(recommendation, risk, priorityRank);
      const estimatedMinutes = estimateReviewMinutes({ risk, priorityRank, hasTopic: Boolean(review.topic_id), daysUntilDue, reviewType });
      return {
        ...review,
        subject_name: review.user_subjects?.name,
        topic_name: review.topics?.name,
        forgetting_risk: risk,
        recommendation,
        priority_label: priorityRank === 1 ? "Fazer primeiro" : priorityRank === 2 ? "Alta" : "Manutenção",
        priority_rank: priorityRank,
        estimated_minutes: estimatedMinutes,
        review_type: reviewType,
        edital_relevant: planSubjectIds.size === 0 || planSubjectIds.has(review.subject_id),
      };
    }).sort((a: DueReview, b: DueReview) => (Number(a.priority_rank || 9) - Number(b.priority_rank || 9)) || (Number(b.forgetting_risk || 0) - Number(a.forgetting_risk || 0)) || a.review_date.localeCompare(b.review_date));
    setDueReviews(reviews);
    setSelectedReviewIds(prev => prev.filter(id => reviews.some((review: DueReview) => review.id === id)));
    setAuditLogs(auditRes.data || []);
    const ps = buildPsycheState(psyRes.data, checkRes.data || []);
    setPsycheStateLocal(ps);

    // Adaptive Pomodoro: initialize using psyche + ND profile
    const adaptiveMin = adaptivePomodoroMinutes(ps, psyRes.data?.attention_span_minutes || 25);
    if (!timerRunning) {
      setPomodoroMinutes(adaptiveMin);
      setTimerSeconds(adaptiveMin * 60);
    }

    // Compute next action from current study_plan + algorithm
    if (planData.length > 0) {
      // Reconstruct minimal DisciplinePriority list from study_plan rows for pickNextAction
      const fauxPriorities = planData.map((row: any) => ({
        disciplineId: row.subject_id,
        disciplineName: row.user_subjects?.name || "Disciplina",
        gforceScore: Math.round((row.priority_score || 0) * 10),
        vectors: {
          relevance: (row.relevance || 0) * 10,
          incidence: (row.incidence || 0) * 10,
          comprehension: (row.gap_score || 0) * 10,
          intensity: (row.performance || 0) * 10,
          psyche: 50,
        },
        recommendation: "Recomendação baseada no seu plano G-Force",
        suggestedDailyMinutes: Math.round(((row.recommended_hours_weekly || 1) * 60) / 5),
        priorityLevel: row.priority_score >= 7.5 ? "critical" : row.priority_score >= 5 ? "high" : row.priority_score >= 2.5 ? "medium" : "low",
      })) as any;
      setNextAction(pickNextAction(fauxPriorities, ps));
    } else {
      setNextAction(null);
    }
  }, [userId, currentMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  // Pomodoro timer
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 0) { setTimerRunning(false); toast.success("Pomodoro concluído! 🎉"); return pomodoroMinutes * 60; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTimer = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // Calendar grid generation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const calendarDays: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  const getBlocksForDate = (date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    return blocks.filter(b => b.block_date === key);
  };

  // Drag and drop handlers
  const handleDragStart = (block: CalendarBlock) => {
    setDraggedBlock(block);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (!draggedBlock) return;

    const newDate = format(targetDate, "yyyy-MM-dd");
    if (newDate === draggedBlock.block_date) { setDraggedBlock(null); return; }

    // Optimistic update
    setBlocks(prev => prev.map(b => b.id === draggedBlock.id ? { ...b, block_date: newDate } : b));

    const { error } = await supabase.from("study_calendar_blocks").update({ block_date: newDate }).eq("id", draggedBlock.id);
    if (error) {
      toast.error("Erro ao mover bloco");
      loadData();
    } else {
      toast.success("Bloco reagendado! Recalibrando G-Force…");
      // Trigger deterministic recalculation
      recalculateAndPersistPlan(userId, { eventType: "calendar_block_moved", eventSource: "planner_drag_drop", subjectId: draggedBlock.subject_id, explanation: "Bloco movido no calendário; G-Force recalculado para refletir o plano real do dia." }).then(async () => {
        await enforceForgettingCurve(userId);
        toast.success("Cronograma G-Force recalibrado ⚡");
        loadData();
      });
    }
    setDraggedBlock(null);
  };

  // Edit block
  const openEditModal = (block: CalendarBlock) => {
    setEditingBlock(block);
    setEditForm({
      subject_id: block.subject_id || "",
      duration_minutes: String(block.duration_minutes),
      material_name: block.material_name || "",
    });
    setEditModalOpen(true);
  };

  const saveBlock = async () => {
    if (!editingBlock) return;
    const { error } = await supabase.from("study_calendar_blocks").update({
      subject_id: editForm.subject_id || null,
      duration_minutes: parseInt(editForm.duration_minutes) || 60,
      material_name: editForm.material_name || null,
    }).eq("id", editingBlock.id);
    if (error) { toast.error("Erro ao salvar"); return; }
    await recalculateAndPersistPlan(userId, { eventType: "calendar_block_updated", eventSource: "planner_edit", subjectId: editForm.subject_id || null, explanation: "Bloco de estudo editado; G-Force recalculado automaticamente." });
    toast.success("Bloco atualizado!");
    setEditModalOpen(false);
    loadData();
  };

  const deleteBlock = async (blockId: string) => {
    const { error } = await supabase.from("study_calendar_blocks").delete().eq("id", blockId);
    if (error) { toast.error("Erro ao excluir"); return; }
    setBlocks(prev => prev.filter(b => b.id !== blockId));
    setEditModalOpen(false);
    await recalculateAndPersistPlan(userId, { eventType: "calendar_block_deleted", eventSource: "planner_delete", explanation: "Bloco removido; plano recalibrado automaticamente." });
    toast.success("Bloco removido!");
  };

  // Add block
  const openAddModal = (date: Date) => {
    setAddDate(format(date, "yyyy-MM-dd"));
    setEditForm({ subject_id: "", duration_minutes: "60", material_name: "" });
    setAddModalOpen(true);
  };

  const addBlock = async () => {
    if (!editForm.subject_id) { toast.error("Selecione uma disciplina"); return; }
    const dayBlocks = blocks.filter(b => b.block_date === addDate);
    const { error } = await supabase.from("study_calendar_blocks").insert({
      user_id: userId,
      subject_id: editForm.subject_id,
      block_date: addDate,
      duration_minutes: parseInt(editForm.duration_minutes) || 60,
      material_name: editForm.material_name || null,
      order_index: dayBlocks.length,
      block_type: "study",
      cognitive_load: "medium",
      auto_generated: false,
      source: "manual",
    } as any);
    if (error) { toast.error("Erro ao adicionar bloco"); return; }
    await recalculateAndPersistPlan(userId, { eventType: "calendar_block_created", eventSource: "planner_manual", subjectId: editForm.subject_id, explanation: "Novo bloco adicionado; G-Force recalculado automaticamente." });
    toast.success("Bloco adicionado!");
    setAddModalOpen(false);
    loadData();
  };

  // Quick session
  const addSession = async () => {
    if (!sessionForm.subject_id) { toast.error("Selecione uma disciplina"); return; }
    const { error } = await supabase.from("study_sessions").insert({
      user_id: userId, subject_id: sessionForm.subject_id, topic_id: sessionForm.topic_id || null, material_name: sessionForm.material_name || null,
      pages_start: sessionForm.pages_start ? parseInt(sessionForm.pages_start) : null,
      pages_end: sessionForm.pages_end ? parseInt(sessionForm.pages_end) : null,
      duration_minutes: sessionForm.duration_minutes ? parseInt(sessionForm.duration_minutes) : 0,
      comprehension_rating: sessionForm.comprehension_rating,
      started_at: new Date().toISOString(),
    });
    if (error) { toast.error("Erro ao salvar sessão"); return; }
    toast.success("Sessão registrada! G-Force recalculando automaticamente…");
    setSessionForm({ subject_id: "", topic_id: "", material_name: "", pages_start: "", pages_end: "", duration_minutes: "60", comprehension_rating: 3 });
    checkAchievements(userId);
    await recalculateAndPersistPlan(userId, { eventType: "study_session_registered", eventSource: "planner_quick_session", subjectId: sessionForm.subject_id, explanation: "Tempo real e compreensão da sessão alteraram os vetores de intensidade e compreensão." });
    await enforceForgettingCurve(userId);
    const { data: reviewData } = await supabase.functions.invoke("recalculate-review-schedule", { body: { trigger: "study_session", subjectId: sessionForm.subject_id, topicId: sessionForm.topic_id || null } });
    if (reviewData?.suggestions?.length) toast.info("Revisões recalculadas pela curva do esquecimento.");
    loadData();
  };

  // Heatmap
  const sessionDates = sessions.map(s => format(new Date(s.started_at), "yyyy-MM-dd"));

  const handleGoToBlock = async (item?: Partial<NowQueueItem>) => {
    const source = item || (nextAction ? {
      subjectId: nextAction.subjectId,
      durationMinutes: nextAction.durationMinutes,
      title: "Próxima Ação G-Force",
      type: classifyPsycheMode(psycheState) === "low" ? "flashcards" as const : "study" as const,
    } : null);
    if (!source?.subjectId) { toast.error("Sem disciplina sugerida para criar bloco"); return; }
    const blockId = await goToSuggestedBlock(userId, {
      subjectId: source.subjectId,
      durationMinutes: source.durationMinutes || 30,
      title: source.title || "Próxima Ação G-Force",
      type: source.type || "study",
    });
    if (!blockId) { toast.error("Não consegui criar ou localizar o bloco"); return; }
    setCurrentMonth(new Date());
    setPlannerView("calendar");
    setHighlightedBlockId(blockId);
    toast.success("Bloco pronto no calendário");
    await loadData();
    window.setTimeout(() => setHighlightedBlockId(null), 6000);
  };

  const completeReview = async (review: DueReview) => {
    const { error } = await supabase.from("spaced_reviews").update({ completed: true, performance_rating: review.performance_rating || 3 }).eq("id", review.id).eq("user_id", userId);
    if (error) { toast.error("Não consegui concluir a revisão"); return; }
    await supabase.functions.invoke("recalculate-review-schedule", { body: { trigger: "manual", subjectId: review.subject_id, topicId: review.topic_id } });
    toast.success("Revisão concluída e curva atualizada");
    loadData();
  };

  const visibleDueReviews = dueReviews.filter(review => reviewScope === "all" || review.edital_relevant);
  const selectedVisibleIds = selectedReviewIds.filter(id => visibleDueReviews.some(review => review.id === id));
  const selectedVisibleReviews = visibleDueReviews.filter(review => selectedVisibleIds.includes(review.id));
  const selectedEstimatedMinutes = selectedVisibleReviews.reduce((sum, review) => sum + estimateReviewMinutes({
    risk: Number(review.forgetting_risk || 0),
    priorityRank: Number(review.priority_rank || 3),
    hasTopic: Boolean(review.topic_id),
    daysUntilDue: Math.max(0, Math.ceil((new Date(`${review.review_date}T00:00:00`).getTime() - new Date(`${format(new Date(), "yyyy-MM-dd")}T00:00:00`).getTime()) / 86400000)),
    reviewType: review.review_type || "leitura",
  }), 0);
  const reviewSummary = visibleDueReviews.reduce((acc, review) => {
    acc.total += 1;
    acc.minutes += Number(review.estimated_minutes || 0);
    if (review.topic_id) acc.topics.add(review.topic_id);
    if (review.subject_id) acc.subjects.add(review.subject_id);
    if (review.priority_rank === 1) acc.urgent += 1;
    return acc;
  }, { total: 0, minutes: 0, urgent: 0, topics: new Set<string>(), subjects: new Set<string>() });
  const batchReviewLogs = auditLogs.filter(log => log.event_type === "batch_reviews_completed");
  const toggleReviewSelection = (reviewId: string, checked: boolean) => {
    setSelectedReviewIds(prev => checked ? [...new Set([...prev, reviewId])] : prev.filter(id => id !== reviewId));
  };
  const toggleAllVisibleReviews = (checked: boolean) => {
    setSelectedReviewIds(prev => checked ? [...new Set([...prev, ...visibleDueReviews.map(review => review.id)])] : prev.filter(id => !visibleDueReviews.some(review => review.id === id)));
  };
  const completeSelectedReviews = async () => {
    if (reviewsPaused) { toast.info("Pausa rápida ativa: suas seleções foram mantidas para concluir depois."); return; }
    if (selectedVisibleIds.length === 0) { toast.error("Selecione ao menos uma revisão"); return; }
    const selectedReviews = selectedVisibleReviews;
    const { error } = await supabase.from("spaced_reviews").update({ completed: true, performance_rating: 3 }).eq("user_id", userId).in("id", selectedVisibleIds);
    if (error) { toast.error("Não consegui concluir as revisões selecionadas"); return; }
    const uniqueTargets = Array.from(new Map(selectedReviews.map(review => [`${review.subject_id || ""}:${review.topic_id || ""}`, review])).values());
    await Promise.all(uniqueTargets.map(review => supabase.functions.invoke("recalculate-review-schedule", { body: { trigger: "manual", subjectId: review.subject_id, topicId: review.topic_id } })));
    await (supabase as any).from("planner_audit_logs").insert({
      user_id: userId,
      subject_id: uniqueTargets[0]?.subject_id || null,
      event_type: "batch_reviews_completed",
      event_source: "planner_reviews_bulk_action",
      explanation: `${selectedReviews.length} revisões concluídas em lote; curvas recalculadas apenas para ${uniqueTargets.length} assunto(s)/tema(s) impactado(s).`,
      after_state: { completedCount: selectedReviews.length, estimatedMinutes: selectedEstimatedMinutes, impactedTargets: uniqueTargets.length, topics: selectedReviews.map(review => review.topic_name || review.subject_name || "Tema") },
      metadata: { reviewScope, targetExam: studyProfile?.target_exam || null, targetPosition: studyProfile?.target_position || null, reviewIds: selectedVisibleIds },
    });
    setSelectedReviewIds(prev => prev.filter(id => !selectedVisibleIds.includes(id)));
    toast.success(`${selectedVisibleIds.length} revisões concluídas; ${uniqueTargets.length} curva(s) impactada(s) atualizada(s)`);
    loadData();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-display">🗓️ Planner de Estudos</h1>

      {/* Adaptive Next Action Panel — connects G-Force to the calendar */}
      {nextAction && (
        <Card className={`glass border-l-4 ${
          nextAction.priorityLevel === "critical" ? "border-l-destructive" :
          nextAction.priorityLevel === "high" ? "border-l-warning" :
          nextAction.priorityLevel === "medium" ? "border-l-primary" : "border-l-muted"
        }`}>
          <CardContent className="py-3">
            <div className="flex items-start gap-3 flex-wrap">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">Próxima ação G-Force:</span>
                  <Badge variant="outline" className="text-xs">{nextAction.subjectName}</Badge>
                  <Badge className="text-xs">{nextAction.durationMinutes} min</Badge>
                  {psycheState && (
                    <Badge variant="secondary" className="text-xs">
                      <Heart className="h-3 w-3 mr-1" />
                      {classifyPsycheMode(psycheState) === "low" ? "Modo leve" :
                       classifyPsycheMode(psycheState) === "good" ? "Modo intensivo" : "Modo padrão"}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{nextAction.reason}</p>
                <p className="text-xs text-primary/80 mt-0.5 italic">💡 {nextAction.loadHint}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  toast.info("Recalibrando plano G-Force…");
                  await recalculateAndPersistPlan(userId, { eventType: "manual_recalculation", eventSource: "planner_button", explanation: "Recálculo manual solicitado para sincronizar o Planner com os dados atuais." });
                  await enforceForgettingCurve(userId);
                  await loadData();
                  toast.success("Plano atualizado com base nos dados mais recentes ⚡");
                }}
              >
                <Zap className="h-3 w-3 mr-1" /> Recalcular
              </Button>
              <Button size="sm" onClick={() => handleGoToBlock()}>
                <ArrowRight className="h-3 w-3 mr-1" /> Ir para o bloco
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={plannerView === "calendar" ? "default" : "outline"} onClick={() => setPlannerView("calendar")}>
          <ClipboardList className="h-4 w-4 mr-1" /> Calendário
        </Button>
        <Button size="sm" variant={plannerView === "reviews" ? "default" : "outline"} onClick={() => setPlannerView("reviews")}>
          <CheckCircle2 className="h-4 w-4 mr-1" /> Revisões
          {dueReviews.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{dueReviews.length}</Badge>}
        </Button>
        <Button size="sm" variant={plannerView === "queue" ? "default" : "outline"} onClick={() => setPlannerView("queue")}>
          <ListChecks className="h-4 w-4 mr-1" /> Fila Agora
        </Button>
        <Button size="sm" variant={plannerView === "audit" ? "default" : "outline"} onClick={() => setPlannerView("audit")}>
          <SearchCheck className="h-4 w-4 mr-1" /> Auditoria
        </Button>
      </div>

      {plannerView === "reviews" && (
        <Card className="glass">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" />Revisões: hoje e próximos 7 dias</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant={reviewsPaused ? "secondary" : "outline"} onClick={() => setReviewsPaused(prev => !prev)}>
                <TimerReset className="h-3 w-3 mr-1" /> {reviewsPaused ? "Retomar" : "Pausa rápida"}
              </Button>
              <Button size="sm" onClick={completeSelectedReviews} disabled={selectedVisibleIds.length === 0 || reviewsPaused}>
                <CheckCircle2 className="h-3 w-3 mr-1" /> Concluir selecionadas{selectedEstimatedMinutes > 0 ? ` · ${selectedEstimatedMinutes} min` : ""}
                {selectedVisibleIds.length > 0 && <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">{selectedVisibleIds.length}</Badge>}
              </Button>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
              <div className="space-y-1">
                <Label className="text-xs">Filtro do edital</Label>
                <Select value={reviewScope} onValueChange={(value: "all" | "current_edital") => { setReviewScope(value); setSelectedReviewIds([]); }}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current_edital">{studyProfile?.target_exam || "Concurso atual"}{studyProfile?.target_position ? ` — ${studyProfile.target_position}` : ""}</SelectItem>
                    <SelectItem value="all">Todos os temas dos próximos 7 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 rounded border border-border/50 bg-muted/20 px-3 py-2">
                <Checkbox checked={visibleDueReviews.length > 0 && selectedVisibleIds.length === visibleDueReviews.length} onCheckedChange={(checked) => toggleAllVisibleReviews(Boolean(checked))} />
                <span className="text-xs text-muted-foreground">Selecionar visíveis</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-4">
              <div className="rounded border border-border/50 bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Revisões</p><p className="text-lg font-semibold">{reviewSummary.total}</p></div>
              <div className="rounded border border-border/50 bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Disciplinas</p><p className="text-lg font-semibold">{reviewSummary.subjects.size}</p></div>
              <div className="rounded border border-border/50 bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Temas</p><p className="text-lg font-semibold">{reviewSummary.topics.size}</p></div>
              <div className="rounded border border-border/50 bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Tempo / urgentes</p><p className="text-lg font-semibold">{reviewSummary.minutes} min · {reviewSummary.urgent}</p></div>
            </div>
            {reviewsPaused && <div className="rounded border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">Pausa rápida ativa: filtro e seleções ficam preservados até você retomar.</div>}
            {visibleDueReviews.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma revisão pendente para esse filtro nos próximos 7 dias.</p> : visibleDueReviews.map(review => (
              <div key={review.id} className="flex items-start gap-3 rounded border border-border/50 bg-muted/20 p-3">
                <Checkbox className="mt-1" checked={selectedReviewIds.includes(review.id)} onCheckedChange={(checked) => toggleReviewSelection(review.id, Boolean(checked))} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{review.topic_name || review.subject_name || "Tema de revisão"}</span>
                    {review.topic_name && <Badge variant="outline" className="text-xs">{review.subject_name}</Badge>}
                    <Badge className="text-xs">{format(new Date(`${review.review_date}T00:00:00`), "dd/MM")}</Badge>
                    <Badge variant={review.priority_rank === 1 ? "destructive" : review.priority_rank === 2 ? "default" : "secondary"} className="text-xs">{review.priority_label}</Badge>
                    <Badge variant={Number(review.forgetting_risk || 0) >= 70 ? "destructive" : "secondary"} className="text-xs">Risco {Math.round(Number(review.forgetting_risk || 0))}%</Badge>
                    <Badge variant="outline" className="text-xs">~{review.estimated_minutes} min</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{review.recommendation}</p>
                  <p className="text-xs text-primary/80 mt-0.5">Prioridade automática pelo risco de lacuna, proximidade da data e escopo do edital · Intervalo atual: {review.interval_days} dia(s)</p>
                </div>
                <Button size="sm" onClick={() => completeReview(review)}>
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Concluir
                </Button>
              </div>
            ))}
            {batchReviewLogs.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4 text-primary" />Histórico de revisões em lote</div>
                {batchReviewLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="rounded border border-border/50 bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm font-medium">{log.after_state?.completedCount || 0} concluídas · {log.after_state?.estimatedMinutes || 0} min</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(log.created_at), "dd/MM HH:mm")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{(log.after_state?.topics || []).slice(0, 6).join(" · ")}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {plannerView === "queue" && (
        <Card className="glass">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary" />Fila Agora</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {nowQueue.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma ação urgente agora.</p> : nowQueue.map(item => (
              <div key={item.id} className="flex items-start gap-3 rounded border border-border/50 bg-muted/20 p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{item.title}</span>
                    <Badge variant="outline" className="text-xs">{item.subjectName}</Badge>
                    <Badge className="text-xs">{item.durationMinutes} min</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{item.reason}</p>
                  <p className="text-xs text-primary/80 mt-0.5">{item.loadHint}</p>
                </div>
                <Button size="sm" onClick={() => handleGoToBlock(item)}>
                  <ArrowRight className="h-3 w-3 mr-1" /> Ir para o bloco
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {plannerView === "audit" && (
        <Card className="glass">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><SearchCheck className="h-4 w-4 text-primary" />Auditoria do Planner</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {auditLogs.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum recálculo auditado ainda.</p> : auditLogs.map(log => (
              <div key={log.id} className="rounded border border-border/50 bg-muted/20 p-3 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{log.event_type}</Badge>
                    <Badge variant="secondary" className="text-xs">{log.event_source}</Badge>
                    {log.user_subjects?.name && <span className="text-xs text-muted-foreground">{log.user_subjects.name}</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">{format(new Date(log.created_at), "dd/MM HH:mm")}</span>
                </div>
                <p className="text-sm">{log.explanation}</p>
                {log.metadata && <p className="text-xs text-muted-foreground">Detalhes: {JSON.stringify(log.metadata)}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Heatmap - 90 days with scroll buttons */}
      {plannerView === "calendar" && <>
      <Card className="glass">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold">Histórico de Intensidade</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Menos</span>
              <div className="flex gap-0.5">
                <div className="w-3 h-3 rounded-full bg-muted" />
                <div className="w-3 h-3 rounded-full bg-primary/30" />
                <div className="w-3 h-3 rounded-full bg-primary/60" />
                <div className="w-3 h-3 rounded-full bg-primary" />
              </div>
              <span>Mais</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const el = document.getElementById("heatmap-scroll");
                if (el) el.scrollBy({ left: -200, behavior: "smooth" });
              }}
              className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div id="heatmap-scroll" className="flex gap-[3px] overflow-x-hidden flex-1">
              {Array.from({ length: 90 }, (_, i) => {
                const d = new Date(); d.setDate(d.getDate() - 89 + i);
                const key = format(d, "yyyy-MM-dd");
                const count = sessionDates.filter(sd => sd === key).length;
                return (
                  <div key={i} className={`w-3 h-3 rounded-sm flex-shrink-0 transition-colors ${count === 0 ? "bg-muted" : count === 1 ? "bg-primary/30" : count === 2 ? "bg-primary/60" : "bg-primary"}`} title={`${format(d, "dd/MM")}: ${count} sessões`} />
                );
              })}
            </div>
            <button
              onClick={() => {
                const el = document.getElementById("heatmap-scroll");
                if (el) el.scrollBy({ left: 200, behavior: "smooth" });
              }}
              className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar Grid - takes most space */}
        <Card className="glass flex-1 min-w-0">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <CardTitle className="text-lg capitalize">
                {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-2">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(wd => (
                <div key={wd} className="text-center text-xs font-semibold text-primary py-1">{wd}</div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7 auto-rows-fr">
              {calendarDays.map((date, i) => {
                const dayBlocks = getBlocksForDate(date);
                const inMonth = isSameMonth(date, currentMonth);
                const today = isToday(date);

                return (
                  <div
                    key={i}
                    className={`border border-border/30 min-h-[60px] lg:min-h-[100px] p-1 transition-colors ${
                      !inMonth ? "opacity-30" : ""
                    } ${today ? "bg-primary/5 border-primary/40" : ""} ${
                      draggedBlock ? "hover:bg-primary/10" : ""
                    }`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, date)}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-xs font-medium ${today ? "text-primary font-bold" : "text-muted-foreground"}`}>
                        {format(date, "d")}
                      </span>
                    </div>

                    {/* Study blocks */}
                    <div className="space-y-0.5">
                      {dayBlocks.map(block => (
                        <div
                          key={block.id}
                          draggable
                          onDragStart={() => handleDragStart(block)}
                          onClick={() => openEditModal(block)}
                          className={`group border rounded px-1 py-0.5 cursor-grab active:cursor-grabbing transition-colors ${highlightedBlockId === block.id ? "bg-primary/30 border-primary shadow-lg" : block.block_type === "review" ? "bg-warning/15 hover:bg-warning/25 border-warning/30" : "bg-primary/15 hover:bg-primary/25 border-primary/20"}`}
                        >
                          <div className="flex items-center gap-0.5">
                            <GripVertical className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] font-semibold text-primary truncate">{block.duration_minutes} min</div>
                              <div className="text-[10px] text-foreground/80 truncate">{block.subject_name || "—"}</div>
                              {block.block_type === "review" && <div className="text-[9px] text-warning truncate">Revisão</div>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add block button */}
                    {inMonth && (
                      <button
                        onClick={() => openAddModal(date)}
                        className="w-full text-[10px] text-muted-foreground hover:text-primary mt-0.5 opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
                      >
                        + Bloco
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Right sidebar: Timer + Quick Session */}
        <div className="w-full lg:w-[320px] shrink-0 space-y-4">
          {/* Pomodoro Timer */}
          <Card className="glass">
            <CardHeader className="py-3"><CardTitle className="text-sm">🍅 Foco Pomodoro</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center gap-4 pb-4">
              {editingPomodoro && !timerRunning ? (
                <div className="flex flex-col items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Tempo (minutos)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={pomodoroMinutes}
                    onChange={e => {
                      const val = Math.max(1, Math.min(120, Number(e.target.value) || 1));
                      setPomodoroMinutes(val);
                      setTimerSeconds(val * 60);
                    }}
                    className="w-24 text-center text-lg font-mono h-12"
                  />
                  <Button size="sm" variant="outline" onClick={() => setEditingPomodoro(false)}>OK</Button>
                </div>
              ) : (
                <div
                  className="text-5xl font-mono font-bold text-primary cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => { if (!timerRunning) setEditingPomodoro(true); }}
                  title="Clique para editar o tempo"
                >
                  {formatTimer(timerSeconds)}
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setTimerRunning(!timerRunning)}>
                  {timerRunning ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                  {timerRunning ? "Pausar" : "Iniciar"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setTimerRunning(false); setTimerSeconds(pomodoroMinutes * 60); setEditingPomodoro(false); }}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
              {!editingPomodoro && !timerRunning && (
                <p className="text-[10px] text-muted-foreground">Clique no timer para ajustar</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Session Form */}
          <Card className="glass">
            <CardHeader className="py-3"><CardTitle className="text-sm">📝 Registro de Sessões Rápido</CardTitle></CardHeader>
            <CardContent className="space-y-3 pb-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Disciplina</Label>
                  <Select value={sessionForm.subject_id} onValueChange={v => setSessionForm(p => ({ ...p, subject_id: v, topic_id: "" }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Tema</Label>
                  <Select value={sessionForm.topic_id} onValueChange={v => setSessionForm(p => ({ ...p, topic_id: v }))} disabled={!sessionForm.subject_id}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>{topics.filter(t => t.subject_id === sessionForm.subject_id).map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Material</Label>
                <Input className="h-8 text-xs" value={sessionForm.material_name} onChange={e => setSessionForm(p => ({ ...p, material_name: e.target.value }))} placeholder="PDF, Videoaula, etc." />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Pág. Início</Label><Input className="h-8 text-xs" type="number" value={sessionForm.pages_start} onChange={e => setSessionForm(p => ({ ...p, pages_start: e.target.value }))} /></div>
                <div><Label className="text-xs">Pág. Fim</Label><Input className="h-8 text-xs" type="number" value={sessionForm.pages_end} onChange={e => setSessionForm(p => ({ ...p, pages_end: e.target.value }))} /></div>
              </div>
              <div>
                <Label className="text-xs">Duração (minutos)</Label>
                <Input className="h-8 text-xs" type="number" value={sessionForm.duration_minutes} onChange={e => setSessionForm(p => ({ ...p, duration_minutes: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Compreensão</Label>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setSessionForm(p => ({ ...p, comprehension_rating: n }))}>
                      <Star className={`h-5 w-5 ${n <= sessionForm.comprehension_rating ? "text-primary fill-primary" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <Button className="w-full" onClick={addSession}><Plus className="h-4 w-4 mr-1" />Adicionar Sessão</Button>
            </CardContent>
          </Card>
        </div>
      </div>
      </>}

      {/* Recent sessions */}
      <Card className="glass">
        <CardHeader className="py-3"><CardTitle className="text-sm">Histórico Recente de Sessões</CardTitle></CardHeader>
        <CardContent>
          {sessions.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma sessão registrada</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2">Data</th><th className="text-left py-2">Disciplina</th><th className="text-left py-2">Material</th><th className="text-left py-2">Págs</th><th className="text-left py-2">Tempo</th><th className="text-left py-2">Compreensão</th><th className="text-left py-2">Ações</th>
                </tr></thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id} className="border-b border-border/50">
                      <td className="py-2">{format(new Date(s.started_at), "dd/MM")}</td>
                      <td>{(s as any).user_subjects?.name || "—"}</td>
                      <td>{s.material_name || (s as any).topics?.name || "—"}</td>
                      <td>{s.pages_start && s.pages_end ? `${s.pages_start}-${s.pages_end}` : "—"}</td>
                      <td>{s.duration_minutes || 0}min</td>
                      <td>{s.comprehension_rating ? "⭐".repeat(s.comprehension_rating) : "—"}</td>
                      <td>—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Block Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Bloco de Estudo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Disciplina</Label>
              <Select value={editForm.subject_id} onValueChange={v => setEditForm(p => ({ ...p, subject_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Material</Label>
              <Input value={editForm.material_name} onChange={e => setEditForm(p => ({ ...p, material_name: e.target.value }))} placeholder="PDF, Videoaula, etc." />
            </div>
            <div>
              <Label>Duração (minutos)</Label>
              <Input type="number" value={editForm.duration_minutes} onChange={e => setEditForm(p => ({ ...p, duration_minutes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            {editingBlock && (
              <Button variant="destructive" size="sm" onClick={() => deleteBlock(editingBlock.id)}>
                <Trash2 className="h-4 w-4 mr-1" /> Excluir
              </Button>
            )}
            <Button onClick={saveBlock}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Block Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar Bloco — {addDate && format(new Date(addDate + "T12:00:00"), "dd/MM/yyyy")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Disciplina</Label>
              <Select value={editForm.subject_id} onValueChange={v => setEditForm(p => ({ ...p, subject_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Material</Label>
              <Input value={editForm.material_name} onChange={e => setEditForm(p => ({ ...p, material_name: e.target.value }))} placeholder="PDF, Videoaula, etc." />
            </div>
            <div>
              <Label>Duração (minutos)</Label>
              <Input type="number" value={editForm.duration_minutes} onChange={e => setEditForm(p => ({ ...p, duration_minutes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={addBlock}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlannerTab;
