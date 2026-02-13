import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Play, Pause, RotateCcw, Star, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PlannerTabProps { userId: string; }

const PlannerTab = ({ userId }: PlannerTabProps) => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [formData, setFormData] = useState({ subject_id: "", material_name: "", pages_start: "", pages_end: "", duration_minutes: "", comprehension_rating: 3 });

  const loadData = useCallback(async () => {
    const [subRes, sesRes] = await Promise.all([
      supabase.from("user_subjects").select("*").eq("user_id", userId),
      supabase.from("study_sessions").select("*, user_subjects(name)").eq("user_id", userId).order("started_at", { ascending: false }).limit(10),
    ]);
    setSubjects(subRes.data || []);
    setSessions(sesRes.data || []);
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 0) { setTimerRunning(false); toast.success("Pomodoro concluído! 🎉"); return 25 * 60; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTimer = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const addSession = async () => {
    if (!formData.subject_id) { toast.error("Selecione uma disciplina"); return; }
    const { error } = await supabase.from("study_sessions").insert({
      user_id: userId, subject_id: formData.subject_id, material_name: formData.material_name || null,
      pages_start: formData.pages_start ? parseInt(formData.pages_start) : null,
      pages_end: formData.pages_end ? parseInt(formData.pages_end) : null,
      duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : 0,
      comprehension_rating: formData.comprehension_rating,
      started_at: new Date().toISOString(),
    });
    if (error) { toast.error("Erro ao salvar sessão"); return; }
    toast.success("Sessão registrada!");
    setFormData({ subject_id: "", material_name: "", pages_start: "", pages_end: "", duration_minutes: "", comprehension_rating: 3 });
    loadData();
  };

  // Heatmap data
  const sessionDates = sessions.map(s => format(new Date(s.started_at), "yyyy-MM-dd"));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-display">🗓️ Planner</h1>

      {/* Heatmap */}
      <Card className="glass">
        <CardHeader><CardTitle className="text-sm">Intensidade de Estudo (últimos dias)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: 30 }, (_, i) => {
              const d = new Date(); d.setDate(d.getDate() - 29 + i);
              const key = format(d, "yyyy-MM-dd");
              const count = sessionDates.filter(sd => sd === key).length;
              return (
                <div key={i} className={`w-4 h-4 rounded-sm ${count === 0 ? "bg-muted" : count === 1 ? "bg-primary/30" : count === 2 ? "bg-primary/60" : "bg-primary"}`} title={`${key}: ${count} sessões`} />
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="glass lg:col-span-2">
          <CardHeader><CardTitle>Calendário</CardTitle></CardHeader>
          <CardContent>
            <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} locale={ptBR} className="rounded-md" />
          </CardContent>
        </Card>

        {/* Right column: Timer + Quick Session */}
        <div className="space-y-4">
          {/* Pomodoro Timer */}
          <Card className="glass">
            <CardHeader><CardTitle className="text-sm">🍅 Foco Pomodoro</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="text-5xl font-mono font-bold text-primary">{formatTimer(timerSeconds)}</div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setTimerRunning(!timerRunning)}>
                  {timerRunning ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                  {timerRunning ? "Pausar" : "Iniciar"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setTimerRunning(false); setTimerSeconds(25 * 60); }}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Session Form */}
          <Card className="glass">
            <CardHeader><CardTitle className="text-sm">📝 Registro Rápido</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Disciplina</Label>
                <Select value={formData.subject_id} onValueChange={v => setFormData(p => ({ ...p, subject_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Material</Label>
                <Input value={formData.material_name} onChange={e => setFormData(p => ({ ...p, material_name: e.target.value }))} placeholder="Nome do material" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Pág. Início</Label><Input type="number" value={formData.pages_start} onChange={e => setFormData(p => ({ ...p, pages_start: e.target.value }))} /></div>
                <div><Label className="text-xs">Pág. Fim</Label><Input type="number" value={formData.pages_end} onChange={e => setFormData(p => ({ ...p, pages_end: e.target.value }))} /></div>
              </div>
              <div>
                <Label className="text-xs">Duração (min)</Label>
                <Input type="number" value={formData.duration_minutes} onChange={e => setFormData(p => ({ ...p, duration_minutes: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Compreensão</Label>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setFormData(p => ({ ...p, comprehension_rating: n }))}>
                      <Star className={`h-5 w-5 ${n <= formData.comprehension_rating ? "text-warning fill-warning" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <Button className="w-full" onClick={addSession}><Plus className="h-4 w-4 mr-1" />Adicionar Sessão</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent sessions */}
      <Card className="glass">
        <CardHeader><CardTitle className="text-sm">Sessões Recentes</CardTitle></CardHeader>
        <CardContent>
          {sessions.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma sessão registrada</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2">Data</th><th className="text-left py-2">Disciplina</th><th className="text-left py-2">Material</th><th className="text-left py-2">Duração</th><th className="text-left py-2">⭐</th>
                </tr></thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id} className="border-b border-border/50">
                      <td className="py-2">{format(new Date(s.started_at), "dd/MM")}</td>
                      <td>{(s as any).user_subjects?.name || "—"}</td>
                      <td>{s.material_name || "—"}</td>
                      <td>{s.duration_minutes || 0}min</td>
                      <td>{s.comprehension_rating ? "⭐".repeat(s.comprehension_rating) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PlannerTab;
