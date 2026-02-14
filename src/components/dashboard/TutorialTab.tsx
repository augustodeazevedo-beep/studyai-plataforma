import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";
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
        <h2 className="text-xl font-display font-bold">Tutorial e Estratégia</h2>
        <p className="text-sm text-muted-foreground">Como o COGNOS Study.AI utiliza seus dados para garantir a aprovação.</p>
      </div>

      {/* Strategy */}
      <Card className="glass">
        <CardHeader><CardTitle className="text-base">A Estratégia COGNOS: O Ciclo de Feedback</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-foreground/90">
          <p>O COGNOS não é apenas um rastreador; é um sistema de inteligência algorítmica. O objetivo é parar de estudar "no escuro" e usar dados para focar no que realmente importa.</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li><strong>1. Mapeamento (Arsenal):</strong> Primeiro, você define o "inimigo". O Arsenal mapeia 100% do seu edital, definindo a <span className="text-primary font-semibold">Relevância e Incidência</span> de cada tópico.</li>
            <li><strong>2. Execução e Coleta (Planner/Análise):</strong> Você estuda (Planner) e faz questões (Análise). O COGNOS coleta dados cruciais: seu <span className="text-primary font-semibold">Tempo Líquido</span>, sua <span className="text-warning font-semibold">Eficiência (Compreensão)</span> e sua <span className="text-success font-semibold">Taxa de Acertos</span>.</li>
            <li><strong>3. Otimização (Previsor.IA e Coach.IA):</strong> A IA cruza os dados. Ela sabe o <span className="text-destructive">Peso do Conteúdo (o que mais cai/esquece)</span> e a sua <span className="text-primary font-semibold">Eficiência real</span>. Com isso, ela prevê seu tempo até a aprovação (Previsor) e informa onde seu esforço está desalinhado (Coach).</li>
          </ol>
          <p className="text-muted-foreground italic">Seu trabalho é alimentar o sistema com dados honestos. O trabalho da IA é transformar esses dados em estratégia de aprovação.</p>
        </CardContent>
      </Card>

      {/* Tab Overview */}
      <Card className="glass">
        <CardHeader><CardTitle className="text-base">Visão Geral das Abas</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-primary font-semibold">Planner:</span> Use o calendário (Drag-and-Drop) para planejar o futuro e o Registro Rápido para logar sessões passadas. O Pomodoro ajuda no foco.</p>
          <p><span className="text-primary font-semibold">Arsenal:</span> Mapeie seu edital, defina Relevância/Incidência e marque o domínio dos tópicos. Use o <span className="text-primary">Explicar Tópico ✨</span> se tiver dúvidas.</p>
          <p><span className="text-primary font-semibold">Análise:</span> Monitore metas, desempenho em questões e agende suas revisões. Use a <span className="text-primary">Análise de Eixos (Radar)</span> para ver a lacuna entre seu conhecimento e a relevância da matéria.</p>
          <p><span className="text-primary font-semibold">Cadernos:</span> Crie notas rápidas por disciplina. Use o botão <span className="text-primary">Expandir ✨</span> para que a IA detalhe seu apontamento.</p>
          <p><span className="text-primary font-semibold">Previsor.IA:</span> Receba uma previsão de quantos dias faltam para dominar o edital com base em sua performance (eficiência) e dedicação (tempo diário).</p>
          <p><span className="text-primary font-semibold">Coach.IA:</span> Um treinador que analisa seus dados consolidados e te dá um feedback estratégico sobre sua performance geral.</p>
          <p><span className="text-primary font-semibold">Professor.IA:</span> O Chatbot. Tira dúvidas sobre qualquer tópico do edital ou matéria de concurso.</p>
          <p><span className="text-primary font-semibold">Conquistas:</span> Seu mural de medalhas. Desbloqueadas automaticamente conforme você atinge marcos de estudo e performance.</p>
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
            Esta ação é irreversível e irá apagar todo o seu progresso, restaurando a aplicação para o estado inicial com os dados de exemplo.
          </p>
          <p className="text-sm text-muted-foreground italic">
            Use esta função apenas se desejar começar do zero ou se encontrar um problema grave com seus dados atuais. Todos os seus registros de estudo, notas, metas e conquistas serão perdidos permanentemente.
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