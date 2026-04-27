import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, Brain, Target, BarChart3, Zap, Heart, BookOpen, Calendar, Swords, LineChart, NotebookPen, Sparkles, GraduationCap, MessageSquare, Trophy, Settings, ArrowRight, ShieldCheck, Lightbulb, CheckSquare, Clock, FileSearch, Gauge, History, Layers3, LockKeyhole, TimerReset } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

interface TutorialTabProps {
  userId: string;
}

const TOOLS: { key: string; label: string; tables: string[] }[] = [
  { key: "planner", label: "Planner (Sessões + Blocos)", tables: ["study_sessions", "study_calendar_blocks"] },
  { key: "arsenal", label: "Arsenal (Disciplinas + Tópicos + Materiais)", tables: ["user_subjects", "topics", "study_materials"] },
  { key: "analysis", label: "Análise (Questões + Tentativas)", tables: ["questions", "question_attempts"] },
  { key: "study_plan", label: "Plano de Estudo / G-Force", tables: ["study_plan"] },
  { key: "performance", label: "Desempenho por Tema", tables: ["study_sessions", "question_attempts", "spaced_reviews"] },
  { key: "notebooks", label: "Cadernos (Notas)", tables: ["user_notes"] },
  { key: "flashcards", label: "Flashcards", tables: ["flashcards"] },
  { key: "reviews", label: "Revisões Espaçadas + Lotes", tables: ["spaced_reviews", "planner_audit_logs"] },
  { key: "reminders", label: "Lembretes", tables: ["reminders"] },
  { key: "achievements", label: "Conquistas", tables: ["user_achievements"] },
  { key: "coaching", label: "Coach.IA (Histórico)", tables: ["ai_coaching_history"] },
  { key: "psyche", label: "Bem-Estar (Perfil + Check-ins)", tables: ["psyche_profiles", "psyche_checkins"] },
  { key: "profile", label: "Perfil / Configurações", tables: ["profiles"] },
];

const FLOW_STEPS = [
  { icon: Heart, label: "Conheça-se", desc: "Preencha a anamnese e faça check-ins no Bem-Estar. A IA usa Psique para ajustar volume, linguagem e tipo de tarefa." },
  { icon: Swords, label: "Mapeie o edital", desc: "Envie o PDF no Arsenal ou cadastre manualmente disciplinas e tópicos. O sistema calcula relevância, incidência e lacunas." },
  { icon: Settings, label: "Defina sua realidade", desc: "Configure concurso, cargo, banca, data da prova, dias e horas disponíveis. O plano nasce do seu tempo real." },
  { icon: Calendar, label: "Execute no Planner", desc: "Registre sessões, Pomodoros, compreensão e páginas. Esses dados recalibram intensidade, desempenho e revisões." },
  { icon: BarChart3, label: "Meça por questões", desc: "Use a Análise para registrar tentativas e acertos. A taxa de acerto corrige o vetor Compreensão." },
  { icon: GraduationCap, label: "Revise no tempo certo", desc: "Na aba Revisões do Planner, veja hoje e próximos 7 dias, filtre por concurso/cargo, priorize por risco e conclua em lote." },
  { icon: Gauge, label: "Compare desempenho", desc: "Acompanhe a aba Desempenho para ver compreensão, intensidade, risco de esquecimento e evolução das últimas sessões." },
  { icon: Sparkles, label: "Projete e ajuste", desc: "Use Coach.IA e Previsor.IA para receber diagnóstico, próxima ação e previsão realista com margem de segurança." },
];

const SCIENCE_REFERENCES = [
  "Prática de recuperação ativa: testes, questões e explicação sem consulta fortalecem memória mais do que releitura passiva.",
  "Repetição espaçada: revisões distribuídas ao longo do tempo combatem a curva do esquecimento e aumentam retenção de longo prazo.",
  "Intercalação e variação: alternar disciplinas, formatos e níveis de dificuldade melhora transferência e flexibilidade cognitiva.",
  "Feedback rápido e metacognição: saber onde errou e estimar o próprio domínio reduz ilusões de competência.",
  "Carga cognitiva gerenciável: dividir tarefas, reduzir excesso em dias de estresse e respeitar sono/foco preserva aprendizagem sustentável.",
];

