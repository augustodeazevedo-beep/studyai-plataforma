import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Sparkles, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface NotebooksTabProps { userId: string; }

const NotebooksTab = ({ userId }: NotebooksTabProps) => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [expanding, setExpanding] = useState(false);
  const [filterSubject, setFilterSubject] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [subRes, notesRes] = await Promise.all([
      supabase.from("user_subjects").select("*").eq("user_id", userId),
      supabase.from("user_notes").select("*, user_subjects(name)").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    ]);
    setSubjects(subRes.data || []);
    setNotes(notesRes.data || []);
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const saveNote = async () => {
    if (!noteContent.trim()) { toast.error("Conteúdo obrigatório"); return; }
    const { error } = await supabase.from("user_notes").insert({
      user_id: userId, title: noteTitle || "Nota Rápida", content: noteContent,
      subject_id: selectedSubject || null,
    });
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Nota salva!");
    setNoteContent(""); setNoteTitle("");
    loadData();
  };

  const expandWithAI = async () => {
    if (!noteContent.trim()) { toast.error("Escreva algo primeiro"); return; }
    setExpanding(true);
    try {
      const subjectName = subjects.find(s => s.id === selectedSubject)?.name || "";
      const { data, error } = await supabase.functions.invoke("expand-note", { body: { noteContent, subjectName } });
      if (error) throw error;
      setNoteContent(data.content || noteContent);
      toast.success("Nota expandida com IA!");
    } catch (e: any) { toast.error(e.message || "Erro ao expandir"); }
    setExpanding(false);
  };

  const filteredNotes = filterSubject ? notes.filter(n => n.subject_id === filterSubject) : notes;

  // Note count per subject
  const noteCounts = subjects.map(s => ({
    ...s,
    count: notes.filter(n => n.subject_id === s.id).length,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-display">📓 Cadernos Inteligentes</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: New note */}
        <Card className="glass">
          <CardHeader><CardTitle className="text-sm">Nova Nota Rápida</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Disciplina</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger><SelectValue placeholder="Vincular a..." /></SelectTrigger>
                <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Título</Label>
              <input className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="Título da nota" />
            </div>
            <div>
              <Label className="text-xs">Conteúdo</Label>
              <Textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Sua anotação..." rows={8} />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={saveNote}><Save className="h-4 w-4 mr-1" />Salvar</Button>
              <Button variant="outline" onClick={expandWithAI} disabled={expanding}>
                {expanding ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-1" />Expandir com IA</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right: Subject grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <button onClick={() => setFilterSubject(null)} className={`p-3 rounded-lg text-sm text-left transition-colors ${!filterSubject ? "bg-primary/10 text-primary border border-primary/30" : "bg-card border border-border hover:bg-muted/50"}`}>
              <BookOpen className="h-4 w-4 mb-1" />
              <div className="font-medium">Todas</div>
              <div className="text-xs text-muted-foreground">{notes.length} notas</div>
            </button>
            {noteCounts.map(s => (
              <button key={s.id} onClick={() => setFilterSubject(s.id)} className={`p-3 rounded-lg text-sm text-left transition-colors ${filterSubject === s.id ? "bg-primary/10 text-primary border border-primary/30" : "bg-card border border-border hover:bg-muted/50"}`}>
                <BookOpen className="h-4 w-4 mb-1" />
                <div className="font-medium truncate">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.count} notas</div>
              </button>
            ))}
          </div>

          {/* Recent notes */}
          <Card className="glass">
            <CardHeader><CardTitle className="text-sm">Notas Recentes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {filteredNotes.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma nota encontrada</p> : (
                filteredNotes.slice(0, 10).map(n => (
                  <div key={n.id} className="p-3 bg-muted/20 rounded-lg">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-medium">{n.title || "Sem título"}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(n.created_at), "dd/MM")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.content}</p>
                    {n.user_subjects?.name && <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded mt-1 inline-block">{n.user_subjects.name}</span>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NotebooksTab;
