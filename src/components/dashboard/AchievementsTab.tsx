import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Lock, Star, BookOpen, Brain, Target, Flame, StickyNote, Layers, Award, Timer, HelpCircle, CheckCircle, CalendarCheck } from "lucide-react";

interface AchievementsTabProps { userId: string; }

const BADGES = [
  { key: "iniciante", name: "Iniciante", desc: "Completou o onboarding", icon: Star },
  { key: "leitor_voraz", name: "Leitor Voraz", desc: "Estudou 50+ horas", icon: BookOpen },
  { key: "entendimento_pleno", name: "Entendimento Pleno", desc: "5 estrelas em 10 sessões", icon: Brain },
  { key: "mestre_materia", name: "Mestre da Matéria", desc: "Completou todos tópicos de uma disciplina", icon: Trophy },
  { key: "esforcado", name: "Esforçado", desc: "7 dias consecutivos de estudo", icon: Flame },
  { key: "anotador", name: "Anotador", desc: "Criou 50+ notas", icon: StickyNote },
  { key: "polimata", name: "Polímata", desc: "Estudou 5+ disciplinas", icon: Layers },
  { key: "conquistador", name: "Conquistador", desc: "Completou 100 tópicos", icon: Award },
  { key: "maratonista", name: "Maratonista", desc: "Sessão de 4+ horas", icon: Timer },
  { key: "questionador", name: "Questionador", desc: "Respondeu 200+ questões", icon: HelpCircle },
  { key: "precisao", name: "Precisão", desc: "80%+ acurácia em 50+ questões", icon: Target },
  { key: "revisor", name: "Revisor", desc: "Completou 20+ revisões", icon: CalendarCheck },
];

const AchievementsTab = ({ userId }: AchievementsTabProps) => {
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [todayHours, setTodayHours] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(2);

  const loadData = useCallback(async () => {
    const [achRes, profileRes, sessionsRes] = await Promise.all([
      supabase.from("user_achievements").select("achievement_key").eq("user_id", userId),
      supabase.from("profiles").select("daily_hours").eq("user_id", userId).maybeSingle(),
      supabase.from("study_sessions").select("duration_minutes, started_at").eq("user_id", userId),
    ]);
    setUnlocked((achRes.data || []).map((a: any) => a.achievement_key));
    setDailyGoal(profileRes.data?.daily_hours || 2);

    const today = new Date().toISOString().split("T")[0];
    const todayMins = (sessionsRes.data || []).filter((s: any) => s.started_at?.startsWith(today)).reduce((a: number, s: any) => a + (s.duration_minutes || 0), 0);
    setTodayHours(Math.round(todayMins / 60 * 10) / 10);
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const pct = dailyGoal > 0 ? Math.min(100, Math.round((todayHours / dailyGoal) * 100)) : 0;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (pct / 100) * circumference;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-display">🏆 Conquistas</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Badges */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {BADGES.map(b => {
              const isUnlocked = unlocked.includes(b.key);
              return (
                <Card key={b.key} className={`glass transition-all ${isUnlocked ? "border-primary/30 glow" : "opacity-50"}`}>
                  <CardContent className="pt-4 text-center">
                    <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${isUnlocked ? "bg-primary/20" : "bg-muted/30"}`}>
                      {isUnlocked ? <b.icon className="h-6 w-6 text-primary" /> : <Lock className="h-6 w-6 text-muted-foreground" />}
                    </div>
                    <div className="font-medium text-sm">{b.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{b.desc}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Daily ring */}
        <Card className="glass">
          <CardHeader><CardTitle className="text-sm">Avanço Diário (Hoje)</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center">
            <svg width="160" height="160" className="mb-4">
              <circle cx="80" cy="80" r={radius} fill="none" stroke="hsl(220,15%,18%)" strokeWidth="10" />
              <circle cx="80" cy="80" r={radius} fill="none" stroke="hsl(192,91%,52%)" strokeWidth="10" strokeDasharray={`${strokeDash} ${circumference}`} strokeLinecap="round" transform="rotate(-90 80 80)" className="transition-all duration-500" />
              <text x="80" y="75" textAnchor="middle" fill="hsl(210,40%,96%)" fontSize="24" fontWeight="bold">{pct}%</text>
              <text x="80" y="95" textAnchor="middle" fill="hsl(215,20%,55%)" fontSize="12">{todayHours}h / {dailyGoal}h</text>
            </svg>
            <p className="text-sm text-muted-foreground text-center">
              {pct >= 100 ? "🎉 Meta diária atingida!" : `Faltam ${Math.max(0, dailyGoal - todayHours).toFixed(1)}h para completar`}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AchievementsTab;
