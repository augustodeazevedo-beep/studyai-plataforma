import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Shield, BookOpen, CheckCircle, Target, Plus, Loader2, Trash2, Upload, FileText, TrendingUp, RefreshCw, SearchCheck } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";

const MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024;

const processEditalPayloadSchema = z.object({
  editalText: z.string().trim().min(20, "Texto do edital muito curto").max(15000, "Texto do edital muito longo"),
  targetExam: z.string().trim().max(180).nullable().optional(),
  targetPosition: z.string().trim().max(180).nullable().optional(),
  banca: z.string().trim().max(120).nullable().optional(),
  forceReprocess: z.boolean().optional(),
});

type SummaryDetail = {
  name: string;
  subject?: string;
  reason: string;
  previous?: Record<string, number | string | null>;
  next?: Record<string, number | string | null>;
  sources?: Array<{ title?: string; url?: string; note?: string }>;
};

type ProcessingSummary = {
  counts: {
    insertedSubjects: number;
    skippedSubjects: number;
    updatedSubjects: number;
    insertedTopics: number;
    skippedTopics: number;
    insertedPlans: number;
    skippedPlans: number;
    updatedPlans: number;
  };
  subjects: { inserted: SummaryDetail[]; skipped: SummaryDetail[]; updated: SummaryDetail[] };
  topics: { inserted: SummaryDetail[]; skipped: SummaryDetail[] };
  plans: { inserted: SummaryDetail[]; skipped: SummaryDetail[]; updated: SummaryDetail[] };
  research?: { status: "consulted" | "not_configured" | "failed"; summary: string; citations: string[]; queryHints: string[] };
};

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
  const [pdfSubmissionId, setPdfSubmissionId] = useState<string | null>(null);
  const [forceReprocess, setForceReprocess] = useState(false);
  const [processingSummary, setProcessingSummary] = useState<ProcessingSummary | null>(null);
  const [pdfFailure, setPdfFailure] = useState<{ submissionId: string; stage: string; message: string; code: string; canRetry: boolean } | null>(null);
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
    return data || {} as Record<string, any>;
  };

  const resetSelectedFile = () => {
    setSelectedFile(null);
    setPdfSubmissionId(null);
    setPdfFailure(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getPdfHash = async (file: File) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()))).map(byte => byte.toString(16).padStart(2, "0")).join("");

  const logPdfFlow = async (submissionId: string, stage: string, status: string, metadata: Record<string, unknown> = {}, errorCode?: string, safeMessage?: string) => {
    await (supabase as any).from("pdf_processing_logs").insert({ user_id: userId, submission_id: submissionId, stage, status, error_code: errorCode || null, safe_message: safeMessage || null, metadata });
  };

  const createPdfFailure = (submissionId: string, stage: string, code: string, message: string, canRetry = true) => {
    setPdfFailure({ submissionId, stage, code, message, canRetry });
    toast.error(message);
  };

  const validatePdfFile = async (file: File) => {
    const extension = file.name.toLowerCase().endsWith(".pdf");
    const mimeOk = !file.type || file.type === "application/pdf" || file.type === "application/x-pdf";
    if (!extension) throw new Error("Selecione um arquivo com extensão .pdf.");
    if (!mimeOk) throw new Error("O arquivo selecionado não parece ser um PDF válido.");
    if (file.size <= 0) throw new Error("O arquivo PDF está vazio.");
    if (file.size > MAX_PDF_SIZE_BYTES) throw new Error("Arquivo muito grande. Envie um PDF de até 20MB.");

    const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    const signature = String.fromCharCode(...header);
    if (signature !== "%PDF-") throw new Error("O arquivo não possui assinatura de PDF válida. Tente outro arquivo ou use Colar Texto.");
    const tail = await file.slice(Math.max(0, file.size - 4096)).text();
    if (!tail.includes("%%EOF")) throw new Error("O PDF parece corrompido ou incompleto. Baixe novamente o edital e tente outra vez.");
    return { declaredMime: file.type || "não informado", detectedMime: "application/pdf", signature, size: file.size };
  };

  const extractPdfText = async (file: File) => {
    await validatePdfFile(file);
    if (!(Uint8Array.prototype as any).toHex) {
      Object.defineProperty(Uint8Array.prototype, "toHex", {
        value() { return Array.from(this as Uint8Array).map((byte) => byte.toString(16).padStart(2, "0")).join(""); },
        configurable: true,
      });
    }
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data, disableWorker: true, isEvalSupported: false, disableFontFace: true }).promise;
    const pageTexts = await Promise.all(
      Array.from({ length: pdf.numPages }, async (_, index) => {
        const page = await pdf.getPage(index + 1);
        const content = await page.getTextContent();
        return content.items.map((item: any) => item.str || "").join(" ");
      })
    );
    return pageTexts.join("\n").replace(/\s+/g, " ").trim();
  };

  const extractPdfTextWithBackend = async (file: File, submissionId: string, fileHash: string) => {
    const storagePath = `${userId}/edital-submissions/${submissionId}.pdf`;
    await logPdfFlow(submissionId, "storage_upload_started", "started", { storagePath, fileHash, size: file.size, mime: file.type || null });
    const { error: uploadError } = await supabase.storage.from("study-materials").upload(storagePath, file, { contentType: "application/pdf", upsert: false });
    if (uploadError) {
      await logPdfFlow(submissionId, "storage_upload_failed", "failed", { storagePath }, uploadError.message.includes("already exists") ? "overwrite_blocked" : "upload_failed", "Não foi possível enviar o PDF para fallback seguro.");
      throw new Error(uploadError.message.includes("already exists") ? "Submissão duplicada bloqueada para impedir sobrescrita. Tente novamente." : "Não foi possível enviar o PDF para processamento seguro.");
    }

    await logPdfFlow(submissionId, "storage_upload_completed", "success", { storagePath });
    await logPdfFlow(submissionId, "backend_extraction_started", "started", { storagePath, worker: "backend fallback" });
    const { data, error } = await supabase.functions.invoke("extract-pdf-text", { body: { submissionId, storagePath, fileHash } });
    if (error || !data?.success) {
      const message = data?.error || "Não foi possível extrair texto do PDF no backend.";
      await logPdfFlow(submissionId, data?.stage || "backend_extraction_failed", "failed", { storagePath }, data?.code || "backend_failed", message);
      throw new Error(message);
    }

    await logPdfFlow(submissionId, "backend_extraction_completed", "success", { pages: data.pages, textLength: data.textLength, worker: "backend fallback" });
    return String(data.editalText || "");
  };

  const processEdital = async () => {
    setProcessing(true);
    setPdfFailure(null);
    const submissionId = pdfSubmissionId || crypto.randomUUID();
    try {
      const profile = await getProfileData();

      const body: any = {
        targetExam: profile.target_exam,
        targetPosition: profile.target_position,
        banca: profile.banca,
        forceReprocess,
      };

      if (uploadMode === "pdf" && selectedFile) {
        let extractedText = "";
        let fileHash = "";
        try {
          const validation = await validatePdfFile(selectedFile);
          fileHash = await getPdfHash(selectedFile);
          await logPdfFlow(submissionId, "validation_completed", "success", { ...validation, fileHash, fileName: selectedFile.name.slice(0, 120) });
          await logPdfFlow(submissionId, "browser_extraction_started", "started", { worker: "pdfjs legacy browser" });
          extractedText = await extractPdfText(selectedFile);
          await logPdfFlow(submissionId, "browser_extraction_completed", "success", { textLength: extractedText.length, worker: "pdfjs legacy browser" });
        } catch (browserError: any) {
          const safeMessage = browserError?.message || "Falha ao ler o PDF no navegador.";
          const isValidationError = safeMessage.includes("extensão") || safeMessage.includes("assinatura") || safeMessage.includes("corrompido") || safeMessage.includes("vazio") || safeMessage.includes("grande") || safeMessage.includes("válido");
          await logPdfFlow(submissionId, isValidationError ? "validation_failed" : "browser_extraction_failed", "failed", { fileName: selectedFile.name.slice(0, 120), size: selectedFile.size, mime: selectedFile.type || null }, isValidationError ? "invalid_pdf" : "browser_pdf_failed", safeMessage);
          if (isValidationError) {
            createPdfFailure(submissionId, "Validação do arquivo", "invalid_pdf", safeMessage, true);
            setProcessing(false);
            return;
          }
          fileHash = fileHash || await getPdfHash(selectedFile);
          extractedText = await extractPdfTextWithBackend(selectedFile, submissionId, fileHash);
        }
        if (extractedText.length < 20) {
          await logPdfFlow(submissionId, "text_quality_failed", "failed", { textLength: extractedText.length }, "no_text", "PDF sem texto suficiente para processamento.");
          createPdfFailure(submissionId, "Extração de texto", "no_text", "Não consegui ler texto suficiente desse PDF. Se ele for escaneado, use Colar Texto.", true);
          setProcessing(false);
          return;
        }
        body.editalText = extractedText;
      } else if (uploadMode === "text") {
        if (editalText.trim().length < 20) { toast.error("Texto do edital muito curto"); setProcessing(false); return; }
        body.editalText = editalText;
      } else {
        toast.error("Selecione um arquivo PDF ou cole o texto do edital");
        setProcessing(false);
        return;
      }

      const payload = processEditalPayloadSchema.safeParse(body);
      if (!payload.success) throw new Error(payload.error.issues[0]?.message || "Dados inválidos para processar o edital");

      if (uploadMode === "pdf") await logPdfFlow(submissionId, "ai_processing_started", "started", { textLength: payload.data.editalText.length });
      const { data, error } = await supabase.functions.invoke("process-edital", { body: payload.data });
      if (error) throw new Error(error.message || "Erro ao processar edital");
      if (!data?.success) throw new Error(data?.error || "A IA não retornou disciplinas válidas");
      if (uploadMode === "pdf") await logPdfFlow(submissionId, "completed", "success", { insertedSubjects: data.summary?.counts?.insertedSubjects || 0, updatedSubjects: data.summary?.counts?.updatedSubjects || 0 });

      const summary = data.summary as ProcessingSummary | undefined;
      if (summary) setProcessingSummary(summary);
      toast.success(
        summary
          ? `Edital processado: ${summary.counts.insertedSubjects} disciplinas inseridas, ${summary.counts.updatedSubjects} atualizadas e ${summary.counts.skippedSubjects} ignoradas.`
          : `Edital processado! ${data.subjects?.length || 0} disciplinas extraídas.`
      );
      setEditalText("");
      resetSelectedFile();
      loadData();
    } catch (e: any) {
      const message = e.message || "Erro ao processar edital";
      if (uploadMode === "pdf") {
        await logPdfFlow(submissionId, "processing_failed", "failed", { mode: uploadMode }, "processing_failed", message);
        createPdfFailure(submissionId, "Processamento", "processing_failed", message, true);
      } else {
        toast.error(message);
      }
    }
    setProcessing(false);
  };

  const addSubject = async () => {
    if (!newSubject.name.trim()) { toast.error("Nome obrigatório"); return; }
    const { error } = await supabase.from("user_subjects").insert({ user_id: userId, name: newSubject.name, weight: newSubject.weight, knowledge_level: newSubject.knowledge_level });
    if (error) { toast.error(error.code === "23505" ? "Essa disciplina já existe no Arsenal" : "Erro ao adicionar"); return; }
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
    const { error } = await supabase.from("topics").insert({ user_id: userId, subject_id: subjectId, name, order_index: maxOrder });
    if (error) { toast.error(error.code === "23505" ? "Esse tópico já existe nesta disciplina" : "Erro ao adicionar tópico"); return; }
    setNewTopicInputs(prev => ({ ...prev, [subjectId]: "" }));
    loadData();
  };

  const deleteSubject = async (id: string) => {
    await supabase.from("user_subjects").delete().eq("id", id);
    toast.success("Disciplina removida");
    loadData();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPdfFailure(null);
      const submissionId = crypto.randomUUID();
      const validation = await validatePdfFile(file);
      const fileHash = await getPdfHash(file);
      await logPdfFlow(submissionId, "selected", "success", { ...validation, fileHash, fileName: file.name.slice(0, 120) });
      setPdfSubmissionId(submissionId);
      setSelectedFile(file);
    } catch (error: any) {
      resetSelectedFile();
      toast.error(error.message || "PDF inválido. Use outro arquivo ou cole o texto do edital.");
    }
  };

  const totalTopics = topics.length;
  const completedTopics = topics.filter(t => t.completed).length;
  const completionPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const getSubjectPlan = (subjectId: string) => plan.find(p => p.subject_id === subjectId);

  const renderDetailList = (items: SummaryDetail[], empty: string) => (
    items.length ? (
      <div className="space-y-2">
        {items.slice(0, 12).map((item, index) => (
          <div key={`${item.name}-${index}`} className="rounded-lg border border-border/60 p-3 text-xs space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">{item.name}</span>
              {item.subject && <Badge variant="outline" className="text-[10px]">{item.subject}</Badge>}
            </div>
            <p className="text-muted-foreground">{item.reason}</p>
            {(item.previous || item.next) && (
              <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                {item.previous && <span>Antes: {Object.entries(item.previous).map(([k, v]) => `${k} ${v}`).join(" · ")}</span>}
                {item.next && <span>Agora: {Object.entries(item.next).map(([k, v]) => `${k} ${v}`).join(" · ")}</span>}
              </div>
            )}
            {item.sources?.some(source => source.url) && (
              <div className="space-y-1 pt-1">
                {item.sources.filter(source => source.url).slice(0, 2).map((source, sourceIndex) => (
                  <a key={`${source.url}-${sourceIndex}`} href={source.url} target="_blank" rel="noreferrer" className="block truncate text-primary hover:underline">
                    {source.title || "Fonte pública"}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
        {items.length > 12 && <p className="text-xs text-muted-foreground">+ {items.length - 12} itens adicionais.</p>}
      </div>
    ) : <p className="text-xs text-muted-foreground">{empty}</p>
  );

  const renderProcessingSummary = () => processingSummary && (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><SearchCheck className="h-4 w-4" />Resumo do processamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border/60 p-3"><p className="text-xs text-muted-foreground">Disciplinas</p><p className="text-sm font-semibold">+{processingSummary.counts.insertedSubjects} · ↻{processingSummary.counts.updatedSubjects} · ={processingSummary.counts.skippedSubjects}</p></div>
          <div className="rounded-lg border border-border/60 p-3"><p className="text-xs text-muted-foreground">Tópicos</p><p className="text-sm font-semibold">+{processingSummary.counts.insertedTopics} · ={processingSummary.counts.skippedTopics}</p></div>
          <div className="rounded-lg border border-border/60 p-3"><p className="text-xs text-muted-foreground">Planos</p><p className="text-sm font-semibold">+{processingSummary.counts.insertedPlans} · ↻{processingSummary.counts.updatedPlans} · ={processingSummary.counts.skippedPlans}</p></div>
          <div className="rounded-lg border border-border/60 p-3"><p className="text-xs text-muted-foreground">Fontes públicas</p><p className="text-sm font-semibold">{processingSummary.research?.status === "consulted" ? "Consultadas" : processingSummary.research?.status === "failed" ? "Falha" : "Não configuradas"}</p></div>
        </div>

        {processingSummary.research?.summary && (
          <div className="rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground space-y-2">
            <p className="font-medium text-foreground/80">Base de Relevância/Incidência</p>
            <p className="line-clamp-4">{processingSummary.research.summary}</p>
            {processingSummary.research.citations?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {processingSummary.research.citations.slice(0, 4).map((url) => <a key={url} href={url} target="_blank" rel="noreferrer" className="truncate text-primary hover:underline max-w-full">{url}</a>)}
              </div>
            )}
          </div>
        )}

        <Accordion type="multiple" className="space-y-2">
          <AccordionItem value="subjects" className="rounded-lg border border-border/60 px-3">
            <AccordionTrigger className="text-sm hover:no-underline">Disciplinas inseridas, atualizadas e ignoradas</AccordionTrigger>
            <AccordionContent className="space-y-3">
              {renderDetailList(processingSummary.subjects.inserted, "Nenhuma disciplina nova.")}
              {renderDetailList(processingSummary.subjects.updated, "Nenhuma disciplina atualizada.")}
              {renderDetailList(processingSummary.subjects.skipped, "Nenhuma disciplina ignorada.")}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="topics" className="rounded-lg border border-border/60 px-3">
            <AccordionTrigger className="text-sm hover:no-underline">Tópicos inseridos e ignorados</AccordionTrigger>
            <AccordionContent className="space-y-3">
              {renderDetailList(processingSummary.topics.inserted, "Nenhum tópico novo.")}
              {renderDetailList(processingSummary.topics.skipped, "Nenhum tópico ignorado.")}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="plans" className="rounded-lg border border-border/60 px-3">
            <AccordionTrigger className="text-sm hover:no-underline">Planos inseridos, atualizados e ignorados</AccordionTrigger>
            <AccordionContent className="space-y-3">
              {renderDetailList(processingSummary.plans.inserted, "Nenhum plano novo.")}
              {renderDetailList(processingSummary.plans.updated, "Nenhum plano atualizado.")}
              {renderDetailList(processingSummary.plans.skipped, "Nenhum plano ignorado.")}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-display">🛡️ Arsenal</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass"><CardContent className="pt-4 text-center"><Shield className="h-6 w-6 mx-auto text-primary mb-1" /><div className="text-2xl font-bold">{subjects.length}</div><div className="text-xs text-muted-foreground">Disciplinas Ativas</div></CardContent></Card>
        <Card className="glass"><CardContent className="pt-4 text-center"><BookOpen className="h-6 w-6 mx-auto text-primary mb-1" /><div className="text-2xl font-bold">{totalTopics}</div><div className="text-xs text-muted-foreground">Tópicos no Edital</div></CardContent></Card>
        <Card className="glass"><CardContent className="pt-4 text-center"><CheckCircle className="h-6 w-6 mx-auto text-success mb-1" /><div className="text-2xl font-bold">{completedTopics}</div><div className="text-xs text-muted-foreground">Tópicos Dominados</div></CardContent></Card>
        <Card className="glass"><CardContent className="pt-4 text-center"><Target className="h-6 w-6 mx-auto text-warning mb-1" /><div className="text-2xl font-bold">{completionPct}%</div><div className="text-xs text-muted-foreground">Conclusão Geral</div></CardContent></Card>
      </div>

      <Card className="glass">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" />Processar Edital com IA</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as "text" | "pdf")}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="pdf"><Upload className="h-3 w-3 mr-1" />Upload PDF</TabsTrigger>
              <TabsTrigger value="text"><FileText className="h-3 w-3 mr-1" />Colar Texto</TabsTrigger>
            </TabsList>

            <TabsContent value="pdf" className="space-y-3 mt-3">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={handleFileSelect} className="hidden" />
                {selectedFile ? (
                  <div className="space-y-2">
                    <FileText className="h-10 w-10 mx-auto text-primary" />
                    <p className="text-sm font-medium break-all">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); resetSelectedFile(); }}>Remover</Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Clique para selecionar o PDF do edital</p>
                    <p className="text-xs text-muted-foreground">Máximo 20MB</p>
                  </div>
                )}
              </div>
              {pdfFailure && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm space-y-3">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">Não foi possível processar este PDF</p>
                    <p className="text-muted-foreground">{pdfFailure.message}</p>
                  </div>
                  <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                    <span>Etapa: <strong className="text-foreground">{pdfFailure.stage}</strong></span>
                    <span>ID da submissão: <strong className="text-foreground break-all">{pdfFailure.submissionId}</strong></span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pdfFailure.canRetry && selectedFile && <Button size="sm" variant="outline" onClick={processEdital} disabled={processing}><RefreshCw className="h-3 w-3 mr-1" />Tentar novamente</Button>}
                    <Button size="sm" variant="ghost" onClick={() => setUploadMode("text")} disabled={processing}><FileText className="h-3 w-3 mr-1" />Usar Colar Texto</Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="text" className="mt-3">
              <Textarea value={editalText} onChange={e => setEditalText(e.target.value)} placeholder="Cole aqui o conteúdo programático do edital..." rows={6} />
            </TabsContent>
          </Tabs>

          <div className="flex items-start justify-between gap-3 rounded-lg border border-border/60 p-3">
            <div className="space-y-1">
              <Label htmlFor="force-reprocess" className="text-sm font-medium flex items-center gap-2"><RefreshCw className="h-4 w-4" />Reprocessar edital</Label>
              <p className="text-xs text-muted-foreground">Atualiza Relevância/Incidência e planos existentes sem duplicar disciplinas ou tópicos.</p>
            </div>
            <Switch id="force-reprocess" checked={forceReprocess} onCheckedChange={setForceReprocess} />
          </div>

          <div className="bg-muted/20 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground/80">🤖 A IA irá automaticamente:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Extrair disciplinas e tópicos do conteúdo programático</li>
              <li>Avaliar <strong className="text-primary">Relevância</strong> pelo peso no edital</li>
              <li>Estimar <strong className="text-primary">Incidência</strong> com consulta pública quando configurada</li>
              <li>Preservar Compreensão, Psique e Intensidade para registros do usuário</li>
            </ul>
          </div>

          <Button onClick={processEdital} disabled={processing} className="w-full">
            {processing ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Processando edital com IA...</> : forceReprocess ? <><RefreshCw className="h-4 w-4 mr-1" />Reprocessar Edital</> : <><TrendingUp className="h-4 w-4 mr-1" />Processar Edital com IA</>}
          </Button>
        </CardContent>
      </Card>

      {renderProcessingSummary()}

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subjects.map(s => {
          const subTopics = topics.filter(t => t.subject_id === s.id);
          const done = subTopics.filter(t => t.completed).length;
          const pct = subTopics.length > 0 ? Math.round((done / subTopics.length) * 100) : 0;
          const subPlan = getSubjectPlan(s.id);
          return (
            <Card key={s.id} className="glass">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-primary text-sm">{s.name}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => deleteSubject(s.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                  <span>Relevância: <strong className="text-foreground">{subPlan?.relevance || s.weight}/5</strong></span>
                  <span>Incidência: <strong className="text-foreground">{subPlan?.incidence || s.incidence || "—"}/5</strong></span>
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
