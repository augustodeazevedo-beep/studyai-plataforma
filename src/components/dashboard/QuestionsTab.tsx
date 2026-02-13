import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HelpCircle, Plus, Check, X as XIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface QuestionsTabProps { userId: string }

const QuestionsTab = ({ userId }: QuestionsTabProps) => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [answering, setAnswering] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formSubject, setFormSubject] = useState("");
  const [formText, setFormText] = useState("");
  const [formOptions, setFormOptions] = useState(["", "", "", ""]);
  const [formCorrect, setFormCorrect] = useState(0);
  const [formExplanation, setFormExplanation] = useState("");

  const fetchData = async () => {
    const [qRes, sRes] = await Promise.all([
      supabase.from("questions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
      supabase.from("user_subjects").select("*").eq("user_id", userId),
    ]);
    setQuestions(qRes.data || []);
    setSubjects(sRes.data || []);
  };

  useEffect(() => { fetchData(); }, [userId]);

  const createQuestion = async () => {
    if (!formText.trim() || !formSubject) return;
    const { error } = await supabase.from("questions").insert({
      user_id: userId,
      subject_id: formSubject,
      question_text: formText,
      options: formOptions.filter(Boolean),
      correct_option: formCorrect,
      explanation: formExplanation,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Questão criada! ✅" });
    setShowForm(false);
    setFormText(""); setFormOptions(["", "", "", ""]); setFormCorrect(0); setFormExplanation("");
    fetchData();
  };

  const submitAnswer = async (questionId: string, correct: number) => {
    if (selectedOption === null) return;
    const isCorrect = selectedOption === correct;
    await supabase.from("question_attempts").insert({
      user_id: userId, question_id: questionId, selected_option: selectedOption, is_correct: isCorrect,
    });
    setAnswered(true);
    toast({ title: isCorrect ? "Correto! 🎉" : "Incorreto 😞" });
  };

  const getSubjectName = (id: string) => subjects.find((s) => s.id === id)?.name || "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold flex items-center gap-2"><HelpCircle className="h-5 w-5 text-primary" />Banco de Questões</h2>
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "outline" : "default"}>
          <Plus className="h-4 w-4 mr-2" />{showForm ? "Cancelar" : "Nova Questão"}
        </Button>
      </div>

      {showForm && (
        <Card className="glass border-primary/20">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label>Disciplina</Label>
              <Select value={formSubject} onValueChange={setFormSubject}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Enunciado</Label><Textarea value={formText} onChange={(e) => setFormText(e.target.value)} placeholder="Digite o enunciado..." /></div>
            <div className="space-y-2">
              <Label>Alternativas</Label>
              {formOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button onClick={() => setFormCorrect(i)} className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs", formCorrect === i ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                    {formCorrect === i && <Check className="h-3 w-3" />}
                  </button>
                  <Input value={opt} onChange={(e) => { const n = [...formOptions]; n[i] = e.target.value; setFormOptions(n); }} placeholder={`Alternativa ${String.fromCharCode(65 + i)}`} />
                </div>
              ))}
            </div>
            <div className="space-y-2"><Label>Explicação (opcional)</Label><Textarea value={formExplanation} onChange={(e) => setFormExplanation(e.target.value)} placeholder="Por que essa é a resposta certa?" /></div>
            <Button onClick={createQuestion} className="w-full">Salvar Questão</Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {questions.map((q) => (
          <Card key={q.id} className="glass">
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground mb-1">{getSubjectName(q.subject_id)}</p>
              <p className="font-medium text-sm mb-3">{q.question_text}</p>
              {answering === q.id ? (
                <div className="space-y-2">
                  {(q.options as string[]).map((opt: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => { if (!answered) setSelectedOption(i); }}
                      className={cn(
                        "w-full text-left p-2 rounded-lg border text-sm transition-colors",
                        answered && i === q.correct_option ? "border-primary bg-primary/10 text-primary" : "",
                        answered && i === selectedOption && i !== q.correct_option ? "border-destructive bg-destructive/10" : "",
                        !answered && selectedOption === i ? "border-primary bg-primary/5" : "border-border hover:border-primary/30",
                      )}
                    >
                      <span className="font-mono mr-2">{String.fromCharCode(65 + i)})</span>{opt}
                    </button>
                  ))}
                  {!answered ? (
                    <Button size="sm" onClick={() => submitAnswer(q.id, q.correct_option)} disabled={selectedOption === null}>Responder</Button>
                  ) : (
                    <div>
                      {q.explanation && <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted/30 rounded">{q.explanation}</p>}
                      <Button size="sm" variant="ghost" onClick={() => { setAnswering(null); setSelectedOption(null); setAnswered(false); }} className="mt-2">Fechar</Button>
                    </div>
                  )}
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => { setAnswering(q.id); setSelectedOption(null); setAnswered(false); }}>Responder</Button>
              )}
            </CardContent>
          </Card>
        ))}
        {questions.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhuma questão criada ainda.</p>}
      </div>
    </div>
  );
};

export default QuestionsTab;
