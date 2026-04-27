import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Settings, Save, Download, Trash2 } from "lucide-react";
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

const formatMinutes = (minutes: number) => {
  const safe = Math.max(0, Math.round(minutes || 0));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  return `${hours}h${mins ? ` ${mins}min` : ""}`;
};

const SettingsTab = ({ userId }: SettingsTabProps) => {
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [targetExam, setTargetExam] = useState("");
  const [targetPosition, setTargetPosition] = useState("");
  const [studyDays, setStudyDays] = useState<string[]>([]);
  const [studyMinutesByDay, setStudyMinutesByDay] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle().then(({ data }) => {
      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
        setTargetExam(data.target_exam || "");
        setTargetPosition(data.target_position || "");
        const days = data.study_days || [];
        const legacyMinutes = Math.round((data.daily_hours || 2) * 60);
        setStudyDays(days);
        setStudyMinutesByDay(data.study_minutes_by_day || Object.fromEntries(days.map((day: string) => [day, legacyMinutes])));
      }
    });
  }, [userId]);

  const toggleDay = (day: string) => setStudyDays((prev) => {
    const next = prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day];
    setStudyMinutesByDay((current) => ({ ...current, [day]: next.includes(day) && !current[day] ? 60 : current[day] || 0 }));
    return next;
  });

  const updateDayMinutes = (day: string, part: "hours" | "minutes", value: string) => {
    const numeric = Math.max(0, Number(value) || 0);
    setStudyMinutesByDay((prev) => {
      const current = Math.max(0, prev[day] || 0);
      const hours = Math.floor(current / 60);
      const minutes = current % 60;
      return { ...prev, [day]: part === "hours" ? Math.round(numeric) * 60 + minutes : hours * 60 + Math.min(59, Math.round(numeric)) };
    });
  };

  const saveSettings = async () => {
    setSaving(true);
    const totalWeeklyMinutes = studyDays.reduce((sum, day) => sum + Math.max(0, studyMinutesByDay[day] || 0), 0);
    const averageDailyHours = studyDays.length ? totalWeeklyMinutes / studyDays.length / 60 : 0;
    const { error } = await supabase.from("profiles").update({
      full_name: fullName, target_exam: targetExam, target_position: targetPosition,
      daily_hours: Math.round(averageDailyHours * 100) / 100, study_days: studyDays, study_minutes_by_day: studyMinutesByDay,
    } as any).eq("user_id", userId);
    setSaving(false);
    if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); return; }
    toast({ title: "Configurações salvas! ✅" });
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/export-user-data`,
        { headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" } }
      );
      if (!res.ok) throw new Error("Falha ao exportar");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `studyai-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Dados exportados! 📦" });
    } catch {
      toast({ title: "Erro ao exportar dados", variant: "destructive" });
    }
    setExporting(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "EXCLUIR") {
      toast({ title: "Digite EXCLUIR para confirmar", variant: "destructive" });
      return;
    }
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/delete-account`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        }
      );
      if (!res.ok) throw new Error("Falha ao excluir");
      await supabase.auth.signOut();
      navigate("/");
      toast({ title: "Conta excluída com sucesso" });
    } catch {
      toast({ title: "Erro ao excluir conta", variant: "destructive" });
    }
    setDeleting(false);
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
            <Label>Tempo diário de estudo</Label>
            <div className="flex gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Horas</Label>
                <Input type="number" min={0} max={16} value={dailyHours} onChange={(e) => setDailyHours(String(Math.max(0, Math.min(16, Number(e.target.value) || 0))))} className="w-20 text-center" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Minutos</Label>
                <Input type="number" min={0} max={59} step={5} value={dailyMinutes} onChange={(e) => setDailyMinutes(String(Math.max(0, Math.min(59, Number(e.target.value) || 0))))} className="w-20 text-center" />
              </div>
              <span className="text-sm text-muted-foreground pb-2">
                = {Number(dailyHours)}h{Number(dailyMinutes) > 0 ? `${dailyMinutes}min` : ""}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={saveSettings} disabled={saving} className="w-full glow">
        <Save className="h-4 w-4 mr-2" />{saving ? "Salvando..." : "Salvar Configurações"}
      </Button>

      {/* LGPD Section */}
      <Card className="glass border-border/50">
        <CardHeader><CardTitle className="text-base">Privacidade e Dados (LGPD)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={handleExportData} disabled={exporting} className="flex-1">
              <Download className="h-4 w-4 mr-2" />{exporting ? "Exportando..." : "Exportar meus dados"}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="flex-1">
                  <Trash2 className="h-4 w-4 mr-2" />Excluir minha conta
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir conta permanentemente</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é <strong>irreversível</strong>. Todos os seus dados serão apagados permanentemente, incluindo sessões de estudo, flashcards, anotações e progresso.
                    <br /><br />
                    Digite <strong>EXCLUIR</strong> abaixo para confirmar:
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Digite EXCLUIR"
                  className="mt-2"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== "EXCLUIR" || deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? "Excluindo..." : "Excluir permanentemente"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <p className="text-xs text-muted-foreground">
            Conforme a LGPD, você pode exportar todos os seus dados ou solicitar a exclusão completa da sua conta a qualquer momento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsTab;
