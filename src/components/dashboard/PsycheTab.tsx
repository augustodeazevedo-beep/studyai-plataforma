import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Heart, Brain, Sun, Moon, Sunrise, Sunset, Smile, Frown, Meh, Zap, Eye, BookOpen, Headphones, Hand, Save, Loader2, CheckCircle, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { applyDailyAdaptation, recalculateAndPersistPlan, enforceForgettingCurve } from "@/lib/planner-adaptation";

interface PsycheTabProps { userId: string; }

const NEURODIVERGENCE_TYPES = [
  "TDAH", "TEA (Autismo)", "Dislexia", "Discalculia", "Disgrafia",
  "TOC", "Ansiedade Generalizada", "Depressão", "Bipolaridade", "Outro",
];

const STUDY_PERIODS = [
  { key: "morning", label: "Manhã", icon: Sunrise, desc: "6h - 12h" },
  { key: "afternoon", label: "Tarde", icon: Sun, desc: "12h - 18h" },
  { key: "evening", label: "Noite", icon: Sunset, desc: "18h - 22h" },
  { key: "night", label: "Madrugada", icon: Moon, desc: "22h - 6h" },
];

const STUDY_METHODS = [
  { key: "visual", label: "Visual", icon: Eye, desc: "Mapas mentais, diagramas" },
  { key: "auditory", label: "Auditivo", icon: Headphones, desc: "Videoaulas, podcasts" },
  { key: "kinesthetic", label: "Cinestésico", icon: Hand, desc: "Resumos escritos, prática" },
  { key: "reading", label: "Leitura", icon: BookOpen, desc: "Livros, PDFs, artigos" },
];

const MOOD_LABELS = [
  { value: 1, label: "Muito baixo", icon: Frown, color: "text-destructive" },
  { value: 2, label: "Baixo", icon: Frown, color: "text-warning" },
  { value: 3, label: "Neutro", icon: Meh, color: "text-muted-foreground" },
  { value: 4, label: "Bom", icon: Smile, color: "text-primary" },
  { value: 5, label: "Excelente", icon: Smile, color: "text-success" },
];

