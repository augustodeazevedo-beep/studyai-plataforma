import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, Target, TrendingUp, CheckCircle, Plus, Loader2, Sparkles, AlertTriangle, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { checkAchievements } from "@/lib/checkAchievements";
import {
  buildDisciplinesFromData,
  buildPsycheState,
  calculateDisciplinePriorities,
  getStudyRecommendations,
  calculatePsycheIndex,
  type DisciplinePriority,
  type StudyRecommendation,
} from "@/lib/adaptive-algorithm";

interface AnalysisTabProps { userId: string; }

const AnalysisTab = ({ userId }: AnalysisTabProps) => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [plan, setPlan] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [psycheProfile, setPsycheProfile] = useState<any>(null);
  const [reminders, setReminders] = useState<any[]>([]);
  const [qForm, setQForm] = useState({ subject_id: "", attempted: "", correct: "" });
  const [reminderText, setReminderText] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [priorities, setPriorities] = useState<DisciplinePriority[]>([]);
  const [recommendations, setRecommendations] = useState<StudyRecommendation[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    const [subRes, topRes, sesRes, planRes, attRes, revRes, psyRes, remRes, checkRes] = await Promise.all([
      supabase.from("user_subjects").select("*").eq("user_id", userId),
      supabase.from("topics").select("*").eq("user_id", userId),
      supabase.from("study_sessions").select("*").eq("user_id", userId),
      supabase.from("study_plan").select("*, user_subjects(name)").eq("user_id", userId),
      supabase.from("question_attempts").select("*, questions(subject_id)").eq("user_id", userId),
      supabase.from("spaced_reviews").select("*").eq("user_id", userId),
      supabase.from("psyche_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("reminders").select("*").eq("user_id", userId).eq("completed", false).order("reminder_date"),
      supabase.from("psyche_checkins").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
    ]);
    const subs = subRes.data || [];
    const sess = sesRes.data || [];
    const atts = attRes.data || [];
    setSubjects(subs);
    setTopics(topRes.data || []);
    setSessions(sess);
    setPlan(planRes.data || []);
    setAttempts(atts);
    setReviews(revRes.data || []);
    setPsycheProfile(psyRes.data);
    setReminders(remRes.data || []);
    setCheckins(checkRes.data || []);

    // Calculate G-Force priorities using the formal algorithm
    const disciplines = buildDisciplinesFromData(subs, sess, atts);
    const psycheState = buildPsycheState(psyRes.data, checkRes.data || []);
    const prios = calculateDisciplinePriorities(disciplines, psycheState);
    setPriorities(prios);
    setRecommendations(getStudyRecommendations(prios));
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalHours = Math.round(sessions.reduce((a, s) => a + (s.duration_minutes || 0), 0) / 60 * 10) / 10;
  const completedTopics = topics.filter(t => t.completed).length;
  const completionPct = topics.length > 0 ? Math.round((completedTopics / topics.length) * 100) : 0;
  const totalAttempts = attempts.length;
  const correctAttempts = attempts.filter(a => a.is_correct).length;
  const avgAccuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

  // === G-FORCE from formal algorithm ===
  const psycheState = buildPsycheState(psycheProfile, checkins);
  const psycheIndex = calculatePsycheIndex(psycheState);

  // Aggregate vectors from priorities
  const avgVectors = priorities.length > 0 ? {
    relevance: Math.round(priorities.reduce((s, p) => s + p.vectors.relevance, 0) / priorities.length),
    incidence: Math.round(priorities.reduce((s, p) => s + p.vectors.incidence, 0) / priorities.length),
    comprehension: Math.round(priorities.reduce((s, p) => s + (100 - p.vectors.comprehension), 0) / priorities.length), // Show as mastery, not gap
    intensity: Math.round(priorities.reduce((s, p) => s + p.vectors.intensity, 0) / priorities.length),
    psyche: psycheIndex,
  } : { relevance: 0, incidence: 0, comprehension: 0, intensity: 0, psyche: 0 };

  const gForceData = [
    { vector: "Relevância", value: avgVectors.relevance, fullMark: 100 },
    { vector: "Incidência", value: avgVectors.incidence, fullMark: 100 },
    { vector: "Compreensão", value: avgVectors.comprehension, fullMark: 100 },
    { vector: "Intensidade", value: avgVectors.intensity, fullMark: 100 },
    { vector: "Psique", value: avgVectors.psyche, fullMark: 100 },
  ];

  // Per-subject radar
  const subjectRadarData = plan.map((p: any) => ({
    subject: (p.user_subjects?.name || "?").substring(0, 12),
    Relevância: (p.relevance || 0) * 20,
    Incidência: (p.incidence || 0) * 20,
    Acurácia: (p.accuracy || 0) * 20,
    Desempenho: (p.performance || 0) * 20,
    Lacuna: (p.gap_score || 0) * 20,
  }));

  // Accuracy per subject
  const accuracyBySubject = subjects.map(s => {
    const subAttempts = attempts.filter(a => a.questions?.subject_id === s.id);
    const correct = subAttempts.filter(a => a.is_correct).length;
    return { name: s.name.substring(0, 15), acurácia: subAttempts.length > 0 ? Math.round((correct / subAttempts.length) * 100) : 0 };
  }).filter(s => s.acurácia > 0);

  const registerQuestions = async () => {
    if (!qForm.subject_id || !qForm.attempted) { toast.error("Preencha os campos"); return; }
    const attempted = parseInt(qForm.attempted);
    const correct = parseInt(qForm.correct) || 0;
    if (attempted <= 0 || correct < 0 || correct > attempted) { toast.error("Valores inválidos"); return; }

    try {
      for (let i = 0; i < attempted; i++) {
        const { data: qData, error: qError } = await supabase.from("questions").insert({
          user_id: userId, subject_id: qForm.subject_id,
          question_text: `Questão registrada #${Date.now()}-${i}`, correct_option: 0, options: [],
        }).select("id").single();
        if (qError || !qData) continue;
        await supabase.from("question_attempts").insert({
          user_id: userId, question_id: qData.id, selected_option: 0, is_correct: i < correct,
        });
      }
      toast.success(`${attempted} questões registradas (${correct} corretas)!`);
      setQForm({ subject_id: "", attempted: "", correct: "" });
      loadData();
      checkAchievements(userId);
    } catch { toast.error("Erro ao registrar questões"); }
  };

  const generateStudyPlan = async () => {
    setGeneratingPlan(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) { toast.error("Faça login novamente"); return; }
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-study-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Erro ao gerar plano");
      toast.success("Plano de estudos gerado com IA! 🎯");
      loadData();
    } catch (e: any) { toast.error(e.message || "Erro ao gerar plano"); }
    finally { setGeneratingPlan(false); }
  };

  const addReminder = async () => {
    if (!reminderText || !reminderDate) return;
    await supabase.from("reminders").insert({ user_id: userId, text: reminderText, reminder_date: reminderDate });
    setReminderText(""); setReminderDate("");
    loadData();
    toast.success("Lembrete adicionado");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold font-display">📊 Análise de Batalha</h1>
        <Button onClick={generateStudyPlan} disabled={generatingPlan}>
          {generatingPlan ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          {generatingPlan ? "Gerando..." : "Gerar Plano com IA"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass"><CardContent className="pt-4 text-center"><Clock className="h-6 w-6 mx-auto text-primary mb-1" /><div className="text-2xl font-bold">{totalHours}h</div><div className="text-xs text-muted-foreground">Horas Totais</div></CardContent></Card>
        <Card className="glass"><CardContent className="pt-4 text-center"><Target className="h-6 w-6 mx-auto text-primary mb-1" /><div className="text-2xl font-bold">{completionPct}%</div><div className="text-xs text-muted-foreground">Taxa de Conclusão</div></CardContent></Card>
        <Card className="glass"><CardContent className="pt-4 text-center"><TrendingUp className="h-6 w-6 mx-auto text-success mb-1" /><div className="text-2xl font-bold">{avgAccuracy}%</div><div className="text-xs text-muted-foreground">Eficiência Média</div></CardContent></Card>
        <Card className="glass"><CardContent className="pt-4 text-center"><CheckCircle className="h-6 w-6 mx-auto text-warning mb-1" /><div className="text-2xl font-bold">{completedTopics}</div><div className="text-xs text-muted-foreground">Tópicos Dominados</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* G-FORCE SENSOR — 5 Vectors */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                🏎️ Sensor G-Force Study.AI — 5 Vetores
              </CardTitle>
              <p className="text-xs text-muted-foreground">Visão global da sua situação com base nos 5 vetores do motor de estudo</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={gForceData} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid stroke="hsl(220,15%,25%)" strokeDasharray="3 3" />
                  <PolarAngleAxis
                    dataKey="vector"
                    tick={{ fill: "hsl(215,20%,65%)", fontSize: 12, fontWeight: 600 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: "hsl(215,20%,45%)", fontSize: 9 }}
                    tickCount={6}
                  />
                  <Radar
                    name="Seu Nível"
                    dataKey="value"
                    stroke="hsl(192,91%,52%)"
                    fill="hsl(192,91%,52%)"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
              {/* Vector values */}
              <div className="grid grid-cols-5 gap-2 mt-2">
                {gForceData.map(d => (
                  <div key={d.vector} className="text-center">
                    <div className={`text-lg font-bold ${d.value >= 60 ? "text-primary" : d.value >= 40 ? "text-warning" : "text-destructive"}`}>
                      {d.value}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">{d.vector}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* G-Force Recommendations */}
          {recommendations.length > 0 && (
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <ArrowUp className="h-4 w-4 text-primary" />Recomendações G-Force
                </CardTitle>
                <p className="text-xs text-muted-foreground">Prioridades calculadas pelo algoritmo adaptativo</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {recommendations.slice(0, 5).map((rec) => {
                  const colorMap = {
                    critical: "bg-destructive/10 border-destructive/30 text-destructive",
                    high: "bg-warning/10 border-warning/30 text-warning",
                    medium: "bg-primary/10 border-primary/30 text-primary",
                    low: "bg-muted/20 border-border text-muted-foreground",
                  };
                  const badgeMap = {
                    critical: "destructive" as const,
                    high: "secondary" as const,
                    medium: "outline" as const,
                    low: "outline" as const,
                  };
                  return (
                    <div key={rec.disciplineId} className={`p-3 rounded-lg border ${colorMap[rec.priority]}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{rec.disciplineName}</span>
                        <Badge variant={badgeMap[rec.priority]} className="text-[10px]">
                          {rec.priority === "critical" ? "🔴 Crítico" : rec.priority === "high" ? "🟡 Alto" : rec.priority === "medium" ? "🟢 Médio" : "⚪ Baixo"}
                        </Badge>
                      </div>
                      <p className="text-xs opacity-80">{rec.reason}</p>
                      <p className="text-xs font-medium mt-1">{rec.suggestedAction}</p>
                      <p className="text-[10px] opacity-60 mt-1">⏱️ {rec.estimatedMinutes} min sugeridos</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}


          <Card className="glass">
            <CardHeader><CardTitle className="text-sm">Progresso por Disciplina</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {subjects.map(s => {
                const subTopics = topics.filter(t => t.subject_id === s.id);
                const done = subTopics.filter(t => t.completed).length;
                const pct = subTopics.length > 0 ? Math.round((done / subTopics.length) * 100) : 0;
                return (
                  <div key={s.id}>
                    <div className="flex justify-between text-xs mb-1"><span>{s.name}</span><span>{done}/{subTopics.length}</span></div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Accuracy chart */}
          {accuracyBySubject.length > 0 && (
            <Card className="glass">
              <CardHeader><CardTitle className="text-sm">Desempenho em Questões</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={accuracyBySubject}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,18%)" />
                    <XAxis dataKey="name" tick={{ fill: "hsl(215,20%,55%)", fontSize: 11 }} />
                    <YAxis tick={{ fill: "hsl(215,20%,55%)", fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="acurácia" fill="hsl(192,91%,52%)" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Per-subject radar */}
          {subjectRadarData.length > 0 && (
            <Card className="glass">
              <CardHeader><CardTitle className="text-sm">Análise por Disciplina</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={subjectRadarData}>
                    <PolarGrid stroke="hsl(220,15%,18%)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(215,20%,55%)", fontSize: 10 }} />
                    <PolarRadiusAxis tick={{ fill: "hsl(215,20%,55%)", fontSize: 9 }} />
                    <Radar name="Relevância" dataKey="Relevância" stroke="hsl(192,91%,52%)" fill="hsl(192,91%,52%)" fillOpacity={0.2} />
                    <Radar name="Lacuna" dataKey="Lacuna" stroke="hsl(0,72%,51%)" fill="hsl(0,72%,51%)" fillOpacity={0.1} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick questions */}
          <Card className="glass">
            <CardHeader><CardTitle className="text-sm">📝 Registro de Questões</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={qForm.subject_id} onValueChange={v => setQForm(p => ({ ...p, subject_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Disciplina" /></SelectTrigger>
                <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" placeholder="Tentadas" value={qForm.attempted} onChange={e => setQForm(p => ({ ...p, attempted: e.target.value }))} />
              <Input type="number" placeholder="Corretas" value={qForm.correct} onChange={e => setQForm(p => ({ ...p, correct: e.target.value }))} />
              <Button className="w-full" size="sm" onClick={registerQuestions}>Registrar</Button>
            </CardContent>
          </Card>

          {/* Reminders */}
          <Card className="glass">
            <CardHeader><CardTitle className="text-sm">🔔 Lembretes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {reminders.map(r => (
                <div key={r.id} className="text-xs p-2 bg-muted/30 rounded"><span className="text-muted-foreground">{r.reminder_date}:</span> {r.text}</div>
              ))}
              <Input placeholder="Lembrete..." value={reminderText} onChange={e => setReminderText(e.target.value)} className="text-xs h-8" />
              <Input type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)} className="text-xs h-8" />
              <Button size="sm" variant="outline" className="w-full" onClick={addReminder}><Plus className="h-3 w-3 mr-1" />Adicionar</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AnalysisTab;
