import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Brain, Target, BookOpen, Clock, CalendarIcon, ArrowRight, ArrowLeft,
  Plus, X, Sparkles, GraduationCap, Star, Check,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import BrandLogo from "@/components/brand/BrandLogo";

const EXAMS = [
  "Concurso Público Federal",
  "Concurso Público Estadual",
  "Concurso Público Municipal",
  "OAB",
  "Residência Médica",
  "ENEM",
  "Vestibular",
  "Certificação Profissional",
  "Outro",
];

const BANCAS = [
  "CESPE/CEBRASPE", "FCC", "FGV", "VUNESP", "IBFC", "IDECAN",
  "Quadrix", "AOCP", "Instituto ACESSO", "Outra",
];

const COMMON_SUBJECTS = [
  "Português", "Matemática", "Raciocínio Lógico", "Direito Constitucional",
  "Direito Administrativo", "Direito Penal", "Direito Civil", "Direito Processual",
  "Informática", "Contabilidade", "Administração Pública", "Economia",
  "Legislação Específica", "Redação", "Inglês", "Atualidades",
];

const DAYS_OF_WEEK = [
  { key: "seg", label: "Seg" },
  { key: "ter", label: "Ter" },
  { key: "qua", label: "Qua" },
  { key: "qui", label: "Qui" },
  { key: "sex", label: "Sex" },
  { key: "sab", label: "Sáb" },
  { key: "dom", label: "Dom" },
];

const DEFAULT_STUDY_MINUTES_BY_DAY = { seg: 120, ter: 120, qua: 120, qui: 120, sex: 120, sab: 0, dom: 0 } as Record<string, number>;

const formatMinutes = (minutes: number) => {
  const safe = Math.max(0, Math.round(minutes || 0));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  return `${hours}h${mins ? ` ${mins}min` : ""}`;
};

const STEPS = [
  { icon: Target, title: "Seu Objetivo", description: "Concurso e banca" },
  { icon: BookOpen, title: "Disciplinas", description: "Matérias do edital" },
  { icon: Clock, title: "Disponibilidade", description: "Horários e dias" },
  { icon: Star, title: "Autoavaliação", description: "Nível por disciplina" },
];

interface SubjectEntry {
  name: string;
  knowledge_level: number;
}

