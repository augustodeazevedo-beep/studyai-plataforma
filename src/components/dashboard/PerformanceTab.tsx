import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Brain, Clock, FileSearch, ShieldCheck, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface PerformanceTabProps { userId: string; }

const fmtDate = (value: string) => new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

const PerformanceTab = ({ userId }: PerformanceTabProps) => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const loadData = useCallback(async () => {
    const [subRes, topRes, sesRes, schedRes, repRes, srcRes] = await Promise.all([
      supabase.from("user_subjects").select("*").eq("user_id", userId),
      supabase.from("topics").select("*").eq("user_id", userId),
      supabase.from("study_sessions").select("*, user_subjects(name), topics(name)").eq("user_id", userId).order("started_at", { ascending: false }).limit(60),
      (supabase as any).from("topic_review_schedules").select("*, user_subjects(name), topics(name)").eq("user_id", userId).order("forgetting_risk", { ascending: false }),
      (supabase as any).from("content_audit_reports").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
      (supabase as any).from("public_source_audits").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    ]);
    setSubjects(subRes.data || []);
    setTopics(topRes.data || []);
    setSessions(sesRes.data || []);
    setSchedules(schedRes.data || []);
    setReports(repRes.data || []);
    setSources(srcRes.data || []);
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const runAudit = async () => {
    setLoadingAudit(true);
    try {
      const { data, error } = await supabase.functions.invoke("run-continuous-audit", { body: {} });
      if (error || !data?.success) throw new Error(error?.message || data?.error || "Erro na auditoria");
      toast.success("Auditoria concluída e relatório atualizado.");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao executar auditoria");
    } finally {
      setLoadingAudit(false);
    }
  };

  const subjectMetrics = subjects.map((subject) => {
    const subjectSessions = sessions.filter((s) => s.subject_id === subject.id);
    const duration = subjectSessions.reduce((sum, s) => sum + Number(s.duration_minutes || 0), 0);
    const comprehension = subjectSessions.length ? Math.round(subjectSessions.reduce((sum, s) => sum + Number(s.comprehension_rating || 3), 0) / subjectSessions.length * 20) : Number(subject.knowledge_level || 3) * 20;
    const riskRows = schedules.filter((row) => row.subject_id === subject.id);
    const risk = riskRows.length ? Math.round(riskRows.reduce((sum, row) => sum + Number(row.forgetting_risk || 0), 0) / riskRows.length) : 0;
    return { id: subject.id, name: subject.name, comprehension, intensity: Math.min(100, Math.round(duration / 180 * 100)), risk, minutes: duration };
  }).sort((a, b) => b.risk - a.risk);

  const sessionChart = [...sessions].reverse().slice(-14).map((s) => ({
    date: fmtDate(s.started_at),
    minutos: Number(s.duration_minutes || 0),
    compreensão: Number(s.comprehension_rating || 0) * 20,
    disciplina: s.user_subjects?.name || "—",
  }));

  const latestReport = reports[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold font-display flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" />Métricas e Auditoria</h1>
        <Button onClick={runAudit} disabled={loadingAudit} variant="outline"><FileSearch className="h-4 w-4 mr-2" />{loadingAudit ? "Auditando..." : "Executar auditoria"}</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass"><CardContent className="pt-4 text-center"><Brain className="h-6 w-6 mx-auto text-primary mb-1" /><div className="text-2xl font-bold">{Math.round(subjectMetrics.reduce((s, m) => s + m.comprehension, 0) / Math.max(subjectMetrics.length, 1))}%</div><div className="text-xs text-muted-foreground">Compreensão média</div></CardContent></Card>
        <Card className="glass"><CardContent className="pt-4 text-center"><Clock className="h-6 w-6 mx-auto text-primary mb-1" /><div className="text-2xl font-bold">{Math.round(sessions.reduce((s, m) => s + Number(m.duration_minutes || 0), 0) / 60)}h</div><div className="text-xs text-muted-foreground">Últimas sessões</div></CardContent></Card>
        <Card className="glass"><CardContent className="pt-4 text-center"><TrendingUp className="h-6 w-6 mx-auto text-warning mb-1" /><div className="text-2xl font-bold">{Math.round(schedules.reduce((s, m) => s + Number(m.forgetting_risk || 0), 0) / Math.max(schedules.length, 1))}%</div><div className="text-xs text-muted-foreground">Risco médio</div></CardContent></Card>
        <Card className="glass"><CardContent className="pt-4 text-center"><ShieldCheck className="h-6 w-6 mx-auto text-success mb-1" /><div className="text-2xl font-bold">{reports.length}</div><div className="text-xs text-muted-foreground">Relatórios</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass"><CardHeader><CardTitle className="text-sm">Últimas sessões</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={280}><LineChart data={sessionChart}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="date" fontSize={11} /><YAxis fontSize={11} /><Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} /><Line type="monotone" dataKey="minutos" stroke="hsl(var(--primary))" strokeWidth={2} /><Line type="monotone" dataKey="compreensão" stroke="hsl(var(--warning))" strokeWidth={2} /></LineChart></ResponsiveContainer></CardContent></Card>
        <Card className="glass"><CardHeader><CardTitle className="text-sm">Risco por disciplina</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={280}><BarChart data={subjectMetrics.slice(0, 8)}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" fontSize={10} interval={0} angle={-18} textAnchor="end" height={70} /><YAxis fontSize={11} /><Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} /><Bar dataKey="risk" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
      </div>

      <Card className="glass"><CardHeader><CardTitle className="text-sm">Disciplinas e temas</CardTitle></CardHeader><CardContent className="space-y-3">{subjectMetrics.map((metric) => (<div key={metric.id} className="rounded-lg border border-border/60 p-3 space-y-2"><div className="flex items-center justify-between gap-2"><span className="font-medium text-sm">{metric.name}</span><Badge variant={metric.risk >= 70 ? "destructive" : metric.risk >= 45 ? "secondary" : "outline"}>Risco {metric.risk}%</Badge></div><div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs"><div>Compreensão<Progress value={metric.comprehension} className="h-2 mt-1" /></div><div>Intensidade<Progress value={metric.intensity} className="h-2 mt-1" /></div><div>Temas: {topics.filter(t => t.subject_id === metric.id).length}</div></div></div>))}</CardContent></Card>

      <Card className="glass"><CardHeader><CardTitle className="text-sm">Auditoria de fontes e proteção</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">{latestReport?.summary || "Nenhum relatório gerado ainda."}</p>{latestReport?.findings?.map((finding: any, index: number) => (<div key={index} className="rounded-lg border border-border/60 p-3 text-xs"><Badge variant={finding.level === "warning" ? "secondary" : "outline"}>{finding.area}</Badge><p className="mt-2 text-muted-foreground">{finding.message}</p></div>))}<div className="space-y-2">{sources.slice(0, 8).map((source) => (<div key={source.id} className="text-xs border-b border-border/50 pb-2"><p className="font-medium">{source.source_title}</p>{source.source_url && <a href={source.source_url} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">{source.source_url}</a>}<p className="text-muted-foreground">{source.storage_notes}</p></div>))}</div></CardContent></Card>
    </div>
  );
};

export default PerformanceTab;
