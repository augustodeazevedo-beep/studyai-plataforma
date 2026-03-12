import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SettingsTabProps { userId: string }

const EXAMS = [
  "Concurso Público Federal", "Concurso Público Estadual", "Concurso Público Municipal",
  "OAB", "Residência Médica", "ENEM", "Vestibular", "Certificação Profissional", "Outro",
];

const DAYS_OF_WEEK = [
  { key: "seg", label: "Seg" }, { key: "ter", label: "Ter" }, { key: "qua", label: "Qua" },
  { key: "qui", label: "Qui" }, { key: "sex", label: "Sex" }, { key: "sab", label: "Sáb" }, { key: "dom", label: "Dom" },
];

const SettingsTab = ({ userId }: SettingsTabProps) => {
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [targetExam, setTargetExam] = useState("");
  const [targetPosition, setTargetPosition] = useState("");
  const [dailyHours, setDailyHours] = useState("2");
  const [dailyMinutes, setDailyMinutes] = useState("0");
  const [studyDays, setStudyDays] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle().then(({ data }) => {
      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
        setTargetExam(data.target_exam || "");
        setTargetPosition(data.target_position || "");
        setDailyHours(String(data.daily_hours || 2));
        setStudyDays(data.study_days || []);
      }
    });
  }, [userId]);

  const toggleDay = (day: string) => setStudyDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);

  const saveSettings = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName, target_exam: targetExam, target_position: targetPosition,
      daily_hours: Number(dailyHours), study_days: studyDays,
    }).eq("user_id", userId);
    setSaving(false);
    if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); return; }
    toast({ title: "Configurações salvas! ✅" });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-display font-bold flex items-center gap-2"><Settings className="h-5 w-5 text-primary" />Configurações</h2>

      <Card className="glass">
        <CardHeader><CardTitle className="text-base">Perfil</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Nome completo</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>Concurso-alvo</Label>
            <Select value={targetExam} onValueChange={setTargetExam}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{EXAMS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-2"><Label>Cargo pretendido</Label><Input value={targetPosition} onChange={(e) => setTargetPosition(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader><CardTitle className="text-base">Disponibilidade</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Dias de estudo</Label>
            <div className="flex gap-2 flex-wrap">
              {DAYS_OF_WEEK.map((d) => (
                <button key={d.key} onClick={() => toggleDay(d.key)} className={cn("w-11 h-11 rounded-lg border-2 text-sm font-medium transition-all", studyDays.includes(d.key) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30")}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Horas diárias</Label>
            <div className="flex gap-2 flex-wrap">
              {["1", "2", "3", "4", "5", "6", "8", "10"].map((h) => (
                <button key={h} onClick={() => setDailyHours(h)} className={cn("px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all", dailyHours === h ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30")}>
                  {h}h
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={saveSettings} disabled={saving} className="w-full glow">
        <Save className="h-4 w-4 mr-2" />{saving ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
};

export default SettingsTab;
