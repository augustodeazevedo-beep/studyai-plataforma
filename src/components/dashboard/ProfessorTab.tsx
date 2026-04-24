import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Bot, User, BookOpen, Brain, FileQuestion, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface ProfessorTabProps { userId: string; }
type Msg = { role: "user" | "assistant"; content: string };

type ToolType = "flashcards" | "mindmap" | "quiz" | "summary";

const TOOLS: { key: ToolType; label: string; icon: any; placeholder: string }[] = [
  { key: "flashcards", label: "Flashcards", icon: BookOpen, placeholder: "Ex: Princípios do Direito Administrativo" },
  { key: "mindmap", label: "Mapa Mental", icon: Brain, placeholder: "Ex: Organização do Estado Brasileiro" },
  { key: "quiz", label: "Simulado", icon: FileQuestion, placeholder: "Ex: Direitos Fundamentais - Art. 5º" },
  { key: "summary", label: "Resumo", icon: FileText, placeholder: "Ex: Lei de Licitações (Lei 14.133)" },
];

const ProfessorTab = ({ userId }: ProfessorTabProps) => {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Olá! Sou o Professor.IA, seu assistente especialista em concursos. Pergunte-me qualquer dúvida ou use as ferramentas abaixo para gerar flashcards, mapas mentais, simulados e resumos. Como posso ajudar?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolType | null>(null);
  const [toolInput, setToolInput] = useState("");
  const [toolResult, setToolResult] = useState("");
  const [toolLoading, setToolLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const streamFromUrl = async (url: string, body: any, onDelta: (text: string) => void) => {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) { toast.error("Faça login novamente"); return; }

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || `Error ${resp.status}`);
    }

    const reader = resp.body?.getReader();
    if (!reader) throw new Error("No stream");
    const decoder = new TextDecoder();
    let textBuffer = "";
    let accumulated = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "" || !line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            accumulated += content;
            onDelta(accumulated);
          }
        } catch { textBuffer = line + "\n" + textBuffer; break; }
      }
    }
    return accumulated;
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-professor`;
      await streamFromUrl(
        CHAT_URL,
        { messages: updatedMessages.filter(m => m.role !== "assistant" || m !== messages[0]).map(m => ({ role: m.role, content: m.content })) },
        (text) => {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && prev.length > updatedMessages.length) {
              return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: text } : m);
            }
            return [...prev, { role: "assistant", content: text }];
          });
        }
      );
    } catch (e: any) {
      toast.error(e.message || "Erro na comunicação");
      setMessages(prev => [...prev, { role: "assistant", content: "Desculpe, ocorreu um erro. Tente novamente." }]);
    }
    setLoading(false);
  };

  const generateTool = async () => {
    if (!toolInput.trim() || !activeTool || toolLoading) return;
    setToolLoading(true);
    setToolResult("");

    try {
      const TOOL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/professor-tools`;
      await streamFromUrl(
        TOOL_URL,
        { tool: activeTool, topic: toolInput.trim() },
        (text) => setToolResult(text)
      );
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar conteúdo");
      if (!toolResult) setToolResult("Erro ao gerar. Tente novamente.");
    }
    setToolLoading(false);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold font-display">👨‍🏫 Professor.IA</h1>

      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-180px)]">
        {/* Chat */}
        <Card className="glass flex-1 flex flex-col min-w-0">
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><Bot className="h-4 w-4 text-primary" /></div>}
                <div className={`max-w-[80%] p-3 rounded-lg text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/30"}`}>
                  {m.content}
                </div>
                {m.role === "user" && <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0"><User className="h-4 w-4" /></div>}
              </div>
            ))}
            {loading && !messages[messages.length - 1]?.content && (
              <div className="flex gap-3"><div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Bot className="h-4 w-4 text-primary" /></div><div className="p-3 bg-muted/30 rounded-lg"><Loader2 className="h-4 w-4 animate-spin" /></div></div>
            )}
            <div ref={endRef} />
          </CardContent>
          <div className="p-4 border-t border-border">
            <form onSubmit={e => { e.preventDefault(); send(); }} className="flex gap-2">
              <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Pergunte ao Professor..." disabled={loading} className="flex-1" />
              <Button type="submit" disabled={loading || !input.trim()}><Send className="h-4 w-4" /></Button>
            </form>
          </div>
        </Card>

        {/* Tools Panel */}
        <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-3">
          {/* Tool Buttons */}
          <Card className="glass">
            <CardContent className="p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">🧰 Ferramentas de Estudo</p>
              <div className="grid grid-cols-2 gap-2">
                {TOOLS.map(t => (
                  <Button
                    key={t.key}
                    variant={activeTool === t.key ? "default" : "outline"}
                    size="sm"
                    className="text-xs justify-start"
                    onClick={() => { setActiveTool(activeTool === t.key ? null : t.key); setToolResult(""); }}
                  >
                    <t.icon className="h-3 w-3 mr-1" />{t.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tool Input & Result */}
          {activeTool && (
            <Card className="glass flex-1 flex flex-col min-h-0">
              <CardContent className="p-3 flex flex-col flex-1 min-h-0 gap-3">
                <div className="flex gap-2">
                  <Input
                    value={toolInput}
                    onChange={e => setToolInput(e.target.value)}
                    placeholder={TOOLS.find(t => t.key === activeTool)?.placeholder}
                    disabled={toolLoading}
                    className="flex-1 text-xs h-8"
                    onKeyDown={e => e.key === "Enter" && generateTool()}
                  />
                  <Button size="sm" onClick={generateTool} disabled={toolLoading || !toolInput.trim()} className="h-8">
                    {toolLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto bg-muted/20 rounded-lg p-3 text-sm whitespace-pre-wrap min-h-[200px]">
                  {toolResult || (
                    <div className="text-muted-foreground text-center py-8">
                      <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">Digite o tema e clique em gerar</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfessorTab;
