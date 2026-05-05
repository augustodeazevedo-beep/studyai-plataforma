import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  CalendarCheck, ChevronRight, ChevronLeft, Target, ExternalLink,
  RotateCcw, Copy, Save, BookOpen, RefreshCw, Clock,
} from "lucide-react";
import {
  AREAS_OAB_1FASE, META_APROVACAO, calcularCronograma, gerarLinkQConcursos,
  type Dominio, type DiaSemana, type CronogramaInput, type ResultadoCronograma,
  type SemanaCronograma,
} from "@/data/oabConfig";

interface CronogramaOABTabProps { userId: string; }

const DIAS_SEMANA: { key: DiaSemana; label: string }[] = [
  { key: 'seg', label: 'Seg' },
  { key: 'ter', label: 'Ter' },
  { key: 'qua', label: 'Qua' },
  { key: 'qui', label: 'Qui' },
  { key: 'sex', label: 'Sex' },
  { key: 'sab', label: 'Sáb' },
  { key: 'dom', label: 'Dom' },
];

const DOMINIO_OPTIONS: { value: Dominio; label: string; emoji: string; color: string }[] = [
  { value: 'baixo', label: 'Fraco', emoji: '🔴', color: 'bg-destructive/20 text-destructive border-destructive/40 hover:bg-destructive/30' },
  { value: 'medio', label: 'Regular', emoji: '🟡', color: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/40 hover:bg-yellow-500/30' },
  { value: 'alto', label: 'Bom', emoji: '🟢', color: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/40 hover:bg-green-500/30' },
];

function dominioBg(d: Dominio) {
  if (d === 'baixo') return 'border-l-destructive';
  if (d === 'alto') return 'border-l-green-500';
  return 'border-l-yellow-500';
}

function semanaLabel(s: SemanaCronograma) {
  if (s.tipo === 'estudo') return { icon: '📚', text: 'Estudo', cls: 'bg-primary/10 text-primary' };
  if (s.tipo === 'revisao') return { icon: '🔄', text: 'Revisão Geral', cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' };
  return { icon: '🎯', text: 'Semana Final', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' };
}

function formatDateRange(inicio: Date, fim: Date) {
  const sameMonth = inicio.getMonth() === fim.getMonth() && inicio.getFullYear() === fim.getFullYear();
  if (sameMonth) {
    return `${format(inicio, "d")} a ${format(fim, "d 'de' MMMM", { locale: ptBR })}`;
  }
  return `${format(inicio, "d 'de' MMM", { locale: ptBR })} a ${format(fim, "d 'de' MMM", { locale: ptBR })}`;
}

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

const STORAGE_KEY_PREFIX = 'oab_cronograma_';

const CronogramaOABTab = ({ userId }: CronogramaOABTabProps) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 state
  const [dataProva, setDataProva] = useState('');
  const [horasPorDia, setHorasPorDia] = useState(2);
  const [diasEstudo, setDiasEstudo] = useState<DiaSemana[]>(['seg', 'ter', 'qua', 'qui', 'sex']);

  // Step 2 state
  const [dominioAreas, setDominioAreas] = useState<Record<string, Dominio>>(
    Object.fromEntries(AREAS_OAB_1FASE.map(a => [a.id, 'medio' as Dominio]))
  );

  // Step 3 result
  const [resultado, setResultado] = useState<ResultadoCronograma | null>(null);

  // --- Dynamic preview for step 1 ---
  const previewSemanas = useMemo(() => {
    if (!dataProva) return null;
    const dias = Math.max(7, Math.round((new Date(dataProva + 'T12:00:00').getTime() - new Date().setHours(0,0,0,0)) / 86400000));
    const semanas = Math.ceil(dias / 7);
    const horas = Math.round((dias / 7) * diasEstudo.length * horasPorDia * 10) / 10;
    return { semanas, horas, dias };
  }, [dataProva, diasEstudo.length, horasPorDia]);

  // --- Dynamic preview for step 2 ---
  const focoPrioritario = useMemo(() => {
    return AREAS_OAB_1FASE
      .filter(a => dominioAreas[a.id] === 'baixo')
      .slice(0, 3);
  }, [dominioAreas]);

  const toggleDia = (dia: DiaSemana) => {
    setDiasEstudo(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    );
  };

  const setDominio = (areaId: string, dominio: Dominio) => {
    setDominioAreas(prev => ({ ...prev, [areaId]: dominio }));
  };

  const gerarCronograma = () => {
    if (!dataProva || diasEstudo.length === 0) return;
    const input: CronogramaInput = { dataProva, horasPorDia, diasEstudo, dominioAreas };
    const r = calcularCronograma(input);
    setResultado(r);
    setStep(3);
  };

  const copiarCronograma = () => {
    if (!resultado) return;
    const lines: string[] = [
      '=== CRONOGRAMA OAB 1ª FASE ===',
      `Meta: ${META_APROVACAO.minAcertos}/${META_APROVACAO.totalQuestoes} acertos (${META_APROVACAO.percentual}%)`,
      `Total de semanas: ${resultado.numSemanas}`,
      `Horas de estudo: ${resultado.horasTotal}h`,
      '',
    ];
    resultado.semanas.forEach(s => {
      const lbl = semanaLabel(s);
      lines.push(`--- Semana ${s.numero} (${formatDateRange(s.dataInicio, s.dataFim)}) — ${lbl.text} ---`);
      if (s.tipo === 'final') {
        lines.push('Revisão leve + simulado completo no QConcursos + descanso');
      } else {
        s.areas.forEach(a => {
          lines.push(`  • ${a.area.nome} — ${a.horasAlocadas}h — ${gerarLinkQConcursos(a.area)}`);
        });
      }
      lines.push('');
    });
    navigator.clipboard.writeText(lines.join('\n'))
      .then(() => toast.success('Cronograma copiado para o clipboard!'))
      .catch(() => toast.error('Não foi possível copiar'));
  };

  const salvarCronograma = () => {
    if (!resultado) return;
    const payload = { resultado, input: { dataProva, horasPorDia, diasEstudo, dominioAreas }, savedAt: new Date().toISOString() };
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(payload));
    toast.success('Cronograma salvo localmente!');
  };

  const recalcular = () => {
    setStep(1);
    setResultado(null);
  };

  // ── STEP 1 ──────────────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <CalendarCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold font-display">Cronograma OAB 1ª Fase</h1>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-semibold text-primary">Etapa 1</span>
          <span>/</span><span>2</span><span>/</span><span>3</span>
          <span className="ml-1">— Configurar meu plano</span>
        </div>

        {/* Meta card */}
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="py-4 flex items-center gap-3">
            <Target className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold">Meta: {META_APROVACAO.minAcertos} acertos de {META_APROVACAO.totalQuestoes} ({META_APROVACAO.percentual}%)</p>
              <p className="text-xs text-muted-foreground mt-0.5">Você não concorre com ninguém — apenas precisa atingir o mínimo.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader><CardTitle className="text-base">Configure seu plano</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {/* Data da prova */}
            <div className="space-y-2">
              <Label htmlFor="data-prova" className="text-sm font-medium">Data do próximo exame OAB</Label>
              <input
                id="data-prova"
                type="date"
                min={todayIso()}
                value={dataProva}
                onChange={e => setDataProva(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Horas por dia */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Horas disponíveis por dia</Label>
                <span className="text-sm font-bold text-primary">{horasPorDia}h</span>
              </div>
              <Slider
                value={[horasPorDia]}
                onValueChange={([v]) => setHorasPorDia(v)}
                min={1}
                max={6}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1h</span><span>2h</span><span>3h</span><span>4h</span><span>5h</span><span>6h</span>
              </div>
            </div>

            {/* Dias da semana */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Dias disponíveis para estudo</Label>
              <div className="flex flex-wrap gap-2">
                {DIAS_SEMANA.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => toggleDia(key)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                      diasEstudo.includes(key)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {diasEstudo.length === 0 && (
                <p className="text-xs text-destructive">Selecione ao menos um dia.</p>
              )}
            </div>

            {/* Preview dinâmico */}
            {previewSemanas && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-1">
                <p className="text-sm font-semibold text-primary flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Seu plano em números
                </p>
                <p className="text-sm text-foreground">
                  <span className="font-bold">{previewSemanas.semanas} semanas</span> e{' '}
                  <span className="font-bold">{previewSemanas.horas}h</span> totais de estudo disponíveis
                </p>
                <p className="text-xs text-muted-foreground">
                  {previewSemanas.dias} dias até a prova · {diasEstudo.length} dia(s) de estudo por semana
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={() => setStep(2)}
            disabled={!dataProva || diasEstudo.length === 0}
            size="lg"
          >
            Próximo <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ── STEP 2 ──────────────────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <CalendarCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold font-display">Cronograma OAB 1ª Fase</h1>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Etapa 1</span><span>/</span>
          <span className="font-semibold text-primary">Etapa 2</span>
          <span>/</span><span>3</span>
          <span className="ml-1">— Como está seu domínio por área?</span>
        </div>

        <div className="flex gap-4">
          <Card className="glass flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Avalie seu domínio em cada área</CardTitle>
              <p className="text-xs text-muted-foreground">O algoritmo redistribui as horas: áreas fracas recebem 50% mais tempo.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {AREAS_OAB_1FASE.map(area => {
                const dom = dominioAreas[area.id] || 'medio';
                return (
                  <div
                    key={area.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border-l-2 bg-muted/20 ${dominioBg(dom)}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{area.nome}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Peso {area.pesoHistorico}%
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{area.questoesTipicas} questões/prova</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {DOMINIO_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setDominio(area.id, opt.value)}
                          className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium transition-colors ${
                            dom === opt.value ? opt.color : 'border-border text-muted-foreground hover:bg-muted/50'
                          }`}
                          title={opt.label}
                        >
                          <span>{opt.emoji}</span>
                          <span className="hidden sm:inline">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Preview sidebar */}
          <div className="w-56 shrink-0 hidden lg:block space-y-3">
            <Card className="glass sticky top-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Preview de foco</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {focoPrioritario.length > 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground">Com essa avaliação, você precisará focar mais em:</p>
                    <div className="space-y-1">
                      {focoPrioritario.map(a => (
                        <div key={a.id} className="flex items-center gap-1.5">
                          <span className="text-xs">🔴</span>
                          <span className="text-xs font-medium leading-snug">{a.nome}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhuma área marcada como fraca. O algoritmo distribuirá o tempo pelos pesos históricos.</p>
                )}
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">Áreas marcadas:</p>
                  <div className="flex flex-col gap-0.5 mt-1">
                    {(['baixo', 'medio', 'alto'] as Dominio[]).map(d => {
                      const count = Object.values(dominioAreas).filter(v => v === d).length;
                      const emoji = d === 'baixo' ? '🔴' : d === 'alto' ? '🟢' : '🟡';
                      const label = d === 'baixo' ? 'Fracas' : d === 'alto' ? 'Boas' : 'Regulares';
                      return <p key={d} className="text-xs">{emoji} {count} {label}</p>;
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setStep(1)}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>
          <Button size="lg" onClick={gerarCronograma}>
            <BookOpen className="mr-2 h-4 w-4" /> Gerar meu cronograma →
          </Button>
        </div>
      </div>
    );
  }

  // ── STEP 3 ──────────────────────────────────────────────────────────────────
  if (!resultado) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <CalendarCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold font-display">Seu Cronograma Personalizado</h1>
      </div>

      {/* Summary card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="glass">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-primary">{resultado.numSemanas}</p>
            <p className="text-xs text-muted-foreground mt-1">Semanas até a prova</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-primary">{resultado.horasTotal}h</p>
            <p className="text-xs text-muted-foreground mt-1">Horas de estudo</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-primary">40/80</p>
            <p className="text-xs text-muted-foreground mt-1">Meta de acertos (50%)</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="py-4 text-center">
            <div className="flex flex-wrap justify-center gap-1">
              {resultado.areasPrioritarias.slice(0, 2).map(a => (
                <Badge key={a.id} variant="secondary" className="text-[10px]">{a.nome.split(' ')[0]}</Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Áreas prioritárias</p>
          </CardContent>
        </Card>
      </div>

      {/* Week timeline */}
      <div className="space-y-4">
        {resultado.semanas.map(semana => {
          const lbl = semanaLabel(semana);
          const isFinal = semana.tipo === 'final';
          const isRevisao = semana.tipo === 'revisao';

          return (
            <Card
              key={semana.numero}
              className={`glass border-l-4 ${
                isFinal ? 'border-l-amber-500 bg-amber-500/5' :
                isRevisao ? 'border-l-blue-500 bg-blue-500/5' :
                'border-l-primary'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{lbl.icon}</span>
                    <div>
                      <p className="text-sm font-bold">Semana {semana.numero}</p>
                      <p className="text-xs text-muted-foreground">{formatDateRange(semana.dataInicio, semana.dataFim)}</p>
                    </div>
                  </div>
                  <Badge className={`text-xs ${lbl.cls}`}>{lbl.text}</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {isFinal ? (
                  <div className="space-y-3">
                    <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                      Esta semana: revisão leve das áreas mais pesadas + simulado completo + descanso 2 dias antes da prova.
                    </p>
                    <a
                      href="https://www.qconcursos.com/questoes-da-oab/questoes?limit=80"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-sm font-medium hover:bg-amber-500/20 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Simulado OAB completo no QConcursos →
                    </a>
                    <div className="space-y-1">
                      {semana.dicas.map((d, i) => (
                        <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="text-amber-500 mt-0.5">•</span>{d}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Areas grid */}
                    {semana.areas.length > 0 && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {semana.areas.map(areaComH => {
                          const dominioOpt = DOMINIO_OPTIONS.find(o => o.value === areaComH.dominio);
                          return (
                            <div
                              key={areaComH.area.id}
                              className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border/50 bg-muted/20"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-xs font-semibold leading-snug">{areaComH.area.nome}</p>
                                  {dominioOpt && (
                                    <span className="text-xs">{dominioOpt.emoji}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{areaComH.horasAlocadas}h</Badge>
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Peso {areaComH.area.pesoHistorico}%</Badge>
                                </div>
                              </div>
                              <a
                                href={gerarLinkQConcursos(areaComH.area)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 flex items-center gap-1 px-2 py-1 rounded border border-primary/30 bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                                title={`10 questões de ${areaComH.area.nome} no QConcursos`}
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span className="hidden sm:inline">Praticar</span>
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Tips */}
                    {semana.dicas.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {semana.dicas.map((d, i) => (
                          <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="text-primary mt-0.5">💡</span>{d}
                          </p>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Note about QConcursos */}
      <Card className="border-muted bg-muted/20">
        <CardContent className="py-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Sobre o QConcursos:</span> os links abrem a plataforma deles filtrada por disciplina e exame OAB.
            É necessário cadastro para acessar as questões. A integração automática de questões dentro do Study.AI será implementada em versão futura.
          </p>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={copiarCronograma}>
          <Copy className="h-4 w-4 mr-2" /> Copiar cronograma
        </Button>
        <Button variant="outline" onClick={salvarCronograma}>
          <Save className="h-4 w-4 mr-2" /> Salvar
        </Button>
        <Button variant="outline" onClick={recalcular}>
          <RotateCcw className="h-4 w-4 mr-2" /> Recalcular
        </Button>
        <Button variant="outline" onClick={() => setStep(2)}>
          <RefreshCw className="h-4 w-4 mr-2" /> Ajustar domínio
        </Button>
      </div>
    </div>
  );
};

export default CronogramaOABTab;