const Onboarding = () => {
  const [user, setUser] = useState<User | null>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Step 1: Objective
  const [targetExam, setTargetExam] = useState("");
  const [targetPosition, setTargetPosition] = useState("");
  const [banca, setBanca] = useState("");
  const [examDate, setExamDate] = useState<Date | undefined>();

  // Step 2: Subjects
  const [subjects, setSubjects] = useState<SubjectEntry[]>([]);
  const [newSubject, setNewSubject] = useState("");

  // Step 3: Schedule
  const [studyDays, setStudyDays] = useState<string[]>(["seg", "ter", "qua", "qui", "sex"]);
  const [studyMinutesByDay, setStudyMinutesByDay] = useState<Record<string, number>>(DEFAULT_STUDY_MINUTES_BY_DAY);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        setLoading(false);
      }
    });
  }, [navigate]);

  const addSubject = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || subjects.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) return;
    setSubjects([...subjects, { name: trimmed, knowledge_level: 1 }]);
    setNewSubject("");
  };

  const removeSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const updateKnowledgeLevel = (index: number, level: number) => {
    const updated = [...subjects];
    updated[index].knowledge_level = level;
    setSubjects(updated);
  };

  const toggleDay = (day: string) => {
    setStudyDays((prev) => {
      const next = prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day];
      setStudyMinutesByDay((current) => ({ ...current, [day]: next.includes(day) && !current[day] ? 60 : current[day] || 0 }));
      return next;
    });
  };

  const updateDayMinutes = (day: string, part: "hours" | "minutes", value: string) => {
    const numeric = Math.max(0, Number(value) || 0);
    setStudyMinutesByDay((prev) => {
      const current = Math.max(0, prev[day] || 0);
      const hours = Math.floor(current / 60);
      const minutes = current % 60;
      const next = part === "hours" ? Math.round(numeric) * 60 + minutes : hours * 60 + Math.min(59, Math.round(numeric));
      return { ...prev, [day]: next };
    });
  };

  const canProceed = () => {
    switch (step) {
      case 0: return targetExam && targetPosition.trim();
      case 1: return subjects.length >= 1;
      case 2: return studyDays.length >= 1 && studyDays.some((day) => (studyMinutesByDay[day] || 0) > 0);
      case 3: return true;
      default: return false;
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const totalWeeklyMinutes = studyDays.reduce((sum, day) => sum + Math.max(0, studyMinutesByDay[day] || 0), 0);
      const averageDailyHours = studyDays.length ? totalWeeklyMinutes / studyDays.length / 60 : 0;

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          target_exam: targetExam,
          target_position: targetPosition.trim(),
          exam_date: examDate ? format(examDate, "yyyy-MM-dd") : null,
          study_days: studyDays,
          daily_hours: Math.round(averageDailyHours * 100) / 100,
          study_minutes_by_day: studyMinutesByDay,
          banca: banca || null,
          onboarding_completed: true,
        } as any)
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Insert subjects
      const subjectRows = subjects.map((s) => ({
        user_id: user.id,
        name: s.name,
        knowledge_level: s.knowledge_level,
      }));

      const { error: subjectsError } = await supabase
        .from("user_subjects")
        .insert(subjectRows);

      if (subjectsError) throw subjectsError;

      toast({ title: "Onboarding concluído! 🎉", description: "Seu plano de estudos está sendo preparado." });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <BrandLogo variant="mark" size="sidebarCollapsed" imgClassName="animate-pulse" />
      </div>
    );
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border glass sticky top-0 z-40">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <BrandLogo size="nav" imgClassName="max-w-[160px]" />
          </div>
          <div className="text-sm text-muted-foreground">
            Passo {step + 1} de {STEPS.length}
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        {/* Progress */}
        <div className="mb-8">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-4">
            {STEPS.map((s, i) => (
              <div
                key={i}
                className={cn(
                  "flex flex-col items-center gap-1 text-center",
                  i <= step ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors",
                    i < step
                      ? "bg-primary border-primary text-primary-foreground"
                      : i === step
                      ? "border-primary text-primary"
                      : "border-muted text-muted-foreground"
                  )}
                >
                  {i < step ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                </div>
                <span className="text-xs hidden sm:block">{s.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {step === 0 && (
              <Card className="glass border-border/50">
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Qual é o seu objetivo?
                  </CardTitle>
                  <CardDescription>
                    Nos conte sobre o concurso que você está estudando.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label>Tipo de concurso / exame</Label>
                    <Select value={targetExam} onValueChange={setTargetExam}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXAMS.map((exam) => (
                          <SelectItem key={exam} value={exam}>{exam}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo / posição pretendida</Label>
                    <Input
                      placeholder="Ex: Analista Judiciário, Auditor Fiscal..."
                      value={targetPosition}
                      onChange={(e) => setTargetPosition(e.target.value)}
                      maxLength={200}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Banca organizadora (opcional)</Label>
                    <Select value={banca} onValueChange={setBanca}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a banca" />
                      </SelectTrigger>
                      <SelectContent>
                        {BANCAS.map((b) => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Data prevista da prova (opcional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !examDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {examDate
                            ? format(examDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                            : "Selecione a data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={examDate}
                          onSelect={setExamDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 1 && (
              <Card className="glass border-border/50">
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Suas disciplinas
                  </CardTitle>
                  <CardDescription>
                    Adicione as matérias do edital. Clique nos botões ou digite manualmente.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Quick add buttons */}
                  <div>
                    <Label className="mb-2 block text-xs text-muted-foreground">Sugestões rápidas</Label>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_SUBJECTS.filter(
                        (cs) => !subjects.some((s) => s.name.toLowerCase() === cs.toLowerCase())
                      ).map((cs) => (
                        <button
                          key={cs}
                          onClick={() => addSubject(cs)}
                          className="px-3 py-1.5 rounded-full text-xs border border-border hover:border-primary/50 hover:text-primary transition-colors"
                        >
                          + {cs}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom add */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Adicionar disciplina personalizada..."
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addSubject(newSubject)}
                      maxLength={100}
                    />
                    <Button size="icon" variant="outline" onClick={() => addSubject(newSubject)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Selected subjects */}
                  {subjects.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Disciplinas selecionadas ({subjects.length})
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {subjects.map((s, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm border border-primary/20"
                          >
                            <span>{s.name}</span>
                            <button onClick={() => removeSubject(i)} className="hover:text-destructive">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card className="glass border-border/50">
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Sua disponibilidade
                  </CardTitle>
                  <CardDescription>
                    Quando e quanto tempo você pode estudar por dia?
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>Dias da semana disponíveis</Label>
                    <div className="flex gap-2 flex-wrap">
                      {DAYS_OF_WEEK.map((day) => (
                        <button
                          key={day.key}
                          onClick={() => toggleDay(day.key)}
                          className={cn(
                            "w-12 h-12 rounded-lg border-2 text-sm font-medium transition-all",
                            studyDays.includes(day.key)
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/30"
                          )}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Horas diárias de estudo</Label>
                    <div className="flex gap-2 flex-wrap">
                      {["1", "2", "3", "4", "5", "6", "8", "10"].map((h) => (
                        <button
                          key={h}
                          onClick={() => setDailyHours(h)}
                          className={cn(
                            "px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all",
                            dailyHours === h
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/30"
                          )}
                        >
                          {h}h
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <p className="text-sm text-muted-foreground">
                      <Sparkles className="inline h-4 w-4 text-primary mr-1" />
                      Com <strong className="text-foreground">{dailyHours}h</strong> por dia em{" "}
                      <strong className="text-foreground">{studyDays.length} dias</strong>, você terá{" "}
                      <strong className="text-primary">
                        {Number(dailyHours) * studyDays.length}h por semana
                      </strong>{" "}
                      de estudo.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card className="glass border-border/50">
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    Autoavaliação
                  </CardTitle>
                  <CardDescription>
                    Avalie seu nível atual em cada disciplina de 1 (iniciante) a 5 (avançado).
                    Isso ajuda a IA a priorizar seus estudos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {subjects.map((subject, i) => (
                    <div
                      key={i}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/30"
                    >
                      <span className="font-medium text-sm">{subject.name}</span>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <button
                            key={level}
                            onClick={() => updateKnowledgeLevel(i, level)}
                            className={cn(
                              "w-9 h-9 rounded-md border-2 text-xs font-bold transition-all",
                              subject.knowledge_level >= level
                                ? "border-primary bg-primary/20 text-primary"
                                : "border-border text-muted-foreground hover:border-primary/30"
                            )}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-between text-xs text-muted-foreground mt-2 px-1">
                    <span>1 = Iniciante</span>
                    <span>5 = Avançado</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={step === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="glow"
            >
              Próximo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={saving}
              className="glow"
            >
              {saving ? (
                <>
                  <Brain className="mr-2 h-4 w-4 animate-pulse" />
                  Salvando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Gerar Meu Plano
                </>
              )}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default Onboarding;