const PsycheTab = ({ userId }: PsycheTabProps) => {
  const [profile, setProfile] = useState<any>(null);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [showAnamnesis, setShowAnamnesis] = useState(false);

  // Anamnesis form
  const [form, setForm] = useState({
    has_neurodivergence: false,
    neurodivergence_type: "",
    neurodivergence_notes: "",
    stress_level: 3,
    anxiety_level: 3,
    sleep_quality: 3,
    motivation_level: 3,
    focus_capacity: 3,
    best_study_period: "morning",
    preferred_study_method: "visual",
    attention_span_minutes: 25,
  });

  // Check-in form
  const [checkinForm, setCheckinForm] = useState({
    mood: 3,
    stress: 3,
    energy: 3,
    focus: 3,
    notes: "",
  });

  const loadData = useCallback(async () => {
    const [profRes, checkRes] = await Promise.all([
      supabase.from("psyche_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("psyche_checkins").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
    ]);
    if (profRes.data) {
      setProfile(profRes.data);
      setForm({
        has_neurodivergence: profRes.data.has_neurodivergence || false,
        neurodivergence_type: profRes.data.neurodivergence_type || "",
        neurodivergence_notes: profRes.data.neurodivergence_notes || "",
        stress_level: profRes.data.stress_level || 3,
        anxiety_level: profRes.data.anxiety_level || 3,
        sleep_quality: profRes.data.sleep_quality || 3,
        motivation_level: profRes.data.motivation_level || 3,
        focus_capacity: profRes.data.focus_capacity || 3,
        best_study_period: profRes.data.best_study_period || "morning",
        preferred_study_method: profRes.data.preferred_study_method || "visual",
        attention_span_minutes: profRes.data.attention_span_minutes || 25,
      });
    } else {
      setShowAnamnesis(true);
    }
    setCheckins(checkRes.data || []);
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const saveAnamnesis = async () => {
    setSaving(true);
    const payload = {
      user_id: userId,
      ...form,
      anamnesis_completed: true,
      current_mood: 3,
    };

    let error;
    if (profile) {
      ({ error } = await supabase.from("psyche_profiles").update(payload).eq("user_id", userId));
    } else {
      ({ error } = await supabase.from("psyche_profiles").insert(payload));
    }
    setSaving(false);
    if (error) { toast.error("Erro ao salvar"); console.error(error); return; }
    toast.success("Perfil psíquico salvo! ✅");
    setShowAnamnesis(false);
    loadData();
  };

  const submitCheckin = async () => {
    const { error } = await supabase.from("psyche_checkins").insert({
      user_id: userId,
      ...checkinForm,
    });
    if (error) { toast.error("Erro ao registrar check-in"); return; }

    // Update profile with latest mood
    await supabase.from("psyche_profiles").update({
      current_mood: checkinForm.mood,
      stress_level: checkinForm.stress,
      motivation_level: checkinForm.energy,
      focus_capacity: checkinForm.focus,
      mood_notes: checkinForm.notes,
      last_checkin_at: new Date().toISOString(),
    }).eq("user_id", userId);

    toast.success("Check-in registrado! 💚");
    setCheckinForm({ mood: 3, stress: 3, energy: 3, focus: 3, notes: "" });
    loadData();

    // INSTANT G-FORCE ADAPTATION (no AI calls)
    try {
      // 1) Recompute study_plan with new psyche state
      await recalculateAndPersistPlan(userId, { eventType: "psyche_checkin_recalculation", eventSource: "psyche_checkin", explanation: "Check-in de Bem-Estar alterou o vetor Psique e recalibrou o plano." });
      await enforceForgettingCurve(userId);
      await supabase.functions.invoke("recalculate-review-schedule", { body: { trigger: "psyche_checkin" } });
      // 2) Adapt today's calendar blocks (light/intensive mode + TDAH fragmentation)
      const result = await applyDailyAdaptation(userId);
      if (result.blocksAffected > 0) {
        toast.success(result.message, { duration: 6000 });
      }
    } catch (e) {
      console.error("Adaptive recalibration failed:", e);
    }
  };

  // Calculate Psique score
  const psycheScore = profile ? Math.round(
    ((profile.current_mood || 3) + (6 - (profile.stress_level || 3)) + (profile.sleep_quality || 3) + (profile.motivation_level || 3) + (profile.focus_capacity || 3)) / 5 * 20
  ) : 60;

  const RatingBar = ({ label, value, onChange, lowLabel, highLabel }: { label: string; value: number; onChange: (v: number) => void; lowLabel: string; highLabel: string }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <Label className="text-sm">{label}</Label>
        <span className="text-muted-foreground">{value}/5</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`flex-1 h-8 rounded text-xs font-medium transition-all ${
              n <= value
                ? n <= 2 ? "bg-destructive/20 text-destructive border border-destructive/30"
                : n <= 3 ? "bg-warning/20 text-warning border border-warning/30"
                : "bg-primary/20 text-primary border border-primary/30"
                : "bg-muted/20 text-muted-foreground border border-border hover:border-primary/30"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{lowLabel}</span><span>{highLabel}</span>
      </div>
    </div>
  );

  // Show anamnesis if not completed
  if (showAnamnesis || !profile?.anamnesis_completed) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold font-display flex items-center justify-center gap-2">
            <Heart className="h-6 w-6 text-primary" />Anamnese de Bem-Estar
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            "Conhecer a si mesmo é o começo de toda sabedoria." — Aristóteles. 
            Este questionário nos ajuda a personalizar sua experiência de estudo respeitando seu perfil cognitivo e emocional.
          </p>
        </div>

        {/* Neurodivergence */}
        <Card className="glass">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4 text-primary" />Perfil Neurocognitivo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={form.has_neurodivergence}
                onCheckedChange={(checked) => setForm(p => ({ ...p, has_neurodivergence: !!checked }))}
              />
              <div>
                <span className="text-sm font-medium">Possuo alguma condição neurodivergente</span>
                <p className="text-xs text-muted-foreground">TDAH, TEA, Dislexia, etc. Isso nos ajuda a adaptar timers, revisões e métodos.</p>
              </div>
            </label>

            {form.has_neurodivergence && (
              <div className="space-y-3 pl-7">
                <div>
                  <Label className="text-xs">Tipo de condição</Label>
                  <Select value={form.neurodivergence_type} onValueChange={v => setForm(p => ({ ...p, neurodivergence_type: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>{NEURODIVERGENCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Observações (opcional)</Label>
                  <Textarea
                    value={form.neurodivergence_notes}
                    onChange={e => setForm(p => ({ ...p, neurodivergence_notes: e.target.value }))}
                    placeholder="Como isso afeta seus estudos? Usa medicação? Tem acompanhamento?"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emotional State */}
        <Card className="glass">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Heart className="h-4 w-4 text-primary" />Estado Emocional Atual</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <RatingBar label="Nível de Estresse" value={form.stress_level} onChange={v => setForm(p => ({ ...p, stress_level: v }))} lowLabel="Muito baixo" highLabel="Muito alto" />
            <RatingBar label="Nível de Ansiedade" value={form.anxiety_level} onChange={v => setForm(p => ({ ...p, anxiety_level: v }))} lowLabel="Tranquilo" highLabel="Muito ansioso" />
            <RatingBar label="Qualidade do Sono" value={form.sleep_quality} onChange={v => setForm(p => ({ ...p, sleep_quality: v }))} lowLabel="Péssimo" highLabel="Excelente" />
            <RatingBar label="Motivação" value={form.motivation_level} onChange={v => setForm(p => ({ ...p, motivation_level: v }))} lowLabel="Desmotivado" highLabel="Muito motivado" />
            <RatingBar label="Capacidade de Foco" value={form.focus_capacity} onChange={v => setForm(p => ({ ...p, focus_capacity: v }))} lowLabel="Muito difícil" highLabel="Foco total" />
          </CardContent>
        </Card>

        {/* Cognitive Profile */}
        <Card className="glass">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-primary" />Perfil Cognitivo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm mb-2 block">Melhor período para estudar</Label>
              <div className="grid grid-cols-2 gap-2">
                {STUDY_PERIODS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => setForm(f => ({ ...f, best_study_period: p.key }))}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left ${
                      form.best_study_period === p.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <p.icon className="h-4 w-4 shrink-0" />
                    <div>
                      <div className="text-sm font-medium">{p.label}</div>
                      <div className="text-[10px] opacity-70">{p.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm mb-2 block">Método de estudo preferido</Label>
              <div className="grid grid-cols-2 gap-2">
                {STUDY_METHODS.map(m => (
                  <button
                    key={m.key}
                    onClick={() => setForm(f => ({ ...f, preferred_study_method: m.key }))}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left ${
                      form.preferred_study_method === m.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <m.icon className="h-4 w-4 shrink-0" />
                    <div>
                      <div className="text-sm font-medium">{m.label}</div>
                      <div className="text-[10px] opacity-70">{m.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm">Tempo médio de concentração (minutos)</Label>
              <Input
                type="number"
                min={5}
                max={120}
                value={form.attention_span_minutes}
                onChange={e => setForm(f => ({ ...f, attention_span_minutes: Number(e.target.value) || 25 }))}
                className="w-32"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Usaremos isso para calibrar o timer Pomodoro e os blocos de estudo</p>
            </div>
          </CardContent>
        </Card>

        <Button onClick={saveAnamnesis} disabled={saving} className="w-full glow">
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : <><Save className="h-4 w-4 mr-2" />Salvar Perfil de Bem-Estar</>}
        </Button>
      </div>
    );
  }

  // Dashboard view after anamnesis is completed
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Heart className="h-6 w-6 text-primary" />Bem-Estar
        </h1>
        <Button variant="outline" size="sm" onClick={() => setShowAnamnesis(true)}>
          <Brain className="h-3 w-3 mr-1" />Editar Anamnese
        </Button>
      </div>

      <p className="text-sm text-muted-foreground italic">"Cuide da sua mente e ela cuidará dos seus estudos. Persistência transforma sonho em realidade."</p>

      {/* Psique Score */}
      <Card className="glass">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className={`text-5xl font-bold ${psycheScore >= 60 ? "text-primary" : psycheScore >= 40 ? "text-warning" : "text-destructive"}`}>
                {psycheScore}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">Índice Psique</div>
            </div>
            <div className="flex-1 space-y-2">
              <Progress value={psycheScore} className="h-3" />
              <div className="grid grid-cols-5 gap-1 text-[10px] text-muted-foreground text-center">
                <span>Humor</span><span>Estresse↓</span><span>Sono</span><span>Motivação</span><span>Foco</span>
              </div>
              <div className="grid grid-cols-5 gap-1 text-xs font-bold text-center">
                <span>{profile?.current_mood || 3}/5</span>
                <span>{6 - (profile?.stress_level || 3)}/5</span>
                <span>{profile?.sleep_quality || 3}/5</span>
                <span>{profile?.motivation_level || 3}/5</span>
                <span>{profile?.focus_capacity || 3}/5</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Check-in */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Smile className="h-4 w-4 text-primary" />Check-in Diário
              </CardTitle>
              <p className="text-xs text-muted-foreground">Como você está se sentindo agora?</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <RatingBar label="Humor" value={checkinForm.mood} onChange={v => setCheckinForm(p => ({ ...p, mood: v }))} lowLabel="😞" highLabel="😄" />
                <RatingBar label="Estresse" value={checkinForm.stress} onChange={v => setCheckinForm(p => ({ ...p, stress: v }))} lowLabel="Tranquilo" highLabel="Muito alto" />
                <RatingBar label="Energia" value={checkinForm.energy} onChange={v => setCheckinForm(p => ({ ...p, energy: v }))} lowLabel="Exausto" highLabel="Energizado" />
                <RatingBar label="Foco" value={checkinForm.focus} onChange={v => setCheckinForm(p => ({ ...p, focus: v }))} lowLabel="Disperso" highLabel="Concentrado" />
              </div>
              <Textarea
                value={checkinForm.notes}
                onChange={e => setCheckinForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Como foi seu dia? Algo afetando seus estudos? (opcional)"
                rows={2}
              />
              <Button onClick={submitCheckin} className="w-full">
                <CheckCircle className="h-4 w-4 mr-1" />Registrar Check-in
              </Button>
            </CardContent>
          </Card>

          {/* Check-in History */}
          <Card className="glass">
            <CardHeader><CardTitle className="text-sm">📊 Histórico de Check-ins</CardTitle></CardHeader>
            <CardContent>
              {checkins.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum check-in registrado ainda</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {checkins.map(c => {
                    const avg = Math.round(((c.mood || 3) + (6 - (c.stress || 3)) + (c.energy || 3) + (c.focus || 3)) / 4 * 20);
                    return (
                      <div key={c.id} className="flex items-center gap-3 p-2 bg-muted/10 rounded text-sm">
                        <div className={`text-lg font-bold w-12 text-center ${avg >= 60 ? "text-primary" : avg >= 40 ? "text-warning" : "text-destructive"}`}>
                          {avg}%
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            <span>😊{c.mood}</span>
                            <span>😰{c.stress}</span>
                            <span>⚡{c.energy}</span>
                            <span>🎯{c.focus}</span>
                          </div>
                          {c.notes && <p className="text-xs truncate mt-0.5">{c.notes}</p>}
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {format(new Date(c.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Profile Summary */}
        <div className="space-y-4">
          <Card className="glass">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4" />Seu Perfil</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {profile?.has_neurodivergence && (
                <div className="p-2 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 text-primary" />
                    <span className="font-medium text-xs">{profile.neurodivergence_type || "Neurodivergente"}</span>
                  </div>
                  {profile.neurodivergence_notes && (
                    <p className="text-xs text-muted-foreground mt-1">{profile.neurodivergence_notes}</p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">Período ideal</span>
                <span className="font-medium text-xs">
                  {STUDY_PERIODS.find(p => p.key === profile?.best_study_period)?.label || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">Método preferido</span>
                <span className="font-medium text-xs">
                  {STUDY_METHODS.find(m => m.key === profile?.preferred_study_method)?.label || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">Span de atenção</span>
                <span className="font-medium text-xs">{profile?.attention_span_minutes || 25} min</span>
              </div>
              {profile?.last_checkin_at && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">Último check-in</span>
                  <span className="font-medium text-xs">
                    {format(new Date(profile.last_checkin_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader><CardTitle className="text-sm">💡 Dicas Personalizadas</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              {profile?.has_neurodivergence && profile?.neurodivergence_type === "TDAH" && (
                <>
                  <p>🧠 <strong className="text-foreground">TDAH:</strong> Use Pomodoros de {Math.min(profile.attention_span_minutes || 15, 20)}min com pausas de 5min.</p>
                  <p>🎯 Alterne entre disciplinas para manter o engajamento.</p>
                  <p>📱 Ative o modo "não perturbe" durante os blocos.</p>
                </>
              )}
              {(profile?.stress_level || 3) >= 4 && (
                <p>🧘 <strong className="text-foreground">Estresse alto:</strong> Considere exercícios de respiração antes de estudar (4-7-8).</p>
              )}
              {(profile?.sleep_quality || 3) <= 2 && (
                <p>😴 <strong className="text-foreground">Sono ruim:</strong> Priorize qualidade de sono. Estudar cansado reduz retenção em até 40%.</p>
              )}
              {(profile?.motivation_level || 3) <= 2 && (
                <p>💪 <strong className="text-foreground">Motivação baixa:</strong> Foque em sessões curtas. Pequenas vitórias geram momentum.</p>
              )}
              {!profile?.has_neurodivergence && (profile?.stress_level || 3) < 4 && (profile?.sleep_quality || 3) > 2 && (
                <p>✅ Seu perfil está equilibrado! Continue mantendo bons hábitos.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PsycheTab;
