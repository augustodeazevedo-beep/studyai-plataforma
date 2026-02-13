import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PredictorTabProps { userId: string; }

const PredictorTab = ({ userId }: PredictorTabProps) => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dailyMinutes, setDailyMinutes] = useState("120");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [mode, setMode] = useState("predict_date");

  const loadData = useCallback(async () => {
    const { data } = await supabase.from("user_subjects").select("*").eq("user_id", userId);
    setSubjects(data || []);
    setSelectedIds((data || []).map((s: any) => s.id));
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleSubject = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const generate = async () => {
    if (selectedIds.length === 0) { toast.error("Selecione ao menos uma disciplina"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("predict-cycle", {
        body: { mode, dailyMinutes: parseInt(dailyMinutes), startDate, subjectIds: selectedIds },
      });
      if (error) throw error;
      setResult(data.content || "Sem resultado");
    } catch (e: any) { toast.error(e.message || "Erro"); }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-display">🔮 Previsor.IA</h1>

      <Card className="glass">
        <CardHeader><CardTitle className="text-sm">Gerador de Ciclos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="predict_date">Prever Data de Conclusão</TabsTrigger>
              <TabsTrigger value="calculate_rhythm">Calcular Ritmo Diário</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-xs">Tempo Diário (min)</Label><Input type="number" value={dailyMinutes} onChange={e => setDailyMinutes(e.target.value)} /></div>
            <div><Label className="text-xs">{mode === "predict_date" ? "Data de Início" : "Data Alvo"}</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Disciplinas a Incluir</Label>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedIds(selectedIds.length === subjects.length ? [] : subjects.map(s => s.id))}>
                {selectedIds.length === subjects.length ? "Desmarcar Todas" : "Selecionar Todas"}
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {subjects.map(s => (
                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded bg-muted/20">
                  <Checkbox checked={selectedIds.includes(s.id)} onCheckedChange={() => toggleSubject(s.id)} />
                  <span className="truncate">{s.name}</span>
                </label>
              ))}
            </div>
          </div>

          <Button className="w-full" onClick={generate} disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Gerando...</> : <><Sparkles className="h-4 w-4 mr-1" />Gerar Previsão do Ciclo</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="glass">
          <CardHeader><CardTitle className="text-sm">📋 Resultado</CardTitle></CardHeader>
          <CardContent>
            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">{result}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PredictorTab;
