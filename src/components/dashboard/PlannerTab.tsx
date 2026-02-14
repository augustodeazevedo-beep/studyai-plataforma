import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { checkAchievements } from "@/lib/checkAchievements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Play, Pause, RotateCcw, Star, Plus, ChevronLeft, ChevronRight, GripVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isToday, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PlannerTabProps { userId: string; }

interface CalendarBlock {
  id: string;
  user_id: string;
  subject_id: string | null;
  block_date: string;
  duration_minutes: number;
  material_name: string | null;
  order_index: number;
  subject_name?: string;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const PlannerTab = ({ userId }: PlannerTabProps) => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [draggedBlock, setDraggedBlock] = useState<CalendarBlock | null>(null);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<CalendarBlock | null>(null);
  const [editForm, setEditForm] = useState({ subject_id: "", duration_minutes: "60", material_name: "" });

  // Add block modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addDate, setAddDate] = useState<string>("");

  // Quick session form
  const [sessionForm, setSessionForm] = useState({ subject_id: "", material_name: "", pages_start: "", pages_end: "", duration_minutes: "60", comprehension_rating: 3 });

  const loadData = useCallback(async () => {
    const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const heatmapStart = format(ninetyDaysAgo, "yyyy-MM-dd");

    const [subRes, sesRes, blockRes] = await Promise.all([
      supabase.from("user_subjects").select("*").eq("user_id", userId),
      supabase.from("study_sessions").select("*, user_subjects(name)").eq("user_id", userId).gte("started_at", heatmapStart).order("started_at", { ascending: false }),
      supabase.from("study_calendar_blocks").select("*, user_subjects(name)").eq("user_id", userId).gte("block_date", monthStart).lte("block_date", monthEnd).order("order_index"),
    ]);
    setSubjects(subRes.data || []);
    setSessions(sesRes.data || []);
    setBlocks((blockRes.data || []).map((b: any) => ({ ...b, subject_name: b.user_subjects?.name })));
  }, [userId, currentMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  // Pomodoro timer
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 0) { setTimerRunning(false); toast.success("Pomodoro concluído! 🎉"); return 25 * 60; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTimer = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // Calendar grid generation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const calendarDays: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  const getBlocksForDate = (date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    return blocks.filter(b => b.block_date === key);
  };

  // Drag and drop handlers
  const handleDragStart = (block: CalendarBlock) => {
    setDraggedBlock(block);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (!draggedBlock) return;

    const newDate = format(targetDate, "yyyy-MM-dd");
    if (newDate === draggedBlock.block_date) { setDraggedBlock(null); return; }

    // Optimistic update
    setBlocks(prev => prev.map(b => b.id === draggedBlock.id ? { ...b, block_date: newDate } : b));

    const { error } = await supabase.from("study_calendar_blocks").update({ block_date: newDate }).eq("id", draggedBlock.id);
    if (error) {
      toast.error("Erro ao mover bloco");
      loadData();
    } else {
      toast.success("Bloco reagendado!");
    }
    setDraggedBlock(null);
  };

  // Edit block
  const openEditModal = (block: CalendarBlock) => {
    setEditingBlock(block);
    setEditForm({
      subject_id: block.subject_id || "",
      duration_minutes: String(block.duration_minutes),
      material_name: block.material_name || "",
    });
    setEditModalOpen(true);
  };

  const saveBlock = async () => {
    if (!editingBlock) return;
    const { error } = await supabase.from("study_calendar_blocks").update({
      subject_id: editForm.subject_id || null,
      duration_minutes: parseInt(editForm.duration_minutes) || 60,
      material_name: editForm.material_name || null,
    }).eq("id", editingBlock.id);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Bloco atualizado!");
    setEditModalOpen(false);
    loadData();
  };

  const deleteBlock = async (blockId: string) => {
    const { error } = await supabase.from("study_calendar_blocks").delete().eq("id", blockId);
    if (error) { toast.error("Erro ao excluir"); return; }
    setBlocks(prev => prev.filter(b => b.id !== blockId));
    setEditModalOpen(false);
    toast.success("Bloco removido!");
  };

  // Add block
  const openAddModal = (date: Date) => {
    setAddDate(format(date, "yyyy-MM-dd"));
    setEditForm({ subject_id: "", duration_minutes: "60", material_name: "" });
    setAddModalOpen(true);
  };

  const addBlock = async () => {
    if (!editForm.subject_id) { toast.error("Selecione uma disciplina"); return; }
    const dayBlocks = blocks.filter(b => b.block_date === addDate);
    const { error } = await supabase.from("study_calendar_blocks").insert({
      user_id: userId,
      subject_id: editForm.subject_id,
      block_date: addDate,
      duration_minutes: parseInt(editForm.duration_minutes) || 60,
      material_name: editForm.material_name || null,
      order_index: dayBlocks.length,
    });
    if (error) { toast.error("Erro ao adicionar bloco"); return; }
    toast.success("Bloco adicionado!");
    setAddModalOpen(false);
    loadData();
  };

  // Quick session
  const addSession = async () => {
    if (!sessionForm.subject_id) { toast.error("Selecione uma disciplina"); return; }
    const { error } = await supabase.from("study_sessions").insert({
      user_id: userId, subject_id: sessionForm.subject_id, material_name: sessionForm.material_name || null,
      pages_start: sessionForm.pages_start ? parseInt(sessionForm.pages_start) : null,
      pages_end: sessionForm.pages_end ? parseInt(sessionForm.pages_end) : null,
      duration_minutes: sessionForm.duration_minutes ? parseInt(sessionForm.duration_minutes) : 0,
      comprehension_rating: sessionForm.comprehension_rating,
      started_at: new Date().toISOString(),
    });
    if (error) { toast.error("Erro ao salvar sessão"); return; }
    toast.success("Sessão registrada!");
    setSessionForm({ subject_id: "", material_name: "", pages_start: "", pages_end: "", duration_minutes: "60", comprehension_rating: 3 });
    loadData();
    checkAchievements(userId);
  };

  // Heatmap
  const sessionDates = sessions.map(s => format(new Date(s.started_at), "yyyy-MM-dd"));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-display">🗓️ Planner de Estudos</h1>

      {/* Heatmap - 90 days with scroll buttons */}
      <Card className="glass">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold">Histórico de Intensidade</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Menos</span>
              <div className="flex gap-0.5">
                <div className="w-3 h-3 rounded-full bg-muted" />
                <div className="w-3 h-3 rounded-full bg-primary/30" />
                <div className="w-3 h-3 rounded-full bg-primary/60" />
                <div className="w-3 h-3 rounded-full bg-primary" />
              </div>
              <span>Mais</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const el = document.getElementById("heatmap-scroll");
                if (el) el.scrollBy({ left: -200, behavior: "smooth" });
              }}
              className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div id="heatmap-scroll" className="flex gap-[3px] overflow-x-hidden flex-1">
              {Array.from({ length: 90 }, (_, i) => {
                const d = new Date(); d.setDate(d.getDate() - 89 + i);
                const key = format(d, "yyyy-MM-dd");
                const count = sessionDates.filter(sd => sd === key).length;
                return (
                  <div key={i} className={`w-3 h-3 rounded-sm flex-shrink-0 transition-colors ${count === 0 ? "bg-muted" : count === 1 ? "bg-primary/30" : count === 2 ? "bg-primary/60" : "bg-primary"}`} title={`${format(d, "dd/MM")}: ${count} sessões`} />
                );
              })}
            </div>
            <button
              onClick={() => {
                const el = document.getElementById("heatmap-scroll");
                if (el) el.scrollBy({ left: 200, behavior: "smooth" });
              }}
              className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar Grid - takes most space */}
        <Card className="glass flex-1 min-w-0">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <CardTitle className="text-lg capitalize">
                {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-2">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(wd => (
                <div key={wd} className="text-center text-xs font-semibold text-primary py-1">{wd}</div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7 auto-rows-fr">
              {calendarDays.map((date, i) => {
                const dayBlocks = getBlocksForDate(date);
                const inMonth = isSameMonth(date, currentMonth);
                const today = isToday(date);

                return (
                  <div
                    key={i}
                    className={`border border-border/30 min-h-[60px] lg:min-h-[100px] p-1 transition-colors ${
                      !inMonth ? "opacity-30" : ""
                    } ${today ? "bg-primary/5 border-primary/40" : ""} ${
                      draggedBlock ? "hover:bg-primary/10" : ""
                    }`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, date)}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-xs font-medium ${today ? "text-primary font-bold" : "text-muted-foreground"}`}>
                        {format(date, "d")}
                      </span>
                    </div>

                    {/* Study blocks */}
                    <div className="space-y-0.5">
                      {dayBlocks.map(block => (
                        <div
                          key={block.id}
                          draggable
                          onDragStart={() => handleDragStart(block)}
                          onClick={() => openEditModal(block)}
                          className="group bg-primary/15 hover:bg-primary/25 border border-primary/20 rounded px-1 py-0.5 cursor-grab active:cursor-grabbing transition-colors"
                        >
                          <div className="flex items-center gap-0.5">
                            <GripVertical className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] font-semibold text-primary truncate">{block.duration_minutes} min</div>
                              <div className="text-[10px] text-foreground/80 truncate">{block.subject_name || "—"}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add block button */}
                    {inMonth && (
                      <button
                        onClick={() => openAddModal(date)}
                        className="w-full text-[10px] text-muted-foreground hover:text-primary mt-0.5 opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
                      >
                        + Bloco
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Right sidebar: Timer + Quick Session */}
        <div className="w-full lg:w-[320px] shrink-0 space-y-4">
          {/* Pomodoro Timer */}
          <Card className="glass">
            <CardHeader className="py-3"><CardTitle className="text-sm">🍅 Foco Pomodoro</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center gap-4 pb-4">
              <div className="text-5xl font-mono font-bold text-primary">{formatTimer(timerSeconds)}</div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setTimerRunning(!timerRunning)}>
                  {timerRunning ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                  {timerRunning ? "Pausar" : "Iniciar"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setTimerRunning(false); setTimerSeconds(25 * 60); }}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Session Form */}
          <Card className="glass">
            <CardHeader className="py-3"><CardTitle className="text-sm">📝 Registro de Sessões Rápido</CardTitle></CardHeader>
            <CardContent className="space-y-3 pb-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Disciplina</Label>
                  <Select value={sessionForm.subject_id} onValueChange={v => setSessionForm(p => ({ ...p, subject_id: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Material</Label>
                  <Input className="h-8 text-xs" value={sessionForm.material_name} onChange={e => setSessionForm(p => ({ ...p, material_name: e.target.value }))} placeholder="PDF, Videoaula, etc." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Pág. Início</Label><Input className="h-8 text-xs" type="number" value={sessionForm.pages_start} onChange={e => setSessionForm(p => ({ ...p, pages_start: e.target.value }))} /></div>
                <div><Label className="text-xs">Pág. Fim</Label><Input className="h-8 text-xs" type="number" value={sessionForm.pages_end} onChange={e => setSessionForm(p => ({ ...p, pages_end: e.target.value }))} /></div>
              </div>
              <div>
                <Label className="text-xs">Duração (minutos)</Label>
                <Input className="h-8 text-xs" type="number" value={sessionForm.duration_minutes} onChange={e => setSessionForm(p => ({ ...p, duration_minutes: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Compreensão</Label>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setSessionForm(p => ({ ...p, comprehension_rating: n }))}>
                      <Star className={`h-5 w-5 ${n <= sessionForm.comprehension_rating ? "text-primary fill-primary" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <Button className="w-full" onClick={addSession}><Plus className="h-4 w-4 mr-1" />Adicionar Sessão</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent sessions */}
      <Card className="glass">
        <CardHeader className="py-3"><CardTitle className="text-sm">Histórico Recente de Sessões</CardTitle></CardHeader>
        <CardContent>
          {sessions.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma sessão registrada</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2">Data</th><th className="text-left py-2">Disciplina</th><th className="text-left py-2">Material</th><th className="text-left py-2">Págs</th><th className="text-left py-2">Tempo</th><th className="text-left py-2">Compreensão</th><th className="text-left py-2">Ações</th>
                </tr></thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id} className="border-b border-border/50">
                      <td className="py-2">{format(new Date(s.started_at), "dd/MM")}</td>
                      <td>{(s as any).user_subjects?.name || "—"}</td>
                      <td>{s.material_name || "—"}</td>
                      <td>{s.pages_start && s.pages_end ? `${s.pages_start}-${s.pages_end}` : "—"}</td>
                      <td>{s.duration_minutes || 0}min</td>
                      <td>{s.comprehension_rating ? "⭐".repeat(s.comprehension_rating) : "—"}</td>
                      <td>—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Block Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Bloco de Estudo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Disciplina</Label>
              <Select value={editForm.subject_id} onValueChange={v => setEditForm(p => ({ ...p, subject_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Material</Label>
              <Input value={editForm.material_name} onChange={e => setEditForm(p => ({ ...p, material_name: e.target.value }))} placeholder="PDF, Videoaula, etc." />
            </div>
            <div>
              <Label>Duração (minutos)</Label>
              <Input type="number" value={editForm.duration_minutes} onChange={e => setEditForm(p => ({ ...p, duration_minutes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            {editingBlock && (
              <Button variant="destructive" size="sm" onClick={() => deleteBlock(editingBlock.id)}>
                <Trash2 className="h-4 w-4 mr-1" /> Excluir
              </Button>
            )}
            <Button onClick={saveBlock}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Block Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar Bloco — {addDate && format(new Date(addDate + "T12:00:00"), "dd/MM/yyyy")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Disciplina</Label>
              <Select value={editForm.subject_id} onValueChange={v => setEditForm(p => ({ ...p, subject_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Material</Label>
              <Input value={editForm.material_name} onChange={e => setEditForm(p => ({ ...p, material_name: e.target.value }))} placeholder="PDF, Videoaula, etc." />
            </div>
            <div>
              <Label>Duração (minutos)</Label>
              <Input type="number" value={editForm.duration_minutes} onChange={e => setEditForm(p => ({ ...p, duration_minutes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={addBlock}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlannerTab;
