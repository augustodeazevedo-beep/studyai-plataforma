import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FlashcardsTabProps { userId: string }

const FlashcardsTab = ({ userId }: FlashcardsTabProps) => {
  const [cards, setCards] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [studyMode, setStudyMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [formSubject, setFormSubject] = useState("");
  const [formFront, setFormFront] = useState("");
  const [formBack, setFormBack] = useState("");
  const { toast } = useToast();

  const fetchData = async () => {
    const [cRes, sRes] = await Promise.all([
      supabase.from("flashcards").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("user_subjects").select("*").eq("user_id", userId),
    ]);
    setCards(cRes.data || []);
    setSubjects(sRes.data || []);
  };

  useEffect(() => { fetchData(); }, [userId]);

  const createCard = async () => {
    if (!formFront.trim() || !formBack.trim() || !formSubject) return;
    await supabase.from("flashcards").insert({ user_id: userId, subject_id: formSubject, front: formFront, back: formBack });
    toast({ title: "Flashcard criado! ✅" });
    setShowForm(false); setFormFront(""); setFormBack("");
    fetchData();
  };

  const deleteCard = async (id: string) => {
    await supabase.from("flashcards").delete().eq("id", id);
    fetchData();
  };

  const nextCard = () => {
    setFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const markReviewed = async () => {
    const card = cards[currentIndex];
    await supabase.from("flashcards").update({
      review_count: (card.review_count || 0) + 1,
      last_reviewed_at: new Date().toISOString(),
    }).eq("id", card.id);
    nextCard();
  };

  const getSubjectName = (id: string) => subjects.find((s) => s.id === id)?.name || "—";

  if (studyMode && cards.length > 0) {
    const card = cards[currentIndex];
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold">Modo Estudo</h2>
          <Button variant="outline" onClick={() => setStudyMode(false)}>Sair</Button>
        </div>
        <p className="text-sm text-muted-foreground text-center">{currentIndex + 1} / {cards.length}</p>
        <div className="flex justify-center" onClick={() => setFlipped(!flipped)}>
          <motion.div
            className="w-full max-w-md h-64 cursor-pointer"
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.4 }}
            style={{ perspective: 1000 }}
          >
            <Card className="glass h-full flex items-center justify-center p-8">
              <CardContent className="text-center">
                <p className="text-xs text-muted-foreground mb-2">{flipped ? "Resposta" : "Pergunta"}</p>
                <p className="font-display text-lg" style={{ transform: flipped ? "rotateY(180deg)" : "none" }}>
                  {flipped ? card.back : card.front}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={nextCard}><RotateCcw className="h-4 w-4 mr-2" />Pular</Button>
          <Button onClick={markReviewed}>Revisado ✅</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold flex items-center gap-2"><Layers className="h-5 w-5 text-primary" />Flashcards</h2>
        <div className="flex gap-2">
          {cards.length > 0 && <Button variant="outline" onClick={() => { setStudyMode(true); setCurrentIndex(0); setFlipped(false); }}>Modo Estudo</Button>}
          <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-2" />Novo</Button>
        </div>
      </div>

      {showForm && (
        <Card className="glass border-primary/20">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label>Disciplina</Label>
              <Select value={formSubject} onValueChange={setFormSubject}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Frente (pergunta)</Label><Textarea value={formFront} onChange={(e) => setFormFront(e.target.value)} /></div>
            <div className="space-y-2"><Label>Verso (resposta)</Label><Textarea value={formBack} onChange={(e) => setFormBack(e.target.value)} /></div>
            <Button onClick={createCard} className="w-full">Salvar Flashcard</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((c) => (
          <Card key={c.id} className="glass">
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground mb-1">{getSubjectName(c.subject_id)}</p>
              <p className="font-medium text-sm mb-1">{c.front}</p>
              <p className="text-xs text-muted-foreground">{c.back}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">Revisões: {c.review_count}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteCard(c.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {cards.length === 0 && !showForm && <p className="text-sm text-muted-foreground text-center py-8">Nenhum flashcard criado.</p>}
    </div>
  );
};

export default FlashcardsTab;
