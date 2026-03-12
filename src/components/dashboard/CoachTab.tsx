import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Brain, Loader2, Sparkles, Calendar, CheckCircle, Clock, Star, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CoachTabProps { userId: string; }

const SRS_INTERVALS = [1, 3, 7, 15, 30]; // days

const CoachTab = ({ userId }: CoachTabProps) => {
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [newReviewSubject, setNewReviewSubject] = useState("");

  const loadData = useCallback(async () => {
    const [histRes, subRes, revRes] = await Promise.all([
      supabase.from("ai_coaching_history").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      supabase.from("user_subjects").select("*").eq("user_id", userId),
      supabase.from("spaced_reviews").select("*, user_subjects(name)").eq("user_id", userId).order("review_date"),
    ]);
    setHistory(histRes.data || []);
    setSubjects(subRes.data || []);
    setReviews(revRes.data || []);
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const generateAdvice = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-coach", { body: {} });
      if (error) throw error;
      setAdvice(data.content || "");
      loadData();
    } catch (e: any) { toast.error(e.message || "Erro ao gerar conselho"); }
    setLoading(false);
  };

  const scheduleReview = async () => {
    if (!newReviewSubject) { toast.error("Selecione uma disciplina"); return; }
    const today = new Date();
    const reviewDate = format(today, "yyyy-MM-dd");

    // Create first review + schedule next
    const nextDate = format(addDays(today, SRS_INTERVALS[0]), "yyyy-MM-dd");

    const { error } = await supabase.from("spaced_reviews").insert({
      user_id: userId,
      subject_id: newReviewSubject,
      review_date: reviewDate,
      interval_days: SRS_INTERVALS[0],
      next_review_date: nextDate,
      completed: false,
    });

    if (error) { toast.error("Erro ao agendar revisão"); return; }
    toast.success("Revisão agendada! Próxima revisão em 1 dia.");
    setNewReviewSubject("");
    loadData();

    // Also create a calendar block for the next review
    await supabase.from("study_calendar_blocks").insert({
      user_id: userId,
      subject_id: newReviewSubject,
      block_date: nextDate,
      duration_minutes: 30,
      material_name: "📝 Revisão SRS",
      order_index: 99,
    });
  };

  const completeReview = async (review: any, rating: number) => {
    // Calculate next interval based on performance
    const currentIntervalIndex = SRS_INTERVALS.indexOf(review.interval_days);
    let nextIntervalIndex: number;

    if (rating >= 4) {
      // Good performance → advance to next interval
      nextIntervalIndex = Math.min(currentIntervalIndex + 1, SRS_INTERVALS.length - 1);
    } else if (rating >= 3) {
      // OK → same interval
      nextIntervalIndex = currentIntervalIndex;
    } else {
      // Poor → go back
      nextIntervalIndex = Math.max(currentIntervalIndex - 1, 0);
    }

    const nextInterval = SRS_INTERVALS[nextIntervalIndex];
    const nextDate = format(addDays(new Date(), nextInterval), "yyyy-MM-dd");

    // Mark current as completed
    await supabase.from("spaced_reviews").update({
      completed: true,
      performance_rating: rating,
    }).eq("id", review.id);

    // Schedule next review (unless max interval and good rating)
    if (!(nextIntervalIndex === SRS_INTERVALS.length - 1 && rating >= 5)) {
      await supabase.from("spaced_reviews").insert({
        user_id: userId,
        subject_id: review.subject_id,
        review_date: nextDate,
        interval_days: nextInterval,
        next_review_date: format(addDays(new Date(), nextInterval * 2), "yyyy-MM-dd"),
        completed: false,
      });

      // Create calendar block for next review
      await supabase.from("study_calendar_blocks").insert({
        user_id: userId,
        subject_id: review.subject_id,
        block_date: nextDate,
        duration_minutes: 30,
        material_name: `📝 Revisão SRS (${nextInterval}d)`,
        order_index: 99,
      });
    }

    toast.success(`Revisão concluída! Próxima em ${nextInterval} dias.`);
    loadData();
  };

  const pendingReviews = reviews.filter(r => !r.completed && (isPast(new Date(r.review_date)) || isToday(new Date(r.review_date))));
  const upcomingReviews = reviews.filter(r => !r.completed && !isPast(new Date(r.review_date)) && !isToday(new Date(r.review_date)));
  const completedReviews = reviews.filter(r => r.completed);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-display">🧠 Coach.IA</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Coach Advice */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4 text-primary" />Conselho Estratégico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {advice ? (
                <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap p-4 bg-muted/20 rounded-lg">{advice}</div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Clique abaixo para receber um conselho personalizado.</p>
                </div>
              )}
              <Button className="w-full" onClick={generateAdvice} disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Analisando...</> : <><Sparkles className="h-4 w-4 mr-1" />Gerar Conselho</>}
              </Button>
            </CardContent>
          </Card>

          {/* Pending Reviews */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Revisões Pendentes ({pendingReviews.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingReviews.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma revisão pendente! 🎉</p>
              ) : (
                pendingReviews.map(r => (
                  <div key={r.id} className="p-3 bg-muted/20 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{r.user_subjects?.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          Intervalo: {r.interval_days}d • Agendada: {format(new Date(r.review_date), "dd/MM", { locale: ptBR })}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isPast(new Date(r.review_date)) && !isToday(new Date(r.review_date)) ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"}`}>
                        {isToday(new Date(r.review_date)) ? "Hoje" : "Atrasada"}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Como foi a revisão?</p>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button key={n} onClick={() => completeReview(r, n)} className="p-1 hover:scale-110 transition-transform">
                            <Star className={`h-5 w-5 ${n <= 3 ? "text-muted-foreground hover:text-warning" : "text-muted-foreground hover:text-primary"}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Upcoming Reviews */}
          {upcomingReviews.length > 0 && (
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Próximas Revisões ({upcomingReviews.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcomingReviews.slice(0, 10).map(r => (
                  <div key={r.id} className="flex items-center justify-between p-2 bg-muted/10 rounded text-sm">
                    <span>{r.user_subjects?.name || "—"}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(r.review_date), "dd/MM", { locale: ptBR })}
                      <span className="text-primary/60">{r.interval_days}d</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Schedule Review */}
          <Card className="glass">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" />Agendar Revisão SRS</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Disciplina</Label>
                <Select value={newReviewSubject} onValueChange={setNewReviewSubject}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="bg-muted/20 rounded p-2 text-xs text-muted-foreground space-y-0.5">
                <p className="font-medium text-foreground/80">Intervalos SRS:</p>
                <p>1d → 3d → 7d → 15d → 30d</p>
                <p>Ajustados pelo seu desempenho</p>
              </div>
              <Button className="w-full" size="sm" onClick={scheduleReview}>
                <Calendar className="h-3 w-3 mr-1" />Agendar
              </Button>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card className="glass">
            <CardHeader><CardTitle className="text-sm">📊 Estatísticas de Revisão</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total completadas</span>
                <span className="font-bold">{completedReviews.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pendentes</span>
                <span className="font-bold text-warning">{pendingReviews.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Agendadas</span>
                <span className="font-bold text-primary">{upcomingReviews.length}</span>
              </div>
              {completedReviews.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Média desempenho</span>
                  <span className="font-bold">
                    {(completedReviews.reduce((a, r) => a + (r.performance_rating || 0), 0) / completedReviews.length).toFixed(1)}/5
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* History */}
          <Card className="glass">
            <CardHeader><CardTitle className="text-sm">Histórico de Conselhos</CardTitle></CardHeader>
            <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
              {history.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum conselho gerado ainda</p> : (
                history.map(h => (
                  <button key={h.id} onClick={() => setAdvice(h.content)} className="w-full text-left p-3 bg-muted/20 rounded-lg hover:bg-muted/40 transition-colors">
                    <div className="text-xs text-muted-foreground mb-1">{format(new Date(h.created_at), "dd/MM/yy HH:mm")}</div>
                    <p className="text-xs line-clamp-3">{h.content}</p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CoachTab;
