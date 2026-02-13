import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StickyNote, Plus, Save, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NotesTabProps { userId: string }

const NotesTab = ({ userId }: NotesTabProps) => {
  const [notes, setNotes] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formSubject, setFormSubject] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const { toast } = useToast();

  const fetchData = async () => {
    const [nRes, sRes] = await Promise.all([
      supabase.from("user_notes").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
      supabase.from("user_subjects").select("*").eq("user_id", userId),
    ]);
    setNotes(nRes.data || []);
    setSubjects(sRes.data || []);
  };

  useEffect(() => { fetchData(); }, [userId]);

  const createNote = async () => {
    if (!formTitle.trim() || !formSubject) return;
    await supabase.from("user_notes").insert({ user_id: userId, subject_id: formSubject, title: formTitle, content: formContent });
    toast({ title: "Anotação criada! ✅" });
    setShowForm(false); setFormTitle(""); setFormContent("");
    fetchData();
  };

  const saveNote = async (id: string) => {
    await supabase.from("user_notes").update({ title: editTitle, content: editContent }).eq("id", id);
    toast({ title: "Salvo! ✅" });
    setEditing(null);
    fetchData();
  };

  const deleteNote = async (id: string) => {
    await supabase.from("user_notes").delete().eq("id", id);
    fetchData();
  };

  const getSubjectName = (id: string) => subjects.find((s) => s.id === id)?.name || "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold flex items-center gap-2"><StickyNote className="h-5 w-5 text-primary" />Anotações</h2>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-2" />Nova</Button>
      </div>

      {showForm && (
        <Card className="glass border-primary/20">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2"><Label>Disciplina</Label><Select value={formSubject} onValueChange={setFormSubject}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Título</Label><Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} /></div>
            <div className="space-y-2"><Label>Conteúdo</Label><Textarea value={formContent} onChange={(e) => setFormContent(e.target.value)} rows={6} /></div>
            <Button onClick={createNote} className="w-full">Salvar</Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {notes.map((n) => (
          <Card key={n.id} className="glass">
            <CardContent className="py-4">
              {editing === n.id ? (
                <div className="space-y-3">
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={6} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveNote(n.id)}><Save className="h-3 w-3 mr-1" />Salvar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{getSubjectName(n.subject_id)}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(n.id); setEditTitle(n.title); setEditContent(n.content); }}>Editar</Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteNote(n.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.content}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {notes.length === 0 && !showForm && <p className="text-sm text-muted-foreground text-center py-8">Nenhuma anotação criada.</p>}
      </div>
    </div>
  );
};

export default NotesTab;
