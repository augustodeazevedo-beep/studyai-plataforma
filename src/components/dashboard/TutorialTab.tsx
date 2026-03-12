import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, Brain, Target, BarChart3, Zap, Heart, BookOpen, Calendar, Swords, LineChart, NotebookPen, Sparkles, GraduationCap, MessageSquare, Trophy, Settings, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

interface TutorialTabProps {
  userId: string;
}

const TOOLS: { key: string; label: string; tables: string[] }[] = [
  { key: "planner", label: "Planner (Sessões + Blocos)", tables: ["study_sessions", "study_calendar_blocks"] },
  { key: "arsenal", label: "Arsenal (Disciplinas + Tópicos + Materiais)", tables: ["user_subjects", "topics", "study_materials"] },
  { key: "analysis", label: "Análise (Questões + Tentativas + Plano)", tables: ["questions", "question_attempts", "study_plan"] },
  { key: "notebooks", label: "Cadernos (Notas)", tables: ["user_notes"] },
  { key: "flashcards", label: "Flashcards", tables: ["flashcards"] },
  { key: "reviews", label: "Revisões Espaçadas", tables: ["spaced_reviews"] },
  { key: "reminders", label: "Lembretes", tables: ["reminders"] },
  { key: "achievements", label: "Conquistas", tables: ["user_achievements"] },
  { key: "coaching", label: "Coach.IA (Histórico)", tables: ["ai_coaching_history"] },
  { key: "psyche", label: "Bem-Estar (Perfil + Check-ins)", tables: ["psyche_profiles", "psyche_checkins"] },
];

const FLOW_STEPS = [
  { icon: Heart, label: "Anamnese", desc: "Preencha seu perfil neurocognitivo na aba Bem-Estar" },
  { icon: Swords, label: "Upload do Edital", desc: "Envie o PDF do edital no Arsenal para extração automática por IA" },
  { icon: Settings, label: "Configurações", desc: "Defina suas horas diárias, dias de estudo e meta de questões" },
  { icon: Calendar, label: "Estudar", desc: "Use o Planner com Pomodoro editável para registrar sessões" },
  { icon: BarChart3, label: "Questões", desc: "Resolva questões na Análise e acompanhe o G-Force" },
  { icon: GraduationCap, label: "Revisões SRS", desc: "Complete revisões espaçadas no Coach.IA" },
  { icon: Sparkles, label: "Previsão", desc: "Gere sua previsão de aprovação no Previsor.IA" },
];

