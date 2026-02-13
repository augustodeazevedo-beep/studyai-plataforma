import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Timer, Play, Pause, Square, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface StudyTimerTabProps { userId: string }

const POMODORO_WORK = 25 * 60;
const POMODORO_BREAK = 5 * 60;

const StudyTimerTab = ({ userId }: StudyTimerTabProps) => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [mode, setMode] = useState<"pomodoro" | "free">("pomodoro");
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(POMODORO_WORK);
  const [isBreak, setIsBreak] = useState(false);
  const [totalStudied, setTotalStudied] = useState(0);
  const startTimeRef = useRef<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("user_subjects").select("*").eq("user_id", userId).then(({ data }) => setSubjects(data || []));
  }, [userId]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (mode === "pomodoro" && prev <= 1) {
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            if (!isBreak) {
              saveSession();
              toast({ title: "Pomodoro completo! 🍅 Hora do descanso." });
              setIsBreak(true);
              return POMODORO_BREAK;
            } else {
              toast({ title: "Descanso terminado! Vamos voltar? 💪" });
              setIsBreak(false);
              return POMODORO_WORK;
            }
          }
          if (mode === "free") setTotalStudied((t) => t + 1);
          return mode === "pomodoro" ? prev - 1 : prev + 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, mode, isBreak]);

  const startTimer = () => {
    if (!selectedSubject) { toast({ title: "Selecione uma disciplina", variant: "destructive" }); return; }
    startTimeRef.current = new Date();
    setIsRunning(true);
  };

  const pauseTimer = () => setIsRunning(false);

  const stopTimer = async () => {
    setIsRunning(false);
    await saveSession();
    setSeconds(mode === "pomodoro" ? POMODORO_WORK : 0);
    setTotalStudied(0);
    setIsBreak(false);
  };

  const saveSession = async () => {
    if (!startTimeRef.current || !selectedSubject) return;
    const ended = new Date();
    const durationMinutes = Math.round((ended.getTime() - startTimeRef.current.getTime()) / 60000);
    if (durationMinutes < 1) return;
    await supabase.from("study_sessions").insert({
      user_id: userId, subject_id: selectedSubject,
      started_at: startTimeRef.current.toISOString(), ended_at: ended.toISOString(),
      duration_minutes: durationMinutes,
    });
    startTimeRef.current = new Date();
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSeconds(mode === "pomodoro" ? POMODORO_WORK : 0);
    setTotalStudied(0);
    setIsBreak(false);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-display font-bold flex items-center gap-2"><Timer className="h-5 w-5 text-primary" />Cronômetro de Estudo</h2>

      <div className="flex gap-2 justify-center">
        <Button variant={mode === "pomodoro" ? "default" : "outline"} onClick={() => { setMode("pomodoro"); resetTimer(); setSeconds(POMODORO_WORK); }}>Pomodoro</Button>
        <Button variant={mode === "free" ? "default" : "outline"} onClick={() => { setMode("free"); resetTimer(); setSeconds(0); }}>Livre</Button>
      </div>

      <Card className="glass max-w-md mx-auto">
        <CardContent className="flex flex-col items-center gap-6 py-12">
          <p className="text-xs text-muted-foreground">{isBreak ? "☕ Descanso" : mode === "pomodoro" ? "🍅 Foco" : "⏱️ Cronômetro livre"}</p>
          <div className={cn("text-6xl font-mono font-bold", isBreak ? "text-warning" : "text-primary")}>
            {formatTime(seconds)}
          </div>

          <div className="w-full max-w-xs space-y-3">
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger><SelectValue placeholder="Selecione a disciplina" /></SelectTrigger>
              <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>

            <div className="flex gap-2 justify-center">
              {!isRunning ? (
                <Button onClick={startTimer} className="glow"><Play className="h-4 w-4 mr-2" />Iniciar</Button>
              ) : (
                <Button variant="outline" onClick={pauseTimer}><Pause className="h-4 w-4 mr-2" />Pausar</Button>
              )}
              <Button variant="outline" onClick={stopTimer}><Square className="h-4 w-4 mr-2" />Parar</Button>
              <Button variant="ghost" size="icon" onClick={resetTimer}><RotateCcw className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudyTimerTab;
