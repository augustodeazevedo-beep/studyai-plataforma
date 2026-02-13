import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

interface ProgressTabProps { userId: string }

const COLORS = ["hsl(192, 91%, 52%)", "hsl(210, 78%, 56%)", "hsl(270, 60%, 52%)", "hsl(142, 76%, 36%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)"];

const ProgressTab = ({ userId }: ProgressTabProps) => {
  const [subjectHours, setSubjectHours] = useState<any[]>([]);
  const [accuracyData, setAccuracyData] = useState<any[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [sessionsRes, attemptsRes, subjectsRes] = await Promise.all([
        supabase.from("study_sessions").select("subject_id, duration_minutes, started_at").eq("user_id", userId),
        supabase.from("question_attempts").select("is_correct, created_at, questions(subject_id)").eq("user_id", userId),
        supabase.from("user_subjects").select("*").eq("user_id", userId),
      ]);

      const subjects = subjectsRes.data || [];
      const sessions = sessionsRes.data || [];
      const attempts = attemptsRes.data || [];

      // Hours per subject
      const hoursMap: Record<string, number> = {};
      sessions.forEach((s: any) => { hoursMap[s.subject_id] = (hoursMap[s.subject_id] || 0) + (s.duration_minutes || 0) / 60; });
      setSubjectHours(subjects.map((s: any) => ({ name: s.name, hours: Math.round((hoursMap[s.id] || 0) * 10) / 10 })));

      // Accuracy per subject
      const accMap: Record<string, { correct: number; total: number }> = {};
      attempts.forEach((a: any) => {
        const sid = a.questions?.subject_id;
        if (!sid) return;
        if (!accMap[sid]) accMap[sid] = { correct: 0, total: 0 };
        accMap[sid].total++;
        if (a.is_correct) accMap[sid].correct++;
      });
      setAccuracyData(subjects.map((s: any) => ({
        name: s.name,
        accuracy: accMap[s.id] ? Math.round((accMap[s.id].correct / accMap[s.id].total) * 100) : 0,
      })));

      // Weekly trend (last 4 weeks)
      const weeks: any[] = [];
      for (let i = 3; i >= 0; i--) {
        const start = new Date(); start.setDate(start.getDate() - (i + 1) * 7);
        const end = new Date(); end.setDate(end.getDate() - i * 7);
        const mins = sessions.filter((s: any) => {
          const d = new Date(s.started_at);
          return d >= start && d < end;
        }).reduce((a: number, s: any) => a + (s.duration_minutes || 0), 0);
        weeks.push({ week: `S-${4 - i}`, hours: Math.round(mins / 60 * 10) / 10 });
      }
      setWeeklyTrend(weeks);
    };
    fetchData();
  }, [userId]);

  const tooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-display font-bold flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Progresso</h2>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass">
          <CardHeader><CardTitle className="text-base">Horas por disciplina</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={subjectHours} layout="vertical">
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={100} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader><CardTitle className="text-base">Acurácia por disciplina</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={accuracyData}>
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} angle={-30} textAnchor="end" height={60} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="accuracy" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Evolução semanal (horas)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weeklyTrend}>
                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="hours" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProgressTab;
