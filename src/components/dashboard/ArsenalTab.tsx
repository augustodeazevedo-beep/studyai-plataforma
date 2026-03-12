import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, BookOpen, CheckCircle, Target, Plus, Loader2, Trash2, Upload, FileText, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ArsenalTabProps { userId: string; }

const ArsenalTab = ({ userId }: ArsenalTabProps) => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [plan, setPlan] = useState<any[]>([]);
  const [editalText, setEditalText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: "", weight: 3, knowledge_level: 1 });
  const [newTopicInputs, setNewTopicInputs] = useState<Record<string, string>>({});
  const [uploadMode, setUploadMode] = useState<"text" | "pdf">("pdf");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    const [subRes, topRes, planRes] = await Promise.all([
      supabase.from("user_subjects").select("*").eq("user_id", userId),
      supabase.from("topics").select("*").eq("user_id", userId).order("order_index"),
      supabase.from("study_plan").select("*, user_subjects(name)").eq("user_id", userId),
    ]);
    setSubjects(subRes.data || []);
    setTopics(topRes.data || []);
    setPlan(planRes.data || []);
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const getProfileData = async () => {
    const { data } = await supabase.from("profiles").select("target_exam, target_position, banca").eq("user_id", userId).maybeSingle();
    return data || {};
  };

  const processEdital = async () => {
    setProcessing(true);
    try {
      const profile = await getProfileData();
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) { toast.error("Faça login novamente"); setProcessing(false); return; }

      let body: any = {
        targetExam: profile.target_exam,
        targetPosition: profile.target_position,
        banca: profile.banca,
      };

      if (uploadMode === "pdf" && selectedFile) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]); // Remove data:...;base64, prefix
          };
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });
        body.pdfBase64 = base64;
      } else if (uploadMode === "text") {
        if (editalText.trim().length < 20) { toast.error("Texto do edital muito curto"); setProcessing(false); return; }
        body.editalText = editalText;
      } else {
        toast.error("Selecione um arquivo PDF ou cole o texto do edital");
        setProcessing(false);
        return;
      }

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-edital`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || `Erro ${resp.status}`);

      toast.success(`Edital processado! ${data.subjects?.length || 0} disciplinas extraídas com análise de incidência e relevância`);
      setEditalText("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Apenas arquivos PDF são aceitos"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("Arquivo muito grande (máx. 20MB)"); return; }
    setSelectedFile(file);
  };

  const totalTopics = topics.length;
  const completedTopics = topics.filter(t => t.completed).length;
  const completionPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const getSubjectPlan = (subjectId: string) => plan.find(p => p.subject_id === subjectId);

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
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" />Processar Edital com IA</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as "text" | "pdf")}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="pdf"><Upload className="h-3 w-3 mr-1" />Upload PDF</TabsTrigger>
              <TabsTrigger value="text"><FileText className="h-3 w-3 mr-1" />Colar Texto</TabsTrigger>
            </TabsList>

            <TabsContent value="pdf" className="space-y-3 mt-3">
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="space-y-2">
                    <FileText className="h-10 w-10 mx-auto text-primary" />
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                      Remover
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Clique para selecionar o PDF do edital</p>
                    <p className="text-xs text-muted-foreground">Máximo 20MB</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="text" className="mt-3">
              <Textarea value={editalText} onChange={e => setEditalText(e.target.value)} placeholder="Cole aqui o conteúdo programático do edital..." rows={6} />
            </TabsContent>
          </Tabs>

          <div className="bg-muted/20 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground/80">🤖 A IA irá automaticamente:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Extrair todas as disciplinas e tópicos do conteúdo programático</li>
              <li>Avaliar o grau de <strong className="text-primary">relevância</strong> (peso na prova) de cada disciplina</li>
              <li>Estimar o grau de <strong className="text-primary">incidência</strong> com base em provas anteriores da mesma banca/cargo</li>
              <li>Criar automaticamente o plano de estudos com prioridades</li>
            </ul>
          </div>

          <Button onClick={processEdital} disabled={processing} className="w-full">
            {processing ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Processando edital com IA...</> : <><TrendingUp className="h-4 w-4 mr-1" />Processar Edital com IA</>}
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
          const subPlan = getSubjectPlan(s.id);
          return (
            <Card key={s.id} className="glass">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-primary text-sm">{s.name}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => deleteSubject(s.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                  <span>Relevância: <strong className="text-foreground">{subPlan?.relevance || s.weight}/5</strong></span>
                  <span>Incidência: <strong className="text-foreground">{subPlan?.incidence || "—"}/5</strong></span>
                  <span>Conhecimento: <strong className="text-foreground">{s.knowledge_level}/5</strong></span>
                </div>
                <Progress value={pct} className="h-1.5 mt-1" />
                <span className="text-[10px] text-muted-foreground">{done}/{subTopics.length} tópicos concluídos</span>
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
