import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, BookOpen, CheckCircle, Target, Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface ArsenalTabProps { userId: string; }

const ArsenalTab = ({ userId }: ArsenalTabProps) => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [editalText, setEditalText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: "", weight: 3, knowledge_level: 1 });
  const [newTopicInputs, setNewTopicInputs] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    const [subRes, topRes] = await Promise.all([
      supabase.from("user_subjects").select("*").eq("user_id", userId),
      supabase.from("topics").select("*").eq("user_id", userId).order("order_index"),
    ]);
    setSubjects(subRes.data || []);
    setTopics(topRes.data || []);
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const processEdital = async () => {
    if (editalText.trim().length < 20) { toast.error("Texto do edital muito curto"); return; }
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-edital", { body: { editalText } });
      if (error) throw error;
      toast.success(`Edital processado! ${data.subjects?.length || 0} disciplinas extraídas`);
      setEditalText("");
      loadData();
    } catch (e: any) { toast.error(e.message || "Erro ao processar edital"); }
    setProcessing(false);
  };

  const addSubject = async () => {
    if (!newSubject.name.trim()) { toast.error("Nome obrigatório"); return; }
    const { error } = await supabase.from("user_subjects").insert({ user_id: userId, name: newSubject.name, weight: newSubject.weight, knowledge_level: newSubject.knowledge_level });
    if (error) { toast.error("Erro ao adicionar"); return; }
    toast.success("Disciplina adicionada!");
    setNewSubject({ name: "", weight: 3, knowledge_level: 1 });
    loadData();
  };

  const toggleTopic = async (topicId: string, completed: boolean) => {
    await supabase.from("topics").update({ completed: !completed }).eq("id", topicId);
    setTopics(prev => prev.map(t => t.id === topicId ? { ...t, completed: !completed } : t));
  };

  const addTopic = async (subjectId: string) => {
    const name = newTopicInputs[subjectId]?.trim();
    if (!name) return;
    const maxOrder = topics.filter(t => t.subject_id === subjectId).length;
    await supabase.from("topics").insert({ user_id: userId, subject_id: subjectId, name, order_index: maxOrder });
    setNewTopicInputs(prev => ({ ...prev, [subjectId]: "" }));
    loadData();
  };

  const deleteSubject = async (id: string) => {
    await supabase.from("user_subjects").delete().eq("id", id);
    toast.success("Disciplina removida");
    loadData();
  };

  const totalTopics = topics.length;
  const completedTopics = topics.filter(t => t.completed).length;
  const completionPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-display">🛡️ Arsenal</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass"><CardContent className="pt-4 text-center"><Shield className="h-6 w-6 mx-auto text-primary mb-1" /><div className="text-2xl font-bold">{subjects.length}</div><div className="text-xs text-muted-foreground">Disciplinas Ativas</div></CardContent></Card>
        <Card className="glass"><CardContent className="pt-4 text-center"><BookOpen className="h-6 w-6 mx-auto text-primary mb-1" /><div className="text-2xl font-bold">{totalTopics}</div><div className="text-xs text-muted-foreground">Tópicos no Edital</div></CardContent></Card>
        <Card className="glass"><CardContent className="pt-4 text-center"><CheckCircle className="h-6 w-6 mx-auto text-success mb-1" /><div className="text-2xl font-bold">{completedTopics}</div><div className="text-xs text-muted-foreground">Tópicos Dominados</div></CardContent></Card>
        <Card className="glass"><CardContent className="pt-4 text-center"><Target className="h-6 w-6 mx-auto text-warning mb-1" /><div className="text-2xl font-bold">{completionPct}%</div><div className="text-xs text-muted-foreground">Conclusão Geral</div></CardContent></Card>
      </div>

      {/* Process Edital */}
      <Card className="glass">
        <CardHeader><CardTitle className="text-sm">📄 Processar Novo Edital</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={editalText} onChange={e => setEditalText(e.target.value)} placeholder="Cole aqui o conteúdo programático do edital..." rows={5} />
          <Button onClick={processEdital} disabled={processing}>
            {processing ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Processando...</> : "Processar Edital com IA"}
          </Button>
        </CardContent>
      </Card>

      {/* Add Subject */}
      <Card className="glass">
        <CardHeader><CardTitle className="text-sm">➕ Adicionar Nova Disciplina</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]"><Label className="text-xs">Nome</Label><Input value={newSubject.name} onChange={e => setNewSubject(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Direito Constitucional" /></div>
            <div className="w-24"><Label className="text-xs">Relevância (1-5)</Label><Input type="number" min={1} max={5} value={newSubject.weight} onChange={e => setNewSubject(p => ({ ...p, weight: Number(e.target.value) }))} /></div>
            <div className="w-24"><Label className="text-xs">Conhecimento (1-5)</Label><Input type="number" min={1} max={5} value={newSubject.knowledge_level} onChange={e => setNewSubject(p => ({ ...p, knowledge_level: Number(e.target.value) }))} /></div>
            <Button onClick={addSubject}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
          </div>
        </CardContent>
      </Card>

      {/* Subject Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subjects.map(s => {
          const subTopics = topics.filter(t => t.subject_id === s.id);
          const done = subTopics.filter(t => t.completed).length;
          const pct = subTopics.length > 0 ? Math.round((done / subTopics.length) * 100) : 0;
          return (
            <Card key={s.id} className="glass">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-primary text-sm">{s.name}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => deleteSubject(s.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>Relevância: {s.weight}</span>
                  <span>Conhecimento: {s.knowledge_level}</span>
                </div>
                <Progress value={pct} className="h-1.5 mt-1" />
              </CardHeader>
              <CardContent className="space-y-2">
                {subTopics.map(t => (
                  <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={t.completed} onCheckedChange={() => toggleTopic(t.id, t.completed)} />
                    <span className={t.completed ? "line-through text-muted-foreground" : ""}>{t.name}</span>
                  </label>
                ))}
                <div className="flex gap-2 mt-2">
                  <Input placeholder="Novo tópico" value={newTopicInputs[s.id] || ""} onChange={e => setNewTopicInputs(p => ({ ...p, [s.id]: e.target.value }))} className="text-xs h-8" onKeyDown={e => e.key === "Enter" && addTopic(s.id)} />
                  <Button size="sm" variant="outline" onClick={() => addTopic(s.id)} className="h-8"><Plus className="h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ArsenalTab;
