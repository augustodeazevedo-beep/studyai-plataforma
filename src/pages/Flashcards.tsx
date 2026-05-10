import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, RotateCcw, Trash2, BookOpen, Check, X, Download, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  easiness: number;
  interval: number;
  repetitions: number;
  nextReview: string;
  created_at: string;
}

const STORAGE_KEY = "studyai_flashcards";

function sm2(card: Flashcard, quality: number): Flashcard {
  const q = Math.max(0, Math.min(5, quality));
  let { easiness, interval, repetitions } = card;
  if (q >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easiness);
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }
  easiness = Math.max(1.3, easiness + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);
  return { ...card, easiness, interval, repetitions, nextReview: nextReview.toISOString() };
}

function isDue(card: Flashcard): boolean {
  return new Date(card.nextReview) <= new Date();
}

export default function Flashcards() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [view, setView] = useState<"list" | "study" | "create">("list");
  const [studyQueue, setStudyQueue] = useState<Flashcard[]>([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [sessionStats, setSessionStats] = useState({ easy: 0, regular: 0, hard: 0 });
  const importRef = useRef<HTMLInputElement>(null);

  // Guard: redirect to /auth if not authenticated
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth", { replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setCards(JSON.parse(stored));
  }, []);

  const save = (updated: Flashcard[]) => {
    setCards(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const createCard = () => {
    if (!newFront.trim() || !newBack.trim()) {
      toast.error("Preencha frente e verso do cartão");
      return;
    }
    const card: Flashcard = {
      id: crypto.randomUUID(),
      front: newFront.trim(),
      back: newBack.trim(),
      easiness: 2.5,
      interval: 0,
      repetitions: 0,
      nextReview: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    save([...cards, card]);
    setNewFront("");
    setNewBack("");
    toast.success("Cartão criado");
    setView("list");
  };

  const deleteCard = (id: string) => save(cards.filter((c) => c.id !== id));

  const startStudy = () => {
    const due = cards.filter(isDue);
    if (due.length === 0) { toast.info("Nenhum cartão para revisar agora!"); return; }
    setStudyQueue(due);
    setCurrent(0);
    setFlipped(false);
    setSessionStats({ easy: 0, regular: 0, hard: 0 });
    setView("study");
  };

  const rate = (quality: number) => {
    const card = studyQueue[current];
    const updated = sm2(card, quality);
    save(cards.map((c) => (c.id === card.id ? updated : c)));
    setSessionStats((s) => ({
      easy: s.easy + (quality === 5 ? 1 : 0),
      regular: s.regular + (quality === 3 ? 1 : 0),
      hard: s.hard + (quality === 1 ? 1 : 0),
    }));
    if (current + 1 >= studyQueue.length) {
      toast.success(`Sessão concluída! ${sessionStats.easy + (quality === 5 ? 1 : 0)} fáceis · ${sessionStats.regular + (quality === 3 ? 1 : 0)} regulares · ${sessionStats.hard + (quality === 1 ? 1 : 0)} difíceis`);
      setView("list");
    } else {
      setCurrent((p) => p + 1);
      setFlipped(false);
    }
  };

  const exportCards = () => {
    const blob = new Blob([JSON.stringify(cards, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flashcards_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${cards.length} cartões exportados`);
  };

  const importCards = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(imported)) throw new Error("formato inválido");
        const valid = imported.filter(
          (c) => c && typeof c.id === "string" && typeof c.front === "string" && typeof c.back === "string"
        ) as Flashcard[];
        const existingIds = new Set(cards.map((c) => c.id));
        const newCards = valid.filter((c) => !existingIds.has(c.id));
        save([...cards, ...newCards]);
        toast.success(`${newCards.length} cartões importados (${imported.length - newCards.length} duplicados ignorados)`);
      } catch {
        toast.error("Arquivo inválido. Use um JSON exportado pelo StudyAI.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const due = cards.filter(isDue);
  const mastered = cards.filter((c) => c.repetitions >= 5).length;
  const avgEasiness = cards.length > 0
    ? (cards.reduce((s, c) => s + c.easiness, 0) / cards.length).toFixed(2)
    : "—";

  if (view === "study" && studyQueue.length > 0) {
    const card = studyQueue[current];
    return (
      <div className="max-w-xl mx-auto space-y-6 py-8">
        <div className="flex items-center justify-between">
          <button onClick={() => setView("list")} className="text-sm text-muted-foreground hover:underline">← Sair</button>
          <div className="text-sm text-muted-foreground">
            {current + 1} / {studyQueue.length}
            <span className="ml-3 text-xs">
              ✓ {sessionStats.easy} · ↻ {sessionStats.regular} · ✗ {sessionStats.hard}
            </span>
          </div>
        </div>
        <div className="w-full bg-border/40 rounded-full h-1">
          <div
            className="bg-primary h-1 rounded-full transition-all"
            style={{ width: `${(current / studyQueue.length) * 100}%` }}
          />
        </div>
        <div
          onClick={() => setFlipped(!flipped)}
          className="min-h-[240px] rounded-2xl border-2 cursor-pointer flex items-center justify-center p-8 text-center transition-all hover:border-primary/50 select-none"
        >
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-4">
              {flipped ? "VERSO" : "FRENTE"}
            </div>
            <p className="text-xl leading-relaxed">{flipped ? card.back : card.front}</p>
            {!flipped && <p className="text-xs text-muted-foreground mt-6">Clique para revelar</p>}
          </div>
        </div>
        {flipped && (
          <div className="grid grid-cols-3 gap-3">
            <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={() => rate(1)}>
              <X className="w-4 h-4 mr-1" /> Difícil
            </Button>
            <Button variant="outline" className="border-amber-300 text-amber-600 hover:bg-amber-50" onClick={() => rate(3)}>
              <RotateCcw className="w-4 h-4 mr-1" /> Regular
            </Button>
            <Button variant="outline" className="border-green-300 text-green-600 hover:bg-green-50" onClick={() => rate(5)}>
              <Check className="w-4 h-4 mr-1" /> Fácil
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (view === "create") {
    return (
      <div className="max-w-xl mx-auto space-y-4 py-8">
        <button onClick={() => setView("list")} className="text-sm text-muted-foreground hover:underline">← Voltar</button>
        <h2 className="text-xl font-bold">Novo Flashcard</h2>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wide text-muted-foreground">Frente (pergunta)</label>
          <Textarea
            placeholder="Ex: Qual o conceito de ITCMD?"
            value={newFront}
            onChange={(e) => setNewFront(e.target.value)}
            rows={3}
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wide text-muted-foreground">Verso (resposta)</label>
          <Textarea
            placeholder="Ex: Imposto sobre transmissão causa mortis e doação..."
            value={newBack}
            onChange={(e) => setNewBack(e.target.value)}
            rows={3}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={createCard} className="flex-1">Criar Cartão</Button>
          <Button variant="outline" onClick={() => setView("list")}>Cancelar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8">
      <input ref={importRef} type="file" accept=".json" className="hidden" onChange={importCards} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Flashcards</h1>
          <p className="text-muted-foreground text-sm mt-1">Revisão espaçada (SM-2)</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="ghost" size="icon" title="Importar JSON" onClick={() => importRef.current?.click()}>
            <Upload className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Exportar JSON" onClick={exportCards} disabled={cards.length === 0}>
            <Download className="w-4 h-4" />
          </Button>
          <Button onClick={startStudy} disabled={due.length === 0}>
            <BookOpen className="w-4 h-4 mr-2" />
            Revisar ({due.length})
          </Button>
          <Button variant="outline" onClick={() => setView("create")}>
            <Plus className="w-4 h-4 mr-2" /> Novo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-2xl font-bold">{cards.length}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-2xl font-bold text-amber-600">{due.length}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Para revisar</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-2xl font-bold text-green-600">{mastered}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Dominados</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-2xl font-bold text-blue-600">{avgEasiness}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Facilidade</p>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Nenhum flashcard criado ainda.</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => setView("create")}><Plus className="w-4 h-4 mr-2" />Criar primeiro cartão</Button>
            <Button variant="outline" onClick={() => importRef.current?.click()}><Upload className="w-4 h-4 mr-2" />Importar JSON</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {cards.map((card) => (
            <div key={card.id} className="border rounded-lg p-4 flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-medium truncate">{card.front}</p>
                <p className="text-sm text-muted-foreground truncate">{card.back}</p>
              </div>
              <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                <span className="text-xs text-muted-foreground font-mono">{card.repetitions}x</span>
                <Badge variant={isDue(card) ? "destructive" : "secondary"} className="text-xs">
                  {isDue(card) ? "Revisar" : `+${card.interval}d`}
                </Badge>
                <button onClick={() => deleteCard(card.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
