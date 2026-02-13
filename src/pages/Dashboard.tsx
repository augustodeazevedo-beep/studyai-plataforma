import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Brain, BookOpen, Clock, Target, BarChart3, Sparkles } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const motivationalMessages = [
  "Você está na fila. Sua vez vai chegar. 💪",
  "Cada hora de estudo te aproxima da aprovação. 🎯",
  "O caminho é longo, mas você não está sozinho. 🤝",
  "Consistência vence intensidade. Continue! 📚",
  "Sua dedicação de hoje é a sua conquista de amanhã. ⭐",
];

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Brain className="h-6 w-6 animate-pulse text-primary" />
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Estudante";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border glass sticky top-0 z-40">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <img src="/logo-cognos.png" alt="COGNOS" className="h-8" />
            <span className="font-display text-lg font-bold hidden sm:block">
              COGNOS <span className="text-primary">Study.AI</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              Olá, <span className="text-foreground font-medium">{displayName}</span>
            </span>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Motivational Banner */}
        <Card className="glass border-primary/20 mb-8">
          <CardContent className="flex items-center gap-4 py-4">
            <Sparkles className="h-8 w-8 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">Mensagem do dia</p>
              <p className="font-display text-lg font-medium">{randomMessage}</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: BookOpen, label: "Disciplinas", value: "—", color: "text-primary" },
            { icon: Clock, label: "Horas Estudadas", value: "0h", color: "text-primary" },
            { icon: Target, label: "Questões", value: "0", color: "text-primary" },
            { icon: BarChart3, label: "Confiança", value: "—", color: "text-primary" },
          ].map((stat) => (
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

        {/* Onboarding Prompt */}
        <Card className="glass border-primary/20">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Configure seu primeiro plano de estudos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Para gerar seu plano personalizado, precisamos saber qual concurso você está estudando,
              suas disciplinas e sua disponibilidade de horários.
            </p>
            <Button className="glow">
              <Sparkles className="mr-2 h-4 w-4" />
              Iniciar Configuração
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
