import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Clock, Target, TrendingUp, CheckCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface AnalysisTabProps { userId: string; }

const AnalysisTab = ({ userId }: AnalysisTabProps) => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [plan, setPlan] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [qForm, setQForm] = useState({ subject_id: "", attempted: "", correct: "" });
  const [reminderText, setReminderText] = useState("");
  const [reminderDate, setReminderDate] = useState("");

  const loadData = useCallback(async () => {
    const [subRes, topRes, sesRes, planRes, attRes, remRes] = await Promise.all([
      supabase.from("user_subjects").select("*").eq("user_id", userId),
      supabase.from("topics").select("*").eq("user_id", userId),
      supabase.from("study_sessions").select("*").eq("user_id", userId),
      supabase.from("study_plan").select("*, user_subjects(name)").eq("user_id", userId),
      supabase.from("question_attempts").select("*, questions(subject_id)").eq("user_id", userId),
      supabase.from("reminders").select("*").eq("user_id", userId).eq("completed", false).order("reminder_date"),
    ]);
    setSubjects(subRes.data || []);
    setTopics(topRes.data || []);
    setSessions(sesRes.data || []);
    setPlan(planRes.data || []);
    setAttempts(attRes.data || []);
    setReminders(remRes.data || []);
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalHours = Math.round(sessions.reduce((a, s) => a + (s.duration_minutes || 0), 0) / 60 * 10) / 10;
  const completedTopics = topics.filter(t => t.completed).length;
  const completionPct = topics.length > 0 ? Math.round((completedTopics / topics.length) * 100) : 0;
  const totalAttempts = attempts.length;
  const correctAttempts = attempts.filter(a => a.is_correct).length;
  const avgAccuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

  // Radar data from study_plan
  const radarData = plan.map((p: any) => ({
    subject: p.user_subjects?.name || "?",
    Relevância: p.relevance || 0,
    Incidência: p.incidence || 0,
    Acurácia: p.accuracy || 0,
    Desempenho: p.performance || 0,
    Lacuna: p.gap_score || 0,
  }));

  // Accuracy per subject
  const accuracyBySubject = subjects.map(s => {
    const subAttempts = attempts.filter(a => a.questions?.subject_id === s.id);
    const correct = subAttempts.filter(a => a.is_correct).length;
    return { name: s.name.substring(0, 15), acurácia: subAttempts.length > 0 ? Math.round((correct / subAttempts.length) * 100) : 0 };
  }).filter(s => s.acurácia > 0);

  const registerQuestions = async () => {
    if (!qForm.subject_id || !qForm.attempted) { toast.error("Preencha os campos"); return; }
    toast.success("Questões registradas!");
    setQForm({ subject_id: "", attempted: "", correct: "" });
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
      <h1 className="text-2xl font-bold font-display">📊 Análise de Batalha</h1>

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
          {/* Progress by subject */}
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

          {/* Radar */}
          {radarData.length > 0 && (
            <Card className="glass">
              <CardHeader><CardTitle className="text-sm">Análise de 5 Eixos</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(220,15%,18%)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(215,20%,55%)", fontSize: 10 }} />
                    <PolarRadiusAxis tick={{ fill: "hsl(215,20%,55%)", fontSize: 9 }} />
                    <Radar name="Relevância" dataKey="Relevância" stroke="hsl(192,91%,52%)" fill="hsl(192,91%,52%)" fillOpacity={0.2} />
                    <Radar name="Lacuna" dataKey="Lacuna" stroke="hsl(0,72%,51%)" fill="hsl(0,72%,51%)" fillOpacity={0.1} />
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
