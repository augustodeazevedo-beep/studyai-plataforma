import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Clock, Target, BarChart3, Sparkles, CalendarCheck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const motivationalMessages = [
  "Você está na fila. Sua vez vai chegar. 💪",
  "Cada hora de estudo te aproxima da aprovação. 🎯",
  "O caminho é longo, mas você não está sozinho. 🤝",
  "Consistência vence intensidade. Continue! 📚",
  "Sua dedicação de hoje é a sua conquista de amanhã. ⭐",
];

interface OverviewTabProps { userId: string }

const OverviewTab = ({ userId }: OverviewTabProps) => {
  const [stats, setStats] = useState({ subjects: 0, hours: 0, questions: 0, accuracy: 0 });
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [subjectsRes, sessionsRes, attemptsRes, reviewsRes] = await Promise.all([
        supabase.from("user_subjects").select("id").eq("user_id", userId),
        supabase.from("study_sessions").select("duration_minutes, started_at").eq("user_id", userId),
        supabase.from("question_attempts").select("is_correct").eq("user_id", userId),
        supabase.from("spaced_reviews").select("*, user_subjects(name)").eq("user_id", userId).eq("completed", false).lte("review_date", new Date().toISOString().split("T")[0]).order("review_date"),
      ]);

      const subjects = subjectsRes.data?.length || 0;
      const totalMinutes = (sessionsRes.data || []).reduce((a: number, s: any) => a + (s.duration_minutes || 0), 0);
      const totalAttempts = attemptsRes.data?.length || 0;
      const correctAttempts = (attemptsRes.data || []).filter((a: any) => a.is_correct).length;
      const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

      setStats({ subjects, hours: Math.round(totalMinutes / 60 * 10) / 10, questions: totalAttempts, accuracy });
      setPendingReviews((reviewsRes.data || []).slice(0, 5));

      // Weekly chart
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        return d;
      });
      const weekly = days.map(d => {
        const dayStr = d.toISOString().split("T")[0];
        const mins = (sessionsRes.data || [])
          .filter((s: any) => s.started_at?.startsWith(dayStr))
          .reduce((a: number, s: any) => a + (s.duration_minutes || 0), 0);
        return { day: format(d, "EEE", { locale: ptBR }), hours: Math.round(mins / 60 * 10) / 10 };
      });
      setWeeklyData(weekly);
    };
    fetchData();
  }, [userId]);

  const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];

  const statCards = [
    { icon: BookOpen, label: "Disciplinas", value: stats.subjects.toString(), color: "text-primary" },
    { icon: Clock, label: "Horas Estudadas", value: `${stats.hours}h`, color: "text-primary" },
    { icon: Target, label: "Questões", value: stats.questions.toString(), color: "text-primary" },
    { icon: BarChart3, label: "Acurácia", value: stats.questions > 0 ? `${stats.accuracy}%` : "—", color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <Card className="glass border-primary/20">
        <CardContent className="flex items-center gap-4 py-4">
          <Sparkles className="h-8 w-8 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm text-muted-foreground">Mensagem do dia</p>
            <p className="font-display text-lg font-medium">{randomMessage}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="glass">
            <CardContent className="flex items-center gap-3 py-4">
              <stat.icon className={`h-8 w-8 ${stat.color} flex-shrink-0`} />
              <div>
                <p className="text-2xl font-display font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass">
          <CardHeader><CardTitle className="text-base font-display">Horas esta semana</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData}>
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
                <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader><CardTitle className="text-base font-display flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-primary" />Revisões pendentes</CardTitle></CardHeader>
          <CardContent>
            {pendingReviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma revisão pendente hoje! 🎉</p>
            ) : (
              <ul className="space-y-2">
                {pendingReviews.map((r: any) => (
                  <li key={r.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30">
                    <span>{r.user_subjects?.name || "Disciplina"}</span>
                    <span className="text-xs text-muted-foreground">{r.review_date}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OverviewTab;
