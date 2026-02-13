import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface CoachTabProps { userId: string; }

const CoachTab = ({ userId }: CoachTabProps) => {
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const loadHistory = useCallback(async () => {
    const { data } = await supabase.from("ai_coaching_history").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
    setHistory(data || []);
  }, [userId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const generateAdvice = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-coach", { body: {} });
      if (error) throw error;
      setAdvice(data.content || "");
      loadHistory();
    } catch (e: any) { toast.error(e.message || "Erro ao gerar conselho"); }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-display">🧠 Coach.IA</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4 text-primary" />Conselho Estratégico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {advice ? (
                <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap p-4 bg-muted/20 rounded-lg">{advice}</div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Clique no botão abaixo para receber um conselho estratégico personalizado baseado nos seus dados de estudo.</p>
                </div>
              )}
              <Button className="w-full" onClick={generateAdvice} disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Analisando...</> : <><Sparkles className="h-4 w-4 mr-1" />Gerar Conselho</>}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="glass">
          <CardHeader><CardTitle className="text-sm">Histórico de Conselhos</CardTitle></CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
            {history.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum conselho gerado ainda</p> : (
              history.map(h => (
                <button key={h.id} onClick={() => setAdvice(h.content)} className="w-full text-left p-3 bg-muted/20 rounded-lg hover:bg-muted/40 transition-colors">
                  <div className="text-xs text-muted-foreground mb-1">{format(new Date(h.created_at), "dd/MM/yy HH:mm")}</div>
                  <p className="text-xs line-clamp-3">{h.content}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CoachTab;
