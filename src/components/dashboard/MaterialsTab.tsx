import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderOpen, Plus, FileText, Link as LinkIcon, Trash2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MaterialsTabProps { userId: string }

const MaterialsTab = ({ userId }: MaterialsTabProps) => {
  const [materials, setMaterials] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formSubject, setFormSubject] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("link");
  const [formUrl, setFormUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    const [mRes, sRes] = await Promise.all([
      supabase.from("study_materials").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("user_subjects").select("*").eq("user_id", userId),
    ]);
    setMaterials(mRes.data || []);
    setSubjects(sRes.data || []);
  };

  useEffect(() => { fetchData(); }, [userId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !formSubject) return;
    setUploading(true);
    const filePath = `${userId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("study-materials").upload(filePath, file);
    if (uploadError) { toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("study-materials").getPublicUrl(filePath);
    await supabase.from("study_materials").insert({
      user_id: userId, subject_id: formSubject, title: formTitle || file.name, file_url: urlData.publicUrl, material_type: "pdf",
    });
    toast({ title: "Material enviado! ✅" });
    setUploading(false); setShowForm(false); setFormTitle("");
    fetchData();
  };

  const addLink = async () => {
    if (!formUrl.trim() || !formSubject) return;
    await supabase.from("study_materials").insert({
      user_id: userId, subject_id: formSubject, title: formTitle || formUrl, file_url: formUrl, material_type: "link",
    });
    toast({ title: "Link adicionado! ✅" });
    setShowForm(false); setFormTitle(""); setFormUrl("");
    fetchData();
  };

  const deleteMaterial = async (id: string) => {
    await supabase.from("study_materials").delete().eq("id", id);
    fetchData();
  };

  const getSubjectName = (id: string) => subjects.find((s) => s.id === id)?.name || "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold flex items-center gap-2"><FolderOpen className="h-5 w-5 text-primary" />Materiais</h2>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-2" />Adicionar</Button>
      </div>

      {showForm && (
        <Card className="glass border-primary/20">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label>Disciplina</Label>
              <Select value={formSubject} onValueChange={setFormSubject}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Título</Label><Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Nome do material" /></div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formType} onValueChange={setFormType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="link">Link</SelectItem><SelectItem value="pdf">PDF</SelectItem></SelectContent></Select>
            </div>
            {formType === "link" ? (
              <div className="space-y-2">
                <Label>URL</Label>
                <Input value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder="https://..." />
                <Button onClick={addLink} className="w-full">Adicionar Link</Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Arquivo PDF</Label>
                <Input type="file" accept=".pdf" onChange={handleFileUpload} disabled={uploading} />
                {uploading && <p className="text-xs text-muted-foreground">Enviando...</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {materials.map((m) => (
          <Card key={m.id} className="glass">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                {m.material_type === "pdf" ? <FileText className="h-5 w-5 text-primary" /> : <LinkIcon className="h-5 w-5 text-primary" />}
                <div>
                  <p className="font-medium text-sm">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{getSubjectName(m.subject_id)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {m.file_url && <Button variant="outline" size="sm" asChild><a href={m.file_url} target="_blank" rel="noopener">Abrir</a></Button>}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMaterial(m.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {materials.length === 0 && !showForm && <p className="text-sm text-muted-foreground text-center py-8">Nenhum material adicionado.</p>}
      </div>
    </div>
  );
};

export default MaterialsTab;
