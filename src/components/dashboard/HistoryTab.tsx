import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star } from "lucide-react";
import { format } from "date-fns";

interface HistoryTabProps { userId: string; }

const HistoryTab = ({ userId }: HistoryTabProps) => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [filterSubject, setFilterSubject] = useState("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const loadData = useCallback(async () => {
    const [subRes] = await Promise.all([
      supabase.from("user_subjects").select("*").eq("user_id", userId),
    ]);
    setSubjects(subRes.data || []);
  }, [userId]);

  const loadSessions = useCallback(async () => {
    let query = supabase.from("study_sessions").select("*, user_subjects(name)").eq("user_id", userId).order("started_at", { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (filterSubject !== "all") query = query.eq("subject_id", filterSubject);
    const { data } = await query;
    setSessions(data || []);
  }, [userId, filterSubject, page]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadSessions(); }, [loadSessions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display">📜 Histórico de Sessões</h1>
        <Select value={filterSubject} onValueChange={v => { setFilterSubject(v); setPage(0); }}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filtrar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas disciplinas</SelectItem>
            {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="glass">
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-muted-foreground text-xs">
                <th className="text-left py-2">Data</th>
                <th className="text-left py-2">Disciplina</th>
                <th className="text-left py-2">Material</th>
                <th className="text-left py-2">Páginas</th>
                <th className="text-left py-2">Duração</th>
                <th className="text-left py-2">Compreensão</th>
              </tr></thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id} className="border-b border-border/30">
                    <td className="py-2.5">{format(new Date(s.started_at), "dd/MM/yy")}</td>
                    <td>{(s as any).user_subjects?.name || "—"}</td>
                    <td>{s.material_name || "—"}</td>
                    <td>{s.pages_start && s.pages_end ? `${s.pages_start}-${s.pages_end}` : "—"}</td>
                    <td>{s.duration_minutes || 0}min</td>
                    <td><div className="flex">{s.comprehension_rating ? Array.from({ length: s.comprehension_rating }, (_, i) => <Star key={i} className="h-3 w-3 text-warning fill-warning" />) : "—"}</div></td>
                  </tr>
                ))}
                {sessions.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Nenhuma sessão encontrada</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between mt-4">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <span className="text-xs text-muted-foreground">Página {page + 1}</span>
            <Button variant="outline" size="sm" disabled={sessions.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>Próxima</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HistoryTab;
