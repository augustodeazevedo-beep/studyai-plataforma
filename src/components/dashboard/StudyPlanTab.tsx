import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface StudyPlanTabProps { userId: string }

const StudyPlanTab = ({ userId }: StudyPlanTabProps) => {
  const [plan, setPlan] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const fetchPlan = async () => {
    setLoading(true);
    const [planRes, subjectsRes] = await Promise.all([
      supabase.from("study_plan").select("*").eq("user_id", userId).order("priority_score", { ascending: false }),
      supabase.from("user_subjects").select("*").eq("user_id", userId),
    ]);
    setPlan(planRes.data || []);
    setSubjects(subjectsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPlan(); }, [userId]);

  const generatePlan = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-study-plan");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Plano gerado com sucesso! 🎯" });
      fetchPlan();
    } catch (e: any) {
      toast({ title: "Erro ao gerar plano", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const getSubjectName = (subjectId: string) => subjects.find((s) => s.id === subjectId)?.name || "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold">Plano de Estudos — 5 Vetores</h2>
        <Button onClick={generatePlan} disabled={generating} className="glow">
          {generating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
          {generating ? "Gerando..." : plan.length > 0 ? "Atualizar Plano" : "Gerar Plano com IA"}
        </Button>
      </div>

      {plan.length === 0 && !loading ? (
        <Card className="glass border-primary/20">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Brain className="h-12 w-12 text-primary" />
            <p className="text-muted-foreground text-center">Clique em "Gerar Plano com IA" para criar seu plano personalizado baseado nos 5 vetores.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {plan.map((p, i) => (
            <Card key={p.id} className="glass">
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground">#{i + 1}</span>
                    <span className="font-display font-semibold">{getSubjectName(p.subject_id)}</span>
                  </div>
                  <span className="text-sm font-medium text-primary">{Number(p.recommended_hours_weekly).toFixed(1)}h/sem</span>
                </div>
                <div className="grid grid-cols-5 gap-2 text-xs">
                  {[
                    { label: "Relevância", value: p.relevance },
                    { label: "Incidência", value: p.incidence },
                    { label: "Acurácia", value: p.accuracy },
                    { label: "Desempenho", value: p.performance },
                    { label: "Lacuna", value: p.gap_score },
                  ].map((v) => (
                    <div key={v.label} className="space-y-1">
                      <span className="text-muted-foreground">{v.label}</span>
                      <Progress value={Number(v.value) * 10} className="h-1.5" />
                      <span className="font-medium">{Number(v.value).toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudyPlanTab;