const TutorialTab = ({ userId }: TutorialTabProps) => {
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; label: string; tables: string[] }>({ open: false, label: "", tables: [] });
  const [loading, setLoading] = useState(false);

  const resetTables = async (tables: string[], label: string) => {
    setLoading(true);
    try {
      for (const table of tables) {
        await supabase.from(table as any).delete().eq("user_id", userId);
      }
      toast.success(`${label} resetado com sucesso!`);
    } catch {
      toast.error("Erro ao resetar dados");
    }
    setLoading(false);
    setConfirmDialog({ open: false, label: "", tables: [] });
  };

  const resetAll = () => {
    const allTables = TOOLS.flatMap(t => t.tables);
    const unique = [...new Set(allTables)];
    setConfirmDialog({ open: true, label: "Todos os Dados do Aplicativo", tables: unique });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" /> Tutorial & Estratégia COGNOS
        </h2>
        <p className="text-sm text-muted-foreground">Entenda a arquitetura por trás da sua aprovação e como extrair o máximo da plataforma.</p>
      </div>

      {/* Philosophy */}
      <Card className="glass border-primary/20">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> A Filosofia COGNOS</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-foreground/90">
          <p>O COGNOS não é um rastreador de horas. É um <span className="text-primary font-semibold">sistema de inteligência algorítmica</span> projetado sobre dois pilares da neurociência:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Curva do Esquecimento (Ebbinghaus):</strong> Sem revisão espaçada, você esquece ~70% em 24h. O sistema SRS do Coach.IA combate isso com intervalos adaptativos.</li>
            <li><strong>Carga Cognitiva (Sweller):</strong> Estudar o que já domina desperdiça energia. O G-Force identifica onde seu esforço está desalinhado da necessidade real.</li>
          </ul>
          <p className="text-muted-foreground italic">A plataforma adota uma abordagem empática e não punitiva — especialmente para estudantes neurodivergentes ou sob estresse. Cada estímulo visual e mensagem foi pensado para incentivar persistência sem gerar culpa.</p>
        </CardContent>
      </Card>

      {/* The Cycle */}
      <Card className="glass">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> O Ciclo de Feedback Contínuo</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-foreground/90">
          <p>Toda decisão da IA se baseia em um ciclo de 5 etapas que se retroalimenta:</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li><strong>Mapeamento:</strong> Você define o território (edital) no <span className="text-primary font-semibold">Arsenal</span>. A IA extrai disciplinas, tópicos, relevância e incidência automaticamente do PDF.</li>
            <li><strong>Execução:</strong> Você estuda no <span className="text-primary font-semibold">Planner</span> (com Pomodoro editável de 1–120 min) e registra cada sessão com compreensão e páginas.</li>
            <li><strong>Coleta:</strong> O sistema captura automaticamente seu tempo líquido, taxa de acertos em questões, nível de compreensão e estado emocional (check-ins diários).</li>
            <li><strong>Otimização:</strong> A IA cruza os 5 vetores no <span className="text-primary font-semibold">G-Force</span> para identificar lacunas. O <span className="text-primary font-semibold">Previsor.IA</span> calcula quantos dias faltam. O <span className="text-primary font-semibold">Coach.IA</span> agenda revisões SRS.</li>
            <li><strong>Correção de Rota:</strong> Com base nos dados consolidados, o Coach.IA e o Professor.IA geram feedback estratégico e materiais de reforço onde você mais precisa.</li>
          </ol>
          <p className="font-medium text-primary">Seu trabalho: alimentar o sistema com dados honestos. O trabalho da IA: transformar esses dados em estratégia de aprovação.</p>
        </CardContent>
      </Card>

      {/* 5 Vectors */}
      <Card className="glass border-primary/20">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Os 5 Vetores do G-Force</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-foreground/90">O gráfico Radar <strong>G-Force</strong> (aba Análise) é o "sensor central" da plataforma. Ele compara sua situação <span className="text-destructive font-semibold">Real</span> com a <span className="text-primary font-semibold">Ideal</span> em 5 dimensões:</p>
          
          <div className="grid gap-3">
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="font-semibold text-primary flex items-center gap-2"><Target className="h-3.5 w-3.5" /> 1. Relevância</p>
              <p className="text-muted-foreground mt-1">Quanto peso a disciplina tem no edital (definido no Arsenal). Matérias com alta relevância devem receber mais atenção.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Fonte: Campo "peso" em user_subjects</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="font-semibold text-primary flex items-center gap-2"><BarChart3 className="h-3.5 w-3.5" /> 2. Incidência</p>
              <p className="text-muted-foreground mt-1">Frequência histórica com que o tópico aparece em provas. Extraída automaticamente do edital pela IA ou definida manualmente.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Fonte: Campo "incidence" no study_plan</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="font-semibold text-primary flex items-center gap-2"><BookOpen className="h-3.5 w-3.5" /> 3. Compreensão</p>
              <p className="text-muted-foreground mt-1">Sua autoavaliação de entendimento ao final de cada sessão de estudo (1–5 estrelas). Indica profundidade de aprendizado, não apenas tempo gasto.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Fonte: Média de comprehension_rating em study_sessions</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="font-semibold text-primary flex items-center gap-2"><Zap className="h-3.5 w-3.5" /> 4. Intensidade</p>
              <p className="text-muted-foreground mt-1">Volume de horas líquidas dedicadas à disciplina. Reflete consistência e esforço real — não apenas intenção.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Fonte: Soma de duration_minutes em study_sessions</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="font-semibold text-primary flex items-center gap-2"><Heart className="h-3.5 w-3.5" /> 5. Psique</p>
              <p className="text-muted-foreground mt-1">Seu estado emocional e cognitivo. Calculado a partir dos check-ins diários (humor, estresse, energia, foco) e do perfil neurocognitivo da anamnese.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Fonte: psyche_profiles + psyche_checkins</p>
            </div>
          </div>

          <p className="text-muted-foreground italic">Quando os 5 vetores Reais se aproximam dos Ideais, você está no caminho ótimo para aprovação. Lacunas grandes indicam onde a IA vai direcionar seu esforço.</p>
        </CardContent>
      </Card>

      {/* Tab Overview */}
      <Card className="glass">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Guia Completo das Abas</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/20">
              <p className="font-semibold text-primary flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Planner</p>
              <p className="text-muted-foreground mt-1">Calendário visual com drag-and-drop para planejar sessões futuras. Registro Rápido para logar sessões passadas com disciplina, duração, compreensão e páginas estudadas. Timer Pomodoro editável (1–120 min). Heatmap de atividade mostrando sua consistência ao longo do tempo.</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/20">
              <p className="font-semibold text-primary flex items-center gap-1.5"><Swords className="h-3.5 w-3.5" /> Arsenal</p>
              <p className="text-muted-foreground mt-1">Mapeamento completo do edital. <strong>Upload de PDF:</strong> a IA extrai automaticamente disciplinas, tópicos, relevância e incidência do documento. <strong>Modo manual:</strong> adicione disciplinas e tópicos com arrastar-e-soltar. Defina peso (relevância) e nível de domínio de cada matéria. Use o botão <span className="text-primary">Explicar Tópico ✨</span> para que a IA detalhe qualquer tópico do edital.</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/20">
              <p className="font-semibold text-primary flex items-center gap-1.5"><LineChart className="h-3.5 w-3.5" /> Análise</p>
              <p className="text-muted-foreground mt-1">Central de inteligência. Metas semanais de questões e horas. Desempenho detalhado por disciplina com taxa de acertos. <strong>Gráfico G-Force:</strong> Radar de 5 vetores comparando sua situação Real vs Ideal — o "sensor" que guia toda a estratégia da plataforma.</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/20">
              <p className="font-semibold text-primary flex items-center gap-1.5"><NotebookPen className="h-3.5 w-3.5" /> Cadernos</p>
              <p className="text-muted-foreground mt-1">Notas rápidas organizadas por disciplina. Use o botão <span className="text-primary">Expandir ✨</span> para que a IA transforme seus apontamentos em resumos detalhados com explicações, exemplos e conexões conceituais.</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/20">
              <p className="font-semibold text-primary flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Previsor.IA</p>
              <p className="text-muted-foreground mt-1">Gerador de ciclos de estudo. <strong>Prever Data:</strong> com base na sua eficiência atual e tempo diário, calcula quantos dias faltam para dominar o edital. <strong>Calcular Ritmo:</strong> dado uma data-alvo (prova), calcula quantas horas/dia você precisaria estudar.</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/20">
              <p className="font-semibold text-primary flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> Coach.IA</p>
              <p className="text-muted-foreground mt-1">Treinador estratégico que analisa seus dados consolidados e fornece feedback personalizado. <strong>Sistema SRS:</strong> revisões espaçadas baseadas na curva do esquecimento — a IA agenda revisões com intervalos crescentes (1→3→7→14→30 dias) e ajusta conforme seu desempenho em cada revisão.</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/20">
              <p className="font-semibold text-primary flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Professor.IA</p>
              <p className="text-muted-foreground mt-1">Chatbot especializado em concursos. <strong>Chat livre:</strong> tire dúvidas sobre qualquer matéria. <strong>Ferramentas IA:</strong> gere Flashcards, Mapas Mentais, Simulados e Resumos automaticamente a partir de qualquer disciplina ou tópico do seu edital.</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/20">
              <p className="font-semibold text-primary flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" /> Bem-Estar (Psique)</p>
              <p className="text-muted-foreground mt-1"><strong>Anamnese:</strong> questionário inicial sobre perfil neurocognitivo (TDAH, TEA, dislexia, etc.), nível de ansiedade, qualidade do sono e preferências de estudo. <strong>Check-in diário:</strong> registre humor, estresse, energia e foco. A IA usa esses dados para gerar dicas personalizadas e alimentar o vetor Psique do G-Force.</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/20">
              <p className="font-semibold text-primary flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5" /> Conquistas</p>
              <p className="text-muted-foreground mt-1">Mural de medalhas desbloqueadas automaticamente conforme você atinge marcos: primeira sessão, 10h de estudo, 100 questões, streaks de dias consecutivos, e mais. Gamificação para manter a motivação.</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/20">
              <p className="font-semibold text-primary flex items-center gap-1.5"><Settings className="h-3.5 w-3.5" /> Configurações</p>
              <p className="text-muted-foreground mt-1">Defina horas e minutos de estudo diário com precisão granular, meta semanal de questões, período preferido de estudo (manhã/tarde/noite), dias da semana ativos, data da prova e dados do concurso-alvo.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Flow */}
      <Card className="glass border-primary/20">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ArrowRight className="h-4 w-4 text-primary" /> Fluxo Recomendado para Novos Usuários</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {FLOW_STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold text-sm flex items-center gap-1.5">
                    <step.icon className="h-3.5 w-3.5 text-primary" /> {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Individual Resets */}
      <Card className="glass">
        <CardHeader><CardTitle className="text-base">Resetar Ferramentas Individualmente</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {TOOLS.map(tool => (
              <Button
                key={tool.key}
                variant="outline"
                size="sm"
                className="justify-start text-xs"
                onClick={() => setConfirmDialog({ open: true, label: tool.label, tables: tool.tables })}
              >
                <RotateCcw className="h-3 w-3 mr-2 flex-shrink-0" />
                Resetar {tool.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-base text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Zona de Perigo: Resetar Dados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Esta ação é irreversível e irá apagar todo o seu progresso, restaurando a aplicação para o estado inicial.
          </p>
          <p className="text-sm text-muted-foreground italic">
            Use apenas se desejar começar do zero. Todos os registros de estudo, notas, metas, revisões, check-ins e conquistas serão perdidos permanentemente.
          </p>
          <Button variant="destructive" onClick={resetAll}>
            <RotateCcw className="h-4 w-4 mr-2" /> Resetar Todos os Dados do Aplicativo
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(o) => !o && setConfirmDialog({ open: false, label: "", tables: [] })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Reset</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja resetar <strong>{confirmDialog.label}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, label: "", tables: [] })}>Cancelar</Button>
            <Button variant="destructive" disabled={loading} onClick={() => resetTables(confirmDialog.tables, confirmDialog.label)}>
              {loading ? "Resetando..." : "Confirmar Reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TutorialTab;