const TutorialTab = ({ userId }: TutorialTabProps) => {
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; label: string; tables: string[] }>({ open: false, label: "", tables: [] });
  const [loading, setLoading] = useState(false);

  const resetTables = async (tables: string[], label: string) => {
    setLoading(true);
    try {
      for (const table of tables) {
        if (table === "profiles") {
          // Reset profile fields to defaults instead of deleting the row
          await supabase.from("profiles").update({
            target_exam: null,
            target_position: null,
            exam_date: null,
            daily_hours: null,
            study_days: null,
            banca: null,
            avatar_url: null,
          }).eq("user_id", userId);
        } else {
          await supabase.from(table as any).delete().eq("user_id", userId);
        }
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
          <Brain className="h-5 w-5 text-primary" /> Tutorial & Estratégia Study.AI
        </h2>
        <p className="text-sm text-muted-foreground">Entenda a arquitetura por trás da sua aprovação e como extrair o máximo da plataforma.</p>
      </div>

      {/* Core Philosophy */}
      <Card className="glass border-primary/20">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> Princípio Fundamental</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-foreground/90">
          <p>O Study.AI <strong>não</strong> é um contador de horas. É um <span className="text-primary font-semibold">motor de decisão pedagógica</span> que busca maximizar seu <strong>aprendizado por unidade de carga cognitiva</strong> — não simplesmente o tempo que você passa sentado.</p>
          <p>Isso significa que a plataforma não vai te pedir para "estudar mais". Ela vai te dizer <strong>o quê</strong> estudar, <strong>como</strong> estudar e <strong>quando</strong> revisar, com base no seu estado real — incluindo como você está se sentindo hoje.</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Curva do Esquecimento (Ebbinghaus):</strong> Sem revisão espaçada, você esquece ~70% do conteúdo em 24h. O sistema SRS do Coach.IA combate isso com intervalos adaptativos que se ajustam ao seu desempenho.</li>
            <li><strong>Teoria da Carga Cognitiva (Sweller):</strong> Estudar o que já domina desperdiça energia. O G-Force identifica onde seu esforço está desalinhado da necessidade real e redireciona.</li>
            <li><strong>Aprendizado Adaptativo:</strong> Cada interação com a plataforma atualiza o seu "modelo de aluno" — um perfil dinâmico que a IA consulta antes de tomar qualquer decisão.</li>
          </ul>
          <p className="text-muted-foreground italic">A plataforma adota uma abordagem empática e não punitiva. Especialmente para estudantes neurodivergentes ou sob estresse, cada estímulo foi pensado para incentivar persistência sem gerar culpa. "Vamos ajustar a rota" — nunca "você deveria ter feito mais".</p>
        </CardContent>
      </Card>

      <Card className="glass border-primary/20">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Gauge className="h-4 w-4 text-primary" /> Eficiência + Efetividade: a lógica do cálculo</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-foreground/90">
          <p><strong>Eficiência</strong> é estudar o máximo de conteúdo relevante com o menor desperdício de energia. <strong>Efetividade</strong> é converter esse esforço em nota: compreender, lembrar e acertar questões no dia da prova.</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="font-semibold text-primary flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Busca da eficiência</p>
              <p className="text-muted-foreground mt-1">O sistema evita alocar tempo demais no que você já domina e pouco no que mais pesa no edital. Ele cruza tempo disponível, intensidade recente, relevância, incidência e estado Psique para sugerir a próxima ação possível — não a rotina idealizada.</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="font-semibold text-primary flex items-center gap-2"><Target className="h-3.5 w-3.5" /> Busca da efetividade</p>
              <p className="text-muted-foreground mt-1">O sistema prioriza temas com maior chance de gerar ganho de nota: alto peso, alta incidência, baixa compreensão, baixa taxa de acerto ou alto risco de esquecimento. A meta é acertar mais, não apenas cumprir horas.</p>
            </div>
          </div>
          <p className="text-muted-foreground italic">Em termos simples: a plataforma calcula onde cada minuto de estudo tende a produzir o maior retorno pedagógico, respeitando sua capacidade cognitiva do dia.</p>
        </CardContent>
      </Card>

      {/* Student Model */}
      <Card className="glass">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Como a IA "Enxerga" Você</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-foreground/90">
          <p>A IA mantém um <strong>modelo dinâmico</strong> de cada aluno, atualizado automaticamente a cada ação na plataforma. Esse modelo é composto por 4 dimensões:</p>
          <div className="grid gap-2">
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="font-semibold text-primary">Conhecimento por Tópico (K)</p>
              <p className="text-muted-foreground mt-1">Grau de domínio aproximado de cada disciplina, derivado da taxa de acertos em questões, dificuldade das questões respondidas, histórico de revisões SRS e compreensão autoavaliada ao final das sessões.</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="font-semibold text-primary">Desempenho Dinâmico (P)</p>
              <p className="text-muted-foreground mt-1">Dados em tempo real: taxa de acertos, tempo médio por questão, número de tentativas e intensidade (horas líquidas recentes) por disciplina.</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="font-semibold text-primary">Estado Emocional / Psique (E)</p>
              <p className="text-muted-foreground mt-1">Humor, estresse, energia, foco e perfil neurocognitivo. Capturado pela anamnese e pelos check-ins diários na aba Bem-Estar.</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="font-semibold text-primary">Características do Aluno (C)</p>
              <p className="text-muted-foreground mt-1">Preferências de estudo (período do dia), tempo diário disponível, data da prova, metas semanais e informações da anamnese neurocognitiva.</p>
            </div>
          </div>
          <p className="text-muted-foreground italic">Toda recomendação que a IA faz — cada plano, feedback, material ou revisão — consulta este modelo antes de decidir. Quanto mais dados você fornece, mais precisa se torna a estratégia.</p>
        </CardContent>
      </Card>

      {/* The Feedback Cycle */}
      <Card className="glass">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> O Ciclo de Feedback Contínuo</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-foreground/90">
          <p>A inteligência do Study.AI opera em um ciclo de 5 etapas que se retroalimenta continuamente:</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li><strong>Mapeamento:</strong> Você define o território (edital) no <span className="text-primary font-semibold">Arsenal</span>. A IA extrai disciplinas e tópicos, montando um <strong>grafo de conhecimento</strong> com relevância, incidência, dificuldade estimada e pré-requisitos entre tópicos.</li>
            <li><strong>Execução:</strong> Você estuda no <span className="text-primary font-semibold">Planner</span> (com Pomodoro editável de 1–120 min) e registra cada sessão com compreensão e páginas. A autoavaliação de compreensão é um dos dados mais valiosos — seja honesto.</li>
            <li><strong>Coleta:</strong> O sistema captura automaticamente tempo líquido, taxa de acertos, nível de compreensão e estado emocional (check-ins diários). Cada dado atualiza o modelo do aluno em tempo real.</li>
            <li><strong>Otimização:</strong> A IA cruza os 5 vetores no <span className="text-primary font-semibold">G-Force</span> para identificar lacunas e calcular prioridades. O <span className="text-primary font-semibold">Coach.IA</span> agenda revisões SRS. O <span className="text-primary font-semibold">Previsor.IA</span> projeta cenários realistas — não ideais.</li>
            <li><strong>Correção de Rota:</strong> Com base nos dados consolidados e no estado Psique, a IA gera feedback estratégico e materiais de reforço direcionados às suas maiores lacunas, adaptando formato e volume ao seu dia.</li>
          </ol>
          <p className="font-medium text-primary">Seu trabalho: alimentar o sistema com dados honestos. O trabalho da IA: transformar esses dados em estratégia de aprovação com o menor desgaste possível.</p>
        </CardContent>
      </Card>

      {/* 5 Vectors */}
      <Card className="glass border-primary/20">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Os 5 Vetores do G-Force</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-foreground/90">O gráfico Radar <strong>G-Force</strong> (aba Análise) é o "sensor central" da plataforma. Ele compara sua situação <span className="text-destructive font-semibold">Real</span> com a <span className="text-primary font-semibold">Ideal</span> em 5 dimensões. A IA usa as <strong>lacunas</strong> entre Real e Ideal para decidir a próxima ação:</p>
          
          <div className="grid gap-3">
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="font-semibold text-primary flex items-center gap-2"><Target className="h-3.5 w-3.5" /> 1. Relevância</p>
              <p className="text-muted-foreground mt-1">Quanto peso a disciplina tem no edital. Matérias com alta relevância devem receber proporcionalmente mais atenção e são priorizadas pelo motor de recomendação.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Fonte: Campo "peso" em user_subjects · Multiplicador ×3 na fórmula de prioridade</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="font-semibold text-primary flex items-center gap-2"><BarChart3 className="h-3.5 w-3.5" /> 2. Incidência</p>
              <p className="text-muted-foreground mt-1">Frequência histórica com que o tópico aparece em provas da banca. A IA cruza incidência com relevância para identificar os "pontos quentes" do edital — onde seu esforço dá mais retorno.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Fonte: Campo "incidence" no study_plan · Multiplicador ×2 na fórmula de prioridade</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="font-semibold text-primary flex items-center gap-2"><BookOpen className="h-3.5 w-3.5" /> 3. Compreensão</p>
              <p className="text-muted-foreground mt-1">Combinação de autoavaliação ao final de sessões e taxa de acertos em questões. Indica profundidade real de aprendizado. Quanto <strong>menor</strong> a compreensão em disciplinas de alta relevância, <strong>maior</strong> a prioridade.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Fonte: Média de comprehension_rating + accuracy_rate · Multiplicador ×2 (inverso) na fórmula</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="font-semibold text-primary flex items-center gap-2"><Zap className="h-3.5 w-3.5" /> 4. Intensidade</p>
              <p className="text-muted-foreground mt-1">Volume de horas líquidas dedicadas, consistência ao longo do tempo e motivação. Reflete esforço real. A IA detecta quando você está investindo muito em matérias já dominadas e pouco nas lacunas.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Fonte: Soma de duration_minutes em study_sessions · Multiplicador ×1 na fórmula</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="font-semibold text-primary flex items-center gap-2"><Heart className="h-3.5 w-3.5" /> 5. Psique</p>
              <p className="text-muted-foreground mt-1">Seu estado emocional e cognitivo. A IA usa este vetor como <strong>modulador de carga</strong>: em dias de baixa Psique, ela reduz o volume recomendado, prioriza formatos leves (flashcards curtos, revisões rápidas) e adapta sua linguagem para ser mais acolhedora.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Fonte: psyche_profiles + psyche_checkins · Multiplicador ×2 (lacuna/gap) na fórmula</p>
            </div>
          </div>

          <p className="text-muted-foreground italic">Quando os 5 vetores Reais se aproximam dos Ideais, você está no caminho ótimo. Lacunas grandes ativam automaticamente o motor de recomendação para direcionar seu próximo passo.</p>
        </CardContent>
      </Card>

      {/* Next Action Engine */}
      <Card className="glass border-primary/20">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" /> O Motor "Próxima Ação"</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-foreground/90">
          <p>Toda vez que a IA te oferece uma recomendação (plano de estudo, revisão, material), ela está resolvendo duas perguntas em paralelo:</p>
          
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="font-semibold text-primary">1ª Pergunta: O QUE estudar? (Alvo)</p>
            <p className="text-muted-foreground mt-1">A IA calcula um "score de prioridade" para cada disciplina cruzando: importância (relevância × incidência), lacuna de domínio (quanto menor sua compreensão, maior a urgência), déficit de intensidade (horas investidas vs necessárias) e capacidade cognitiva atual (estado Psique). O tópico com maior impacto esperado e menor custo cognitivo naquele momento é selecionado.</p>
          </div>
          
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="font-semibold text-primary">2ª Pergunta: COMO estudar? (Formato)</p>
            <p className="text-muted-foreground mt-1">O formato se adapta ao seu estado:</p>
            <ul className="list-disc pl-5 mt-1.5 space-y-1 text-muted-foreground">
              <li><strong>Energia alta + Foco alto:</strong> Simulados completos, leitura guiada aprofundada, questões difíceis, mapas mentais complexos.</li>
              <li><strong>Energia média:</strong> Resumos estruturados, questões de dificuldade moderada, revisões SRS com explicação.</li>
              <li><strong>Energia baixa ou Estresse alto:</strong> Flashcards curtos, micro-revisões, problemas quebrados em passos menores. A IA "alivia a carga" para preservar consistência — porque um dia leve ainda é melhor que um dia zerado.</li>
            </ul>
          </div>

          <p className="text-muted-foreground italic">A IA sempre justifica suas escolhas: "Sugiro X porque Y e Z, com foco em maximizar ganho com o mínimo de desgaste." Você nunca fica no escuro sobre por que algo foi recomendado.</p>
        </CardContent>
      </Card>

      {/* Neurodivergence */}
      <Card className="glass">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Heart className="h-4 w-4 text-primary" /> Suporte a Neurodivergência</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-foreground/90">
          <p>O Study.AI foi projetado considerando que muitos concurseiros convivem com TDAH, TEA, dislexia e outras condições. Isso se reflete em toda a arquitetura:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Sessões adaptáveis:</strong> O Pomodoro é editável de 1 a 120 minutos. Se seu span de atenção é de 15 min, a IA trabalha com 15 min. Sem julgamento.</li>
            <li><strong>Micro-metas:</strong> Tarefas grandes são automaticamente quebradas em passos menores e mais concretos.</li>
            <li><strong>Linguagem sem culpa:</strong> A IA nunca diz "você deveria ter feito mais". Diz "vamos ajustar a rota" ou "hoje o foco é consistência mínima".</li>
            <li><strong>Reforço positivo:</strong> O sistema de conquistas e as frases motivacionais são projetados como estímulos constantes, não como pressão.</li>
            <li><strong>Carga reduzida automaticamente:</strong> Em dias de alto estresse ou baixa energia (detectados pelo check-in), a IA reduz o volume de revisões obrigatórias e foca nos itens de maior impacto.</li>
            <li><strong>Anamnese dedicada:</strong> O questionário da aba Bem-Estar captura informações específicas sobre condições neurocognitivas para personalizar toda a experiência.</li>
          </ul>
        </CardContent>
      </Card>

      {/* Tab Overview */}
      <Card className="glass">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Guia Completo das Abas</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/20">
              <p className="font-semibold text-primary flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Planner</p>
              <p className="text-muted-foreground mt-1">Calendário visual com drag-and-drop para planejar sessões futuras. Registro Rápido para logar sessões passadas com disciplina, duração, compreensão e páginas estudadas. Timer Pomodoro editável (1–120 min, adaptável ao seu span de atenção). Heatmap de atividade mostrando sua consistência ao longo do tempo.</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/20">
              <p className="font-semibold text-primary flex items-center gap-1.5"><Swords className="h-3.5 w-3.5" /> Arsenal</p>
              <p className="text-muted-foreground mt-1">Mapeamento completo do edital. <strong>Upload de PDF:</strong> a IA extrai automaticamente disciplinas, tópicos, relevância e incidência, construindo o grafo de conhecimento do seu concurso. <strong>Modo manual:</strong> adicione disciplinas e tópicos com arrastar-e-soltar. Defina peso (relevância) e nível de domínio. Use <span className="text-primary">Explicar Tópico ✨</span> para detalhamento de qualquer ponto do edital.</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/20">
              <p className="font-semibold text-primary flex items-center gap-1.5"><LineChart className="h-3.5 w-3.5" /> Análise</p>
              <p className="text-muted-foreground mt-1">Central de inteligência. Metas semanais de questões e horas. Desempenho detalhado por disciplina com taxa de acertos. <strong>Gráfico G-Force:</strong> Radar de 5 vetores comparando Real vs Ideal — a camada de decisão e explicação que guia toda a estratégia da IA.</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/20">
              <p className="font-semibold text-primary flex items-center gap-1.5"><NotebookPen className="h-3.5 w-3.5" /> Cadernos</p>
              <p className="text-muted-foreground mt-1">Notas rápidas organizadas por disciplina. Use <span className="text-primary">Expandir ✨</span> para que a IA transforme seus apontamentos em resumos detalhados com explicações, exemplos e conexões conceituais.</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/20">
              <p className="font-semibold text-primary flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Previsor.IA</p>
              <p className="text-muted-foreground mt-1">Gerador de previsões realistas. <strong>Prever Data:</strong> com base na sua eficiência real (não ideal) e tempo diário, calcula dias até dominar o edital — incluindo margem para dias improdutivos. <strong>Calcular Ritmo:</strong> dado uma data-alvo, calcula as horas/dia necessárias, com aviso se a carga for excessiva para seu estado Psique.</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/20">
              <p className="font-semibold text-primary flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> Coach.IA</p>
              <p className="text-muted-foreground mt-1">Motor de decisão estratégica. Analisa seus dados consolidados à luz dos 5 vetores G-Force e gera feedback personalizado com diagnóstico de lacunas, próxima ação recomendada e ajuste de rota. <strong>Sistema SRS:</strong> revisões espaçadas adaptativas (1→3→7→14→30 dias) que se ajustam ao desempenho e ao estado Psique — em dias difíceis, a carga de revisões é aliviada automaticamente.</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/20">
              <p className="font-semibold text-primary flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Professor.IA</p>
              <p className="text-muted-foreground mt-1">Professor especializado que adapta profundidade e ritmo ao seu estado atual. <strong>Chat livre:</strong> tire dúvidas sobre qualquer matéria — respostas contextualizam relevância e incidência do tema no seu edital. <strong>Ferramentas IA:</strong> gere Flashcards, Mapas Mentais, Simulados e Resumos personalizados ao seu nível de compreensão e estado cognitivo.</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/20">
              <p className="font-semibold text-primary flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" /> Bem-Estar (Psique)</p>
              <p className="text-muted-foreground mt-1"><strong>Anamnese:</strong> perfil neurocognitivo (TDAH, TEA, dislexia, etc.), nível de ansiedade, qualidade do sono e preferências de estudo. <strong>Check-in diário:</strong> registre humor, estresse, energia e foco. Esses dados alimentam o vetor Psique do G-Force e modulam todas as recomendações da IA — desde o volume até a linguagem utilizada.</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/20">
              <p className="font-semibold text-primary flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5" /> Conquistas</p>
              <p className="text-muted-foreground mt-1">Mural de medalhas desbloqueadas automaticamente: primeira sessão, 10h de estudo, 100 questões, streaks consecutivos e mais. Gamificação como reforço positivo — especialmente eficaz para perfis com TDAH.</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/20">
              <p className="font-semibold text-primary flex items-center gap-1.5"><Settings className="h-3.5 w-3.5" /> Configurações</p>
              <p className="text-muted-foreground mt-1">Horas e minutos de estudo diário com precisão granular, meta semanal de questões, período preferido (manhã/tarde/noite), dias da semana ativos, data da prova, concurso-alvo e banca. Tudo isso compõe a dimensão "Características do Aluno" no modelo da IA.</p>
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
